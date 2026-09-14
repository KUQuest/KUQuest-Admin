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
import { payoutRoutes } from "../admin-routes";
import {
  adminApi,
  type PayoutApproval,
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
  payoutDecisionContext,
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

type PayoutPresentation = "page" | "drawer";
type PayoutCommand = "approve" | "reject";
const payoutFocusReturnStorageKey = "kuquest-payout-focus-return";
type ApprovalReasonCode = PayoutApproval["reasonCode"];
type RejectionReasonCode = PayoutRejection["reasonCode"];
type PayoutCommandSubmission =
  | { command: "approve"; reasonCode: ApprovalReasonCode }
  | { command: "reject"; reasonCode: RejectionReasonCode };

const approvalReasonCodes: Array<{ value: ApprovalReasonCode; label: string }> = [
  { value: "PAYOUT_POLICY_REVIEW", label: "Policy review" },
  { value: "PAYOUT_RISK_REVIEW", label: "Risk review" },
];

const rejectionReasonCodes: Array<{ value: RejectionReasonCode; label: string }> = [
  ...approvalReasonCodes,
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact"><span>{label}</span><strong>{children}</strong></div>;
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
}: {
  detail: PayoutDetailView;
  onCommand: (command: PayoutCommand) => void;
  onReconcile: () => void;
  reconcileError: string | null;
  reconcileNotice: string | null;
  reconcilePending: boolean;
  showReconcileAction: boolean;
  showFullDetailLink: boolean;
}) {
  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = showReconcileAction
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);
  const outcomeReason = payoutOutcomeReason(detail);

  return (
    <div className="payout-detail-stack">
      <Section title="Payout summary">
        <div className="facts payout-detail-facts">
          <Fact label="Status"><Badge status={detail.status} /></Fact>
          <Fact label="Payout record">{detail.id}</Fact>
          <Fact label="Student">{detail.student.name}</Fact>
          <Fact label="Student email">{detail.student.email}</Fact>
          <Fact label="Quote">{detail.quoteId}</Fact>
          <Fact label="Payout version">{detail.version}</Fact>
        </div>
      </Section>

      <Section title="Payout amounts">
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

      <Section title="Payout Destination">
        <div className="facts">
          <Fact label="Bank">{detail.destination.bankName}</Fact>
          <Fact label="Bank code">{detail.destination.bankCode}</Fact>
          <Fact label="Destination type">{readableValue(detail.destination.type)}</Fact>
          <Fact label="Destination">{detail.destination.maskedValue}</Fact>
          <Fact label="Routing">{detail.destination.maskedRoutingValue}</Fact>
        </div>
        <p className="audit-note">Destination data is masked. Raw destination, encrypted payload, and Provider payload are not available to the Admin client.</p>
      </Section>

      <Section title="Payout timing">
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

      <Section title={detail.decisionContext.heading}>
        <p>{detail.decisionContext.copy}</p>
        <p className="audit-note">{detail.decisionContext.next}</p>
      </Section>

      <Section title="Payout history">
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
        <section className="section payout-outcome">
          <h3>{detail.status === "FAILED" ? "Transfer failure reason" : "Rejection reason"}</h3>
          <p>{readableValue(outcomeReason)}</p>
        </section>
      ) : null}

      {canDecide || canReconcile ? (
        <Section title="Admin decision">
          <p>{canDecide
            ? "Review the masked destination and API-provided amounts before deciding this Payout."
            : "The Payout needs a Provider status check before the next Admin action."}</p>
          <div className="drawer-actions payout-detail-actions">
            {canDecide ? <>
              <button className="btn primary" type="button" onClick={() => onCommand("approve")}>Approve Payout</button>
              <button className="btn danger" type="button" onClick={() => onCommand("reject")}>Reject Payout</button>
            </> : <button className="btn primary" type="button" onClick={onReconcile} disabled={reconcilePending}>
              {reconcilePending ? "Reconciling…" : "Reconcile with provider"}
            </button>}
          </div>
          {reconcileError ? <p className="field-error" role="alert">{reconcileError}</p> : null}
          {reconcileNotice ? <output>{reconcileNotice}</output> : null}
        </Section>
      ) : null}

      {showFullDetailLink ? <a className="btn payout-full-detail-link" href={payoutRoutes.detail(detail.id)}>Full Payout detail</a> : null}
    </div>
  );
}

function PayoutCommandDialog({
  command,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  command: PayoutCommand;
  onCancel: () => void;
  onSubmit: (submission: PayoutCommandSubmission) => void;
  error: string | null;
  pending: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const reasonOptions = command === "approve" ? approvalReasonCodes : rejectionReasonCodes;
  const submitDisabled = pending || !reasonCode;

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
    if (!reasonCode) {
      setValidationError("Select a reason code.");
      return;
    }
    setValidationError(null);
    if (command === "approve") {
      onSubmit({ command, reasonCode: reasonCode as ApprovalReasonCode });
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
          <label htmlFor="payout-reason-code">Reason code <span aria-hidden="true">*</span>
            <select id="payout-reason-code" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} autoFocus>
              <option value="">Choose a reason</option>
              {reasonOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
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
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const drawerOpenerIdRef = useRef<string | null>(null);
  const restoreDrawerFocusRef = useRef(false);
  const [detail, setDetail] = useState(data.detail);
  const [command, setCommand] = useState<PayoutCommand | null>(null);
  const [commandIdempotencyKey, setCommandIdempotencyKey] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const [reconcilePending, setReconcilePending] = useState(false);

  const closeDrawer = useCallback(() => {
    window.sessionStorage.setItem(payoutFocusReturnStorageKey, detail.id);
    restoreDrawerFocusRef.current = true;
    router.back();
  }, [detail.id, router]);

  useEffect(() => {
    setDetail(data.detail);
    setCommand(null);
    setCommandIdempotencyKey(null);
    setCommandError(null);
    setReconcileError(null);
    setReconcileNotice(null);
    setReconcilePending(false);
  }, [data]);

  useEffect(() => {
    if (presentation !== "drawer") return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const activeElement = document.activeElement;
    const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-payout-drawer-trigger]"));
    drawerOpenerIdRef.current = detail.id;
    drawerOpenerRef.current = triggers.find((element) => element.tagName === "A" && element.dataset.payoutDrawerTrigger === detail.id)
      ?? (activeElement instanceof HTMLElement && activeElement.dataset.payoutDrawerTrigger === detail.id
        ? activeElement
        : null)
        ?? triggers.find((element) => element.dataset.payoutDrawerTrigger === detail.id)
        ?? null;
    restoreDrawerFocusRef.current = false;

    const shell = drawer.closest<HTMLElement>(".admin-shell");
    const outsideElements = shell
      ? Array.from(shell.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== drawer && !element.classList.contains("scrim") && !element.classList.contains("payout-command-layer"))
      : [];
    const previousInert = outsideElements.map((element) => element.inert);
    outsideElements.forEach((element) => { element.inert = true; });
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () => Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.getClientRects().length > 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (command) return;
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || command) return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus({ preventScroll: true });
        return;
      }
      const current = document.activeElement;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (current === drawer || current === first || !drawer.contains(current))) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (current === last || !drawer.contains(current))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    const restoreFocusToOpener = () => {
      const opener = drawerOpenerRef.current?.isConnected
        ? drawerOpenerRef.current
        : Array.from(document.querySelectorAll<HTMLElement>("[data-payout-drawer-trigger]")).find(
          (element) => element.dataset.payoutDrawerTrigger === drawerOpenerIdRef.current,
        );
      if (!opener) return;
      opener.focus({ preventScroll: true });
    };
    const retryFocusToOpener = (attempt = 0) => {
      restoreFocusToOpener();
      if (attempt < 8) requestAnimationFrame(() => retryFocusToOpener(attempt + 1));
    };
    const markBrowserClose = () => {
      restoreDrawerFocusRef.current = true;
      window.sessionStorage.setItem(payoutFocusReturnStorageKey, detail.id);
      requestAnimationFrame(() => retryFocusToOpener());
    };
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", markBrowserClose);
    drawer.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", markBrowserClose);
      outsideElements.forEach((element, index) => { element.inert = previousInert[index] ?? false; });
      if (restoreDrawerFocusRef.current) {
        requestAnimationFrame(() => retryFocusToOpener());
      }
    };
  }, [closeDrawer, command, detail.id, presentation]);

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
            reasonCode: submission.reasonCode,
          });
        } else {
          await adminApi.rejectPayout(detail.id, {
            ...options,
            reasonCode: submission.reasonCode,
          });
        }
      } else {
        const nextStatus: PayoutStatus = submission.command === "approve" ? "SUBMITTED_TO_PROVIDER" : "CANCELLED";
        setDetail((current) => ({
          ...current,
          status: nextStatus,
          decisionContext: payoutDecisionContext(nextStatus),
          version: current.version + 1,
          updatedAt: new Date().toISOString(),
          cancellationReasonCode: submission.command === "reject" ? submission.reasonCode : current.cancellationReasonCode,
          history: [...current.history, {
            id: `local-${submission.command}-${Date.now()}`,
            fromStatus: current.status,
            toStatus: nextStatus,
            actorUserId: null,
            actorAdminId: "mock-admin",
            source: submission.command === "approve" ? "ADMIN_APPROVAL" : "ADMIN_REJECTION",
            reason: submission.reasonCode,
            occurredAt: new Date().toISOString(),
          }],
        }));
      }
      setCommand(null);
      setCommandIdempotencyKey(null);
      if (presentation === "drawer") {
        closeDrawer();
        if (dataSource === "api") window.setTimeout(() => router.refresh(), 0);
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
  />;

  if (presentation === "drawer") {
    return (
      <>
        <button className="scrim" type="button" tabIndex={-1} aria-label="Close Payout detail" onClick={closeDrawer} />
        <dialog ref={drawerRef} className="drawer open payout-drawer" aria-modal="true" aria-labelledby="payout-drawer-title" tabIndex={-1} open>
          <div className="drawer-top">
            <div><strong id="payout-drawer-title">{detail.id}</strong><small>Payout detail drawer</small></div>
            <button className="icon" type="button" aria-label="Close Payout detail" onClick={closeDrawer}><span className="close-lines" /></button>
          </div>
          <div className="drawer-body">{content}</div>
        </dialog>
        {command ? <PayoutCommandDialog command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page payout-detail-page" tabIndex={-1}>
      <div className="page-head">
        <div><p className="admin-route-kicker">Payout</p><h1>{detail.id}</h1><p>Full Payout record for {detail.student.name}.</p></div>
        <Link className="btn" href={payoutRoutes.list()}>Back to Payouts</Link>
      </div>
      <div className="payout-detail-grid">{content}</div>
      {command ? <PayoutCommandDialog command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
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
}: {
  initialData: PayoutBoardPageData;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PayoutBoardRow[]>(initialData.rows);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PayoutBoardTab>("PENDING_ADMIN_APPROVAL");
  const [pageSize, setPageSize] = useState<PayoutBoardPageSize>(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<PayoutSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<PayoutSortDirection>("descending");

  useEffect(() => { setRows(initialData.rows); }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const focusReturn = () => {
      const payoutId = window.sessionStorage.getItem(payoutFocusReturnStorageKey);
      if (!payoutId) return;

      let attempt = 0;
      const retry = () => {
        if (cancelled) return;
        if (document.querySelector("dialog.payout-drawer")) {
          if (attempt < 60) {
            attempt += 1;
            frame = requestAnimationFrame(retry);
          }
          return;
        }
        const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-payout-drawer-trigger]"));
        const trigger = triggers.find((element) => element.tagName === "A" && element.dataset.payoutDrawerTrigger === payoutId)
          ?? triggers.find((element) => element.dataset.payoutDrawerTrigger === payoutId);
        trigger?.focus({ preventScroll: true });
        if (attempt < 60) {
          attempt += 1;
          frame = requestAnimationFrame(retry);
        } else {
          window.sessionStorage.removeItem(payoutFocusReturnStorageKey);
        }
      };
      retry();
    };

    focusReturn();
    window.addEventListener("popstate", focusReturn);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", focusReturn);
    };
  }, []);

  const filteredRows = searchPayoutRows(rows, query).filter((row) => payoutMatchesTab(row, tab));
  const sortedRows = sortPayoutRows(filteredRows, sortKey, sortDirection);
  const totalPages = payoutPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visibleRows = pagePayoutRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  function chooseTab(nextTab: PayoutBoardTab) { setTab(nextTab); setPage(1); }
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
