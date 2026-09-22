"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { adminBoardCount, adminBoardPagination, adminBoardTable } from "../../../components/admin/admin-record-styles";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button as UiButton, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { payoutRoutes } from "../admin-routes";
import { countBoardTabMatches } from "../data/board-tab-counts";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import { formatPayoutDate, formatPayoutMoney, pagePayoutRows, PAYOUT_BOARD_TABS, payoutMatchesTab, payoutPageCount, searchPayoutRows, sortPayoutRows, type PayoutBoardPageSize, type PayoutBoardRow, type PayoutBoardTab, type PayoutDetailView } from "./payout-model";
import type { PayoutBoardPageData, PayoutDataSource } from "./payout-service";
import { applyMockPayoutOverrideToRow, PAYOUT_MOCK_UPDATED_EVENT, payoutMockOverrideFromDetail, readMockPayoutOverrides } from "./payout-mock-state";
import { usePayoutBoardStore } from "./payout-board-store";
import { usePayoutBoardQuery } from "./payout-query";
import { PayoutStatusBadge as Badge } from "./payout-status-badge";

export function AdminPayoutPage({
  initialData,
  dataSource = "mock",
}: {
  initialData: PayoutBoardPageData;
  dataSource?: PayoutDataSource;
}) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const queryClient = useQueryClient();
  const { data: boardData, queryKey } = usePayoutBoardQuery(initialData, dataSource);
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
    reset,
  } = usePayoutBoardStore();

  useAdminBoardReset(reset);

  const rows = useMemo(() => {
    const nextRows = boardData.allRows ?? boardData.rows;
    if (dataSource !== "mock" || typeof window === "undefined") return nextRows;
    const overrides = readMockPayoutOverrides(window.localStorage);
    return nextRows.map((row) => applyMockPayoutOverrideToRow(row, overrides[row.id] ?? null));
  }, [boardData, dataSource]);

  useEffect(() => {
    if (dataSource !== "mock") return;
    const updateRow = (event: Event) => {
      const nextDetail = (event as CustomEvent<PayoutDetailView>).detail;
      if (!nextDetail?.id) return;
      queryClient.setQueryData<PayoutBoardPageData>(queryKey, (current) => {
        if (!current) return current;
        const override = payoutMockOverrideFromDetail(nextDetail);
        const updateRows = (currentRows: PayoutBoardRow[]) => currentRows.map((row) => (
          row.id === nextDetail.id ? applyMockPayoutOverrideToRow(row, override) : row
        ));
        return {
          ...current,
          rows: updateRows(current.rows),
          allRows: current.allRows ? updateRows(current.allRows) : current.allRows,
        };
      });
    };
    window.addEventListener(PAYOUT_MOCK_UPDATED_EVENT, updateRow);
    return () => window.removeEventListener(PAYOUT_MOCK_UPDATED_EVENT, updateRow);
  }, [dataSource, queryClient, queryKey]);

  const filteredRows = searchPayoutRows(rows, query).filter((row) => payoutMatchesTab(row, tab));
  const tabCounts = countBoardTabMatches(rows, PAYOUT_BOARD_TABS, payoutMatchesTab);
  const sortedRows = sortPayoutRows(filteredRows, sortKey, sortDirection);
  const totalPages = payoutPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visibleRows = pagePayoutRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  function chooseTab(nextTab: PayoutBoardTab) {
    setTab(nextTab);
  }
  function choosePageSize(nextSize: PayoutBoardPageSize) { setPageSize(nextSize); }

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
            {PAYOUT_BOARD_TABS.map((item) => <TabsTrigger key={item.id} value={item.id}>{translateText(item.label)} ({tabCounts.get(item.id) ?? 0})</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2">
          <label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="payout-search"><span className="visually-hidden">{translateText("Search Payouts")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="payout-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={translateText("Search Payouts…")} autoComplete="off" /></label>
          <span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span>
          <PageSizeControls value={pageSize} translateText={translateText} onChange={choosePageSize} />
          <span className="ml-auto text-sm text-admin-muted max-[600px]:hidden" aria-live="polite">{translateText("Showing")} {pageStart}–{pageEnd} {translateText("of")} {sortedRows.length} {translateText("results")}</span>
        </div>
        {!sortedRows.length ? <EmptyState title={translateText("No matching Payouts")} description={translateText("There are no Payouts in this view.")} action={<UiButton variant="outline" type="button" onClick={() => { setQuery(""); setTab("all"); }}>{translateText("Reset view")}</UiButton>} /> : <div className="overflow-x-auto" aria-label={translateText("Payouts table")}><Table className={adminBoardTable}><caption>{translateText("Payouts")}</caption><thead><tr><AdminSortableHeader label={translateText("Payout")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Student")} sortKey="student" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Created At")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Principal")} sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="payout-row" data-payout-id={row.id} data-payout-drawer-trigger={row.id} key={row.id} tabIndex={0} aria-label={`${translateText("Open Payout")} ${row.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; void router.push(payoutRoutes.detail(row.id)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void router.push(payoutRoutes.detail(row.id)); } }}><td><Link className="row-record-button" data-payout-drawer-trigger={row.id} href={payoutRoutes.detail(row.id)} aria-label={`${translateText("Open Payout")} ${row.id}`}>{row.id}</Link></td><td><strong>{row.studentName}</strong><small>{row.studentEmail}</small></td><td>{formatPayoutDate(row.createdAt)}</td><td className="money">{formatPayoutMoney(row.principalSatang)}</td><td><Badge status={row.status} /></td></tr>)}</tbody></Table></div>}
        {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPage} ariaLabel={translateText("Payouts pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
      </Card>
    </main>
  );
}
