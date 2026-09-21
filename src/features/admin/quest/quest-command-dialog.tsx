"use client";

import { useState, type FormEvent } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button as UiButton } from "../../../components/ui";
import type { AdminQuestReasonCode } from "../api/admin-api";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { questStateLabel } from "../domain/rulebook";
import type { QuestDetailView } from "./quest-model";

export type QuestCommand = "hide" | "restore" | "terminate";
export type QuestCommandSubmission = {
  command: QuestCommand;
  reason: string;
  reasonCode: AdminQuestReasonCode;
};

const reasonCodes: Array<{ value: AdminQuestReasonCode; label: string }> = [
  { value: "POLICY_REVIEW", label: "Policy review" },
  { value: "SAFETY_REVIEW", label: "Safety review" },
];

export function QuestCommandDialog({
  detail,
  command,
  dataSource,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  detail: QuestDetailView;
  command: QuestCommand;
  dataSource: "api" | "mock";
  onCancel: () => void;
  onSubmit: (submission: QuestCommandSubmission) => void;
  error: string | null;
  pending: boolean;
}) {
  const { translateText } = useAdminShell();
  // The API requires a Restore reason. Mock mode keeps the same field visible
  // so the UI remains close to the live flow, but the fixture path allows an
  // Admin to submit Restore without a reason while the API contract is pending.
  const reasonRequired = command !== "restore" || dataSource === "api";
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState<AdminQuestReasonCode | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reasonRequired && !reasonCode) {
      setValidationError("Select a reason code.");
      return;
    }
    if (reasonRequired && reason.trim().length < 8) {
      setValidationError("Enter at least 8 characters for the reason.");
      return;
    }
    onSubmit({ command, reason: reason.trim(), reasonCode: reasonCode || "POLICY_REVIEW" });
  }

  return (
    <AdminModalPortal open onClose={onCancel}>
      <dialog open className="dispute-decision-dialog quest-command-dialog" aria-labelledby="quest-command-title" aria-modal="true" tabIndex={-1}>
        <form method="dialog" onSubmit={submit}>
          <div className="dialog-body min-h-0 flex-1 overflow-y-auto p-5">
            <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
            <h2 id="quest-command-title">{translateText(command === "hide" ? "Hide Quest" : command === "restore" ? "Restore Quest" : "Terminate Quest")}</h2>
            <p>{translateText(command === "terminate" ? "This changes the Quest to Cancelled and preserves the Admin Action." : "The API Server remains the authority for this Quest action.")}</p>
          <AdminActionSummary
            title={translateText("Before you confirm")}
            affected={`${translateText("Quest")} ${detail.displayId || detail.id}`}
            currentState={translateText(command === "restore" ? "Hidden" : command === "hide" ? "Discoverable" : questStateLabel(detail.state))}
            nextState={translateText(command === "restore" ? "Discoverable" : command === "hide" ? "Hidden" : questStateLabel("QUEST_CANCELLED"))}
            effect={translateText(command === "hide"
              ? "Remove the Quest from public discovery only. Quest State and Quest Escrow do not change."
              : command === "restore"
                ? "Return the Quest to public discovery. Quest State and Quest Escrow do not change."
                : "Change the Quest to Cancelled. Review the Quest and Funding Reservation record before confirming.")}
            reversibility={translateText(command === "terminate" ? "This is a terminal Quest State. It has no restore path." : "An Admin can reverse this discovery visibility change with the opposite command.")}
            warning={translateText(command === "restore" && !reasonRequired ? "Restore reason is optional in mock mode. The visibility change is still recorded as an Admin Action." : "The API Server remains the authority for the final Quest result.")}
          />
          <label className="grid gap-1 text-[16px] leading-[1.4] font-semibold" htmlFor="quest-command-reason-code"><span>{translateText("Reason code")}{reasonRequired ? <span aria-hidden="true"> *</span> : null}</span><select className="w-full rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-lg leading-[1.45] text-admin-text" id="quest-command-reason-code" required={reasonRequired} value={reasonCode} onChange={(event) => setReasonCode(event.target.value as AdminQuestReasonCode | "")} autoFocus><option value="">{translateText(reasonRequired ? "Select a reason code" : "No reason code")}</option>{reasonCodes.map((item) => <option key={item.value} value={item.value}>{translateText(item.label)}</option>)}</select></label>
          <label className="grid gap-1 text-[16px] leading-[1.4] font-semibold" htmlFor="quest-command-reason"><span>{translateText("Reason")}{reasonRequired ? <span aria-hidden="true"> *</span> : null}</span><textarea className="w-full resize-y rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-lg leading-[1.45] text-admin-text" id="quest-command-reason" required={reasonRequired} minLength={reasonRequired ? 8 : undefined} maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} rows={4} /></label>
          {validationError || error ? <p className="field-error" role="alert">{translateText(validationError || error || "")}</p> : null}
          </div>
          <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5"><UiButton variant="outline" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</UiButton><UiButton variant={command === "terminate" ? "danger" : "primary"} type="submit" disabled={pending}>{pending ? translateText("Saving…") : translateText("Confirm")}</UiButton></div>
        </form>
      </dialog>
    </AdminModalPortal>
  );
}
