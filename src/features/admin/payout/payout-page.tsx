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
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
import { adminBoardCount, adminBoardPagination, adminBoardTable, adminRecordFact, adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection, adminSortIndicator, adminTableSort } from "../../../components/admin/admin-record-styles";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Badge as UiBadge, Button as UiButton, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, Tabs, TabsList, TabsTrigger, type ButtonSize } from "../../../components/ui";
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
    <Card as="section" className={`${adminRecordSection}${className ? ` ${className}` : ""}`}>
      <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{title}</h3></CardHeader>
      {children}
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className={adminRecordFact}><span>{label}</span><strong>{children}</strong></div>;
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
      <UiButton size={size} variant="primary" type="button" onClick={() => onCommand("approve")}>{translateText("Approve Payout")}</UiButton>
      <UiButton size={size} variant="danger" type="button" onClick={() => onCommand("reject")}>{translateText("Reject Payout")}</UiButton>
    </>;
  }
  if (canReconcile) {
    return <UiButton size={size} variant="primary" type="button" onClick={onReconcile} disabled={reconcilePending}>
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
  const showDecisionContext = !canDecide && !canReconcile;
  const fullSectionClass = fullDetail ? "!p-[18px] border border-admin-border rounded-admin-md bg-admin-surface shadow-admin-card [&_h3]:mb-[14px]" : "";

  const payoutSummarySection = <Section title={translateText("Payout summary")} className={`payout-summary-section ${fullDetail ? "col-span-full" : ""} ${fullSectionClass}`}>
    <div className={`${adminRecordFacts} payout-detail-facts`}>
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

  const payoutAmountsSection = <Section title={translateText("Payout amounts")} className={`payout-amounts-section ${fullSectionClass}`}>
    <div className="payout-summary-grid">
      <div><span>{translateText("Principal")}</span><strong>{formatPayoutMoney(detail.amounts.principalSatang)}</strong></div>
      <div><span>{translateText("Recipient receipt")}</span><strong>{formatPayoutMoney(detail.amounts.receiptSatang)}</strong></div>
      <div><span>{translateText("Actual fee")}</span><strong>{formatPayoutMoney(detail.amounts.actualFeeSatang)}</strong></div>
      <div><span>{translateText("Actual tax")}</span><strong>{formatPayoutMoney(detail.amounts.actualTaxSatang)}</strong></div>
      <div><span>{translateText("Actual debit")}</span><strong>{formatPayoutMoney(detail.amounts.actualDebitSatang)}</strong></div>
    </div>
    <p className="audit-note">{translateText("Actual fee, tax, and debit values are read from the Payout record.")}</p>
  </Section>;

  const payoutDestinationSection = <Section title={translateText("Payout Destination")} className={`payout-destination-section ${fullSectionClass}`}>
    <div className={`${adminRecordFacts} payout-destination-facts`}>
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

  const payoutDecisionContextSection = showDecisionContext ? <Section title={translateText(detail.decisionContext.heading)} className={`payout-decision-context-section ${fullSectionClass}`}>
    <p>{translateText(detail.decisionContext.copy)}</p>
    <p className="audit-note">{translateText(detail.decisionContext.next)}</p>
  </Section> : null;

  const payoutHistorySection = <Section title={translateText("Payout history")} className={`payout-history-section ${fullSectionClass}`}>
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
    <Card as="section" className={`${adminRecordSection} payout-outcome payout-outcome-section ${fullSectionClass}`}>
      <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText(detail.status === "FAILED" ? "Transfer failure reason" : "Rejection reason")}</h3></CardHeader>
      <p>{translateText(payoutReasonLabel(outcomeReason))}</p>
    </Card>
  ) : null;

  const actionReceiptView = actionReceipt ? (
    <div className="col-span-full">
      <AdminActionReceipt
        action={actionReceipt.action}
        resource="Payout"
        resourceId={detail.id}
        status={actionReceipt.status}
        occurredAt={actionReceipt.occurredAt}
        mock
        details={actionReceipt.reason ? <p>{translateText("Reason")}: {actionReceipt.reason}</p> : undefined}
      />
    </div>
  ) : null;

  const payoutDecisionSection = canDecide || canReconcile ? (
    <Section title={translateText(renderDecisionActions ? "Admin decision" : "Decision context")} className={`payout-decision-section ${fullSectionClass}`}>
      <p>{canDecide
        ? translateText("Review the masked destination and API-provided amounts before deciding this Payout.")
        : translateText("The Payout needs a Provider status check before the next Admin action.")}</p>
      {renderDecisionActions ? <div className="payout-decision-actions mt-4 flex flex-wrap items-center gap-2">
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
    <div className={`payout-detail-stack drawer-content-flow grid !grid-cols-1 gap-[18px]${fullDetail ? " !grid-cols-[minmax(0,1.65fr)_minmax(290px,0.72fr)] max-[1000px]:!grid-cols-1" : ""}`}>
      {payoutSummarySection}
      {fullDetail ? <>
        <div className="payout-detail-column payout-detail-primary-column grid min-w-0 !grid-cols-1 gap-[18px] [grid-column:1] max-[1000px]:[grid-column:1]">
          {payoutAmountsSection}
          {payoutHistorySection}
          {payoutOutcomeSection}
        </div>
        <div className="payout-detail-column payout-detail-secondary-column grid min-w-0 !grid-cols-1 gap-[18px] [grid-column:2] max-[1000px]:[grid-column:1]">
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
      {showFullDetailLink ? <UiButton asChild variant="outline" className="payout-full-detail-link"><a href={payoutRoutes.detail(detail.id)}>{translateText("Full Payout detail")}</a></UiButton> : null}
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
            <UiButton variant="outline" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</UiButton>
            <UiButton variant={command === "approve" ? "primary" : "danger"} type="submit" disabled={submitDisabled}>{pending ? translateText("Saving…") : translateText(command === "approve" ? "Approve Payout" : "Reject Payout")}</UiButton>
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
    showFullDetailLink={false}
    fullDetail={presentation === "page"}
    actionReceipt={actionReceipt}
    renderDecisionActions
  />;

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
          actions={<UiButton asChild variant="outline"><a href={payoutRoutes.detail(detail.id)}>{translateText("Full Payout detail")}</a></UiButton>}
        >
          {content}
        </AdminDrawer>
        {command ? <PayoutCommandDialog detail={detail} command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page payout-detail-page max-w-[1080px]" tabIndex={-1}>
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
      <div className="min-w-0">{content}</div>
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
  const active = activeKey === sortKey;
  return <th aria-sort={active ? direction : "none"}><button className={adminTableSort(active)} type="button" onClick={() => onSort(sortKey)}>{label}<span className={adminSortIndicator(active)} aria-hidden="true">{active && direction === "ascending" ? "↑" : "↓"}</span></button></th>;
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
      <AdminPageHeader title={translateText("Payouts")} description={translateText("Review Payouts through the Admin approval queue.")} />
      <Card as="section" className="overflow-hidden payout-board" aria-label={translateText("Payout review board")}>
        <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
          <div><CardTitle>{translateText("Payouts")}</CardTitle><CardDescription>{translateText("Review Payouts through the Admin approval queue.")}</CardDescription></div>
          <span className={adminBoardCount}>{sortedRows.length} {translateText("shown")}</span>
        </CardHeader>
        <Tabs value={tab} onValueChange={(value) => chooseTab(value as PayoutBoardTab)}>
          <TabsList className="px-3" aria-label={translateText("Payout filters")}>
            {PAYOUT_BOARD_TABS.map((item) => <TabsTrigger key={item.id} value={item.id}>{translateText(item.label)}{item.id === "PENDING_ADMIN_APPROVAL" ? ` (${rows.filter((row) => row.status === item.id).length})` : item.id === "all" ? ` (${rows.length})` : ""}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2">
          <label className="admin-filter-label flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text" htmlFor="payout-search"><span className="visually-hidden">{translateText("Search Payouts")}</span><Input className="admin-filter-input h-9 min-h-9 px-3 py-1.5 text-sm" id="payout-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={translateText("Search Payouts…")} autoComplete="off" /></label>
          <span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span>
          <PageSizeControls value={pageSize} translateText={translateText} onChange={choosePageSize} />
          <span className="ml-auto text-sm text-admin-muted max-[600px]:hidden" aria-live="polite">{translateText("Showing")} {pageStart}–{pageEnd} {translateText("of")} {sortedRows.length} {translateText("results")}</span>
        </div>
        {!sortedRows.length ? <EmptyState title={translateText("No matching Payouts")} description={translateText("There are no Payouts in this view.")} action={<UiButton variant="outline" type="button" onClick={() => { setQuery(""); setTab("all"); }}>{translateText("Reset view")}</UiButton>} /> : <div className="overflow-x-auto" aria-label={translateText("Payouts table")}><Table className={adminBoardTable}><caption>{translateText("Payouts")}</caption><thead><tr><SortableHeader label={translateText("Payout")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Student")} sortKey="student" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Created At")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Principal")} sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="payout-row" data-payout-id={row.id} data-payout-drawer-trigger={row.id} key={row.id} tabIndex={0} aria-label={`${translateText("Open Payout")} ${row.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; void router.push(payoutRoutes.detail(row.id)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void router.push(payoutRoutes.detail(row.id)); } }}><td><Link className="row-record-button" data-payout-drawer-trigger={row.id} href={payoutRoutes.detail(row.id)} aria-label={`${translateText("Open Payout")} ${row.id}`}>{row.id}</Link></td><td><strong>{row.studentName}</strong><small>{row.studentEmail}</small></td><td>{formatPayoutDate(row.createdAt)}</td><td className="money">{formatPayoutMoney(row.principalSatang)}</td><td><Badge status={row.status} /></td></tr>)}</tbody></Table></div>}
        {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPage} ariaLabel={translateText("Payouts pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
      </Card>
    </main>
  );
}
