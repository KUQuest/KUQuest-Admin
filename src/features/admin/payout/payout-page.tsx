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
  | { command: "reject"; reasonCode: RejectionReasonCode };

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

function Badge({ status }: { status: PayoutStatus }) {
  return <span className={`badge ${payoutStatusClass(status)}`}>{payoutStatusLabel(status)}</span>;
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`section${className ? ` ${className}` : ""}`}>
      <h3>{title}</h3>
      {children}
    </section>
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
}: {
  detail: PayoutDetailView;
  onCommand: (command: PayoutCommand) => void;
  onReconcile: () => void;
  reconcilePending: boolean;
  showReconcileAction: boolean;
}) {
  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = showReconcileAction
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);

  if (canDecide) {
    return <>
      <button className="btn primary" type="button" onClick={() => onCommand("approve")}>Approve Payout</button>
      <button className="btn danger" type="button" onClick={() => onCommand("reject")}>Reject Payout</button>
    </>;
  }
  if (canReconcile) {
    return <button className="btn primary" type="button" onClick={onReconcile} disabled={reconcilePending}>
      {reconcilePending ? "Reconciling…" : "Reconcile with provider"}
    </button>;
  }
  return null;
}

function PayoutStatusAlert({ detail }: { detail: PayoutDetailView }) {
  const needsApproval = detail.status === "PENDING_ADMIN_APPROVAL";
  const failed = detail.status === "FAILED";
  const tone = needsApproval ? "open" : failed ? "failed" : "closed";
  const title = needsApproval ? "Payout approval is required" : detail.decisionContext.heading;
  const copy = needsApproval
    ? "Review the masked destination and API-provided amounts before approving this Payout."
    : detail.decisionContext.copy;

  return (
    <output className={`dispute-page-alert payout-page-alert ${tone}`}>
      <span aria-hidden="true">⚑</span>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
      <span className={`badge ${payoutStatusClass(detail.status)}`}>
        {payoutStatusLabel(detail.status)}
      </span>
    </output>
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
  actionReceipt?: {
    action: string;
    status: string;
    reason: string | null;
    occurredAt: string;
  } | null;
  renderDecisionActions: boolean;
}) {
  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = showReconcileAction
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);
  const outcomeReason = payoutOutcomeReason(detail);

  return (
    <div className="payout-detail-stack">
      <Section title="Payout summary" className="payout-summary-section">
        <div className="facts payout-detail-facts">
          <Fact label="Status"><Badge status={detail.status} /></Fact>
          <Fact label="Payout record">{detail.id}</Fact>
          <Fact label="Student">{detail.student.name}</Fact>
          <Fact label="Student email">{detail.student.email}</Fact>
          <Fact label="Quote">{detail.quoteId}</Fact>
          <Fact label="Payout version">{detail.version}</Fact>
        </div>
      </Section>

      <Section title="Payout amounts" className="payout-amounts-section">
        <div className="payout-summary-grid">
          <div><span>Principal</span><strong>{formatPayoutMoney(detail.amounts.principalSatang)}</strong></div>
          <div><span>Recipient receipt</span><strong>{formatPayoutMoney(detail.amounts.receiptSatang)}</strong></div>
          <div><span>Maximum fee</span><strong>{formatPayoutMoney(detail.amounts.maximumFeeSatang)}</strong></div>
          <div><span>Maximum tax</span><strong>{formatPayoutMoney(detail.amounts.maximumTaxSatang)}</strong></div>
          <div><span>Maximum debit</span><strong>{formatPayoutMoney(detail.amounts.maximumDebitSatang)}</strong></div>
          <div><span>Actual fee</span><strong>{formatPayoutMoney(detail.amounts.actualFeeSatang)}</strong></div>
          <div><span>Actual tax</span><strong>{formatPayoutMoney(detail.amounts.actualTaxSatang)}</strong></div>
          <div><span>Actual debit</span><strong>{formatPayoutMoney(detail.amounts.actualDebitSatang)}</strong></div>
        </div>
        <p className="audit-note">Amounts come from the Payout API. The Admin client does not calculate fees, tax, or debit values.</p>
      </Section>

      <Section title="Payout Destination" className="payout-destination-section">
        <div className="facts">
          <Fact label="Bank">{detail.destination.bankName}</Fact>
          <Fact label="Bank code">{detail.destination.bankCode}</Fact>
          <Fact label="Destination type">{readableValue(detail.destination.type)}</Fact>
          <Fact label="Destination">{detail.destination.maskedValue}</Fact>
          <Fact label="Routing">{detail.destination.maskedRoutingValue}</Fact>
        </div>
        <p className="audit-note">Destination data is masked. Raw destination, encrypted payload, and Provider payload are not available to the Admin client.</p>
      </Section>

      <Section title="Payout timing" className="payout-timing-section">
        <div className="payout-audit-list">
          {detail.history.length ? detail.history.map((entry) => (
            <div className="payout-audit-event" key={entry.id}>
              <div><span>Status</span><strong>{payoutStatusLabel(entry.toStatus)}</strong></div>
              <div><span>Occurred at</span><strong>{formatPayoutDate(entry.occurredAt)}</strong></div>
              {entry.fromStatus ? <div><span>Previous status</span><strong>{payoutStatusLabel(entry.fromStatus)}</strong></div> : null}
              {entry.reason ? <div><span>Reason code</span><strong>{readableValue(entry.reason)}</strong></div> : null}
              {entry.actorAdminId ? <div><span>Admin</span><strong>{entry.actorAdminId}</strong></div> : null}
            </div>
          )) : <p className="audit-note">No Payout history was returned by the Admin API.</p>}
        </div>
      </Section>

      <Section title={detail.decisionContext.heading} className="payout-decision-context-section">
        <p>{detail.decisionContext.copy}</p>
        <p className="audit-note">{detail.decisionContext.next}</p>
      </Section>

      <Section title="Payout history" className="payout-history-section">
        {detail.previousPayouts.length ? <div className="payout-previous-list">
          {detail.previousPayouts.map((payout) => (
            <div className="payout-previous-row" key={payout.id}>
              <span><strong>{payout.id}</strong><small>{formatPayoutDate(payout.createdAt)}</small></span>
              <span><strong>{formatPayoutMoney(payout.principalSatang)}</strong><Badge status={payout.status} /></span>
            </div>
          ))}
        </div> : <p className="audit-note">No previous Payouts are connected to this Student.</p>}
      </Section>

      {outcomeReason && (detail.status === "CANCELLED" || detail.status === "FAILED") ? (
        <section className="section payout-outcome payout-outcome-section">
          <h3>{detail.status === "FAILED" ? "Transfer failure reason" : "Rejection reason"}</h3>
          <p>{readableValue(outcomeReason)}</p>
        </section>
      ) : null}

      {actionReceipt ? (
        <AdminActionReceipt
          action={actionReceipt.action}
          resource="Payout"
          resourceId={detail.id}
          status={actionReceipt.status}
          occurredAt={actionReceipt.occurredAt}
          mock
          details={actionReceipt.reason ? <p>Reason: {readableValue(actionReceipt.reason)}</p> : undefined}
        />
      ) : null}

      {canDecide || canReconcile ? (
        <Section title={renderDecisionActions ? "Admin decision" : "Decision context"} className="payout-decision-section">
          <p>{canDecide
            ? "Review the masked destination and API-provided amounts before deciding this Payout."
            : "The Payout needs a Provider status check before the next Admin action."}</p>
          {renderDecisionActions ? <div className="payout-detail-actions">
            <PayoutDecisionActions
              detail={detail}
              onCommand={onCommand}
              onReconcile={onReconcile}
              reconcilePending={reconcilePending}
              showReconcileAction={showReconcileAction}
            />
          </div> : null}
          {renderDecisionActions && reconcileError ? <p className="field-error" role="alert">{reconcileError}</p> : null}
          {renderDecisionActions && reconcileNotice ? <output>{reconcileNotice}</output> : null}
        </Section>
      ) : null}

      {showFullDetailLink ? <a className="btn payout-full-detail-link" href={payoutRoutes.detail(detail.id)}>Full Payout detail</a> : null}
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const submitDisabled = pending || command === "reject" && !reasonCode;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();

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
    setValidationError(null);
    if (command === "approve") {
      onSubmit({ command });
    } else {
      onSubmit({ command, reasonCode: reasonCode as RejectionReasonCode });
    }
  }

  return (
    <div className="command payout-command-layer" role="presentation">
      <button className="command-backdrop" type="button" aria-label="Close Payout command dialog" onClick={onCancel} />
      <dialog ref={dialogRef} className="command-box" aria-labelledby="payout-command-title" aria-modal="true">
        <form className="dialog-body" onSubmit={submit}>
          <h2 id="payout-command-title">{command === "approve" ? "Approve Payout" : "Reject Payout"}</h2>
          <p>{command === "approve" ? "Review the destination and balance before approving this Payout." : "Choose a reason for rejecting this Payout."}</p>
          <AdminActionSummary
            title={command === "approve" ? "Approval effect" : "Rejection effect"}
            affected={`Payout ${detail.id} · ${detail.student.name}`}
            currentState={payoutStatusLabel(detail.status)}
            nextState={command === "approve" ? "Submitted to Provider" : "Cancelled"}
            effect={command === "approve"
              ? "The Payout worker may start provider processing after approval."
              : "The full Payout Reserve returns to the Member's Earnings Balance. No provider transfer starts."}
            reversibility="The Admin decision is final. Provider status changes are separate."
          />
          {command === "reject" ? (
            <label htmlFor="payout-reason-code">Reason code <span aria-hidden="true">*</span>
              <select id="payout-reason-code" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} autoFocus>
                <option value="">Choose a reason</option>
                {rejectionReasonCodes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          ) : null}
          {validationError || error ? <p className="field-error" role="alert">{validationError ?? error}</p> : null}
          <div className="dialog-actions">
            <button className="btn" type="button" onClick={onCancel} disabled={pending}>Cancel</button>
            <button className={`btn ${command === "approve" ? "primary" : "danger"}`} type="submit" disabled={submitDisabled}>{pending ? "Saving…" : command === "approve" ? "Approve Payout" : "Reject Payout"}</button>
          </div>
        </form>
      </dialog>
    </div>
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
          });
        }
      } else {
        const decisionReason = submission.command === "reject" ? submission.reasonCode : null;
        const occurredAt = new Date().toISOString();
        const nextDetail = applyMockPayoutDecision(detail, submission.command, decisionReason, occurredAt);
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
      setReconcileNotice(`Payout ${detail.id} was reconciled with the Provider.`);
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
    actionReceipt={actionReceipt}
    renderDecisionActions={presentation !== "drawer"}
  />;

  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = dataSource === "api"
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);
  const drawerDecisionActions = presentation === "drawer" && (canDecide || canReconcile) ? <>
    <span className="payout-drawer-action-label">
      <strong>{canDecide ? "Admin decision" : "Provider status check"}</strong>
      <small>{canDecide ? "Review this Payout before choosing an outcome." : "Check the Provider status before the next Admin action."}</small>
    </span>
    <PayoutDecisionActions
      detail={detail}
      onCommand={(nextCommand) => { setCommandError(null); setCommandIdempotencyKey(newIdempotencyKey(nextCommand, detail.id)); setCommand(nextCommand); }}
      onReconcile={() => { void reconcilePayout(); }}
      reconcilePending={reconcilePending}
      showReconcileAction={dataSource === "api"}
    />
    {reconcileError ? <p className="payout-drawer-action-feedback field-error" role="alert">{reconcileError}</p> : null}
    {reconcileNotice ? <output className="payout-drawer-action-feedback">{reconcileNotice}</output> : null}
  </> : undefined;

  if (presentation === "drawer") {
    return (
      <>
        <AdminDrawer
          ariaLabel="Close Payout detail"
          title={detail.id}
          titleId="payout-drawer-title"
          subtitle="Payout detail drawer"
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
      <div className="record-breadcrumb"><Link href={payoutRoutes.list()}>Payouts</Link><span aria-hidden="true">›</span><span>{detail.id}</span></div>
      <div className="full-record-head">
        <div>
          <div className="record-id">{detail.id}</div>
          <h1>{detail.id}</h1>
          <p>Payout for {detail.student.name} · created {formatPayoutDate(detail.createdAt)}</p>
        </div>
        <div className="full-record-actions"><Link className="btn" href={payoutRoutes.list()}>Back to Payouts</Link></div>
      </div>
      <PayoutStatusAlert detail={detail} />
      <div className="record-status-bar payout-record-status-bar">
        <div><span>Status</span><strong><Badge status={detail.status} /></strong></div>
        <div><span>Student</span><strong>{detail.student.name}</strong></div>
        <div><span>Principal</span><strong>{formatPayoutMoney(detail.amounts.principalSatang)}</strong></div>
        <div><span>Created</span><strong>{formatPayoutDate(detail.createdAt)}</strong></div>
        <div><span>Destination type</span><strong>{readableValue(detail.destination.type)}</strong></div>
      </div>
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
      <div className="page-head"><div><p className="admin-route-kicker">KUQuest Admin</p><h1>Payouts</h1><p>Review Payouts through the Admin approval queue.</p></div></div>
      <section className="panel payout-board" aria-label="Payout review board">
        <div className="tabs" aria-label="Payout filters">
          {PAYOUT_BOARD_TABS.map((item) => <button className={`tab${tab === item.id ? " active" : ""}`} type="button" aria-pressed={tab === item.id} key={item.id} onClick={() => chooseTab(item.id)}>{item.label}{item.id === "PENDING_ADMIN_APPROVAL" ? ` (${rows.filter((row) => row.status === item.id).length})` : item.id === "all" ? ` (${rows.length})` : ""}</button>)}
        </div>
        <div className="toolbar resource-toolbar">
          <label className="inline-search search-field" htmlFor="payout-search"><span className="visually-hidden">Search Payouts</span><input id="payout-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search Payouts…" autoComplete="off" /></label>
          <span className="sort-help">Click a column to sort</span>
          <div className="page-size-controls">{([10, 25, 50, "all"] as const).map((size) => <button className={`page-size-button${pageSize === size ? " active" : ""}`} type="button" key={size} onClick={() => choosePageSize(size)}>{size === "all" ? "Show all" : `Show ${size}`}</button>)}</div>
          <span className="count" aria-live="polite">Showing {pageStart}–{pageEnd} of {sortedRows.length} results</span>
        </div>
        {!sortedRows.length ? <div className="empty"><h2>No matching Payouts</h2><p>There are no Payouts in this view.</p><button className="btn" type="button" onClick={() => { setQuery(""); setTab("all"); }}>Reset view</button></div> : <div className="table-wrap" aria-label="Payouts table"><table className="data"><caption>Payouts</caption><thead><tr><SortableHeader label="Payout" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Student" sortKey="student" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Created At" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Principal" sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="payout-row" data-payout-id={row.id} data-payout-drawer-trigger={row.id} key={row.id} tabIndex={0} aria-label={`Open Payout ${row.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; void router.push(payoutRoutes.detail(row.id)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void router.push(payoutRoutes.detail(row.id)); } }}><td><Link className="row-record-button" data-payout-drawer-trigger={row.id} href={payoutRoutes.detail(row.id)} aria-label={`Open Payout ${row.id}`}>{row.id}</Link></td><td><strong>{row.studentName}</strong><small>{row.studentEmail}</small></td><td>{formatPayoutDate(row.createdAt)}</td><td className="money">{formatPayoutMoney(row.principalSatang)}</td><td><Badge status={row.status} /></td></tr>)}</tbody></table></div>}
        {sortedRows.length ? <div className="table-pagination"><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="page-indicator">Page {currentPage} of {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div> : null}
      </section>
    </main>
  );
}
