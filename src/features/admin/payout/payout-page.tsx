"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { ApiError } from "../../../lib/api/client";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminActionReceipt, AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminRecordHeader } from "../../../components/admin/admin-record-header";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Badge as UiBadge, Button as UiButton, Card, CardHeader, PageSizeControls, Pagination, Table, type ButtonSize } from "../../../components/ui";
import { payoutRoutes } from "../admin-routes";
import {
  adminApi,
  type PayoutRejection,
} from "../api/admin-api";
import { payoutStatusLabel, type PayoutStatus } from "../domain/rulebook";
import {
  formatPayoutDate,
  formatPayoutMoney,
  pagePayoutRows,
  PAYOUT_BOARD_TABS,
  payoutMatchesTab,
  payoutOutcomeReason,
  payoutPageCount,
  payoutStatusClass,
  searchPayoutRows,
  sortPayoutRows,
  type PayoutBoardPageSize,
  type PayoutBoardRow,
  type PayoutBoardTab,
  type PayoutDetailView,
  type PayoutSortDirection,
  type PayoutSortKey,
} from "./payout-model";
import type {
  PayoutBoardPageData,
  PayoutDataSource,
  PayoutDetailPageData,
} from "./payout-service";
import {
  applyMockPayoutDecision,
  applyMockPayoutOverride,
  applyMockPayoutOverrideToRow,
  PAYOUT_MOCK_UPDATED_EVENT,
  payoutMockOverrideFromDetail,
  readMockPayoutOverride,
  readMockPayoutOverrides,
  saveMockPayoutOverride,
} from "./payout-mock-state";

type PayoutPresentation = "page" | "drawer";
type PayoutCommand = "approve" | "reject";
type RejectionReasonCode = PayoutRejection["reasonCode"];
type PayoutCommandSubmission =
  | { command: "approve" }
  | { command: "reject"; reasonCode: RejectionReasonCode; reason: string };

const rejectionReasonCodes: Array<{ value: RejectionReasonCode; label: string }> = [
  { value: "PAYOUT_POLICY_REVIEW", label: "Policy review" },
  { value: "PAYOUT_RISK_REVIEW", label: "Risk review" },
  { value: "PAYOUT_INVALID_DESTINATION", label: "Invalid destination" },
];

function newIdempotencyKey(command: PayoutCommand, payoutId: string): string {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-${command}-payout-${payoutId}-${id}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return "Payout was not found.";
  return error instanceof Error ? error.message : "Payout command failed.";
}

function readableValue(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function payoutReasonLabel(value: string): string {
  return /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(value) ? readableValue(value) : value;
}

function Badge({ status }: { status: PayoutStatus }) {
  const { translateText } = useAdminShell();
  return <UiBadge tone="neutral" className={`badge ${payoutStatusClass(status)}`}>{translateText(payoutStatusLabel(status))}</UiBadge>;
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card as="section" className={`section${className ? ` ${className}` : ""}`}>
      <CardHeader flush><h3>{title}</h3></CardHeader>
      {children}
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact"><span>{label}</span><strong>{children}</strong></div>;
}

function PayoutDecisionActions({
  detail,
  onCommand,
  onReconcile,
  reconcilePending,
  showReconcileAction,
  size = "md",
}: {
  detail: PayoutDetailView;
  onCommand: (command: PayoutCommand) => void;
  onReconcile: () => void;
  reconcilePending: boolean;
  showReconcileAction: boolean;
  size?: ButtonSize;
}) {
  const { translateText } = useAdminShell();
  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = showReconcileAction
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);

  if (canDecide) {
    return <>
      <UiButton size={size} variant="primary" className="btn primary" type="button" onClick={() => onCommand("approve")}>{translateText("Approve Payout")}</UiButton>
      <UiButton size={size} variant="danger" className="btn danger" type="button" onClick={() => onCommand("reject")}>{translateText("Reject Payout")}</UiButton>
    </>;
  }
  if (canReconcile) {
    return <UiButton size={size} variant="primary" className="btn primary" type="button" onClick={onReconcile} disabled={reconcilePending}>
      {reconcilePending ? translateText("Reconciling…") : translateText("Reconcile with provider")}
    </UiButton>;
  }
  return null;
}

function PayoutStatusAlert({ detail }: { detail: PayoutDetailView }) {
  const { translateText } = useAdminShell();
  const needsApproval = detail.status === "PENDING_ADMIN_APPROVAL";
  const failed = detail.status === "FAILED";
  const tone = needsApproval ? "open" : failed ? "failed" : "closed";
  const title = needsApproval ? translateText("Payout approval is required") : translateText(detail.decisionContext.heading);
  const copy = needsApproval
    ? translateText("Review the masked destination and API-provided amounts before approving this Payout.")
    : translateText(detail.decisionContext.copy);

  return (
    <AdminStatusAlert
      as="output"
      tone={tone === "open" ? "warning" : tone === "failed" ? "danger" : "success"}
      title={title}
      description={copy}
      badge={translateText(payoutStatusLabel(detail.status))}
      badgeClassName={payoutStatusClass(detail.status)}
      className="dispute-page-alert payout-page-alert"
    />
  );
}

function PayoutDetailContent({
  detail,
  onCommand,
  onReconcile,
  reconcileError,
  reconcileNotice,
  reconcilePending,
  showReconcileAction,
  showFullDetailLink,
  fullDetail,
  actionReceipt,
  renderDecisionActions,
}: {
  detail: PayoutDetailView;
  onCommand: (command: PayoutCommand) => void;
  onReconcile: () => void;
  reconcileError: string | null;
  reconcileNotice: string | null;
  reconcilePending: boolean;
  showReconcileAction: boolean;
  showFullDetailLink: boolean;
  fullDetail: boolean;
  actionReceipt?: {
    action: string;
    status: string;
    reason: string | null;
    occurredAt: string;
  } | null;
  renderDecisionActions: boolean;
}) {
  const { translateText } = useAdminShell();
  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = showReconcileAction
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);
  const outcomeReason = payoutOutcomeReason(detail);
  const showDecisionContext = !fullDetail || detail.decisionContext.heading !== "Why your approval is needed";

  const payoutSummarySection = <Section title={translateText("Payout summary")} className="payout-summary-section">
    <div className="facts payout-detail-facts">
      <Fact label={translateText("Status")}><Badge status={detail.status} /></Fact>
      <Fact label={translateText("Payout record")}>{detail.id}</Fact>
      <Fact label={translateText("Student")}>{detail.student.name}</Fact>
      <Fact label={translateText("Student email")}>{detail.student.email}</Fact>
      <Fact label={translateText("Quote")}>{detail.quoteId}</Fact>
      <Fact label={translateText(fullDetail ? "Occurred at" : "Payout version")}>
        {fullDetail ? formatPayoutDate(detail.createdAt) : detail.version}
      </Fact>
    </div>
  </Section>;

  const payoutAmountsSection = <Section title={translateText("Payout amounts")} className="payout-amounts-section">
    <div className="payout-summary-grid">
      <div><span>{translateText("Principal")}</span><strong>{formatPayoutMoney(detail.amounts.principalSatang)}</strong></div>
      <div><span>{translateText("Recipient receipt")}</span><strong>{formatPayoutMoney(detail.amounts.receiptSatang)}</strong></div>
      <div><span>{translateText("Actual fee")}</span><strong>{formatPayoutMoney(detail.amounts.actualFeeSatang)}</strong></div>
      <div><span>{translateText("Actual tax")}</span><strong>{formatPayoutMoney(detail.amounts.actualTaxSatang)}</strong></div>
      <div><span>{translateText("Actual debit")}</span><strong>{formatPayoutMoney(detail.amounts.actualDebitSatang)}</strong></div>
    </div>
    <p className="audit-note">{translateText("Actual fee, tax, and debit values are read from the Payout record.")}</p>
  </Section>;

  const payoutDestinationSection = <Section title={translateText("Payout Destination")} className="payout-destination-section">
    <div className="facts">
      <Fact label={translateText("Bank")}>{detail.destination.bankName}</Fact>
      <Fact label={translateText("Bank code")}>{detail.destination.bankCode}</Fact>
      <Fact label={translateText("Destination type")}>{translateText(readableValue(detail.destination.type))}</Fact>
      <Fact label={translateText("Destination")}>{detail.destination.maskedValue}</Fact>
      <Fact label={translateText("Routing")}>{detail.destination.maskedRoutingValue}</Fact>
    </div>
    <p className="audit-note">{translateText("Destination data is masked. Raw destination, encrypted payload, and Provider payload are not available to the Admin client.")}</p>
  </Section>;

  const payoutTimingSection = !fullDetail ? <Section title={translateText("Payout timing")} className="payout-timing-section">
    <div className="payout-audit-list">
      {detail.history.length ? detail.history.map((entry) => (
        <div className="payout-audit-event" key={entry.id}>
          <div><span>{translateText("Status")}</span><strong>{translateText(payoutStatusLabel(entry.toStatus))}</strong></div>
          <div><span>{translateText("Occurred at")}</span><strong>{formatPayoutDate(entry.occurredAt)}</strong></div>
          {entry.fromStatus ? <div><span>{translateText("Previous status")}</span><strong>{translateText(payoutStatusLabel(entry.fromStatus))}</strong></div> : null}
          {entry.reason ? <div><span>{translateText("Reason")}</span><strong>{translateText(payoutReasonLabel(entry.reason))}</strong></div> : null}
          {entry.actorAdminId ? <div><span>{translateText("Admin")}</span><strong>{entry.actorAdminId}</strong></div> : null}
        </div>
      )) : <p className="audit-note">{translateText("No Payout history is available.")}</p>}
    </div>
  </Section> : null;

  const payoutDecisionContextSection = showDecisionContext ? <Section title={translateText(detail.decisionContext.heading)} className="payout-decision-context-section">
    <p>{translateText(detail.decisionContext.copy)}</p>
    <p className="audit-note">{translateText(detail.decisionContext.next)}</p>
  </Section> : null;

  const payoutHistorySection = <Section title={translateText("Payout history")} className="payout-history-section">
    {detail.previousPayouts.length ? <div className="payout-previous-list">
      {detail.previousPayouts.map((payout) => (
        <div className="payout-previous-row" key={payout.id}>
          <span><strong>{payout.id}</strong><small>{formatPayoutDate(payout.createdAt)}</small></span>
          <span><strong>{formatPayoutMoney(payout.principalSatang)}</strong><Badge status={payout.status} /></span>
        </div>
      ))}
    </div> : <p className="audit-note">{translateText("No previous Payouts are connected to this Student.")}</p>}
  </Section>;

  const payoutOutcomeSection = outcomeReason && (detail.status === "CANCELLED" || detail.status === "FAILED") ? (
    <Card as="section" className="section payout-outcome payout-outcome-section">
      <CardHeader flush><h3>{translateText(detail.status === "FAILED" ? "Transfer failure reason" : "Rejection reason")}</h3></CardHeader>
      <p>{translateText(payoutReasonLabel(outcomeReason))}</p>
    </Card>
  ) : null;

  const actionReceiptView = actionReceipt ? (
    <AdminActionReceipt
      action={actionReceipt.action}
      resource="Payout"
      resourceId={detail.id}
      status={actionReceipt.status}
      occurredAt={actionReceipt.occurredAt}
      mock
      details={actionReceipt.reason ? <p>{translateText("Reason")}: {actionReceipt.reason}</p> : undefined}
    />
  ) : null;

  const payoutDecisionSection = canDecide || canReconcile ? (
    <Section title={translateText(renderDecisionActions ? "Admin decision" : "Decision context")} className="payout-decision-section">
      <p>{canDecide
        ? translateText("Review the masked destination and API-provided amounts before deciding this Payout.")
        : translateText("The Payout needs a Provider status check before the next Admin action.")}</p>
      {renderDecisionActions ? <div className="payout-detail-actions">
        <PayoutDecisionActions
          detail={detail}
          onCommand={onCommand}
          onReconcile={onReconcile}
          reconcilePending={reconcilePending}
          showReconcileAction={showReconcileAction}
          size="lg"
        />
      </div> : null}
      {renderDecisionActions && reconcileError ? <p className="field-error" role="alert">{translateText(reconcileError)}</p> : null}
      {renderDecisionActions && reconcileNotice ? <output>{translateText(reconcileNotice)}</output> : null}
    </Section>
  ) : null;

  return (
    <div className={`payout-detail-stack${fullDetail ? " payout-detail-full-stack" : ""}`}>
      {payoutSummarySection}
      {fullDetail ? <>
        <div className="payout-detail-column payout-detail-primary-column">
          {payoutAmountsSection}
          {payoutHistorySection}
          {payoutOutcomeSection}
        </div>
        <div className="payout-detail-column payout-detail-secondary-column">
          {payoutDestinationSection}
          {payoutDecisionContextSection}
          {payoutDecisionSection}
        </div>
        {actionReceiptView}
      </> : <>
        {payoutAmountsSection}
        {payoutDestinationSection}
        {payoutTimingSection}
        {payoutDecisionContextSection}
        {payoutHistorySection}
        {payoutOutcomeSection}
        {actionReceiptView}
        {payoutDecisionSection}
      </>}
      {showFullDetailLink ? <a className="btn payout-full-detail-link" href={payoutRoutes.detail(detail.id)}>{translateText("Full Payout detail")}</a> : null}
    </div>
  );
}

function PayoutCommandDialog({
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

    const focusableSelector = 'button:not([disabled]), select:not([disabled]), textarea:not([disabled])';
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
      <div className="command payout-command-layer" role="presentation">
      <button className="command-backdrop" type="button" aria-label={translateText("Close Payout command dialog")} onClick={onCancel} />
      <dialog ref={dialogRef} open className="command-box" aria-labelledby="payout-command-title" aria-modal="true">
        <form className="dialog-body" onSubmit={submit}>
          <h2 id="payout-command-title">{translateText(command === "approve" ? "Approve Payout" : "Reject Payout")}</h2>
          <p>{translateText(command === "approve" ? "Review the destination and balance before approving this Payout." : "Choose a reason for rejecting this Payout.")}</p>
          <AdminActionSummary
            title={translateText(command === "approve" ? "Approval effect" : "Rejection effect")}
            affected={`${translateText("Payout")} ${detail.id} · ${detail.student.name}`}
            currentState={payoutStatusLabel(detail.status)}
            nextState={command === "approve" ? "Submitted to Provider" : "Cancelled"}
            effect={command === "approve"
              ? translateText("The Payout worker may start provider processing after approval.")
              : translateText("The full Payout Reserve returns to the Member's Earnings Balance. No provider transfer starts.")}
            reversibility={translateText("The Admin decision is final. Provider status changes are separate.")}
          />
          {command === "reject" ? (
            <>
              <label htmlFor="payout-reason-code">{translateText("Reason code")} <span aria-hidden="true">*</span>
                <select id="payout-reason-code" required value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} autoFocus>
                  <option value="">{translateText("Choose a reason")}</option>
                  {rejectionReasonCodes.map((item) => <option key={item.value} value={item.value}>{translateText(item.label)}</option>)}
                </select>
              </label>
              <label htmlFor="payout-reason">{translateText("Reason")} <span aria-hidden="true">*</span>
                <textarea id="payout-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} />
              </label>
            </>
          ) : null}
          {validationError || error ? <p className="field-error" role="alert">{translateText(validationError ?? error ?? "")}</p> : null}
          <div className="dialog-actions">
            <button className="btn" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</button>
            <button className={`btn ${command === "approve" ? "primary" : "danger"}`} type="submit" disabled={submitDisabled}>{pending ? translateText("Saving…") : translateText(command === "approve" ? "Approve Payout" : "Reject Payout")}</button>
          </div>
        </form>
      </dialog>
      </div>
    </AdminModalPortal>
  );
}

export function AdminPayoutDetailPage({
  data,
  dataSource,
  presentation = "page",
}: {
  data: PayoutDetailPageData;
  dataSource: PayoutDataSource;
  presentation?: PayoutPresentation;
}) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const [detail, setDetail] = useState(data.detail);
  const [command, setCommand] = useState<PayoutCommand | null>(null);
  const [commandIdempotencyKey, setCommandIdempotencyKey] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [actionReceipt, setActionReceipt] = useState<{
    action: string;
    status: string;
    reason: string | null;
    occurredAt: string;
  } | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const [reconcilePending, setReconcilePending] = useState(false);

  const closeDrawer = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const persistedDetail = dataSource === "mock" && typeof window !== "undefined"
      ? applyMockPayoutOverride(data.detail, readMockPayoutOverride(window.localStorage, data.detail.id))
      : data.detail;
    setDetail(persistedDetail);
    setCommand(null);
    setCommandIdempotencyKey(null);
    setCommandError(null);
    setActionReceipt(null);
    setReconcileError(null);
    setReconcileNotice(null);
    setReconcilePending(false);
  }, [data, dataSource]);

  async function submitCommand(submission: PayoutCommandSubmission) {
    setCommandError(null);
    setCommandPending(true);
    const options = {
      idempotencyKey: commandIdempotencyKey ?? newIdempotencyKey(submission.command, detail.id),
      expectedVersion: detail.version,
    };
    try {
      if (dataSource === "api") {
        if (submission.command === "approve") {
          await adminApi.approvePayout(detail.id, {
            ...options,
          });
        } else {
          await adminApi.rejectPayout(detail.id, {
            ...options,
            reasonCode: submission.reasonCode,
            reason: submission.reason,
          });
        }
      } else {
        const decisionReason = submission.command === "reject" ? submission.reason : null;
        const decisionReasonCode = submission.command === "reject" ? submission.reasonCode : null;
        const occurredAt = new Date().toISOString();
        const nextDetail = applyMockPayoutDecision(detail, submission.command, decisionReason, occurredAt, decisionReasonCode);
        setDetail(nextDetail);
        if (typeof window !== "undefined") {
          saveMockPayoutOverride(window.localStorage, { id: nextDetail.id, ...payoutMockOverrideFromDetail(nextDetail) });
          window.dispatchEvent(new CustomEvent(PAYOUT_MOCK_UPDATED_EVENT, { detail: nextDetail }));
        }
        setActionReceipt({
          action: submission.command === "approve" ? "Approve Payout" : "Reject Payout",
          status: payoutStatusLabel(nextDetail.status),
          reason: decisionReason,
          occurredAt,
        });
      }
      setCommand(null);
      setCommandIdempotencyKey(null);
      if (presentation === "drawer" && dataSource === "api") {
        closeDrawer();
        window.setTimeout(() => router.refresh(), 0);
      }
      else if (dataSource === "api") router.refresh();
    } catch (error) {
      setCommandError(errorMessage(error));
    } finally {
      setCommandPending(false);
    }
  }

  async function reconcilePayout() {
    setReconcileError(null);
    setReconcileNotice(null);
    setReconcilePending(true);
    try {
      if (dataSource === "api") {
        await adminApi.reconcilePayout(detail.id);
        router.refresh();
      }
      setReconcileNotice(`${translateText("Payout")} ${detail.id} ${translateText("was reconciled with the Provider.")}`);
    } catch (error) {
      setReconcileError(errorMessage(error));
    } finally {
      setReconcilePending(false);
    }
  }

  const content = <PayoutDetailContent
    detail={detail}
    onCommand={(nextCommand) => { setCommandError(null); setCommandIdempotencyKey(newIdempotencyKey(nextCommand, detail.id)); setCommand(nextCommand); }}
    onReconcile={() => { void reconcilePayout(); }}
    reconcileError={reconcileError}
    reconcileNotice={reconcileNotice}
    reconcilePending={reconcilePending}
    showReconcileAction={dataSource === "api"}
    showFullDetailLink={presentation === "drawer"}
    fullDetail={presentation === "page"}
    actionReceipt={actionReceipt}
    renderDecisionActions={presentation !== "drawer"}
  />;

  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = dataSource === "api"
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);
  const drawerDecisionActions = presentation === "drawer" && (canDecide || canReconcile) ? <>
    <span className="payout-drawer-action-label">
      <strong>{translateText(canDecide ? "Admin decision" : "Provider status check")}</strong>
      <small>{translateText(canDecide ? "Review this Payout before choosing an outcome." : "Check the Provider status before the next Admin action.")}</small>
    </span>
    <PayoutDecisionActions
      detail={detail}
      onCommand={(nextCommand) => { setCommandError(null); setCommandIdempotencyKey(newIdempotencyKey(nextCommand, detail.id)); setCommand(nextCommand); }}
      onReconcile={() => { void reconcilePayout(); }}
      reconcilePending={reconcilePending}
      showReconcileAction={dataSource === "api"}
    />
    {reconcileError ? <p className="payout-drawer-action-feedback field-error" role="alert">{translateText(reconcileError)}</p> : null}
    {reconcileNotice ? <output className="payout-drawer-action-feedback">{translateText(reconcileNotice)}</output> : null}
  </> : undefined;

  if (presentation === "drawer") {
    return (
      <>
        <AdminDrawer
          ariaLabel={translateText("Close Payout detail")}
          title={detail.id}
          titleId="payout-drawer-title"
          subtitle={translateText("Payout detail drawer")}
          className="payout-drawer"
          openerAttribute="data-payout-drawer-trigger"
          openerValue={detail.id}
          outsideClassName="payout-command-layer"
          escapeDisabled={command !== null}
          onClose={closeDrawer}
          actions={drawerDecisionActions}
        >
          {content}
        </AdminDrawer>
        {command ? <PayoutCommandDialog detail={detail} command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page payout-detail-page" tabIndex={-1}>
      <AdminRecordHeader
        breadcrumbHref={payoutRoutes.list()}
        breadcrumbLabel={translateText("Payouts")}
        recordId={detail.id}
        title={detail.id}
        subtitle={`${translateText("Payout for")} ${detail.student.name} · ${translateText("created")} ${formatPayoutDate(detail.createdAt)}`}
        actions={<UiButton asChild size="lg" variant="outline"><Link href={payoutRoutes.list()}>{translateText("Back to Payouts")}</Link></UiButton>}
      />
      <PayoutStatusAlert detail={detail} />
      <RecordStatusBar className="payout-record-status-bar" items={[{ id: "status", label: translateText("Status"), value: <Badge status={detail.status} /> }, { id: "student", label: translateText("Student"), value: detail.student.name }, { id: "principal", label: translateText("Principal"), value: formatPayoutMoney(detail.amounts.principalSatang) }, { id: "created", label: translateText("Created"), value: formatPayoutDate(detail.createdAt) }, { id: "destination-type", label: translateText("Destination type"), value: translateText(readableValue(detail.destination.type)) }]} />
      <div className="payout-detail-grid">{content}</div>
      {command ? <PayoutCommandDialog detail={detail} command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
    </main>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: PayoutSortKey;
  activeKey: PayoutSortKey;
  direction: PayoutSortDirection;
  onSort: (key: PayoutSortKey) => void;
}) {
  return <th aria-sort={activeKey === sortKey ? direction : "none"}><button className={`table-sort${activeKey === sortKey ? " is-active" : ""}`} type="button" onClick={() => onSort(sortKey)}>{label}<span className="sort-indicator" aria-hidden="true">{activeKey === sortKey && direction === "ascending" ? "↑" : "↓"}</span></button></th>;
}

export function AdminPayoutPage({
  initialData,
  dataSource = "mock",
}: {
  initialData: PayoutBoardPageData;
  dataSource?: PayoutDataSource;
}) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const mockAllRows = initialData.allRows;
  const initialRows = mockAllRows ?? initialData.rows;
  const [rows, setRows] = useState<PayoutBoardRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PayoutBoardTab>("PENDING_ADMIN_APPROVAL");
  const [pageSize, setPageSize] = useState<PayoutBoardPageSize>(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<PayoutSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<PayoutSortDirection>("descending");

  useEffect(() => {
    const nextRows = initialData.allRows ?? initialData.rows;
    if (dataSource !== "mock" || typeof window === "undefined") {
      setRows(nextRows);
      return;
    }
    const overrides = readMockPayoutOverrides(window.localStorage);
    setRows(nextRows.map((row) => applyMockPayoutOverrideToRow(row, overrides[row.id] ?? null)));
  }, [dataSource, initialData]);

  useEffect(() => {
    if (dataSource !== "mock") return;
    const updateRow = (event: Event) => {
      const nextDetail = (event as CustomEvent<PayoutDetailView>).detail;
      if (!nextDetail?.id) return;
      setRows((current) => current.map((row) => (
        row.id === nextDetail.id
          ? applyMockPayoutOverrideToRow(row, payoutMockOverrideFromDetail(nextDetail))
          : row
      )));
    };
    window.addEventListener(PAYOUT_MOCK_UPDATED_EVENT, updateRow);
    return () => window.removeEventListener(PAYOUT_MOCK_UPDATED_EVENT, updateRow);
  }, [dataSource]);

  const filteredRows = searchPayoutRows(rows, query).filter((row) => payoutMatchesTab(row, tab));
  const sortedRows = sortPayoutRows(filteredRows, sortKey, sortDirection);
  const totalPages = payoutPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visibleRows = pagePayoutRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  function chooseTab(nextTab: PayoutBoardTab) {
    setTab(nextTab);
    setPage(1);
  }
  function choosePageSize(nextSize: PayoutBoardPageSize) { setPageSize(nextSize); setPage(1); }
  function sortBy(nextKey: PayoutSortKey) {
    setPage(1);
    if (sortKey === nextKey) setSortDirection((direction) => direction === "ascending" ? "descending" : "ascending");
    else { setSortKey(nextKey); setSortDirection("ascending"); }
  }

  return (
    <main className="admin-route-page payout-route-page" tabIndex={-1}>
      <div className="page-head"><div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Payouts")}</h1><p>{translateText("Review Payouts through the Admin approval queue.")}</p></div></div>
      <Card as="section" className="panel payout-board" aria-label={translateText("Payout review board")}>
        <div className="tabs" aria-label={translateText("Payout filters")}>
          {PAYOUT_BOARD_TABS.map((item) => <button className={`tab${tab === item.id ? " active" : ""}`} type="button" aria-pressed={tab === item.id} key={item.id} onClick={() => chooseTab(item.id)}>{translateText(item.label)}{item.id === "PENDING_ADMIN_APPROVAL" ? ` (${rows.filter((row) => row.status === item.id).length})` : item.id === "all" ? ` (${rows.length})` : ""}</button>)}
        </div>
        <div className="toolbar resource-toolbar">
          <label className="inline-search search-field" htmlFor="payout-search"><span className="visually-hidden">{translateText("Search Payouts")}</span><input id="payout-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={translateText("Search Payouts…")} autoComplete="off" /></label>
          <span className="sort-help">{translateText("Click a column to sort")}</span>
          <PageSizeControls value={pageSize} translateText={translateText} onChange={choosePageSize} />
          <span className="count" aria-live="polite">{translateText("Showing")} {pageStart}–{pageEnd} {translateText("of")} {sortedRows.length} {translateText("results")}</span>
        </div>
        {!sortedRows.length ? <div className="empty"><h2>{translateText("No matching Payouts")}</h2><p>{translateText("There are no Payouts in this view.")}</p><button className="btn" type="button" onClick={() => { setQuery(""); setTab("all"); }}>{translateText("Reset view")}</button></div> : <div className="table-wrap" aria-label={translateText("Payouts table")}><Table className="data"><caption>{translateText("Payouts")}</caption><thead><tr><SortableHeader label={translateText("Payout")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Student")} sortKey="student" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Created At")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Principal")} sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="payout-row" data-payout-id={row.id} data-payout-drawer-trigger={row.id} key={row.id} tabIndex={0} aria-label={`${translateText("Open Payout")} ${row.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; void router.push(payoutRoutes.detail(row.id)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void router.push(payoutRoutes.detail(row.id)); } }}><td><Link className="row-record-button" data-payout-drawer-trigger={row.id} href={payoutRoutes.detail(row.id)} aria-label={`${translateText("Open Payout")} ${row.id}`}>{row.id}</Link></td><td><strong>{row.studentName}</strong><small>{row.studentEmail}</small></td><td>{formatPayoutDate(row.createdAt)}</td><td className="money">{formatPayoutMoney(row.principalSatang)}</td><td><Badge status={row.status} /></td></tr>)}</tbody></Table></div>}
        {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPage} ariaLabel={translateText("Payouts pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className="table-pagination" /> : null}
      </Card>
    </main>
  );
}
