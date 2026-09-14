"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";

import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { memberRoutes } from "../admin-routes";
import { adminApi } from "../api/admin-api";
import { walletStatusLabel, type WalletStatus } from "../domain/rulebook";
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

function Badge({ status }: { status: WalletStatus }) {
  return <span className={`badge ${walletStatusClass(status)}`}>{walletStatusLabel(status)}</span>;
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
  const content = dataSource === "mock"
    ? <div className="wallet-finance-summary-heading"><div><strong id="wallet-summary-heading">Total Wallet Funds</strong><small>All Wallets · all statuses</small></div><strong>{formatWalletMoney(summary?.totalCirculatingSatang ?? 0)}</strong></div>
    : error
    ? <div className="empty" role="alert"><h3>Wallet summary unavailable</h3><p>{error}</p><button className="btn" type="button" onClick={onRetry}>Try again</button></div>
    : summary
    ? <div className="wallet-finance-summary-grid">
      <SummaryMetric label="Spending balance" value={summary.totalSpendingSatang} />
      <SummaryMetric label="Earnings balance" value={summary.totalEarningsSatang} />
      <SummaryMetric label="Funding reserved" value={summary.totalFundingReservedSatang} />
      <SummaryMetric label="Payout reserved" value={summary.totalPayoutReservedSatang} />
      <SummaryMetric label="Total circulating" value={summary.totalCirculatingSatang} />
    </div>
    : null;

  return <section className="wallet-funds-summary wallet-finance-summary" aria-labelledby="wallet-summary-heading">{dataSource === "api" && !error ? <div className="wallet-finance-summary-heading"><div><strong id="wallet-summary-heading">Member Wallet Summary</strong><small>Aggregate values from the Admin API</small></div></div> : null}{content}</section>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="section"><h3>{title}</h3>{children}</section>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact"><span>{label}</span><strong>{children}</strong></div>;
}

function WalletDrawer({
  row,
  dataSource,
  opener,
  onClose,
}: {
  row: WalletBoardRow;
  dataSource: WalletDataSource;
  opener: HTMLElement | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<WalletDetailView | null>(null);
  const [history, setHistory] = useState<WalletHistoryView[]>([]);
  const [ledger, setLedger] = useState<WalletLedgerView[]>([]);
  const [verification, setVerification] = useState<WalletVerificationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"verify" | "rebuild" | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    setNotice(null);
    setVerification(null);
    try {
      const result = await loadWalletDrawerDataAction(row.id);
      setDetail(result.detail);
      setHistory(result.history);
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

  return <AdminDrawer
    ariaLabel="Close Wallet detail"
    title={row.id}
    titleId="wallet-drawer-title"
    subtitle="Wallet detail drawer"
    className="wallet-drawer"
    opener={opener}
    onClose={onClose}
    actions={!loading && !error && detail ? <>
      {dataSource === "api" ? <>
        <button className="btn" type="button" disabled={actionPending !== null} onClick={() => { void verifyLedger(); }}>{actionPending === "verify" ? "Verifying…" : "Verify Ledger"}</button>
        <button className="btn primary" type="button" disabled={actionPending !== null} onClick={() => { if (window.confirm("Rebuild this Wallet projection from the Ledger source of truth?")) void rebuildProjection(); }}>{actionPending === "rebuild" ? "Rebuilding…" : "Rebuild projection"}</button>
      </> : null}
      {detail ? <Link className="btn" href={memberRoutes.walletStatement(detail.memberId)}>See Wallet Statement</Link> : null}
      <button className="btn" type="button" onClick={onClose}>Close record</button>
    </> : null}
  >
        {loading ? <p aria-live="polite">Loading Wallet detail…</p> : error ? <div className="empty" role="alert"><h3>Wallet detail unavailable</h3><p>{error}</p><button className="btn" type="button" onClick={() => { startTransition(() => { void loadDetail(); }); }}>Try again</button></div> : detail ? <>
          <section className="wallet-record"><div className="drawer-title"><span className="att-icon neutral">W</span><div><h2>{detail.memberName}</h2><p>{detail.email} · {detail.memberId}</p></div></div><div className="facts"><Fact label="Status"><Badge status={detail.status} /></Fact><Fact label="Current Wallet Balance">{formatWalletMoney(detail.currentBalanceSatang)}</Fact><Fact label="Wallet record">{detail.id}</Fact><Fact label="Latest Wallet Transaction">{formatWalletDate(detail.latestTransactionAt)}</Fact></div></section>
          <Section title="Wallet balances"><div className="user-context-list"><div><span>Spending Balance</span><strong>{formatWalletMoney(detail.balances.spendingBalanceSatang)}</strong></div><div><span>Earnings Balance</span><strong>{formatWalletMoney(detail.balances.earningsBalanceSatang)}</strong></div><div><span>Funding Reserved</span><strong>{formatWalletMoney(detail.balances.fundingReservedSatang)}</strong></div><div><span>Reserved For Payouts</span><strong>{formatWalletMoney(detail.balances.reservedForPayoutsSatang)}</strong></div></div></Section>
          <Section title="Ledger check"><p>{detail.projectionMatchesLedger ? "Wallet projection matches the Ledger." : "Wallet projection does not match the Ledger."}</p></Section>
          {verification ? <Section title="Ledger verification"><p>{verification.matches ? "Projected balances match the Ledger." : "Projected balances do not match the Ledger."}</p><div className="facts"><Fact label="Projected Wallet Balance">{formatWalletMoney(verification.projectedTotal)}</Fact><Fact label="Ledger Wallet Balance">{formatWalletMoney(verification.ledgerTotal)}</Fact><Fact label="Activity count">{verification.activityCountMatches ? "Matches" : "Does not match"}</Fact></div></Section> : null}
          <Section title="Wallet Statement"><p>Latest 5 committed and sealed Ledger Transactions, newest first.</p><WalletStatementTable transactions={ledger} /></Section>
          {history.length ? <Section title="Wallet status history"><ol className="timeline">{history.map((entry) => <li key={entry.id}><strong>{walletStatusLabel(entry.toStatus)}</strong><time dateTime={entry.createdAt}>{formatWalletDate(entry.createdAt)}</time><span>{entry.reason}</span></li>)}</ol></Section> : null}
          {actionError || notice ? <p className={actionError ? "field-error" : "audit-note"} role={actionError ? "alert" : "status"}>{actionError ?? notice}</p> : null}
        </> : null}
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
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const [rows, setRows] = useState<WalletBoardRow[]>(initialData.rows);
  const [isLoadingMore, setIsLoadingMore] = useState(Boolean(initialData.remainingRows));
  const [backgroundLoadError, setBackgroundLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<WalletBoardTab>("all");
  const [pageSize, setPageSize] = useState<WalletBoardPageSize>(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<WalletSortSelection>(null);
  const [sortDirection, setSortDirection] = useState<WalletSortDirection>("ascending");
  const direction = sortDirection;
  const [selectedWallet, setSelectedWallet] = useState<WalletBoardRow | null>(null);

  useEffect(() => {
    setRows(initialData.rows);
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
    setQuery("");
    setTab("all");
    setPageSize(10);
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

  if (initialData.boardError) return <main className="admin-route-page wallet-route-page" tabIndex={-1}>
    <div className="page-head"><div><p className="admin-route-kicker">KUQuest Admin</p><h1>Wallets</h1><p>Review Wallet status and balances. Wallet detail is not a route in this migration.</p></div></div>
    <section className="panel wallet-board" aria-label="Wallet review board">
      <WalletSummary summary={initialData.summary} error={initialData.summaryError} dataSource={initialData.dataSource} onRetry={() => router.refresh()} />
      <div className="empty" role="alert"><h2>Records are not available</h2><p>{initialData.boardError}</p><button className="btn primary" type="button" onClick={() => router.refresh()}>Try again</button></div>
    </section>
  </main>;

  const resultLabel = !sortedRows.length
    ? "Showing 0 of 0 results"
    : pageSize === "all"
    ? `Showing all ${sortedRows.length} ${sortedRows.length === 1 ? "result" : "results"}`
    : `Showing ${pageStart}–${pageEnd} of ${sortedRows.length} ${sortedRows.length === 1 ? "result" : "results"}`;
  const resultLabelWithLoading = isLoadingMore ? `${resultLabel} · Loading more records…` : resultLabel;

  return <main className="admin-route-page wallet-route-page" tabIndex={-1}>
    <div className="page-head"><div><p className="admin-route-kicker">KUQuest Admin</p><h1>Wallets</h1><p>Review Wallet status and balances. Wallet detail is not a route in this migration.</p></div></div>
    <section className="panel wallet-board" aria-label="Wallet review board">
      <WalletSummary summary={initialData.summary} error={initialData.summaryError} dataSource={initialData.dataSource} onRetry={() => router.refresh()} />
      <div className="tabs" aria-label="Wallet status filters">
        {WALLET_BOARD_TABS.map((item) => <button className={`tab${tab === item.id ? " active" : ""}`} type="button" aria-pressed={tab === item.id} key={item.id} onClick={() => chooseTab(item.id)}>{item.label}{item.id === "all" ? ` (${rows.length})` : ""}</button>)}
      </div>
      <div className="toolbar resource-toolbar">
        <label className="inline-search search-field" htmlFor="wallet-search"><span className="visually-hidden">Search Wallets</span><input id="wallet-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search Wallets…" autoComplete="off" /></label>
        <span className="sort-help">Click a column to sort</span>
        <div className="page-size-controls" aria-label="Rows per page">{([10, 25, 50, "all"] as const).map((size) => <button className={`page-size-button${pageSize === size ? " active" : ""}`} type="button" key={size} onClick={() => choosePageSize(size)}>{size === "all" ? "Show all" : `Show ${size}`}</button>)}</div>
        <span className="count" aria-live="polite">{resultLabelWithLoading}</span>
      </div>
      {backgroundLoadError ? <p className="field-error" role="alert">{backgroundLoadError} <button className="link" type="button" onClick={() => router.refresh()}>Try again</button></p> : null}
      {initialData.boardError ? <p className="field-error" role="alert">{initialData.boardError} <button className="link" type="button" onClick={() => router.refresh()}>Try again</button></p> : null}
      {!sortedRows.length ? <div className="empty"><h2>No matching records</h2><p>{query.trim() ? "Clear your search to see more results." : "There are no records in this view."}</p><button className="btn" type="button" onClick={resetView}>Reset view</button></div> : <section className="table-wrap wallet-board-table-wrap" aria-label="Wallets table"><table className="data wallet-board-table"><caption>Wallets</caption><thead><tr><SortableHeader label="Wallet / Member ID" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Member" sortKey="member" activeKey={sortKey} direction={direction} onSort={sortBy} /><th scope="col">Email</th><SortableHeader label="Current Wallet Balance" sortKey="balance" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Latest Wallet Transaction Date" sortKey="latestTransactionAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Wallet status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Created" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr data-wallet-row={row.id} key={row.id} tabIndex={0} aria-label={`Open Wallet ${row.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; openWalletDrawer(row, event.currentTarget); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openWalletDrawer(row, event.currentTarget); } }}><td><button className="row-record-button" type="button" data-wallet-drawer-trigger={row.id} aria-label={`Open Wallet ${row.id}`} onClick={(event) => openWalletDrawer(row, event.currentTarget)}>{row.id}</button><small>{row.memberId}</small></td><td><Link className="user-record-link" data-member-link={row.memberId} href={memberRoutes.detail(row.memberId)} aria-label={`Open Member ${row.memberName}`}><strong>{row.memberName}</strong></Link></td><td><strong>{row.email}</strong><small>{row.studentId || "Student ID not provided"}</small></td><td className="money">{formatWalletMoney(row.currentBalanceSatang)}</td><td>{formatWalletDate(row.latestTransactionAt)}</td><td><Badge status={row.status} /></td><td>{formatWalletDate(row.createdAt)}</td></tr>)}</tbody></table></section>}
      {sortedRows.length ? <div className="table-pagination"><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="page-indicator">Page {currentPage} of {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div> : null}
    </section>
    {selectedWallet ? <WalletDrawer row={selectedWallet} dataSource={initialData.dataSource} opener={drawerOpenerRef.current} onClose={closeWalletDrawer} /> : null}
  </main>;
}
