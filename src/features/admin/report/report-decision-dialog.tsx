"use client";

import { useEffect, useState } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button } from "../../../components/ui/button";
import { AdminReasonCodeField } from "../admin-reason-code-field";
import { ADMIN_REVIEW_REASON_CODE_OPTIONS } from "../admin-reason-codes";
import { AdminDecisionNoteInput, useAdminDecisionNote, type AdminDecisionSubmission } from "../admin-decision-note";
import type { AdminReviewReasonCode } from "../api/admin-api";
import { type ReportCaseDecisionChoice, type ReportCaseModel } from "./report-model";
import { reportCaseStatusLabel } from "../domain/rulebook";

type DecisionDialogProps = {
  open: boolean;
  choice: ReportCaseDecisionChoice | null;
  busy: boolean;
  error: string | null;
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (submission: AdminDecisionSubmission<"reasonCode", AdminReviewReasonCode>) => void;
};

function decisionDialogTitle(choice: ReportCaseDecisionChoice | null, translateText: (value: string) => string): string {
  if (choice === "confirmed-violation") return translateText("Confirm violation");
  if (choice === "restore") return translateText("Restore Message");
  return translateText("Close report");
}

function decisionDialogDescription(choice: ReportCaseDecisionChoice | null, modelId: string, translateText: (value: string) => string): string {
  if (choice === "confirmed-violation") return `${translateText("This will hide the Message and record a confirmed Report Case decision for")} ${modelId}.`;
  if (choice === "restore") return `${translateText("This will restore the Message and close the Report Case for")} ${modelId}.`;
  return `${translateText("This will dismiss the Report Case without changing the reported Member status for")} ${modelId}.`;
}

export function ReportDecisionDialog({
  open,
  choice,
  busy,
  error,
  model,
  translateText,
  onCancel,
  onConfirm,
}: DecisionDialogProps) {
  const [reasonCode, setReasonCode] = useState<AdminReviewReasonCode | "">("");
  const {
    value: decisionNote,
    setValue: setDecisionNote,
    decisionReasonText,
  } = useAdminDecisionNote(open, choice);

  useEffect(() => {
    if (open) setReasonCode("");
  }, [open, choice]);

  if (!open) return null;
  const title = decisionDialogTitle(choice, translateText);
  const description = decisionDialogDescription(choice, model.displayId, translateText);
  const nextState = choice === "confirmed-violation"
    ? "REPORT_CASE_HIDDEN"
    : choice === "restore"
      ? "REPORT_CASE_RESTORED"
      : "REPORT_CASE_DISMISSED";
  const effect = choice === "confirmed-violation"
    ? "The Message and its Attachments are hidden. The Report Case stays open and creates a Misconduct strike."
    : choice === "restore"
      ? "The Message becomes visible again. The related Misconduct strike is reversed and the Report Case closes."
      : "The Report Case closes. The reported Message and Member status do not change.";
  const reversibility = choice === "confirmed-violation"
    ? "An Admin can restore the Message from the open Report Case."
    : choice === "restore"
      ? "The restored record is retained as an immutable decision history."
      : "The decision is retained as an immutable audit record.";

  return (
    <AdminModalPortal open={open} onClose={onCancel}>
      <dialog open className="report-decision-dialog" aria-modal="true" aria-labelledby="report-decision-title" tabIndex={-1}>
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          const selectedReasonCode = reasonCode;
          if (!selectedReasonCode) return;
          onConfirm({
            reasonCode: selectedReasonCode,
            ...(decisionReasonText ? { decisionReasonText } : {}),
          });
        }}
      >
        <div className="dialog-body p-5">
          <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
          <h2 id="report-decision-title">{title}</h2>
          <p>{description}</p>
          {choice ? (
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Report Case")} ${model.displayId} · ${translateText("Message")}`}
              currentState={model.statusLabel}
              nextState={reportCaseStatusLabel(nextState)}
              effect={translateText(effect)}
              reversibility={translateText(reversibility)}
              warning={translateText("Read Message content only through the named Evidence Reference. The evidence read is logged as an Admin Action.")}
            />
          ) : null}
          <AdminReasonCodeField
            id="report-decision-reason-code"
            label="Reason code"
            value={reasonCode}
            options={ADMIN_REVIEW_REASON_CODE_OPTIONS}
            onValueChange={setReasonCode}
            translateText={translateText}
            invalid={Boolean(error)}
          />
          <AdminDecisionNoteInput
            id="report-decision-reason-text"
            value={decisionNote}
            onChange={setDecisionNote}
            translateText={translateText}
          />
          {error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div>
        <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
          <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</Button>
          <Button variant="danger" type="submit" disabled={busy || !reasonCode}>
            {busy ? translateText("Saving…") : translateText("Confirm decision")}
          </Button>
        </div>
      </form>
      </dialog>
    </AdminModalPortal>
  );
}
