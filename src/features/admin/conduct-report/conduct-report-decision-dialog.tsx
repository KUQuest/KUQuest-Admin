"use client";

import { useEffect, useState } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button } from "../../../components/ui/button";
import { conductReportStatusLabel, type ConductReportDecisionChoice, type ConductReportModel } from "./conduct-report-model";


type DecisionDialogProps = {
  open: boolean;
  choice: ConductReportDecisionChoice | null;
  busy: boolean;
  error: string | null;
  model: ConductReportModel;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

function decisionDialogTitle(
  choice: ConductReportDecisionChoice | null,
  translateText: (value: string) => string,
): string {
  return choice === "confirmed-violation"
    ? translateText("Confirm violation")
    : translateText("Close report");
}
function decisionDialogDescription(
  choice: ConductReportDecisionChoice | null,
  modelId: string,
  translateText: (value: string) => string,
): string {
  if (choice === "confirmed-violation") {
    return `${translateText("This will uphold the Conduct Report and record a confirmed violation for")} ${modelId}.`;
  }
  return `${translateText("This will dismiss the Conduct Report without changing the reported Member status for")} ${modelId}.`;
}

export function ConductReportDecisionDialog({
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
  }, [choice, open]);

  if (!open) return null;
  const title = decisionDialogTitle(choice, translateText);
  const description = decisionDialogDescription(choice, model.id, translateText);
  const nextState = choice === "confirmed-violation"
    ? "CONDUCT_REPORT_UPHELD"
    : "CONDUCT_REPORT_DISMISSED";
  const effect = choice === "confirmed-violation"
    ? "The Conduct Report is upheld and a permanent Misconduct strike is recorded. There is no restore path."
    : "The Conduct Report closes. No Misconduct strike or Member status change is made.";

  return (
    <AdminModalPortal open={open} onClose={onCancel}>
      <dialog
        open
        className="report-decision-dialog conduct-report-decision-dialog z-[60]"
        aria-modal="true"
        aria-labelledby="conduct-report-decision-title"
        tabIndex={-1}
      >
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
          <h2 id="conduct-report-decision-title">{title}</h2>
          <p>{description}</p>
          {choice ? (
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Conduct Report")} ${model.id} · ${translateText("Quest")} ${model.questId ?? "—"}`}
              currentState={model.statusLabel}
              nextState={conductReportStatusLabel(nextState)}
              effect={translateText(effect)}
              reversibility={translateText(choice === "confirmed-violation" ? "This decision is final. Review the Quest record before confirming." : "The decision is retained as an immutable audit record.")}
              warning={translateText("Use the Quest, Assignment, and Proof Submission record as the decision evidence.")}
            />
          ) : null}
          <label htmlFor="conduct-report-decision-reason">
            {translateText("Reason for this decision")}
          </label>
          <textarea
            id="conduct-report-decision-reason"
            name="reason"
            rows={4}
            minLength={8}
            maxLength={500}
            required
            value={reason}
            aria-invalid={Boolean(error)}
            onChange={(event) => setReason(event.target.value)}
            placeholder={translateText("Enter the reason for the Conduct Report decision")}
          />
          <div className="mt-1.5 flex justify-between gap-3 text-[15px] leading-[1.4] text-admin-muted">
            <span>{translateText("Minimum 8 characters")}</span>
            <span>{reason.length}/500</span>
          </div>
          {error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div>
        <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
          <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>
            {translateText("Cancel")}
          </Button>
          <Button variant="danger" type="submit" disabled={busy || reason.trim().length < 8}>
            {busy ? translateText("Saving…") : translateText("Confirm decision")}
          </Button>
        </div>
      </form>
      </dialog>
    </AdminModalPortal>
  );
}
