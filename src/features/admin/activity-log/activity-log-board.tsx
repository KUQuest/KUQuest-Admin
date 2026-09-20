"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table } from "../../../components/ui";
import { adminBoardCount, adminBoardPagination, adminBoardTable, adminRecordFact, adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection, adminSortIndicator, adminTableSort } from "../../../components/admin/admin-record-styles";
import { isAdminMockEnabled } from "../../../lib/auth/admin-auth-mode";
import { isAdminApiEnabled } from "../api/admin-provider";
import {
  activityLogCsv,
  activityLogActionLabel,
  activityLogMatchesSearch,
  activityLogReasonLabel,
  activityLogResourceTypeLabel,
  activityLogStateLabel,
  activityLogTargetLabel,
  activityTargetHref,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
  type ActivityLogEntry,
} from "./activity-log-model";
import { pageCount, pageRange, pageRows } from "../data/board-pagination";
import { sortBoardRows, type BoardSortDirection } from "../data/board-sorting";
import type { ActivityLogPageData } from "./activity-log-service";
import { useActivityLogBoardStore, type ActivityLogSortKey } from "./activity-log-board-store";
import { useActivityLogQuery } from "./activity-log-query";
import { formatAdminTimestamp } from "../date-format";

export type ActivityLogBoardProps = {
  initialData?: ActivityLogPageData;
  initialError?: string;
};

type ActivityLogDetailProps = {
  entry: ActivityLogEntry;
  onClose: () => void;
  onOpenTarget: (entry: ActivityLogEntry) => void;
};
const EMPTY_ACTIVITY_LOG_ENTRIES: ActivityLogEntry[] = [];

function displayValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
}

function activityLogSortValue(entry: ActivityLogEntry, key: ActivityLogSortKey): string | number | null {
  switch (key) {
    case "timestamp":
      return entry.createdAtTimestamp;
    case "actor":
      return entry.adminName;
    case "activity":
      return activityLogActionLabel(entry.action);
    case "target":
      return activityLogTargetLabel(entry);
    case "reason":
      return activityLogReasonLabel(entry.reasonCode);
  }
}

function ActivityLogDetail({ entry, onClose, onOpenTarget }: ActivityLogDetailProps) {
  const { translateText } = useAdminShell();
  const targetHref = activityTargetHref(entry.resourceType, entry.resourceId);
  const target = activityLogTargetLabel(entry);

  return (
    <AdminDrawer
      ariaLabel={translateText("Close Activity Log detail")}
      title={translateText("Activity log entry")}
      titleId="activity-log-detail-title"
      subtitle={translateText(activityLogActionLabel(entry.action))}
      className="activity-log-dialog"
      onClose={onClose}
    >
        <div className="activity-log-detail admin-drawer-content-flow grid min-w-0 content-start gap-[18px]">
          <div className="drawer-title m-0 pb-1">
            <span className="att-icon neutral" aria-hidden="true">↺</span>
            <div>
              <h2 id="activity-log-detail-title" className="text-lg font-semibold leading-[1.4]">{translateText(activityLogActionLabel(entry.action))}</h2>
              <p><span className="activity-log-target block min-w-0 break-words text-admin-text no-underline">{translateText(displayValue(target))}</span></p>
            </div>
          </div>
          <Card as="section" className={`${adminRecordSection} activity-log-record-section`} aria-labelledby="activity-log-record-heading">
            <CardHeader flush className={adminRecordHeader}><h3 id="activity-log-record-heading" className={adminRecordHeading}>{translateText("Activity record")}</h3></CardHeader>
            <div className={adminRecordFacts}>
              <div className={adminRecordFact}><span>{translateText("Timestamp")}</span><strong>{formatActivityLogTimestamp(entry.createdAt)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Action")}</span><strong>{translateText(activityLogActionLabel(entry.action))}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Resource type")}</span><strong>{translateText(activityLogResourceTypeLabel(entry.resourceType))}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Resource ID")}</span><strong>{displayValue(entry.resourceId)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Reason code")}</span><strong>{translateText(activityLogReasonLabel(entry.reasonCode))}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Reason catalog version")}</span><strong>{displayValue(entry.reasonCatalogVersion)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Activity ID")}</span><strong>{displayValue(entry.id)}</strong></div>
            </div>
          </Card>
          <Card as="section" className={`${adminRecordSection} activity-log-admin-section`} aria-labelledby="activity-log-admin-heading">
            <CardHeader flush className={adminRecordHeader}><h3 id="activity-log-admin-heading" className={adminRecordHeading}>{translateText("Admin")}</h3></CardHeader>
            <div className={adminRecordFacts}>
              <div className={adminRecordFact}><span>{translateText("Actor")}</span><strong>{displayValue(entry.adminName)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Admin ID")}</span><strong>{displayValue(entry.adminId)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Admin first name")}</span><strong>{displayValue(entry.admin.firstName)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Admin last name")}</span><strong>{displayValue(entry.admin.lastName)}</strong></div>
            </div>
          </Card>
          <Card as="section" className={`${adminRecordSection} activity-log-result-section`} aria-labelledby="activity-log-result-heading">
            <CardHeader flush className={adminRecordHeader}><h3 id="activity-log-result-heading" className={adminRecordHeading}>{translateText("Result")}</h3></CardHeader>
            <div className={adminRecordFacts}>
              <div className={adminRecordFact}><span>{translateText("Result version")}</span><strong>{displayValue(entry.resultVersion)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Result timestamp")}</span><strong>{formatAdminTimestamp(entry.resultTimestamp)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Relative time")}</span><strong>{formatActivityLogRelativeTime(entry.createdAt)}</strong></div>
            </div>
          </Card>
          <Card as="section" className={`${adminRecordSection} activity-log-state-section`} aria-labelledby="activity-log-state-heading">
            <CardHeader flush className={adminRecordHeader}><h3 id="activity-log-state-heading" className={adminRecordHeading}>{translateText("State change")}</h3></CardHeader>
            {entry.previousState || entry.newState ? (
              <div className="activity-log-state-change grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 max-[600px]:grid-cols-1">
                <div className="min-w-0 rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="block text-sm text-admin-muted">{translateText("Previous state")}</span><strong className="mt-1 block break-words text-base font-semibold">{translateText(activityLogStateLabel(entry.previousState))}</strong></div>
                <span className="activity-log-state-arrow text-xl font-extrabold text-admin-accent max-[600px]:justify-self-center max-[600px]:rotate-90" aria-hidden="true">→</span>
                <div className="min-w-0 rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="block text-sm text-admin-muted">{translateText("New state")}</span><strong className="mt-1 block break-words text-base font-semibold">{translateText(activityLogStateLabel(entry.newState))}</strong></div>
              </div>
            ) : <p className="activity-log-missing-context m-0 text-[15px] leading-[1.45] text-admin-muted">{translateText("Before and after state are not included in this record.")}</p>}
            {entry.note ? <p className="activity-log-note m-0 mt-3 grid gap-1 rounded-admin-sm bg-admin-soft p-2.5 text-[15px] leading-[1.45] text-admin-muted"><strong className="text-[17px] leading-[1.4] text-admin-text">{translateText("Admin note")}</strong>{entry.note}</p> : null}
          </Card>
          <div className="admin-drawer-actions sticky bottom-[-28px] z-[4] m-[18px_-24px_-28px] flex flex-wrap gap-2 border-t border-admin-border bg-admin-surface/95 px-6 py-3.5 shadow-[0_-6px_18px_rgba(0,0,0,0.09)] [&>*]:min-h-11 [&>*]:flex-[1_1_180px] [&>*]:text-center max-[720px]:bottom-[-24px] max-[720px]:m-[18px_-16px_-24px] max-[720px]:px-4 max-[720px]:[&>*]:basis-full">
            {targetHref ? <Button variant="primary" className="min-w-0 flex-[1.35]" type="button" onClick={() => onOpenTarget(entry)}>{translateText("View linked detail")}</Button> : null}
            <Button variant="outline" type="button" onClick={onClose}>{translateText("Close")}</Button>
          </div>
        </div>
    </AdminDrawer>
  );
}

export function ActivityLogBoard({ initialData, initialError }: ActivityLogBoardProps) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const apiEnabled = isAdminApiEnabled();
  const mockEnabled = isAdminMockEnabled();
  const {
    appliedFilters,
    draftFilters,
    search,
    pageSize,
    pageNumber,
    sortKey,
    sortDirection,
    setDraftFilters,
    applyFilters: applyBoardFilters,
    clearFilters: clearBoardFilters,
    setSearch,
    setPageSize,
    setPageNumber,
    sortBy,
    reset,
  } = useActivityLogBoardStore();
  const query = useActivityLogQuery(appliedFilters, initialData);
  const page = query.data?.pages.reduce<ActivityLogPageData | null>((current, next) => current
    ? { ...next, items: [...current.items, ...next.items] }
    : next, null) ?? null;
  const entries = page?.items ?? EMPTY_ACTIVITY_LOG_ENTRIES;
  const queryError = query.error instanceof Error ? query.error.message : query.error ? "The Admin API is unavailable." : null;
  const loadError = queryError ?? initialError ?? null;
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const loading = query.isPending || query.isFetching;
  useEffect(() => {
    reset();
  }, [reset]);
  const closeDetails = useCallback(() => setSelectedEntry(null), []);
  const openLinkedDetail = useCallback((entry: ActivityLogEntry) => {
    const href = activityTargetHref(entry.resourceType, entry.resourceId);
    if (!href) return;
    closeDetails();
    router.push(href, { scroll: false });
  }, [closeDetails, router]);

  const filteredEntries = useMemo(
    () => entries
      .filter((entry) => activityLogMatchesSearch(entry, search)),
    [entries, search],
  );
  const sortedEntries = useMemo(
    () => sortKey ? sortBoardRows(filteredEntries, (entry) => activityLogSortValue(entry, sortKey), sortDirection) : filteredEntries,
    [filteredEntries, sortDirection, sortKey],
  );
  const totalPages = pageCount(sortedEntries.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleEntries = useMemo(
    () => pageRows(sortedEntries, currentPage, pageSize),
    [currentPage, pageSize, sortedEntries],
  );
  const { start: pageStart, end: pageEnd } = pageRange(sortedEntries.length, currentPage, pageSize);

  const applyFilters = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaginationError(null);
    applyBoardFilters();
  }, [applyBoardFilters]);

  const clearFilters = useCallback(() => {
    setPaginationError(null);
    clearBoardFilters();
  }, [clearBoardFilters]);

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    setPaginationError(null);
    void query.fetchNextPage().catch((error: unknown) => {
      setPaginationError(error instanceof Error ? error.message : "More Activity Log records could not load.");
    });
  }, [query]);

  const retry = useCallback(() => {
    setPaginationError(null);
    void query.refetch();
  }, [query]);

  const exportCsv = useCallback(() => {
    const csv = activityLogCsv(filteredEntries);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "activity-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [filteredEntries]);

  if (!apiEnabled && !mockEnabled) {
    return (
      <main id="activity-main" className="admin-route-page activity-log-board" tabIndex={-1}>
        <AdminPageHeader title={translateText("Activity Log")} description={translateText("An audit trail of administrative decisions.")} />
        <Card as="section" className="overflow-hidden" aria-labelledby="activity-unavailable-title">
          <EmptyState className="border-0 rounded-none p-[60px_24px]" title={translateText("Activity Log unavailable")} description={translateText("The Admin API is required to display this read-only log.")} />
        </Card>
      </main>
    );
  }

  return (
    <main id="activity-main" className="admin-route-page activity-log-board" tabIndex={-1}>
        <AdminPageHeader title={translateText("Activity Log")} description={translateText("An audit trail of administrative decisions.")} actions={<Button variant="outline" type="button" onClick={exportCsv} disabled={!visibleEntries.length}>{translateText("Export CSV")}</Button>} />
      <Card as="section" className="overflow-hidden" aria-labelledby="activity-log-heading">
        <CardHeader className="flex min-h-[60px] items-center justify-between gap-4"><div><CardTitle id="activity-log-heading">{translateText("Activity Log")}</CardTitle><CardDescription>{translateText("Review the administrative audit trail.")}</CardDescription></div><span className={adminBoardCount} aria-live="polite">{filteredEntries.length} {translateText("loaded entries")}</span></CardHeader>
        <form className="mb-4 grid gap-3.5 rounded-admin-sm border border-admin-border bg-admin-soft p-3.5" onSubmit={applyFilters}>
          <div className="grid grid-cols-2 gap-3 min-[701px]:grid-cols-3 min-[1101px]:grid-cols-5">
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-action-filter">{translateText("Action filter")}<Input id="activity-action-filter" type="search" value={draftFilters.action} onChange={(event) => setDraftFilters({ action: event.target.value })} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-resource-type-filter">{translateText("Resource type filter")}<Input id="activity-resource-type-filter" type="search" value={draftFilters.resourceType} onChange={(event) => setDraftFilters({ resourceType: event.target.value })} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-resource-id-filter">{translateText("Resource ID filter")}<Input id="activity-resource-id-filter" type="search" value={draftFilters.resourceId} onChange={(event) => setDraftFilters({ resourceId: event.target.value })} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-admin-id-filter">{translateText("Admin ID filter")}<Input id="activity-admin-id-filter" type="search" value={draftFilters.adminId} onChange={(event) => setDraftFilters({ adminId: event.target.value })} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-from-date-filter">{translateText("From date")}<Input id="activity-from-date-filter" type="date" value={draftFilters.fromDate} onChange={(event) => setDraftFilters({ fromDate: event.target.value })} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-to-date-filter">{translateText("To date")}<Input id="activity-to-date-filter" type="date" value={draftFilters.toDate} onChange={(event) => setDraftFilters({ toDate: event.target.value })} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-sort">{translateText("Sort activity")}<Select value={draftFilters.sort} onValueChange={(value) => setDraftFilters({ sort: value === "oldest" ? "oldest" : "newest" })}><SelectTrigger id="activity-sort"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">{translateText("Newest first")}</SelectItem><SelectItem value="oldest">{translateText("Oldest first")}</SelectItem></SelectContent></Select></label>
          </div>
          <div className="flex justify-end gap-2 max-[700px]:justify-start"><Button variant="primary" type="submit" disabled={loading}>{translateText("Apply filters")}</Button><Button variant="outline" type="button" onClick={clearFilters} disabled={loading}>{translateText("Clear filters")}</Button></div>
        </form>
        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="activity-search"><span className="visually-hidden">{translateText("Search loaded activity")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="activity-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText("Search loaded activity")}/></label><span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><PageSizeControls value={pageSize} translateText={translateText} onChange={setPageSize} /><span className={`${adminBoardCount} max-[720px]:block max-[720px]:w-full max-[720px]:ms-0`} aria-live="polite">{sortedEntries.length ? pageSize === "all" ? `${translateText("Showing all")} ${sortedEntries.length} ${translateText(sortedEntries.length === 1 ? "result" : "results")}` : `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${sortedEntries.length} ${translateText(sortedEntries.length === 1 ? "result" : "results")}` : translateText("Showing 0 of 0 results")}</span></div>
        <output id="activity-status" className="mb-2 block min-h-5 text-sm text-admin-muted" aria-live="polite">{loading ? translateText("Loading activity") : `${filteredEntries.length} ${translateText("loaded entries")}`}</output>
        {mockEnabled ? <p className="api-data-notice m-0 mb-3 rounded-lg px-3 py-2.5 text-[13px]">{translateText("Fixture data is active. Some records do not include before and after state.")}</p> : null}
        {loadError ? <div className="mb-3 flex items-center gap-2.5 rounded-admin-sm border border-admin-danger bg-admin-danger-soft px-3 py-2.5 text-sm text-admin-danger" role="alert"><strong>{translateText("Activity log is not available")}</strong><p className="m-0 flex-1">{translateText(loadError)}</p><Button variant="outline" type="button" onClick={retry}>{translateText("Try again")}</Button></div> : null}
        {!loadError && loading && !entries.length ? <EmptyState className="border-0 rounded-none p-[60px_24px]" title={translateText("Loading activity")} description={translateText("Loading activity records.")} /> : null}
        {!loadError && !loading && !visibleEntries.length ? <EmptyState className="border-0 rounded-none p-[60px_24px]" title={translateText("No activity recorded")} description={translateText("Administrative activity will appear here as actions are taken.")} /> : null}
        {!loadError && visibleEntries.length ? <div className="overflow-x-auto"><Table className={`${adminBoardTable} min-w-[980px]`}><caption>{translateText("Activity Log records")}</caption><thead><tr><SortableHeader label={translateText("Timestamp")} sortKey="timestamp" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Actor")} sortKey="actor" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Activity")} sortKey="activity" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Target")} sortKey="target" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Reason")} sortKey="reason" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><th className="align-top" scope="col">{translateText("Details")}</th></tr></thead><tbody>{visibleEntries.map((entry) => {
          const target = activityLogTargetLabel(entry);
          return <tr key={entry.id} tabIndex={0} aria-label={`${translateText("View activity details")}: ${translateText(activityLogActionLabel(entry.action))}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; setSelectedEntry(entry); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedEntry(entry); } }}><td>{entry.createdAt ? <time className="grid gap-0.5 whitespace-nowrap tabular-nums" dateTime={entry.createdAt}>{formatActivityLogTimestamp(entry.createdAt)}<small className="text-xs font-normal text-admin-muted">{formatActivityLogRelativeTime(entry.createdAt)}</small></time> : translateText("Not provided")}</td><td aria-label={`${entry.adminName || translateText("Not provided")} · ${entry.adminId || translateText("Not provided")}`}><span className="grid min-w-[150px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><span className="avatar" aria-hidden="true">{entry.adminInitials}</span><span className="grid gap-0.5"><strong>{entry.adminName || translateText("Not provided")}</strong><small className="text-xs font-normal text-admin-muted">{entry.adminId || translateText("Not provided")}</small></span></span></td><td><strong className="break-words">{translateText(activityLogActionLabel(entry.action))}</strong></td><td><span className="block min-w-0 break-words text-admin-text">{translateText(displayValue(target))}</span></td><td>{translateText(activityLogReasonLabel(entry.reasonCode))}</td><td><Button variant="outline" size="xs" className="whitespace-nowrap" type="button" onClick={() => setSelectedEntry(entry)} aria-label={translateText("View activity details")}>{translateText("View")}</Button></td></tr>;
        })}</tbody></Table></div> : null}
        {filteredEntries.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Activity Log pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
        {paginationError ? <div className="mb-3 flex items-center gap-2.5 rounded-admin-sm border border-admin-danger bg-admin-danger-soft px-3 py-2.5 text-sm text-admin-danger" role="alert"><p className="m-0 flex-1">{translateText(paginationError)}</p><Button variant="outline" type="button" onClick={loadMore}>{translateText("Try again")}</Button></div> : null}
        {query.hasNextPage ? <div className="flex justify-center pt-4"><Button variant="outline" type="button" onClick={loadMore} disabled={query.isFetchingNextPage}>{translateText(query.isFetchingNextPage ? "Loading more" : "Load more")}</Button></div> : null}
      </Card>
      {selectedEntry ? <ActivityLogDetail entry={selectedEntry} onClose={closeDetails} onOpenTarget={openLinkedDetail} /> : null}
    </main>
  );
}

function SortableHeader({ label, sortKey, activeKey, direction, onSort }: { label: string; sortKey: ActivityLogSortKey; activeKey: ActivityLogSortKey | null; direction: BoardSortDirection; onSort: (key: ActivityLogSortKey) => void }) {
  const active = activeKey === sortKey;
  return <th className="align-top" scope="col" aria-sort={active ? direction : "none"}><button className={adminTableSort(active)} type="button" onClick={() => onSort(sortKey)}>{label}<span className={adminSortIndicator(active)} aria-hidden="true">{active ? (direction === "ascending" ? "↑" : "↓") : "↕"}</span></button></th>;
}
