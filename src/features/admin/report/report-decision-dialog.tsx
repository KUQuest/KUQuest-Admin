"use client";

import { useEffect, useState } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button } from "../../../components/ui/button";
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
  onConfirm: (reason: string) => void;
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
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, choice]);

  if (!open) return null;
  const title = decisionDialogTitle(choice, translateText);
  const description = decisionDialogDescription(choice, model.id, translateText);
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
          const value = reason.trim();
          if (value.length < 8) return;
          onConfirm(value);
        }}
      >
        <div className="dialog-body p-5">
          <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
          <h2 id="report-decision-title">{title}</h2>
          <p>{description}</p>
          {choice ? (
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Report Case")} ${model.id} · ${translateText("Message")}`}
              currentState={model.statusLabel}
              nextState={reportCaseStatusLabel(nextState)}
              effect={translateText(effect)}
              reversibility={translateText(reversibility)}
              warning={translateText("Read Message content only through the named Evidence Reference. The evidence read is logged as an Admin Action.")}
            />
          ) : null}
          <label htmlFor="report-decision-reason">{translateText("Reason for this decision")}</label>
          <textarea
            id="report-decision-reason"
            name="reason"
            rows={4}
            minLength={8}
            maxLength={500}
            required
            value={reason}
            aria-invalid={Boolean(error)}
            onChange={(event) => setReason(event.target.value)}
            placeholder={translateText("Enter the reason for the Report Case decision")}
          />
          <div className="mt-1.5 flex justify-between gap-3 text-[15px] leading-[1.4] text-admin-muted"><span>{translateText("Minimum 8 characters")}</span><span>{reason.length}/500</span></div>
          {error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div>
        <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
          <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</Button>
          <Button variant="danger" type="submit" disabled={busy || reason.trim().length < 8}>
            {busy ? translateText("Saving…") : translateText("Confirm decision")}
          </Button>
        </div>
      </form>
      </dialog>
    </AdminModalPortal>
  );
}
