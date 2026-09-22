"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, TableCell, TableRow, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { reportRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { pageCount, pageRange, pageRows } from "../data/board-pagination";
import { countBoardTabMatches } from "../data/board-tab-counts";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import { dateSortValue, sortBoardRows } from "../data/board-sorting";
import type { ReportCaseModel } from "./report-model";
import type { ReportCasePageData } from "./report-service";
import { useReportBoardStore, type ReportCaseSortKey, type ReportCaseTab } from "./report-board-store";
import { useReportBoardQuery } from "./report-query";
import { adminBoardCount, adminBoardPagination, adminBoardTable } from "../../../components/admin/admin-record-styles";

const tabs: Array<{ id: ReportCaseTab; label: string }> = [
  { id: "open", label: "Open" },
  { id: "all", label: "All" },
  { id: "dismissed", label: "Dismissed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "restored", label: "Restored" },
];

function tabMatches(model: ReportCaseModel, tab: ReportCaseTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "open":
      return model.status === "REPORT_CASE_PENDING";
    case "dismissed":
      return model.status === "REPORT_CASE_DISMISSED";
    case "confirmed":
      return model.status === "REPORT_CASE_HIDDEN";
    case "restored":
      return model.status === "REPORT_CASE_RESTORED";
  }
}

function modelMatchesQuery(model: ReportCaseModel, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [
    model.id,
    model.reportedMemberId,
    model.reportedMemberName,
    model.reporterId,
    model.reporterName,
    model.reportType,
    model.detail,
  ].some((field) => field !== null && field.toLowerCase().includes(value));
}

function reportSortValue(model: ReportCaseModel, key: ReportCaseSortKey): string | number | null {
  switch (key) {
    case "id":
      return model.id;
    case "source":
      return model.source;
    case "reportedMember":
      return model.reportedMemberName;
    case "reporter":
      return model.reporterName;
    case "type":
      return model.reportType;
    case "status":
      return model.statusLabel;
    case "reported":
      return dateSortValue(model.submittedAt);
  }
}

export function ReportCaseBoard({ initialData }: { initialData?: ReportCasePageData }) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const {
    data: page,
    isPending,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReportBoardQuery(initialData);
  const {
    activeTab,
    query,
    pageSize,
    pageNumber,
    sortKey,
    sortDirection,
    setActiveTab,
    setQuery,
    setPageSize,
    setPageNumber,
    sortBy,
    reset,
  } = useReportBoardStore();
  const [paginationError, setPaginationError] = useState<string | null>(null);

  useAdminBoardReset(reset);

  const openDrawer = (id: string) => {
    router.push(reportRoutes.detail(id), { scroll: false });
  };

  const loadMore = async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    setPaginationError(null);
    try {
      await fetchNextPage();
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Report Cases could not load.");
    }
  };

  const loadAllPages = async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    setPaginationError(null);
    try {
      let result = await fetchNextPage();
      while (result.hasNextPage) result = await fetchNextPage();
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Report Cases could not load.");
    }
  };

  if (isPending) return <AdminLoading message={translateText("Loading Report Cases…")} />;
  if (queryError) {
    const loadError = queryError instanceof Error ? queryError.message : "Report Cases could not load.";
    return <main className="admin-feedback"><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Report Cases unavailable")}</h1></CardHeader><p className="p-5">{translateText(loadError)}</p></Card></main>;
  }

  const filteredModels = page.items.filter((model) => tabMatches(model, activeTab) && modelMatchesQuery(model, query));
  const models = sortKey ? sortBoardRows(filteredModels, (model) => reportSortValue(model, sortKey), sortDirection) : filteredModels;
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const tabCounts = countBoardTabMatches(page.items, tabs, tabMatches);

  return (
      <main id="report-main" className="admin-route-page report-case-board" tabIndex={-1}>
        <AdminPageHeader title={translateText("Report Cases")} description={translateText("Review Report Cases about Message or Attachment content.")} />
        <Card as="section" className="overflow-hidden" aria-labelledby="report-case-board-heading">
          <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
            <div><CardTitle id="report-case-board-heading">{translateText("Report Cases")}</CardTitle><CardDescription>{translateText("Report Case behavior is separate from Conduct Report behavior.")}</CardDescription></div><span className={adminBoardCount}>{visibleModels.length} {translateText("shown")}</span>
          </CardHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportCaseTab)}>
            <TabsList className="px-3" aria-label={translateText("Report Case status filters")}>
              {tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{translateText(tab.label)} ({tabCounts.get(tab.id) ?? 0})</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="report-case-search"><span className="visually-hidden">{translateText("Search Report Cases")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="report-case-search" type="search" aria-label={translateText("Search Report Cases")} placeholder={translateText("Search by Report Case, Member, or Report type")} value={query} onChange={(event) => setQuery(event.target.value)} /></label><span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><PageSizeControls value={pageSize} disabled={isFetchingNextPage} translateText={translateText} onChange={(size) => { setPageSize(size); if (size === "all") void loadAllPages(); }} /><span className={adminBoardCount} aria-live="polite">{isFetchingNextPage ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span></div>
          <div className="overflow-x-auto" aria-label={translateText("Report Cases table")}>
            <Table className={`${adminBoardTable} !min-w-[760px]`}>
              <caption>{translateText("Report Cases")}</caption>
            <thead><TableRow><AdminSortableHeader label={translateText("Report Case")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Source")} sortKey="source" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Reported Member")} sortKey="reportedMember" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Reported by")} sortKey="reporter" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Report type")} sortKey="type" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Reported")} sortKey="reported" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></TableRow></thead>
            <tbody>
              {visibleModels.map((model) => {
                  return <TableRow className="focus-visible:outline-2 focus-visible:outline-admin-accent focus-visible:outline-offset-[-2px]" key={model.id} data-report-id={model.id} tabIndex={0} aria-label={`${translateText("Open Report Case")} ${model.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; openDrawer(model.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDrawer(model.id); } }}>
                    <TableCell><button className="min-h-8 border-0 bg-transparent p-0 text-left text-sm text-admin-text hover:text-admin-accent hover:underline hover:underline-offset-4" type="button" data-report-id={model.id} aria-label={`${translateText("Open Report Case")} ${model.id}`} onClick={(event) => { event.stopPropagation(); openDrawer(model.id); }}><strong>{model.id}</strong></button><small>{translateText(model.title)}</small></TableCell>
                    <TableCell>{translateText(model.source)}</TableCell>
                    <TableCell>{model.reportedMemberHref ? <Link className="text-admin-accent no-underline hover:underline hover:underline-offset-4" href={model.reportedMemberHref} onClick={(event) => event.stopPropagation()}>{model.reportedMemberName}</Link> : model.reportedMemberName}<small>{model.reportedMemberId || "—"}</small></TableCell>
                    <TableCell>{model.reporterHref ? <Link className="text-admin-accent no-underline hover:underline hover:underline-offset-4" href={model.reporterHref} onClick={(event) => event.stopPropagation()}>{model.reporterName}</Link> : model.reporterName}<small>{model.reporterId ?? "—"}</small></TableCell>
                    <TableCell>{translateText(model.reportType)}</TableCell>
                    <TableCell><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></TableCell>
                    <TableCell>{formatAdminTimestamp(model.submittedAt)}</TableCell>
                  </TableRow>;
                })}
              </tbody>
            </Table>
            {!models.length && <EmptyState title={translateText("No matching Report Cases")} description={translateText("Change the status filter or search text.")} />}
          </div>
          {hasNextPage && (
            <div className="border-t border-admin-border px-3 py-3 text-sm text-admin-muted">
              {models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Report Cases pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
              <Button variant="outline" size="sm" type="button" data-report-load-more onClick={loadMore} disabled={isFetchingNextPage}>
                {translateText(isFetchingNextPage ? "Loading more Report Cases…" : "Load more Report Cases")}
              </Button>
              {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
            </div>
          )}
          {!hasNextPage && models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Report Cases pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
        </Card>
      </main>
  );
}
