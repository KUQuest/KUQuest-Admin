"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button } from "../../../components/ui";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { ApiError } from "../../../lib/api/client";
import { MEMBER_PENALTY_REASON_CODE_OPTIONS } from "../admin-reason-codes";
import { formatAdminTimestamp } from "../date-format";
import type {
  AdminMemberPenaltyAddReasonCode,
  AdminMemberPenaltyAddResult,
  AdminMemberPenaltyRemoveReasonCode,
} from "../api/admin-api";
import {
  memberPenaltyHistoryItemKey,
  memberPenaltyHistoryValueLabel,
  type MemberModel,
  type MemberPenaltyHistoryEntry,
} from "./member-model";
import { useMemberPenaltyMutation } from "./member-query";

const ADD_PENALTY_OPTIONS: {
  value: AdminMemberPenaltyAddResult;
  label: string;
  description: string;
}[] = [
  {
    value: "PENALTY_RED_FLAG",
    label: "Red Flag",
    description: "Apply a Red Flag for 7 days.",
  },
  {
    value: "PENALTY_TEMPORARY_BAN_7_DAYS",
    label: "7-day Member Ban",
    description: "Block sign-in and apply the automatic Wallet freeze for 7 days.",
  },
  {
    value: "PENALTY_PERMANENT_BAN",
    label: "Permanent Member Ban",
    description: "Block sign-in and apply the automatic Wallet freeze permanently.",
  },
];

type PenaltyAction = "add" | "remove";
type DirectActionExemption = "PC-12" | "PC-13" | "none" | "unknown";

function isEffectivePenalty(entry: MemberPenaltyHistoryEntry): boolean {
  return entry.isEffective
    && entry.result !== "PENALTY_EXEMPT"
    && entry.result !== "PENALTY_REVERSAL";
}

function historyItemLabel(entry: MemberPenaltyHistoryEntry, translateText: (value: string) => string): string {
  const parts = [
    translateText(memberPenaltyHistoryValueLabel(entry.result)),
    translateText(memberPenaltyHistoryValueLabel(entry.source)),
    `${translateText("Sequence")} ${entry.sequenceNumber}`,
    entry.sourceDisplayId,
    formatAdminTimestamp(entry.createdAt, "Asia/Bangkok"),
  ].filter(Boolean);
  return parts.join(" · ");
}

function calendarMonthAfter(timestamp: number): number {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  date.setUTCFullYear(year, month, Math.min(day, lastDay));
  return date.getTime();
}

function directActionExemption(model: MemberModel, complete: boolean): DirectActionExemption {
  const summary = model.penaltyHistory.summary;
  const entries = model.penaltyHistory.items;
  if (!complete || !summary || !entries) return "unknown";
  if (summary.confirmedMisconductCount < 10) return "PC-12";

  const now = Date.now();
  const banLifts: number[] = [];
  let activeBan = false;
  for (const entry of entries) {
    if (entry.result !== "PENALTY_TEMPORARY_BAN_7_DAYS"
      && entry.result !== "PENALTY_TEMPORARY_BAN_1_MONTH"
      && entry.result !== "PENALTY_PERMANENT_BAN") continue;

    const createdAt = Date.parse(entry.createdAt);
    const reversalAt = entry.reversal?.relation === "REVERSED_BY"
      ? Date.parse(entry.reversal.createdAt)
      : null;
    if (entry.result === "PENALTY_PERMANENT_BAN") {
      if (entry.isEffective) activeBan = true;
      if (reversalAt !== null) banLifts.push(reversalAt);
      continue;
    }

    const expiresAt = entry.result === "PENALTY_TEMPORARY_BAN_7_DAYS"
      ? createdAt + 7 * 24 * 60 * 60 * 1000
      : calendarMonthAfter(createdAt);
    if (entry.isEffective && expiresAt > now) activeBan = true;
    if (reversalAt !== null) banLifts.push(Math.min(expiresAt, reversalAt));
    else if (expiresAt <= now) banLifts.push(expiresAt);
  }

  if (activeBan) return "none";
  const lastBanLift = banLifts.length ? Math.max(...banLifts) : null;
  if (lastBanLift === null) return "none";

  const confirmedSinceBanLift = entries.filter((entry) => (
    entry.ladder === "MISCONDUCT"
    && entry.source !== "REVIEW_AVERAGE"
    && entry.result !== "PENALTY_REVERSAL"
    && entry.recalculatedFrom === null
    && Date.parse(entry.createdAt) >= lastBanLift
  )).length;
  return confirmedSinceBanLift < 3 ? "PC-13" : "none";
}

function penaltyActionIdempotencyKey(action: PenaltyAction, memberId: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-member-penalty-${action}-${memberId}-${uuid}`;
}

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "PENALTY_HISTORY_STALE") return "Penalty History changed. Reload it before you try again.";
    if (error.code === "PENALTY_EXEMPTION_APPLIES") return "A direct-action exemption applies. No penalty was added. Reload Penalty History.";
    if (error.code === "PENALTY_RECORD_NOT_EFFECTIVE") return "This penalty is no longer effective. Reload Penalty History.";
    if (error.code === "PENALTY_RECORD_NOT_FOUND") return "Penalty record was not found. Reload Penalty History.";
    if (error.code === "PENALTY_RESULT_REQUIRED") return "Select a permitted penalty result.";
  }
  return "The penalty action could not be saved. Reload Penalty History and try again.";
}

function MemberPenaltyActionDialog({
  action,
  model,
  effectivePenalties,
  historyComplete,
  exemption,
  onClose,
  onSuccess,
}: {
  action: PenaltyAction;
  model: MemberModel;
  effectivePenalties: MemberPenaltyHistoryEntry[];
  historyComplete: boolean;
  exemption: DirectActionExemption;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { translateText } = useAdminShell();
  const { isPending, mutateAsync } = useMemberPenaltyMutation();
  const keyRef = useRef<Map<string, string>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const selectRecord = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSelectedRecordId(event.currentTarget.value);
  }, []);
  const add = action === "add";
  const title = translateText(add ? "Record violation" : "Remove penalty");
  const reasons = MEMBER_PENALTY_REASON_CODE_OPTIONS[action];
  const versionToken = model.penaltyHistory.summary?.versionToken;
  const canSubmitAdd = historyComplete && typeof versionToken === "number" && exemption !== "unknown";
  const canSubmitRemove = historyComplete
    && typeof versionToken === "number"
    && selectedRecordId !== null
    && effectivePenalties.some((entry) => entry.recordId === selectedRecordId);
  const close = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (isPending || !historyComplete || typeof versionToken !== "number") return;

    const formData = new FormData(event.currentTarget);
    const rawReason = formData.get("reasonCode");
    const reasonValues = reasons.map((reason) => reason.value as string);
    if (typeof rawReason !== "string" || !reasonValues.includes(rawReason)) return;
    const rawNote = formData.get("adminNote");
    const adminNote = typeof rawNote === "string" ? rawNote.trim() : "";

    if (add) {
      if (exemption === "unknown") return;
      const rawResult = formData.get("penaltyResult");
      const result = exemption === "none"
        ? ADD_PENALTY_OPTIONS.find((option) => option.value === rawResult)?.value
        : undefined;
      if (exemption === "none" && !result) return;

      const commandInput = {
        expectedVersionToken: versionToken,
        ...(result ? { result } : {}),
        reasonCode: rawReason as AdminMemberPenaltyAddReasonCode,
        ...(adminNote ? { adminNote } : {}),
      };
      const signature = JSON.stringify(commandInput);
      const idempotencyKey = keyRef.current.get(signature) ?? penaltyActionIdempotencyKey(action, model.id);
      keyRef.current.set(signature, idempotencyKey);

      try {
        const response = await mutateAsync({
          action: "add",
          memberId: model.id,
          command: { ...commandInput, idempotencyKey },
        });
        onSuccess(response.command.outcome === "EXEMPTED"
          ? "Violation recorded without a penalty because an exemption applies."
          : "Violation recorded.");
      } catch (error) {
        setErrorMessage(actionErrorMessage(error));
      }
      return;
    }

    const rawRecordId = formData.get("recordId");
    if (typeof rawRecordId !== "string" || !effectivePenalties.some((entry) => entry.recordId === rawRecordId)) {
      setErrorMessage("Select an effective penalty to remove.");
      return;
    }

    const commandInput = {
      expectedVersionToken: versionToken,
      recordId: rawRecordId,
      reasonCode: rawReason as AdminMemberPenaltyRemoveReasonCode,
      ...(adminNote ? { adminNote } : {}),
    };
    const signature = JSON.stringify(commandInput);
    const idempotencyKey = keyRef.current.get(signature) ?? penaltyActionIdempotencyKey(action, model.id);
    keyRef.current.set(signature, idempotencyKey);

    try {
      await mutateAsync({
        action: "remove",
        memberId: model.id,
        command: { ...commandInput, idempotencyKey },
      });
      onSuccess("Penalty removed");
    } catch (error) {
      setErrorMessage(actionErrorMessage(error));
    }
  }, [action, add, effectivePenalties, exemption, historyComplete, isPending, model, mutateAsync, onSuccess, reasons, versionToken]);

  return (
    <AdminModalPortal open onClose={close}>
      <dialog open className="member-action-dialog member-penalty-command-dialog" aria-labelledby="member-penalty-command-title" aria-modal="true" tabIndex={-1}>
        <form className="member-penalty-command-layout" onSubmit={submit}>
          <div className="dialog-body grid min-h-0 flex-1 gap-4 overflow-y-auto p-5">
            <div>
              <h2 id="member-penalty-command-title">{title}</h2>
              <p className="mb-0">{model.displayId || model.title}</p>
            </div>
            <section className="grid gap-1 rounded-lg bg-admin-soft p-3" aria-label={translateText("Action details")}>
              <h3 className="m-0 font-semibold">{translateText("Action details")}</h3>
              <p className="m-0">{translateText(add
                ? "The selected Misconduct result will be recorded as a direct Admin action. It will not count toward later automatic Misconduct ladder results."
                : "The selected penalty will be reversed. The API will recalculate later automatic ladder results and current restrictions from the remaining effective history. If a later result changes, the API will append a linked reversal and replacement.")}</p>
              <p className="m-0">{translateText(add
                ? "The API checks the direct-action exemptions before it saves the violation."
                : "The original record will stay in immutable Penalty History with a linked reversal. The source case decision will not change.")}</p>
            </section>
            {!historyComplete ? <p className="audit-note" role="alert">{translateText("Complete Penalty History is required before you can record a violation or remove a penalty.")}</p> : null}
            {add ? (
              exemption === "unknown" ? (
                <p className="audit-note" role="alert">{translateText("Penalty History is not complete. Reload it before you record a violation.")}</p>
              ) : exemption !== "none" ? (
                <section className="grid gap-1 rounded-lg border border-admin-border p-3">
                  <strong>{translateText("No penalty will be applied")}</strong>
                  <p className="m-0">{translateText(exemption === "PC-12"
                    ? "The first 10 direct-action violations are exempt. This action will record the violation without adding a penalty."
                    : "The first 3 direct-action violations after a ban lifts are exempt. This action will record the violation without adding a penalty.")}</p>
                </section>
              ) : (
                <fieldset className="grid gap-2">
                  <legend className="mb-1 font-semibold">{translateText("Select a Misconduct penalty")} <span aria-hidden="true">*</span></legend>
                  {ADD_PENALTY_OPTIONS.map((option, index) => (
                    <label className="report-decision-option grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-admin-border p-3" aria-label={`${translateText(option.label)}. ${translateText(option.description)}`} htmlFor={`member-penalty-choice-${option.value}`} key={option.value}>
                      <input className="mt-1" id={`member-penalty-choice-${option.value}`} name="penaltyResult" type="radio" value={option.value} required={index === 0} />
                      <span className="grid gap-1">
                        <strong>{translateText(option.label)}</strong>
                        <small className="text-admin-muted">{translateText(option.description)}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )
            ) : (
              <fieldset className="grid gap-2">
                <legend className="mb-1 font-semibold">{translateText("Select an effective penalty to remove")} <span aria-hidden="true">*</span></legend>
                {historyComplete && effectivePenalties.length ? effectivePenalties.map((entry, index) => (
                  <label className="report-decision-option grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-admin-border p-3" aria-label={`${translateText(memberPenaltyHistoryValueLabel(entry.result))}. ${historyItemLabel(entry, translateText)}`} htmlFor={`member-penalty-record-${entry.recordId}`} key={memberPenaltyHistoryItemKey(entry)}>
                    <input
                      className="mt-1"
                      id={`member-penalty-record-${entry.recordId}`}
                      name="recordId"
                      type="radio"
                      value={entry.recordId}
                      checked={selectedRecordId === entry.recordId}
                      onChange={selectRecord}
                      required={index === 0}
                    />
                    <span className="grid gap-1">
                      <strong>{translateText(memberPenaltyHistoryValueLabel(entry.result))}</strong>
                      <small className="text-admin-muted">{historyItemLabel(entry, translateText)}</small>
                    </span>
                  </label>
                )) : (
                  <p className="audit-note">{translateText(historyComplete ? "No effective penalty record is available to select." : "Complete Penalty History is required before a penalty can be selected.")}</p>
                )}
                <p className="audit-note">{translateText("A timed penalty can remain effective after its restriction ends.")}</p>
              </fieldset>
            )}
            <label className="grid gap-1 font-semibold" htmlFor="member-penalty-reason-code">
              <span>{translateText("Reason code")} <span aria-hidden="true">*</span></span>
              <select className="w-full rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-admin-text" id="member-penalty-reason-code" name="reasonCode" required disabled={isPending} defaultValue="">
                <option value="" disabled>{translateText("Select a reason code")}</option>
                {reasons.map((reason) => <option key={reason.value} value={reason.value}>{translateText(reason.label)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 font-semibold" htmlFor="member-penalty-admin-note">
              <span>{translateText("Admin note (optional)")}</span>
              <textarea className="member-penalty-reason w-full resize-y rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-admin-text" id="member-penalty-admin-note" name="adminNote" maxLength={200} rows={3} disabled={isPending} />
              <span className="font-normal text-admin-muted">{translateText("Maximum 200 characters.")}</span>
            </label>
            {errorMessage ? <p className="audit-note" role="alert">{translateText(errorMessage)}</p> : null}
          </div>
          <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
            <Button variant="outline" type="button" onClick={close} disabled={isPending}>{translateText("Close")}</Button>
            <Button variant={add ? "primary" : "danger"} type="submit" disabled={isPending || (add ? !canSubmitAdd : !canSubmitRemove)}>
              {translateText(isPending ? "Saving" : add ? "Record violation" : "Remove penalty")}
            </Button>
          </div>
        </form>
      </dialog>
    </AdminModalPortal>
  );
}

export function MemberPenaltyActions({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const [action, setAction] = useState<PenaltyAction | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const historyItems = model.penaltyHistory.items;
  const effectivePenalties = useMemo(() => historyItems?.filter(isEffectivePenalty) ?? [], [historyItems]);
  const historyComplete = model.penaltyHistory.complete
    && historyItems !== null
    && !model.penaltyHistory.error
    && model.penaltyHistory.summary !== null;
  const exemption = directActionExemption(model, historyComplete);
  const openAdd = useCallback(() => { setSuccessMessage(null); setAction("add"); }, []);
  const openRemove = useCallback(() => { setSuccessMessage(null); setAction("remove"); }, []);
  const closeAction = useCallback(() => setAction(null), []);
  const finishAction = useCallback((message: string) => {
    setSuccessMessage(message);
    setAction(null);
  }, []);

  return (
    <div className="mt-4 grid gap-3 border-t border-admin-border pt-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={openAdd}>{translateText("Record violation")}</Button>
        <Button variant="outline" onClick={openRemove}>{translateText("Remove penalty")}</Button>
      </div>
      {successMessage ? <output className="audit-note block">{translateText(successMessage)}</output> : null}
      {action ? <MemberPenaltyActionDialog action={action} model={model} effectivePenalties={effectivePenalties} historyComplete={historyComplete} exemption={exemption} onClose={closeAction} onSuccess={finishAction} /> : null}
    </div>
  );
}
