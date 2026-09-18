"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
  type FormEvent,
  type ReactNode,
} from "react";

import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Badge as UiBadge, Button as UiButton, Card, PageSizeControls, Pagination, Table } from "../../../components/ui";
import { adminApi } from "../api/admin-api";
import { walletStatusLabel, type WalletStatus } from "../domain/rulebook";
import { memberTabHref } from "../member/member-model";
import { loadWalletDrawerDataAction, verifyWalletProjectionAction } from "./wallet-actions";
import { WalletStatementTable } from "./wallet-statement-table";
import {
  formatWalletDate,
  formatWalletMoney,
  pageWalletRows,
  searchWalletRows,
  sortWalletRows,
  walletMatchesTab,
  walletPageCount,
  walletStatusClass,
  WALLET_BOARD_TABS,
  type WalletBoardPageSize,
  type WalletBoardRow,
  type WalletBoardTab,
  type WalletDetailView,
  type WalletFinanceSummary,
  type WalletHistoryView,
  type WalletLedgerView,
  type WalletSortDirection,
  type WalletSortKey,
  type WalletSortSelection,
  type WalletVerificationView,
} from "./wallet-model";
import type { WalletDataSource, WalletBoardPageData } from "./wallet-service";

type WalletStatusTarget = Exclude<WalletStatus, "CLOSED">;
type WalletStatusFixture = "success" | "error" | "stale-version";

type WalletStatusReceipt = {
  id: string;
  fromStatus: WalletStatus;
  toStatus: WalletStatus;
  reason: string;
  createdAt: string;
};

const WALLET_STATUS_FIXTURE_OPTIONS: Array<{ value: WalletStatusFixture; label: string }> = [
  { value: "success", label: "Success" },
  { value: "error", label: "Command error" },
  { value: "stale-version", label: "Stale Wallet version" },
];

function walletStatusTargets(status: WalletStatus): WalletStatusTarget[] {
  if (status === "CLOSED") return [];
  if (status === "ACTIVE") return ["FROZEN", "SUSPENDED"];
  if (status === "FROZEN") return ["SUSPENDED", "ACTIVE"];
  return ["FROZEN", "ACTIVE"];
}

function walletStatusActionLabel(status: WalletStatusTarget): string {
  if (status === "ACTIVE") return "Restore Wallet to ACTIVE";
  if (status === "FROZEN") return "Freeze Wallet";
  return "Suspend Wallet";
}

function walletStatusActionClass(status: WalletStatusTarget): string {
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

function walletStatusFixtureError(fixture: WalletStatusFixture): string | null {
  if (fixture === "error") return "Mock Wallet status command failed. No status was changed.";
  if (fixture === "stale-version") return "Wallet status is stale. Refresh this Wallet before trying again. No status was changed.";
  return null;
}

function WalletStatusCommandDialog({
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

  return <AdminModalPortal open onClose={onCancel}><dialog ref={dialogRef} className="wallet-status-command-dialog" aria-labelledby="wallet-status-command-title" aria-modal="true">
    <form className="wallet-status-command-form" onSubmit={submit}>
      <div className="wallet-command-head">
        <div>
          <strong id="wallet-status-command-title">{translateText(walletStatusActionLabel(targetStatus))}</strong>
          <small>{row.memberName} · {row.id}</small>
        </div>
        <button className="icon" type="button" aria-label={translateText("Close Wallet status command")} onClick={onCancel} disabled={pending}><span className="close-lines" /></button>
      </div>
      <div className="wallet-command-body">
        <p className="wallet-command-intro">{translateText("Review the status change before saving. Every Wallet status change requires a reason.")}</p>
        <section className="wallet-status-preview" aria-label={translateText("Wallet status change preview")}>
          <div><span>{translateText("Wallet")}</span><strong>{row.id}</strong></div>
          <div><span>{translateText("Member")}</span><strong>{row.memberName}</strong></div>
          <div className="wallet-status-preview-transition"><span>{translateText("Wallet Status")}</span><strong><Badge status={row.status} /><span aria-hidden="true"> → </span><Badge status={targetStatus} /></strong></div>
        </section>
        <section className={`wallet-status-consequences wallet-status-consequences-${targetStatus.toLocaleLowerCase()}`} aria-label={translateText("Wallet status consequences")}>
          <strong>{translateText(targetStatus === "ACTIVE" ? "Restore effect" : targetStatus === "FROZEN" ? "Temporary hold effect" : "Review hold effect")}</strong>
          <ul>{transitionCopy.map((copy) => <li key={copy}>{translateText(copy)}</li>)}</ul>
        </section>
        <label htmlFor="wallet-status-reason">{translateText("Reason")} <span aria-hidden="true">*</span>
          <textarea id="wallet-status-reason" rows={4} minLength={1} maxLength={500} required value={reason} aria-invalid={validationError ? "true" : undefined} aria-describedby={validationError ? "wallet-status-reason-error" : undefined} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} autoFocus />
        </label>
        <p className="wallet-command-help">{translateText("This reason is part of the Wallet status history. It does not change the Member Ban ladder.")}</p>
        <label className="wallet-fixture-field" htmlFor="wallet-status-fixture">{translateText("Mock response fixture")} <span>{translateText("Development only")}</span>
          <select id="wallet-status-fixture" value={fixture} onChange={(event) => setFixture(event.target.value as WalletStatusFixture)}>
            {WALLET_STATUS_FIXTURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{translateText(option.label)}</option>)}
          </select>
        </label>
        {validationError || error ? <p id="wallet-status-reason-error" className="field-error" role="alert">{translateText(validationError ?? error ?? "")}</p> : null}
      </div>
      <div className="dialog-actions">
        <button className="btn" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</button>
        <button className={`btn ${walletStatusActionClass(targetStatus)}`} type="submit" disabled={pending}>{pending ? translateText("Saving…") : translateText(walletStatusActionLabel(targetStatus))}</button>
      </div>
    </form>
  </dialog></AdminModalPortal>;
}

function Badge({ status, track = true }: { status: WalletStatus; track?: boolean }) {
  const { translateText } = useAdminShell();
  const label = walletStatusLabel(status);
  return <UiBadge
    tone="neutral"
    className={`badge ${walletStatusClass(status)}`}
    data-wallet-status={track ? status : undefined}
    title={status === "CLOSED" ? translateText("Closed — terminal Wallet status") : undefined}
  >{translateText(label)}</UiBadge>;
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return <div className="wallet-finance-summary-metric"><span>{label}</span><strong>{formatWalletMoney(value)}</strong></div>;
}

function WalletSummary({
  summary,
  error,
  dataSource,
  onRetry,
}: {
  summary: WalletFinanceSummary | null;
  error: string | null;
  dataSource: WalletDataSource;
  onRetry: () => void;
}) {
  const { translateText } = useAdminShell();
  const content = error
    ? <div className="empty" role="alert"><h3>{translateText("Wallet summary unavailable")}</h3><p>{translateText(error)}</p><button className="btn" type="button" onClick={onRetry}>{translateText("Try again")}</button></div>
    : summary
    ? <div className="wallet-finance-summary-grid">
      <SummaryMetric label={translateText("Spending balance")} value={summary.totalSpendingSatang} />
      <SummaryMetric label={translateText("Earnings balance")} value={summary.totalEarningsSatang} />
      <SummaryMetric label={translateText("Funding reserved")} value={summary.totalFundingReservedSatang} />
      <SummaryMetric label={translateText("Payout reserved")} value={summary.totalPayoutReservedSatang} />
      <SummaryMetric label={translateText("Total circulating")} value={summary.totalCirculatingSatang} />
    </div>
    : null;

  return <section className="wallet-funds-summary wallet-finance-summary" aria-labelledby="wallet-summary-heading"><div className="wallet-finance-summary-heading"><div><strong id="wallet-summary-heading">{translateText("Member Wallet Summary")}</strong><small>{translateText(dataSource === "api" ? "Aggregate values from the Admin API" : "All Wallets · all statuses")}</small></div></div>{content}</section>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Card as="section" className="section"><h3>{title}</h3>{children}</Card>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact"><span>{label}</span><strong>{children}</strong></div>;
}

function WalletDrawer({
  row,
  dataSource,
  initialMockHistory,
  opener,
  onClose,
  onStatusChanged,
}: {
  row: WalletBoardRow;
  dataSource: WalletDataSource;
  initialMockHistory: WalletHistoryView[];
  opener: HTMLElement | null;
  onClose: () => void;
  onStatusChanged: (walletId: string, nextStatus: WalletStatus, historyEntry: WalletHistoryView) => void;
}) {
  const { translateText } = useAdminShell();
  const [detail, setDetail] = useState<WalletDetailView | null>(null);
  const [history, setHistory] = useState<WalletHistoryView[]>([]);
  const [ledger, setLedger] = useState<WalletLedgerView[]>([]);
  const [verification, setVerification] = useState<WalletVerificationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"verify" | "rebuild" | null>(null);
  const [statusCommand, setStatusCommand] = useState<WalletStatusTarget | null>(null);
  const [statusCommandError, setStatusCommandError] = useState<string | null>(null);
  const [statusCommandPending, setStatusCommandPending] = useState(false);
  const [statusReceipt, setStatusReceipt] = useState<WalletStatusReceipt | null>(null);
  const initialMockHistoryRef = useRef(initialMockHistory);
  const rowStatusRef = useRef(row.status);
  rowStatusRef.current = row.status;

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    setNotice(null);
    setVerification(null);
    try {
      const result = await loadWalletDrawerDataAction(row.id);
      setDetail({ ...result.detail, status: rowStatusRef.current, statusLabel: walletStatusLabel(rowStatusRef.current) });
      setHistory([...initialMockHistoryRef.current, ...result.history]);
      setLedger(result.ledger);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Wallet detail is not available.");
    } finally {
      setLoading(false);
    }
  }, [row.id]);

  useEffect(() => {
    startTransition(() => { void loadDetail(); });
  }, [loadDetail]);

  async function verifyLedger() {
    setActionPending("verify");
    setActionError(null);
    setNotice(null);
    try {
      if (dataSource === "api") {
        const result = await verifyWalletProjectionAction(row.id);
        setVerification(result);
      } else if (detail) {
        setVerification({ matches: detail.projectionMatchesLedger, activityCountMatches: true, projectedTotal: detail.currentBalanceSatang, ledgerTotal: detail.currentBalanceSatang });
      }
      setNotice(`Ledger verification completed for ${row.id}.`);
    } catch (verifyError) {
      setActionError(verifyError instanceof Error ? verifyError.message : "Ledger verification failed.");
    } finally {
      setActionPending(null);
    }
  }

  async function rebuildProjection() {
    setActionPending("rebuild");
    setActionError(null);
    setNotice(null);
    try {
      if (dataSource === "api") {
        await adminApi.rebuildWalletProjection(row.id);
        await loadDetail();
      }
      setNotice(`Wallet projection rebuilt for ${row.id}.`);
    } catch (rebuildError) {
      setActionError(rebuildError instanceof Error ? rebuildError.message : "Wallet projection rebuild failed.");
    } finally {
      setActionPending(null);
    }
  }

  const cancelStatusCommand = useCallback(() => {
    if (statusCommandPending) return;
    setStatusCommand(null);
    setStatusCommandError(null);
  }, [statusCommandPending]);

  function openStatusCommand(nextStatus: WalletStatusTarget) {
    setStatusCommandError(null);
    setStatusReceipt(null);
    setStatusCommand(nextStatus);
  }

  async function submitStatusCommand(reason: string, fixture: WalletStatusFixture) {
    if (!detail || dataSource !== "mock" || !statusCommand) return;
    setStatusCommandPending(true);
    setStatusCommandError(null);
    setNotice(null);
    try {
      const fixtureError = walletStatusFixtureError(fixture);
      if (fixtureError) throw new Error(fixtureError);

      const createdAt = new Date().toISOString();
      const historyEntry: WalletHistoryView = {
        id: `mock-wallet-status-${row.id}-${Date.now()}`,
        fromStatus: detail.status,
        toStatus: statusCommand,
        reason,
        actorAdminId: "admin-mock",
        createdAt,
      };
      const receipt: WalletStatusReceipt = {
        id: `mock-action-${row.id}-${Date.now()}`,
        fromStatus: detail.status,
        toStatus: statusCommand,
        reason,
        createdAt,
      };
      setDetail((current) => current ? { ...current, status: statusCommand, statusLabel: walletStatusLabel(statusCommand) } : current);
      setHistory((current) => [historyEntry, ...current]);
      setStatusReceipt(receipt);
      setNotice(`Wallet status changed to ${walletStatusLabel(statusCommand)}.`);
      onStatusChanged(row.id, statusCommand, historyEntry);
      setStatusCommand(null);
    } catch (commandError) {
      setStatusCommandError(commandError instanceof Error ? commandError.message : "Wallet status command failed.");
    } finally {
      setStatusCommandPending(false);
    }
  }

  const statusActionContent = (
    <>
      {dataSource === "mock" ? <>
        <p>{translateText("Change Wallet Status without changing the Member Ban status. A non-active Wallet blocks new commitments while existing obligations continue.")}</p>
        {walletStatusTargets(detail?.status ?? row.status).length ? <div className="wallet-status-actions" aria-label={translateText("Wallet status actions")}>
          {walletStatusTargets(detail?.status ?? row.status).map((targetStatus) => <UiButton variant={walletStatusActionClass(targetStatus) === "danger" ? "danger" : "outline"} className={`btn ${walletStatusActionClass(targetStatus)}`} type="button" key={targetStatus} data-wallet-status-action={targetStatus} onClick={() => openStatusCommand(targetStatus)} disabled={statusCommandPending}>{translateText(walletStatusActionLabel(targetStatus))}</UiButton>)}
        </div> : <p className="audit-note">{translateText("Closed is terminal. No Wallet status change is available.")}</p>}
      </> : <p>{translateText("Status commands will be connected to the Admin API in the API integration step.")}</p>}
    </>
  );

  return <AdminDrawer
    ariaLabel={translateText("Close Wallet detail")}
    title={row.id}
    titleId="wallet-drawer-title"
    subtitle={translateText("Wallet detail drawer")}
    className="wallet-drawer"
    opener={opener}
    onClose={onClose}
    actions={!loading && !error && detail ? <>
      {dataSource === "api" ? <>
        <UiButton variant="outline" className="btn" type="button" disabled={actionPending !== null} onClick={() => { void verifyLedger(); }}>{actionPending === "verify" ? translateText("Verifying…") : translateText("Verify Ledger")}</UiButton>
        <UiButton variant="primary" className="btn primary" type="button" disabled={actionPending !== null} onClick={() => { if (window.confirm(translateText("Rebuild this Wallet projection from the Ledger source of truth?"))) void rebuildProjection(); }}>{actionPending === "rebuild" ? translateText("Rebuilding…") : translateText("Rebuild projection")}</UiButton>
      </> : null}
      {detail ? <a className="btn" href={memberTabHref(detail.memberId, "wallet-statement")}>{translateText("See Wallet Statement")}</a> : null}
      <button className="btn" type="button" onClick={onClose}>{translateText("Close record")}</button>
    </> : null}
  >
        {loading ? <p aria-live="polite">{translateText("Loading Wallet detail…")}</p> : error ? <div className="empty" role="alert"><h3>{translateText("Wallet detail unavailable")}</h3><p>{translateText(error)}</p><button className="btn" type="button" onClick={() => { startTransition(() => { void loadDetail(); }); }}>{translateText("Try again")}</button></div> : detail ? <>
          <Card as="section" className="wallet-record"><div className="drawer-title"><span className="att-icon neutral">W</span><div><h2>{detail.memberName}</h2><p>{detail.email} · {detail.memberId}</p></div></div><div className="facts"><Fact label={translateText("Wallet Status")}><Badge status={detail.status} /></Fact><Fact label={translateText("Current Wallet Balance")}>{formatWalletMoney(detail.currentBalanceSatang)}</Fact><Fact label={translateText("Wallet record")}>{detail.id}</Fact><Fact label={translateText("Latest Wallet Transaction Date")}>{formatWalletDate(detail.latestTransactionAt)}</Fact></div></Card>
          <Section title={translateText("Wallet balances")}><div className="user-context-list"><div><span>{translateText("Spending Balance")}</span><strong>{formatWalletMoney(detail.balances.spendingBalanceSatang)}</strong></div><div><span>{translateText("Earnings Balance")}</span><strong>{formatWalletMoney(detail.balances.earningsBalanceSatang)}</strong></div><div><span>{translateText("Funding Reserved")}</span><strong>{formatWalletMoney(detail.balances.fundingReservedSatang)}</strong></div><div><span>{translateText("Reserved For Payouts")}</span><strong>{formatWalletMoney(detail.balances.reservedForPayoutsSatang)}</strong></div></div></Section>
          <Section title={translateText("Ledger check")}><p>{translateText(detail.projectionMatchesLedger ? "Wallet projection matches the Ledger." : "Wallet projection does not match the Ledger.")}</p></Section>
          {verification ? <Section title={translateText("Ledger verification")}><p>{translateText(verification.matches ? "Projected balances match the Ledger." : "Projected balances do not match the Ledger.")}</p><div className="facts"><Fact label={translateText("Projected Wallet Balance")}>{formatWalletMoney(verification.projectedTotal)}</Fact><Fact label={translateText("Ledger Wallet Balance")}>{formatWalletMoney(verification.ledgerTotal)}</Fact><Fact label={translateText("Activity count")}>{translateText(verification.activityCountMatches ? "Matches" : "Does not match")}</Fact></div></Section> : null}
          <Section title={translateText("Wallet Statement")}><p>{translateText("Latest 5 committed and sealed Ledger Transactions, newest first.")}</p><WalletStatementTable transactions={ledger} /></Section>
          <Section title={translateText("Wallet status history")}>
            {history.length ? <ol className="timeline">{history.map((entry) => <li key={entry.id}><strong>{entry.fromStatus ? `${translateText(walletStatusLabel(entry.fromStatus))} → ` : ""}{translateText(walletStatusLabel(entry.toStatus))}</strong><time dateTime={entry.createdAt}>{formatWalletDate(entry.createdAt)}</time><span>{entry.reason}</span>{entry.actorAdminId ? <small>{translateText("Admin")} {entry.actorAdminId}</small> : null}</li>)}</ol> : <p>{translateText("No Wallet status changes are recorded.")}</p>}
          </Section>
          <Section title={translateText("Wallet status action")}>{statusActionContent}</Section>
          {statusReceipt ? <Card as="section" className="wallet-action-receipt" aria-label={translateText("Wallet status action receipt")}><h3>{translateText("Action receipt")}</h3><div className="wallet-status-preview"><div><span>{translateText("Action ID")}</span><strong>{statusReceipt.id}</strong></div><div><span>{translateText("Wallet Status")}</span><strong>{translateText(walletStatusLabel(statusReceipt.fromStatus))} → {translateText(walletStatusLabel(statusReceipt.toStatus))}</strong></div><div><span>{translateText("Reason")}</span><strong>{statusReceipt.reason}</strong></div><div><span>{translateText("Recorded")}</span><strong>{formatWalletDate(statusReceipt.createdAt)}</strong></div></div><p className="audit-note">{translateText("This mock receipt represents the Activity Log event that the API integration will return.")}</p></Card> : null}
          {actionError || notice ? <p className={actionError ? "field-error" : "audit-note"} role={actionError ? "alert" : "status"}>{translateText(actionError ?? notice ?? "")}</p> : null}
        </> : null}
    {statusCommand && detail ? <WalletStatusCommandDialog row={{ ...row, status: detail.status, statusLabel: walletStatusLabel(detail.status) }} targetStatus={statusCommand} onCancel={cancelStatusCommand} onSubmit={(reason, fixture) => { void submitStatusCommand(reason, fixture); }} error={statusCommandError} pending={statusCommandPending} /> : null}
  </AdminDrawer>;
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: WalletSortKey;
  activeKey: WalletSortSelection;
  direction: WalletSortDirection;
  onSort: (key: WalletSortKey) => void;
}) {
  const active = activeKey === sortKey;
  return <th aria-sort={active ? direction : "none"}><button className={`table-sort${active ? " is-active" : ""}`} type="button" onClick={() => onSort(sortKey)}>{label}<span className="sort-indicator" aria-hidden="true">{active ? (direction === "ascending" ? "↑" : "↓") : "↕"}</span></button></th>;
}

export function AdminWalletPage({ initialData }: { initialData: WalletBoardPageData }) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const mockAllRows = initialData.dataSource === "mock" ? initialData.allRows : undefined;
  const defaultPageSize: WalletBoardPageSize = 10;
  const initialRows = mockAllRows ?? initialData.rows;
  const [rows, setRows] = useState<WalletBoardRow[]>(initialRows);
  const [isLoadingMore, setIsLoadingMore] = useState(Boolean(initialData.remainingRows));
  const [backgroundLoadError, setBackgroundLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<WalletBoardTab>("all");
  const [pageSize, setPageSize] = useState<WalletBoardPageSize>(defaultPageSize);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<WalletSortSelection>(null);
  const [sortDirection, setSortDirection] = useState<WalletSortDirection>("ascending");
  const direction = sortDirection;
  const [selectedWallet, setSelectedWallet] = useState<WalletBoardRow | null>(null);
  const [mockStatusHistory, setMockStatusHistory] = useState<Record<string, WalletHistoryView[]>>({});

  useEffect(() => {
    setRows(initialData.dataSource === "mock" && initialData.allRows ? initialData.allRows : initialData.rows);
    setPageSize(defaultPageSize);
    setMockStatusHistory({});
    const remainingRows = initialData.remainingRows;
    setIsLoadingMore(Boolean(remainingRows));
    setBackgroundLoadError(null);
    if (!remainingRows) return;

    let cancelled = false;
    void Promise.resolve(remainingRows).then(({ rows: loadedRows, error }) => {
      if (cancelled) return;
      if (error) {
        setBackgroundLoadError(error);
        setIsLoadingMore(false);
        return;
      }
      setRows((currentRows) => {
        const existingIds = new Set(currentRows.map((row) => row.id));
        return [...currentRows, ...loadedRows.filter((row) => !existingIds.has(row.id))];
      });
      setIsLoadingMore(false);
    }).catch(() => {
      if (!cancelled) {
        setBackgroundLoadError("Some Wallet records could not be loaded.");
        setIsLoadingMore(false);
      }
    });

    return () => { cancelled = true; };
  }, [initialData]);

  const filteredRows = searchWalletRows(rows, query).filter((row) => walletMatchesTab(row, tab));
  const sortedRows = sortWalletRows(filteredRows, sortKey, sortDirection);
  const totalPages = walletPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visibleRows = pageWalletRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  function chooseTab(nextTab: WalletBoardTab) {
    setTab(nextTab);
    setPage(1);
  }

  function choosePageSize(nextSize: WalletBoardPageSize) {
    setPageSize(nextSize);
    setPage(1);
  }

  function sortBy(nextKey: WalletSortKey) {
    setPage(1);
    if (sortKey === nextKey) setSortDirection((currentDirection) => currentDirection === "ascending" ? "descending" : "ascending");
    else {
      setSortKey(nextKey);
      setSortDirection("ascending");
    }
  }

  function resetView() {
    setRows(mockAllRows ?? initialData.rows);
    setQuery("");
    setTab("all");
    setPageSize(defaultPageSize);
    setPage(1);
    setSortKey(null);
    setSortDirection("ascending");
  }

  function openWalletDrawer(row: WalletBoardRow, opener: HTMLElement) {
    drawerOpenerRef.current = opener;
    setSelectedWallet(row);
  }

  const closeWalletDrawer = useCallback(() => {
    setSelectedWallet(null);
  }, []);

  const handleStatusChanged = useCallback((walletId: string, nextStatus: WalletStatus, historyEntry: WalletHistoryView) => {
    setRows((currentRows) => currentRows.map((row) => row.id === walletId
      ? { ...row, status: nextStatus, statusLabel: walletStatusLabel(nextStatus) }
      : row));
    setSelectedWallet((current) => current?.id === walletId
      ? { ...current, status: nextStatus, statusLabel: walletStatusLabel(nextStatus) }
      : current);
    setMockStatusHistory((current) => ({
      ...current,
      [walletId]: [historyEntry, ...(current[walletId] ?? [])],
    }));
  }, []);

  if (initialData.boardError) return <main className="admin-route-page wallet-route-page" tabIndex={-1}>
    <div className="page-head"><div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Wallets")}</h1><p>{translateText("Review Wallet status and balances. Wallet detail is not a route in this migration.")}</p></div></div>
    <section className="panel wallet-board" aria-label={translateText("Wallet review board")}>
      <WalletSummary summary={initialData.summary} error={initialData.summaryError} dataSource={initialData.dataSource} onRetry={() => router.refresh()} />
      <div className="empty" role="alert"><h2>{translateText("Records are not available")}</h2><p>{translateText(initialData.boardError)}</p><button className="btn primary" type="button" onClick={() => router.refresh()}>{translateText("Try again")}</button></div>
    </section>
  </main>;

  const resultLabel = !sortedRows.length
    ? translateText("Showing 0 of 0 results")
    : pageSize === "all"
    ? `${translateText("Showing all")} ${sortedRows.length} ${translateText(sortedRows.length === 1 ? "result" : "results")}`
    : `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${sortedRows.length} ${translateText(sortedRows.length === 1 ? "result" : "results")}`;
  const resultLabelWithLoading = isLoadingMore ? `${resultLabel} · ${translateText("Loading more records…")}` : resultLabel;

  return <main className="admin-route-page wallet-route-page" tabIndex={-1}>
    <div className="page-head"><div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Wallets")}</h1><p>{translateText("Review Wallet status and balances. Wallet detail is not a route in this migration.")}</p></div></div>
    <section className="panel wallet-board" aria-label={translateText("Wallet review board")}>
      <WalletSummary summary={initialData.summary} error={initialData.summaryError} dataSource={initialData.dataSource} onRetry={() => router.refresh()} />
      <div className="tabs" aria-label={translateText("Wallet status filters")}>
        {WALLET_BOARD_TABS.map((item) => <button className={`tab${tab === item.id ? " active" : ""}`} type="button" aria-pressed={tab === item.id} key={item.id} onClick={() => chooseTab(item.id)}>{translateText(item.label)}{item.id === "all" ? ` (${rows.length})` : ""}</button>)}
      </div>
      <div className="toolbar resource-toolbar">
        <label className="inline-search search-field" htmlFor="wallet-search"><span className="visually-hidden">{translateText("Search Wallets")}</span><input id="wallet-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={translateText("Search Wallets…")} autoComplete="off" /></label>
        <span className="sort-help">{translateText("Click a column to sort")}</span>
        <PageSizeControls value={pageSize} translateText={translateText} onChange={choosePageSize} />
        <span className="count" aria-live="polite">{translateText(resultLabelWithLoading)}</span>
      </div>
      {backgroundLoadError ? <p className="field-error" role="alert">{translateText(backgroundLoadError)} <button className="link" type="button" onClick={() => router.refresh()}>{translateText("Try again")}</button></p> : null}
      {initialData.boardError ? <p className="field-error" role="alert">{translateText(initialData.boardError)} <button className="link" type="button" onClick={() => router.refresh()}>{translateText("Try again")}</button></p> : null}
      {!sortedRows.length ? <div className="empty"><h2>{translateText("No matching records")}</h2><p>{query.trim() ? translateText("Clear your search to see more results.") : translateText("There are no records in this view.")}</p><button className="btn" type="button" onClick={resetView}>{translateText("Reset view")}</button></div> : <section className="table-wrap wallet-board-table-wrap" aria-label={translateText("Wallets table")}><Table className="data wallet-board-table"><caption>{translateText("Wallets")}</caption><thead><tr><SortableHeader label={translateText("Wallet / Member ID")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Member")} sortKey="member" activeKey={sortKey} direction={direction} onSort={sortBy} /><th scope="col">{translateText("Email")}</th><SortableHeader label={translateText("Current Wallet Balance")} sortKey="balance" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Latest Wallet Transaction Date")} sortKey="latestTransactionAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Wallet status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Created")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr data-wallet-row={row.id} key={row.id} tabIndex={0} aria-label={`${translateText("Open Wallet")} ${row.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; openWalletDrawer(row, event.currentTarget); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openWalletDrawer(row, event.currentTarget); } }}><td><button className="row-record-button" type="button" data-wallet-drawer-trigger={row.id} aria-label={`${translateText("Open Wallet")} ${row.id}`} onClick={(event) => openWalletDrawer(row, event.currentTarget)}>{row.id}</button><small>{row.memberId}</small><div className="wallet-mobile-key-facts" aria-label={translateText("Wallet summary")}><div><span>{translateText("Current Wallet Balance")}</span><strong>{formatWalletMoney(row.currentBalanceSatang)}</strong></div><div><span>{translateText("Wallet Status")}</span><strong><Badge status={row.status} track={false} /></strong></div><div><span>{translateText("Latest Wallet Transaction Date")}</span><strong>{formatWalletDate(row.latestTransactionAt)}</strong></div></div></td><td>{row.memberAvailable ? <Link className="user-record-link" data-member-link={row.memberId} href={memberTabHref(row.memberId, "overview")} aria-label={`${translateText("Open Member")} ${row.memberName}`}><strong>{row.memberName}</strong></Link> : <strong>{row.memberName}</strong>}</td><td><strong>{row.email}</strong><small>{row.studentId || translateText("Student ID not provided")}</small></td><td className="money">{formatWalletMoney(row.currentBalanceSatang)}</td><td>{formatWalletDate(row.latestTransactionAt)}</td><td><Badge status={row.status} /></td><td>{formatWalletDate(row.createdAt)}</td></tr>)}</tbody></Table></section>}
      {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPage} ariaLabel={translateText("Wallets pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className="table-pagination" /> : null}
    </section>
    {selectedWallet ? <WalletDrawer row={selectedWallet} dataSource={initialData.dataSource} initialMockHistory={mockStatusHistory[selectedWallet.id] ?? []} opener={drawerOpenerRef.current} onClose={closeWalletDrawer} onStatusChanged={handleStatusChanged} /> : null}
  </main>;
}
