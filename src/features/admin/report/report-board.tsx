"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, TableCell, TableHead, TableRow, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { isAdminApiEnabled } from "../api/admin-provider";
import { reportRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { loadAllReportCasesFromMock as loadAllReportCasesFromMockData, loadReportCasesFromMock } from "./report-adapter";
import { pageCount, pageRange, pageRows, type AdminBoardPageSize } from "../data/board-pagination";
import { dateSortValue, sortBoardRows, toggleBoardSort, type BoardSortDirection } from "../data/board-sorting";
import {
  REPORT_CASE_UPDATED_EVENT,
  type ReportCaseModel,
} from "./report-model";
import { loadReportCasePageData, type ReportCasePageData } from "./report-service";
import { adminBoardCount, adminBoardPagination, adminBoardTable, adminSortIndicator, adminTableSort } from "../../../components/admin/admin-record-styles";

type ReportCaseTab = "all" | "open" | "dismissed" | "confirmed" | "restored";
type ReportCaseSortKey = "id" | "source" | "reportedMember" | "reporter" | "type" | "status" | "reported";

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

function loadAllReportCasesFromMock(storage: Storage): ReportCasePageData {
  return loadAllReportCasesFromMockData(storage);
}

export function ReportCaseBoard({ initialData }: { initialData?: ReportCasePageData }) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const [page, setPage] = useState<ReportCasePageData | null>(initialData ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportCaseTab>("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<AdminBoardPageSize>(10);
  const [pageNumber, setPageNumber] = useState(1);
  const [sortKey, setSortKey] = useState<ReportCaseSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<BoardSortDirection>("ascending");

  useEffect(() => {
    if (initialData || isAdminApiEnabled()) return;
    let cancelled = false;
    try {
      const nextPage = loadAllReportCasesFromMock(localStorage);
      if (!cancelled) setPage(nextPage);
    } catch (error: unknown) {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "Report Cases could not load.");
    }
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  useEffect(() => {
    if (initialData) setPage(initialData);
  }, [initialData]);

  useEffect(() => {
    const updateRecord = (event: Event) => {
      const model = (event as CustomEvent<ReportCaseModel>).detail;
      if (!model) return;
      setPage((current) => current
        ? { ...current, items: current.items.map((item) => item.id === model.id ? model : item) }
        : current);
    };
    window.addEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
  }, []);

  const openDrawer = (id: string) => {
    router.push(reportRoutes.detail(id), { scroll: false });
  };

  const loadMore = async () => {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const nextPage = page.source === "mock"
        ? loadReportCasesFromMock(localStorage, page.nextCursor)
        : await loadReportCasePageData(undefined, page.nextCursor);
      setPage((current) => current
        ? { ...current, items: [...current.items, ...nextPage.items], nextCursor: nextPage.nextCursor }
        : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Report Cases could not load.");
    } finally {
      setLoadingMore(false);
    }
  };

  const loadAllPages = async () => {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      if (page.source === "mock") {
        setPage(loadAllReportCasesFromMockData(localStorage));
        return;
      }
      const items = [...page.items];
      let cursor: string | undefined = page.nextCursor ?? undefined;
      while (cursor) {
        const nextPage: Pick<ReportCasePageData, "items" | "nextCursor"> = await loadReportCasePageData(undefined, cursor);
        items.push(...nextPage.items);
        if (nextPage.nextCursor === cursor) break;
        cursor = nextPage.nextCursor ?? undefined;
      }
      setPage((current) => current ? { ...current, items, nextCursor: cursor ?? null } : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Report Cases could not load.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (!page) return <AdminLoading message={translateText(loadError ?? "Loading Report Cases…")} />;
  if (loadError) {
    return <main className="admin-feedback"><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Report Cases unavailable")}</h1></CardHeader><p className="p-5">{translateText(loadError)}</p></Card></main>;
  }

  const filteredModels = page.items.filter((model) => tabMatches(model, activeTab) && modelMatchesQuery(model, query));
  const models = sortKey ? sortBoardRows(filteredModels, (model) => reportSortValue(model, sortKey), sortDirection) : filteredModels;
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const openCount = page.items.filter((model) => model.status === "REPORT_CASE_PENDING").length;

  function sortBy(nextKey: ReportCaseSortKey) {
    setPageNumber(1);
    setSortDirection((direction) => toggleBoardSort(sortKey, nextKey, direction));
    setSortKey(nextKey);
  }

  return (
      <main id="report-main" className="admin-route-page report-case-board" tabIndex={-1}>
        <AdminPageHeader title={translateText("Report Cases")} description={translateText("Review Report Cases about Message or Attachment content.")} />
        <Card as="section" className="overflow-hidden" aria-labelledby="report-case-board-heading">
          <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
            <div><CardTitle id="report-case-board-heading">{translateText("Report Cases")}</CardTitle><CardDescription>{translateText("Report Case behavior is separate from Conduct Report behavior.")}</CardDescription></div><span className={adminBoardCount}>{visibleModels.length} {translateText("shown")}</span>
          </CardHeader>
          <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as ReportCaseTab); setPageNumber(1); }}>
            <TabsList className="px-3" aria-label={translateText("Report Case status filters")}>
              {tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{translateText(tab.label)}{tab.id === "open" ? ` (${openCount})` : null}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="report-case-search"><span className="visually-hidden">{translateText("Search Report Cases")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="report-case-search" type="search" aria-label={translateText("Search Report Cases")} placeholder={translateText("Search by Report Case, Member, or Report type")} value={query} onChange={(event) => { setQuery(event.target.value); setPageNumber(1); }} /></label><span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><PageSizeControls value={pageSize} disabled={loadingMore} translateText={translateText} onChange={(size) => { setPageSize(size); setPageNumber(1); if (size === "all") void loadAllPages(); }} /><span className={adminBoardCount} aria-live="polite">{loadingMore ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span></div>
          <div className="overflow-x-auto" aria-label={translateText("Report Cases table")}>
            <Table className={`${adminBoardTable} !min-w-[760px]`}>
              <caption>{translateText("Report Cases")}</caption>
            <thead><TableRow><SortableHeader label={translateText("Report Case")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Source")} sortKey="source" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Reported Member")} sortKey="reportedMember" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Reported by")} sortKey="reporter" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Report type")} sortKey="type" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Reported")} sortKey="reported" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></TableRow></thead>
            <tbody>
              {visibleModels.map((model) => {
                  return <TableRow className="focus-visible:outline-2 focus-visible:outline-admin-accent focus-visible:outline-offset-[-2px]" key={model.id} data-report-id={model.id} tabIndex={0} aria-label={`${translateText("Open Report Case")} ${model.id}`} onClick={() => openDrawer(model.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDrawer(model.id); } }}>
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
          {page.nextCursor && (
            <div className="border-t border-admin-border px-3 py-3 text-sm text-admin-muted">
              {models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Report Cases pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
              <Button variant="outline" size="sm" type="button" data-report-load-more onClick={loadMore} disabled={loadingMore}>
                {translateText(loadingMore ? "Loading more Report Cases…" : "Load more Report Cases")}
              </Button>
              {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
            </div>
          )}
          {!page.nextCursor && models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Report Cases pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
        </Card>
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
  sortKey: ReportCaseSortKey;
  activeKey: ReportCaseSortKey | null;
  direction: BoardSortDirection;
  onSort: (key: ReportCaseSortKey) => void;
}) {
  const active = activeKey === sortKey;
  return <TableHead aria-sort={active ? direction : "none"}><button className={adminTableSort(active)} type="button" onClick={() => onSort(sortKey)}>{label}<span className={adminSortIndicator(active)} aria-hidden="true">{active ? (direction === "ascending" ? "↑" : "↓") : "↕"}</span></button></TableHead>;
}
