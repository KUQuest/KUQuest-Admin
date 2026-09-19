"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, TableCell, TableHead, TableRow, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { isAdminApiEnabled } from "../api/admin-provider";
import { conductReportRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { loadAllConductReportsFromMock as loadAllConductReportsFromMockData, loadConductReportsFromMock } from "./conduct-report-adapter";
import { pageCount, pageRange, pageRows, type AdminBoardPageSize } from "../data/board-pagination";
import { dateSortValue, sortBoardRows, toggleBoardSort, type BoardSortDirection } from "../data/board-sorting";
import {
  CONDUCT_REPORT_UPDATED_EVENT,
  type ConductReportModel,
} from "./conduct-report-model";
import { loadConductReportPageData, type ConductReportPageData } from "./conduct-report-service";
import { adminBoardCount, adminBoardPagination, adminBoardTable } from "../../../components/admin/admin-record-styles";

type ConductReportTab = "all" | "open" | "confirmed" | "dismissed";
type ConductReportSortKey = "id" | "quest" | "reportedMember" | "reporter" | "reason" | "status" | "reported";

const tabs: Array<{ id: ConductReportTab; label: string }> = [
  { id: "open", label: "Open" },
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "dismissed", label: "Dismissed" },
];

function tabMatches(model: ConductReportModel, tab: ConductReportTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "open":
      return model.status === "CONDUCT_REPORT_PENDING";
    case "confirmed":
      return model.status === "CONDUCT_REPORT_UPHELD";
    case "dismissed":
      return model.status === "CONDUCT_REPORT_DISMISSED";
  }
}

function modelMatchesQuery(model: ConductReportModel, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [
    model.id,
    model.questId,
    model.questTitle,
    model.reportedMemberId,
    model.reportedMemberName,
    model.reporterId,
    model.reporterName,
    model.reason,
    model.detail,
  ].some((field) => field !== null && field.toLowerCase().includes(value));
}

function conductSortValue(model: ConductReportModel, key: ConductReportSortKey): string | number | null {
  switch (key) {
    case "id":
      return model.id;
    case "quest":
      return model.questTitle;
    case "reportedMember":
      return model.reportedMemberName;
    case "reporter":
      return model.reporterName;
    case "reason":
      return model.reason;
    case "status":
      return model.statusLabel;
    case "reported":
      return dateSortValue(model.submittedAt);
  }
}

function loadAllConductReportsFromMock(storage: Storage): ConductReportPageData {
  return loadAllConductReportsFromMockData(storage);
}

export function ConductReportBoard({
  initialData,
}: {
  initialData?: ConductReportPageData;
}) {
  const { translateText } = useAdminShell();
  const [page, setPage] = useState<ConductReportPageData | null>(initialData ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<ConductReportTab>("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<AdminBoardPageSize>(10);
  const [pageNumber, setPageNumber] = useState(1);
  const [sortKey, setSortKey] = useState<ConductReportSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<BoardSortDirection>("ascending");
  const router = useRouter();

  useEffect(() => {
    if (initialData || isAdminApiEnabled()) return;
    let cancelled = false;
    try {
      const nextPage = loadAllConductReportsFromMock(localStorage);
      if (!cancelled) setPage(nextPage);
    } catch (error: unknown) {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : "Conduct Reports could not load.");
      }
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
      const model = (event as CustomEvent<ConductReportModel>).detail;
      if (!model) return;
      setPage((current) => current
        ? { ...current, items: current.items.map((item) => item.id === model.id ? model : item) }
        : current);
    };
    window.addEventListener(CONDUCT_REPORT_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(CONDUCT_REPORT_UPDATED_EVENT, updateRecord);
  }, []);

  const loadMore = async () => {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const nextPage = page.source === "mock"
        ? loadConductReportsFromMock(localStorage, page.nextCursor)
        : await loadConductReportPageData(undefined, page.nextCursor);
      setPage((current) => current
        ? { ...current, items: [...current.items, ...nextPage.items], nextCursor: nextPage.nextCursor }
        : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Conduct Reports could not load.");
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
        setPage(loadAllConductReportsFromMockData(localStorage));
        return;
      }
      const items = [...page.items];
      let cursor: string | undefined = page.nextCursor ?? undefined;
      while (cursor) {
        const nextPage: Pick<ConductReportPageData, "items" | "nextCursor"> = await loadConductReportPageData(undefined, cursor);
        items.push(...nextPage.items);
        if (nextPage.nextCursor === cursor) break;
        cursor = nextPage.nextCursor ?? undefined;
      }
      setPage((current) => current ? { ...current, items, nextCursor: cursor ?? null } : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Conduct Reports could not load.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (loadError) {
    return (
      <main className="admin-feedback">
        <Card as="section" className="overflow-hidden">
          <CardHeader><h1 className="text-lg font-semibold">{translateText("Conduct Reports unavailable")}</h1></CardHeader>
          <p className="p-5">{translateText(loadError)}</p>
        </Card>
      </main>
    );
  }
  if (!page) return <AdminLoading message={translateText("Loading Conduct Reports…")} />;

  const filteredModels = page.items.filter((model) => tabMatches(model, activeTab) && modelMatchesQuery(model, query));
  const models = sortKey ? sortBoardRows(filteredModels, (model) => conductSortValue(model, sortKey), sortDirection) : filteredModels;
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const openCount = page.items.filter((model) => model.status === "CONDUCT_REPORT_PENDING").length;
  const openDrawer = (id: string) => {
    router.push(conductReportRoutes.detail(id), { scroll: false });
  };

  function sortBy(nextKey: ConductReportSortKey) {
    setPageNumber(1);
    setSortDirection((direction) => toggleBoardSort(sortKey, nextKey, direction));
    setSortKey(nextKey);
  }

  return (
    <>
      <main id="conduct-report-main" className="admin-route-page conduct-report-board" tabIndex={-1}>
        <AdminPageHeader title={translateText("Conduct Reports")} description={translateText("Review Member behavior on Quests.")} />
        <Card as="section" className="overflow-hidden" aria-labelledby="conduct-report-board-heading">
          <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
            <div>
              <CardTitle id="conduct-report-board-heading">{translateText("Conduct Reports")}</CardTitle>
              <CardDescription>{translateText("Conduct Report behavior is separate from Report Case behavior.")}</CardDescription>
            </div>
            <span className={adminBoardCount}>{visibleModels.length} {translateText("shown")}</span>
          </CardHeader>
          <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as ConductReportTab); setPageNumber(1); }}>
            <TabsList className="flex w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-admin-border px-3" aria-label={translateText("Conduct Report status filters")}>
              {tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id} className="min-h-10 shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 text-sm text-admin-muted data-[state=active]:border-admin-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-admin-text data-[state=active]:shadow-none">{translateText(tab.label)}{tab.id === "open" ? ` (${openCount})` : null}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2">
            <label className="admin-filter-label flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text" htmlFor="conduct-report-search">
              {translateText("Search Conduct Reports")}
              <Input
                className="admin-filter-input h-9 min-h-9 px-3 py-1.5 text-sm"
                id="conduct-report-search"
                type="search"
                aria-label={translateText("Search Conduct Reports")}
                placeholder={translateText("Search by Conduct Report, Member, Quest, or reason")}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPageNumber(1); }}
              />
            </label>
            <PageSizeControls value={pageSize} disabled={loadingMore} translateText={translateText} onChange={(size) => { setPageSize(size); setPageNumber(1); if (size === "all") void loadAllPages(); }} />
            <span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><span className={adminBoardCount} aria-live="polite">{loadingMore ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span>
          </div>
          <div className="overflow-x-auto" aria-label={translateText("Conduct Reports table")}>
            <Table className={`${adminBoardTable} !min-w-[760px]`}>
              <caption>{translateText("Conduct Reports")}</caption>
              <thead>
                <TableRow>
                  <SortableHeader label={translateText("Conduct Report")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label={translateText("Quest")} sortKey="quest" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label={translateText("Reported Member")} sortKey="reportedMember" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label={translateText("Reported by")} sortKey="reporter" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label={translateText("Reason")} sortKey="reason" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                  <SortableHeader label={translateText("Reported")} sortKey="reported" activeKey={sortKey} direction={sortDirection} onSort={sortBy} />
                </TableRow>
              </thead>
              <tbody>
                {visibleModels.map((model) => (
                  <TableRow
                    className="focus-visible:outline-2 focus-visible:outline-admin-accent focus-visible:outline-offset-[-2px]"
                    key={model.id}
                    data-conduct-report-id={model.id}
                    data-conduct-report-status={model.status}
                    tabIndex={0}
                    aria-label={`${translateText("Open Conduct Report")} ${model.id}`}
                    onClick={() => openDrawer(model.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDrawer(model.id);
                      }
                    }}
                  >
                    <TableCell>
                      <button
                        className="min-h-8 border-0 bg-transparent p-0 text-left text-sm text-admin-text hover:text-admin-accent hover:underline hover:underline-offset-4"
                        type="button"
                        data-conduct-report-id={model.id}
                        aria-label={`${translateText("Open Conduct Report")} ${model.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDrawer(model.id);
                        }}
                      >
                        <strong>{model.id}</strong>
                      </button>
                      <small>{translateText(model.title)}</small>
                    </TableCell>
                    <TableCell><strong>{model.questTitle}</strong><small>{model.questId ?? "—"}</small></TableCell>
                    <TableCell>
                      {model.reportedMemberHref
                        ? <Link className="text-admin-accent no-underline hover:underline hover:underline-offset-4" href={model.reportedMemberHref} onClick={(event) => event.stopPropagation()}>{model.reportedMemberName}</Link>
                        : model.reportedMemberName}
                      <small>{model.reportedMemberId || "—"}</small>
                    </TableCell>
                    <TableCell>
                      {model.reporterHref
                        ? <Link className="text-admin-accent no-underline hover:underline hover:underline-offset-4" href={model.reporterHref} onClick={(event) => event.stopPropagation()}>{model.reporterName}</Link>
                        : model.reporterName}
                      <small>{model.reporterId ?? "—"}</small>
                    </TableCell>
                    <TableCell>{translateText(model.reason)}</TableCell>
                    <TableCell><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></TableCell>
                    <TableCell>{formatAdminTimestamp(model.submittedAt)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
            {!models.length && <EmptyState title={translateText("No matching Conduct Reports")} description={translateText("Change the status filter or search text.")} />}
          </div>
          {page.nextCursor && (
            <div className="border-t border-admin-border px-3 py-3 text-sm text-admin-muted">
              {models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Conduct Reports pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
              <Button variant="outline" size="sm" type="button" data-conduct-report-load-more onClick={loadMore} disabled={loadingMore}>
                {translateText(loadingMore ? "Loading more Conduct Reports…" : "Load more Conduct Reports")}
              </Button>
              {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
            </div>
          )}
          {!page.nextCursor && models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Conduct Reports pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
        </Card>
      </main>
    </>
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
  sortKey: ConductReportSortKey;
  activeKey: ConductReportSortKey | null;
  direction: BoardSortDirection;
  onSort: (key: ConductReportSortKey) => void;
}) {
  const active = activeKey === sortKey;
  return <TableHead aria-sort={active ? direction : "none"}><button className={`table-sort${active ? " is-active" : ""}`} type="button" onClick={() => onSort(sortKey)}>{label}<span className="sort-indicator" aria-hidden="true">{active ? (direction === "ascending" ? "↑" : "↓") : "↕"}</span></button></TableHead>;
}
