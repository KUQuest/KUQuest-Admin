"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { adminBoardCount, adminBoardPagination, adminBoardTable } from "../../../components/admin/admin-record-styles";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, TableCell, TableRow, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { memberRoutes } from "../admin-routes";
import type { AdminTopUpListItem } from "../api/admin-api";
import { countBoardTabMatches } from "../data/board-tab-counts";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import { sortBoardRows } from "../data/board-sorting";
import { pageCount, pageRange, pageRows } from "../data/board-pagination";
import { formatAdminTimestamp } from "../date-format";
import { statusBadgeClass } from "../status-badge";
import { formatMoneySatang } from "../member/member-wallet-model";
import {
  searchTopUps,
  TOP_UP_BOARD_TABS,
  topUpMatchesTab,
  topUpSortValue,
  type TopUpBoardTab,
} from "./top-ups-board-model";
import { TopUpDetailDrawer } from "./top-up-detail-drawer";
import { useTopUpBoardStore } from "./top-ups-board-store";
import {
  useFinanceTopUpQuery,
  useFinanceTopUpReconcileMutation,
} from "./finance-query";
import type { TopUpPageData } from "./finance-service";

function TopUpOperations({ initialData }: { initialData: TopUpPageData }) {
  const { translateText } = useAdminShell();
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const [selectedTopUp, setSelectedTopUp] = useState<AdminTopUpListItem | null>(null);
  const [drawerOpener, setDrawerOpener] = useState<HTMLElement | null>(null);
  const topUpQuery = useFinanceTopUpQuery(initialData);
  const reconcile = useFinanceTopUpReconcileMutation();
  const topUps = useMemo(
    () => topUpQuery.data?.pages.flatMap((pageData) => pageData.items) ?? [],
    [topUpQuery.data?.pages],
  );
  const error = topUpQuery.error instanceof Error
    ? topUpQuery.error.message
    : initialData.topUpError;
  const {
    query,
    tab,
    pageSize,
    page,
    sortKey,
    sortDirection,
    setQuery,
    setTab,
    setPageSize,
    setPage,
    sortBy,
  } = useTopUpBoardStore();
  const filteredRows = useMemo(
    () => searchTopUps(topUps, query).filter((topUp) => topUpMatchesTab(topUp, tab)),
    [query, tab, topUps],
  );
  const tabCounts = useMemo(
    () => countBoardTabMatches(topUps, TOP_UP_BOARD_TABS, topUpMatchesTab),
    [topUps],
  );
  const sortedRows = useMemo(
    () => sortKey
      ? sortBoardRows(filteredRows, (topUp) => topUpSortValue(topUp, sortKey), sortDirection)
      : filteredRows,
    [filteredRows, sortDirection, sortKey],
  );
  const totalPages = pageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visibleRows = pageRows(sortedRows, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(sortedRows.length, currentPage, pageSize);

  function openTopUpDrawer(topUp: AdminTopUpListItem, opener: HTMLElement) {
    setDrawerOpener(opener);
    setSelectedTopUp(topUp);
  }

  function closeTopUpDrawer() {
    setSelectedTopUp(null);
  }

  async function loadMore() {
    if (!topUpQuery.hasNextPage || topUpQuery.isFetchingNextPage) return;
    setPaginationError(null);
    try {
      await topUpQuery.fetchNextPage();
    } catch (loadError) {
      setPaginationError(loadError instanceof Error ? loadError.message : "More Top-ups could not load.");
    }
  }

  async function loadAllPages() {
    if (!topUpQuery.hasNextPage || topUpQuery.isFetchingNextPage) return;
    setPaginationError(null);
    try {
      let result: Awaited<ReturnType<typeof topUpQuery.fetchNextPage>> = await topUpQuery.fetchNextPage();
      while (result.hasNextPage) result = await topUpQuery.fetchNextPage();
    } catch (loadError) {
      setPaginationError(loadError instanceof Error ? loadError.message : "More Top-ups could not load.");
    }
  }

  async function loadAtLeast(rowCount: number) {
    if (topUpQuery.isFetchingNextPage) return;
    setPaginationError(null);
    try {
      let loadedCount = topUps.length;
      let hasNextPage = topUpQuery.hasNextPage;
      while (loadedCount < rowCount && hasNextPage) {
        const nextPage = await topUpQuery.fetchNextPage();
        loadedCount = nextPage.data?.pages.flatMap((pageData) => pageData.items).length ?? 0;
        hasNextPage = nextPage.hasNextPage;
      }
    } catch (loadError) {
      setPaginationError(loadError instanceof Error ? loadError.message : "More Top-ups could not load.");
    }
  }

  async function reconcileTopUp(topUpId: string) {
    setReconcileNotice(null);
    try {
      const result = await reconcile.mutateAsync(topUpId);
      setReconcileNotice(`${translateText("Top-up reconciliation completed for")} ${topUpId} · ${translateText(result.topUp.topUpStatus)}.`);
    } catch (mutationError) {
      setReconcileNotice(mutationError instanceof Error ? mutationError.message : "Top-up reconciliation failed.");
    }
  }

  return (
    <>
    <Card as="section" className="overflow-hidden" aria-label={translateText("Top-up review board")}>
      <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
        <div><CardTitle>{translateText("Top-ups")}</CardTitle><CardDescription>{translateText("Review Top-up payments and reconcile a payment with the Provider.")}</CardDescription></div>
        <span className={adminBoardCount}>{filteredRows.length} {translateText("shown")}</span>
      </CardHeader>
      <Tabs value={tab} onValueChange={(value) => setTab(value as TopUpBoardTab)}>
        <TabsList className="px-3" aria-label={translateText("Top-up status filters")}>
          {TOP_UP_BOARD_TABS.map((item) => <TabsTrigger key={item.id} value={item.id}>{translateText(item.label)} ({tabCounts.get(item.id) ?? 0})</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2">
        <label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="top-up-search">
          <span className="visually-hidden">{translateText("Search Top-ups")}</span>
          <Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="top-up-search" type="search" aria-label={translateText("Search Top-ups")} placeholder={translateText("Search by Top-up, Member, or Provider reference")} value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
        </label>
        <span className="text-sm text-admin-muted max-[600px]:hidden">{translateText("Click a column to sort")}</span>
        <PageSizeControls value={pageSize} disabled={topUpQuery.isFetchingNextPage} translateText={translateText} onChange={(size) => { setPageSize(size); if (size === "all") void loadAllPages(); else if (topUps.length < size) void loadAtLeast(size); }} />
        <span className={adminBoardCount} aria-live="polite">{topUpQuery.isFetchingNextPage ? translateText("Loading more records…") : sortedRows.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${sortedRows.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span>
      </div>
      {error ? <div className="m-3 rounded-admin-sm border border-admin-danger bg-admin-danger-soft p-3 text-sm" role="alert">{translateText(error)} <Button variant="outline" size="sm" type="button" onClick={() => { void topUpQuery.refetch(); }}>{translateText("Try again")}</Button></div> : null}
      {reconcileNotice ? <p className={`mx-3 mb-3 text-sm ${reconcile.error ? "field-error" : "audit-note"}`} role={reconcile.error ? "alert" : "status"}>{translateText(reconcileNotice)}</p> : null}
      {topUpQuery.isPending && !topUps.length ? <p className="px-3 py-5" aria-live="polite">{translateText("Loading Top-ups…")}</p> : !sortedRows.length ? <EmptyState title={translateText("No matching Top-ups")} description={translateText("There are no Top-ups in this view.")} action={<Button variant="outline" type="button" onClick={() => { setQuery(""); setTab("all"); }}>{translateText("Reset view")}</Button>} /> : <div className="overflow-x-auto">
        <Table className={`${adminBoardTable} !min-w-[850px] [&_tbody>tr]:cursor-pointer`}>
          <caption>{translateText("Top-ups table")}</caption>
          <thead><tr>
            <AdminSortableHeader label={translateText("Top-up")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
            <AdminSortableHeader label={translateText("Member")} sortKey="member" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
            <AdminSortableHeader label={translateText("Credit amount")} sortKey="creditAmount" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
            <AdminSortableHeader label={translateText("Payment total")} sortKey="paymentTotal" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
            <AdminSortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
            <AdminSortableHeader label={translateText("Created")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
            <th scope="col">{translateText("Action")}</th>
          </tr></thead>
          <tbody>{visibleRows.map((topUp) => <TableRow className="focus-visible:relative focus-visible:outline-3 focus-visible:outline-admin-accent focus-visible:outline-offset-[-3px]" data-top-up-row={topUp.id} key={topUp.id} tabIndex={0} aria-label={`${translateText("Open Top-up")} ${topUp.displayId}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; openTopUpDrawer(topUp, event.currentTarget); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTopUpDrawer(topUp, event.currentTarget); } }}>
            <TableCell><button className="row-record-button" type="button" data-top-up-drawer-trigger={topUp.id} aria-label={`${translateText("Open Top-up")} ${topUp.displayId}`} onClick={(event) => openTopUpDrawer(topUp, event.currentTarget)}>{topUp.displayId}</button><small>{topUp.providerReference ?? translateText("Provider reference not provided")}</small></TableCell>
            <TableCell><Link className="text-admin-accent no-underline hover:underline hover:underline-offset-4" href={memberRoutes.detail(topUp.userId)}>{`${topUp.member.firstName} ${topUp.member.lastName}`.trim()}</Link><small>{topUp.member.studentId ?? "—"}</small></TableCell>
            <TableCell className="money">{formatMoneySatang(topUp.creditAmountSatang)}</TableCell>
            <TableCell className="money">{formatMoneySatang(topUp.paymentTotalSatang)}</TableCell>
            <TableCell><span className={`badge ${statusBadgeClass(topUp.topUpStatus)}`}>{translateText(TOP_UP_BOARD_TABS.find((item) => item.id === topUp.topUpStatus)?.label ?? topUp.topUpStatus)}</span></TableCell>
            <TableCell>{formatAdminTimestamp(topUp.createdAt)}</TableCell>
            <TableCell><Button variant="outline" size="sm" type="button" disabled={reconcile.isPending} onClick={() => { if (window.confirm(`${translateText("Reconcile this Top-up with the Provider?")}\n${topUp.displayId}`)) void reconcileTopUp(topUp.id); }}>{reconcile.isPending ? translateText("Reconciling…") : translateText("Reconcile")}</Button></TableCell>
          </TableRow>)}</tbody>
        </Table>
      </div>}
      {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPage} ariaLabel={translateText("Top-ups pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
      {topUpQuery.hasNextPage ? <div className="border-t border-admin-border px-3 py-3 text-sm text-admin-muted">
        <Button variant="outline" size="sm" type="button" onClick={() => { void loadMore(); }} disabled={topUpQuery.isFetchingNextPage}>{translateText(topUpQuery.isFetchingNextPage ? "Loading more Top-ups…" : "Load more Top-ups")}</Button>
        {paginationError ? <p className="field-error" role="alert">{translateText(paginationError)}</p> : null}
      </div> : null}
    </Card>
    {selectedTopUp ? <TopUpDetailDrawer topUp={selectedTopUp} opener={drawerOpener} onClose={closeTopUpDrawer} /> : null}
    </>
  );
}

export function AdminTopUpsPage({ initialData }: { initialData: TopUpPageData }) {
  const { translateText } = useAdminShell();
  const reset = useTopUpBoardStore((state) => state.reset);

  useAdminBoardReset(reset);

  return (
    <main className="admin-route-page grid min-w-0 content-start gap-4" tabIndex={-1}>
      <AdminPageHeader title={translateText("Top-ups")} description={translateText("Review Top-up payments and reconcile a payment with the Provider.")} />
      {initialData.dataSource === "api" ? <TopUpOperations initialData={initialData} /> : (
        <Card as="section" className="overflow-hidden">
          <EmptyState className="border-0 p-[60px_24px]" title={translateText("Top-up tools unavailable")} description={translateText("The Admin API is required to read Top-up data.")} />
        </Card>
      )}
    </main>
  );
}
