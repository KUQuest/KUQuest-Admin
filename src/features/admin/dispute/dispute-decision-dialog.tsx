"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button } from "../../../components/ui/button";
import { disputeCaseStatusLabel } from "../domain/rulebook";
import type { DisputeCaseDecisionChoice, DisputeCaseModel } from "./dispute-model";

const dialogFocusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDisputeModalFocus(
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  onCancel: () => void,
) {
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(dialogFocusableSelector)).filter((element) => element.getClientRects().length > 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      event.stopPropagation();
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const current = document.activeElement;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (current === dialog || current === first || !dialog.contains(current))) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (current === last || !dialog.contains(current))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleCancel = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onCancelRef.current();
    };

    dialog.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("cancel", handleCancel);
    (focusableElements()[0] ?? dialog).focus({ preventScroll: true });

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("cancel", handleCancel);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [dialogRef, open]);
}

export function DisputeDecisionDialog({
  open,
  choice,
  busy,
  error,
  model,
  translateText,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  choice: DisputeCaseDecisionChoice | null;
  busy: boolean;
  error: string | null;
  model: DisputeCaseModel;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [choice, open]);

  useDisputeModalFocus(dialogRef, open, onCancel);

  if (!open) return null;
  const title = choice === "resolve" ? translateText("Confirm Resolved") : translateText("Confirm Dismissed");
  const description = choice === "resolve"
    ? `${translateText("This will transfer the full remaining Dispute Case amount to the Worker Earnings Balance for")} ${model.id}.`
    : `${translateText("This will keep the full held amount with the Hirer and close the Dispute Case for")} ${model.id}.`;
  const nextState = choice === "resolve" ? "DISPUTE_CASE_RESOLVED" : "DISPUTE_CASE_DISMISSED";
  const effect = choice === "resolve"
    ? `${translateText("Transfer the full remaining amount from the Hirer side of the held Funding Reservation to")} ${model.workerName} ${translateText("Earnings Balance")} (${model.sharedCapLabel}).`
    : translateText("Keep the full held amount with the Hirer. No money moves and the Quest remains Failed.");
  const fullAmountUnavailable = choice === "resolve" && (!model.workerId || model.sharedCapSatang === null || model.sharedCapSatang <= 0);

  return (
    <AdminModalPortal open onClose={onCancel}>
      <dialog ref={dialogRef} open className="dispute-decision-dialog z-[60]" aria-modal="true" aria-labelledby="dispute-decision-title" tabIndex={-1}>
        <form method="dialog" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); if (value.length < 8 || fullAmountUnavailable) return; onConfirm(value); }}>
          <div className="dialog-body p-5">
            <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
            <h2 id="dispute-decision-title">{title}</h2>
            <p>{description}</p>
            {choice ? <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Dispute Case")} ${model.displayId} · ${translateText("Quest")} ${model.questId}`}
              currentState={model.statusLabel}
              nextState={disputeCaseStatusLabel(nextState)}
              effect={translateText(effect)}
              reversibility={translateText(choice === "resolve" ? "The first confirmed decision is final. The money movement cannot be reversed by another Dispute Case decision." : "The decision is retained as an immutable audit record.")}
              warning={translateText(choice === "resolve"
                ? model.sharedCapSatang === null
                  ? "The full remaining amount is not provided. Verify the Funding Reservation before resolving."
                  : "Resolve the Dispute Case with the full remaining amount. A partial amount cannot be entered."
                : "Dismiss the Dispute Case. The full held amount stays with the Hirer.")}
            /> : null}
            {choice === "resolve" && <div className="decision-amount-summary mt-4 flex items-baseline justify-between gap-3 rounded-lg border border-admin-border bg-admin-soft px-3 py-2.5"><span className="text-sm text-admin-muted">{translateText("Worker outcome")}</span><strong className="text-right text-base">{translateText("Full remaining amount")} · {model.sharedCapLabel}</strong></div>}
            <label htmlFor="dispute-decision-reason">{translateText("Reason for this decision")}</label>
            <textarea id="dispute-decision-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} aria-invalid={Boolean(error)} onChange={(event) => setReason(event.target.value)} placeholder={translateText("Enter the reason for the Dispute Case decision")} />
            <div className="mt-1.5 flex justify-between gap-3 text-[15px] leading-[1.4] text-admin-muted"><span>{translateText("Minimum 8 characters")}</span><span>{reason.length}/500</span></div>
            {error && <p className="field-error" role="alert">{translateText(error)}</p>}
          </div>
          <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5"><Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</Button><Button variant="danger" type="submit" disabled={busy || reason.trim().length < 8 || fullAmountUnavailable}>{busy ? translateText("Saving…") : translateText("Confirm decision")}</Button></div>
        </form>
      </dialog>
    </AdminModalPortal>
  );
}
