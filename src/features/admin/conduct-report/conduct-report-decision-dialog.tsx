"use client";

import { useEffect, useState } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button } from "../../../components/ui/button";
import { AdminReasonCodeField } from "../admin-reason-code-field";
import { CONDUCT_REPORT_DISMISS_REASON_CODE_OPTIONS } from "../admin-reason-codes";
import { AdminDecisionNoteInput, useAdminDecisionNote, type AdminDecisionSubmission } from "../admin-decision-note";
import {
  conductReportStatusLabel,
  type ConductReportDecisionChoice,
  type ConductReportDecisionReasonCode,
  type ConductReportModel,
} from "./conduct-report-model";


type DecisionDialogProps = {
  open: boolean;
  choice: ConductReportDecisionChoice | null;
  busy: boolean;
  error: string | null;
  model: ConductReportModel;

  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (submission: AdminDecisionSubmission<"decisionReasonCode", ConductReportDecisionReasonCode | null>) => void;
};

function decisionDialogTitle(
  choice: ConductReportDecisionChoice | null,
  translateText: (value: string) => string,
): string {
  if (choice === "confirmed-violation") return translateText("Confirm violation");
  if (choice === "dismiss") return translateText("Dismiss Conduct Report");
  return translateText("Close report");
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
  const [decisionReasonCode, setDecisionReasonCode] = useState<ConductReportDecisionReasonCode | "">("");
  const {
    value: decisionNote,
    setValue: setDecisionNote,
    decisionReasonText,
  } = useAdminDecisionNote(open, choice);

  useEffect(() => {
    if (open) setDecisionReasonCode("");
  }, [choice, open]);

  if (!open) return null;
  const title = decisionDialogTitle(choice, translateText);
  const description = decisionDialogDescription(choice, model.displayId, translateText);
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
          const selectedDecisionReasonCode = choice === "dismiss" ? decisionReasonCode : null;
          if (choice === "dismiss" && !selectedDecisionReasonCode) return;
          onConfirm({
            decisionReasonCode: selectedDecisionReasonCode || null,
            ...(decisionReasonText ? { decisionReasonText } : {}),
          });
        }}
      >
        <div className="dialog-body p-5">
          <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
          <h2 id="conduct-report-decision-title">{title}</h2>
          <p>{description}</p>
          {choice ? (
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Conduct Report")} ${model.displayId} · ${translateText("Quest")} ${model.questId ?? "—"}`}
              currentState={model.statusLabel}
              nextState={conductReportStatusLabel(nextState)}
              effect={translateText(effect)}
              reversibility={translateText(choice === "confirmed-violation" ? "This decision is final. Review the Quest record before confirming." : "The decision is retained as an immutable audit record.")}
              warning={translateText("Use the Quest, Assignment, and Proof Submission record as the decision evidence.")}
            />
          ) : null}
          {choice === "dismiss" ? (
            <AdminReasonCodeField
              id="conduct-report-decision-reason-code"
              label="Decision reason code"
              value={decisionReasonCode}
              options={CONDUCT_REPORT_DISMISS_REASON_CODE_OPTIONS}
              onValueChange={setDecisionReasonCode}
              translateText={translateText}
              invalid={Boolean(error)}
            />
          ) : null}
          <AdminDecisionNoteInput
            id="conduct-report-decision-reason-text"
            value={decisionNote}
            onChange={setDecisionNote}
            translateText={translateText}
          />
          {error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div>
        <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
          <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>
            {translateText("Cancel")}
          </Button>
          <Button variant="danger" type="submit" disabled={busy || (choice === "dismiss" && !decisionReasonCode)}>
            {busy ? translateText("Saving…") : translateText("Confirm decision")}
          </Button>
        </div>
      </form>
      </dialog>
    </AdminModalPortal>
  );
}
