"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button as UiButton } from "../../../components/ui";
import type { PayoutRejection } from "../api/admin-api";
import { payoutStatusLabel } from "../domain/rulebook";
import type { PayoutDetailView } from "./payout-model";

export type PayoutCommand = "approve" | "reject";
export type RejectionReasonCode = PayoutRejection["reasonCode"];
export type PayoutCommandSubmission =
  | { command: "approve" }
  | { command: "reject"; reasonCode: RejectionReasonCode; reason: string };

const rejectionReasonCodes: Array<{ value: RejectionReasonCode; label: string }> = [
  { value: "PAYOUT_POLICY_REVIEW", label: "Policy review" },
  { value: "PAYOUT_RISK_REVIEW", label: "Risk review" },
  { value: "PAYOUT_INVALID_DESTINATION", label: "Invalid destination" },
];

export function PayoutCommandDialog({
  detail,
  command,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  detail: PayoutDetailView;
  command: PayoutCommand;
  onCancel: () => void;
  onSubmit: (submission: PayoutCommandSubmission) => void;
  error: string | null;
  pending: boolean;
}) {
  const { translateText } = useAdminShell();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const submitDisabled = pending || command === "reject" && (!reasonCode || reason.trim().length < 8);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    const focusableSelector = "button:not([disabled]), select:not([disabled]), textarea:not([disabled])";
    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      if (!focusable.length) return;
      const current = document.activeElement;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (current === first || !dialog.contains(current))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (current === last || !dialog.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCancel();
    };
    dialog.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [onCancel]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (command === "reject" && !reasonCode) {
      setValidationError("Select a reason code.");
      return;
    }
    if (command === "reject" && reason.trim().length < 8) {
      setValidationError("Enter at least 8 characters for the rejection reason.");
      return;
    }
    setValidationError(null);
    if (command === "approve") {
      onSubmit({ command });
    } else {
      onSubmit({ command, reasonCode: reasonCode as RejectionReasonCode, reason: reason.trim() });
    }
  }

  return (
    <AdminModalPortal open onClose={onCancel}>
      <dialog ref={dialogRef} open className="dispute-decision-dialog payout-command-layer" aria-labelledby="payout-command-title" aria-modal="true" tabIndex={-1}>
        <form method="dialog" onSubmit={submit}>
          <div className="dialog-body min-h-0 flex-1 overflow-y-auto p-5">
            <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
            <h2 id="payout-command-title">{translateText(command === "approve" ? "Approve Payout" : "Reject Payout")}</h2>
            <p>{translateText(command === "approve" ? "Review the destination and balance before approving this Payout." : "Choose a reason for rejecting this Payout.")}</p>
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Payout")} ${detail.id} · ${detail.student.name}`}
              currentState={payoutStatusLabel(detail.status)}
              nextState={command === "approve" ? "Submitted to Provider" : "Cancelled"}
              effect={command === "approve"
                ? translateText("The Payout worker may start provider processing after approval.")
                : translateText("The full Payout Reserve returns to the Member's Earnings Balance. No provider transfer starts.")}
              reversibility={translateText("The Admin decision is final. Provider status changes are separate.")}
              warning={translateText("The API Server remains the authority for the final Payout result.")}
            />
            {command === "reject" ? (
              <>
                <label className="grid gap-1 text-[16px] leading-[1.4] font-semibold" htmlFor="payout-reason-code"><span>{translateText("Reason code")} <span aria-hidden="true">*</span></span>
                  <select className="w-full rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-lg leading-[1.45] text-admin-text" id="payout-reason-code" required value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} autoFocus>
                    <option value="">{translateText("Choose a reason")}</option>
                    {rejectionReasonCodes.map((item) => <option key={item.value} value={item.value}>{translateText(item.label)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-[16px] leading-[1.4] font-semibold" htmlFor="payout-reason"><span>{translateText("Reason")} <span aria-hidden="true">*</span></span>
                  <textarea id="payout-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} />
                </label>
              </>
            ) : null}
            {validationError || error ? <p className="field-error" role="alert">{translateText(validationError ?? error ?? "")}</p> : null}
          </div>
          <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
            <UiButton variant="outline" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</UiButton>
            <UiButton variant={command === "approve" ? "primary" : "danger"} type="submit" disabled={submitDisabled}>{pending ? translateText("Saving…") : translateText(command === "approve" ? "Approve Payout" : "Reject Payout")}</UiButton>
          </div>
        </form>
      </dialog>
    </AdminModalPortal>
  );
}
