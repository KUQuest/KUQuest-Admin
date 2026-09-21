"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button as UiButton } from "../../../components/ui";
import { walletStatusLabel, type WalletStatus } from "../domain/rulebook";
import type { WalletBoardRow } from "./wallet-model";

export type WalletStatusTarget = Exclude<WalletStatus, "CLOSED">;
export type WalletStatusFixture = "success" | "error" | "stale-version";

const WALLET_STATUS_FIXTURE_OPTIONS: Array<{ value: WalletStatusFixture; label: string }> = [
  { value: "success", label: "Success" },
  { value: "error", label: "Command error" },
  { value: "stale-version", label: "Stale Wallet version" },
];

export function walletStatusTargets(status: WalletStatus): WalletStatusTarget[] {
  if (status === "CLOSED") return [];
  if (status === "ACTIVE") return ["FROZEN", "SUSPENDED"];
  if (status === "FROZEN") return ["SUSPENDED", "ACTIVE"];
  return ["FROZEN", "ACTIVE"];
}

export function walletStatusActionLabel(status: WalletStatusTarget): string {
  if (status === "ACTIVE") return "Restore Wallet to ACTIVE";
  if (status === "FROZEN") return "Freeze Wallet";
  return "Suspend Wallet";
}

export function walletStatusActionClass(status: WalletStatusTarget): string {
  if (status === "ACTIVE") return "primary";
  if (status === "SUSPENDED") return "danger";
  return "";
}

function walletStatusTransitionCopy(status: WalletStatusTarget): string[] {
  if (status === "ACTIVE") {
    return [
      "Student-initiated Wallet operations are permitted again.",
      "This does not change the Member Ban status.",
    ];
  }
  return [
    "New commitments are blocked, including Top-up, Payout, Earnings Conversion, and new Quest participation.",
    "Existing Escrow, Assignments, and in-progress Payouts continue under their own rules.",
    "This changes Wallet Status only. It does not create or remove a Member Ban.",
  ];
}

export function walletStatusFixtureError(fixture: WalletStatusFixture): string | null {
  if (fixture === "error") return "Mock Wallet status command failed. No status was changed.";
  if (fixture === "stale-version") return "Wallet status is stale. Refresh this Wallet before trying again. No status was changed.";
  return null;
}

export function WalletStatusCommandDialog({
  row,
  targetStatus,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  row: WalletBoardRow;
  targetStatus: WalletStatusTarget;
  onCancel: () => void;
  onSubmit: (reason: string, fixture: WalletStatusFixture) => void;
  error: string | null;
  pending: boolean;
}) {
  const { translateText } = useAdminShell();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [fixture, setFixture] = useState<WalletStatusFixture>("success");
  const [validationError, setValidationError] = useState<string | null>(null);
  const transitionCopy = walletStatusTransitionCopy(targetStatus);
  const actionLabel = walletStatusActionLabel(targetStatus);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [onCancel]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setValidationError("Enter a reason for this Wallet status change.");
      return;
    }
    setValidationError(null);
    onSubmit(trimmedReason, fixture);
  }

  return <AdminModalPortal open onClose={onCancel}><dialog ref={dialogRef} open className="dispute-decision-dialog wallet-status-command-dialog" aria-labelledby="wallet-status-command-title" aria-modal="true" tabIndex={-1}>
    <form method="dialog" className="wallet-status-command-form" onSubmit={submit}>
      <div className="dialog-body min-h-0 flex-1 overflow-y-auto p-5">
        <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
        <h2 id="wallet-status-command-title">{translateText(actionLabel)}</h2>
        <p>{translateText("Review the Wallet status change before saving. Every Wallet status change requires a reason.")}</p>
        <AdminActionSummary
          title={translateText("Before you confirm")}
          affected={`${translateText("Wallet")} ${row.id} · ${row.memberName}`}
          currentState={walletStatusLabel(row.status)}
          nextState={walletStatusLabel(targetStatus)}
          effect={translateText(transitionCopy.join(" "))}
          reversibility={translateText("This changes Wallet Status only. It does not create or remove a Member Ban. The status history is retained.")}
          warning={translateText("The API Server remains the authority for the final Wallet result.")}
        />
        <label htmlFor="wallet-status-reason">{translateText("Reason for this decision")}</label>
        <textarea id="wallet-status-reason" name="reason" rows={4} minLength={1} maxLength={500} required value={reason} aria-invalid={validationError ? "true" : undefined} aria-describedby={validationError ? "wallet-status-reason-error" : undefined} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} autoFocus />
        <div className="mt-1.5 flex justify-between gap-3 text-[15px] leading-[1.4] text-admin-muted"><span>{translateText("This reason is part of the Wallet status history. It does not change the Member Ban ladder.")}</span><span>{reason.length}/500</span></div>
        <label className="wallet-fixture-field" htmlFor="wallet-status-fixture">{translateText("Mock response fixture")} <span className="text-xs font-medium">{translateText("Development only")}</span>
          <select id="wallet-status-fixture" value={fixture} onChange={(event) => setFixture(event.target.value as WalletStatusFixture)}>
            {WALLET_STATUS_FIXTURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{translateText(option.label)}</option>)}
          </select>
        </label>
        {validationError || error ? <p id="wallet-status-reason-error" className="field-error" role="alert">{translateText(validationError ?? error ?? "")}</p> : null}
      </div>
      <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
        <UiButton variant="outline" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</UiButton>
        <UiButton variant={targetStatus === "ACTIVE" ? "primary" : "danger"} type="submit" disabled={pending}>{pending ? translateText("Saving…") : translateText(actionLabel)}</UiButton>
      </div>
    </form>
  </dialog></AdminModalPortal>;
}
