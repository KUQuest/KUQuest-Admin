"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { Button, Card, CardHeader, Input, PageSizeControls, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table } from "../../../components/ui";
import { isAdminMockEnabled } from "../../../lib/auth/admin-auth-mode";
import { isAdminApiEnabled } from "../api/admin-provider";
import {
  activityLogCsv,
  activityLogActionLabel,
  activityLogEntryMatchesFilters,
  activityLogFixturePageData,
  activityLogMatchesSearch,
  activityLogReasonLabel,
  activityLogResourceTypeLabel,
  activityLogStateLabel,
  activityLogTargetLabel,
  activityTargetHref,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
  type ActivityLogEntry,
} from "./activity-log-model";
import { pageCount, pageRange, pageRows, type AdminBoardPageSize } from "../data/board-pagination";
import {
  loadActivityLogPageData,
  type ActivityLogFilters,
  type ActivityLogPageData,
} from "./activity-log-service";
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

function loadAllActivityLogFromMock(filters: ActivityLogFilters): ActivityLogPageData {
  const firstPage = activityLogFixturePageData(filters);
  const items = [...firstPage.items];
  let cursor = firstPage.nextCursor ?? undefined;

  while (cursor) {
    const nextPage = activityLogFixturePageData(filters, cursor);
    items.push(...nextPage.items);
    if (nextPage.nextCursor === cursor) break;
    cursor = nextPage.nextCursor ?? undefined;
  }

  return { ...firstPage, items, nextCursor: null };
}

function displayValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
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
        <div className="activity-log-detail drawer-content-flow">
          <div className="drawer-title">
            <span className="att-icon neutral" aria-hidden="true">↺</span>
            <div>
              <h2 id="activity-log-detail-title">{translateText(activityLogActionLabel(entry.action))}</h2>
              <p><span className="activity-log-target">{translateText(displayValue(target))}</span></p>
            </div>
          </div>
          <Card as="section" className="section activity-log-record-section" aria-labelledby="activity-log-record-heading">
            <CardHeader flush><h3 id="activity-log-record-heading">{translateText("Activity record")}</h3></CardHeader>
            <div className="facts">
              <div className="fact"><span>{translateText("Timestamp")}</span><strong>{formatActivityLogTimestamp(entry.createdAt)}</strong></div>
              <div className="fact"><span>{translateText("Action")}</span><strong>{translateText(activityLogActionLabel(entry.action))}</strong></div>
              <div className="fact"><span>{translateText("Resource type")}</span><strong>{translateText(activityLogResourceTypeLabel(entry.resourceType))}</strong></div>
              <div className="fact"><span>{translateText("Resource ID")}</span><strong>{displayValue(entry.resourceId)}</strong></div>
              <div className="fact"><span>{translateText("Reason code")}</span><strong>{translateText(activityLogReasonLabel(entry.reasonCode))}</strong></div>
              <div className="fact"><span>{translateText("Reason catalog version")}</span><strong>{displayValue(entry.reasonCatalogVersion)}</strong></div>
              <div className="fact"><span>{translateText("Activity ID")}</span><strong>{displayValue(entry.id)}</strong></div>
            </div>
          </Card>
          <Card as="section" className="section activity-log-admin-section" aria-labelledby="activity-log-admin-heading">
            <CardHeader flush><h3 id="activity-log-admin-heading">{translateText("Admin")}</h3></CardHeader>
            <div className="facts">
              <div className="fact"><span>{translateText("Actor")}</span><strong>{displayValue(entry.adminName)}</strong></div>
              <div className="fact"><span>{translateText("Admin ID")}</span><strong>{displayValue(entry.adminId)}</strong></div>
              <div className="fact"><span>{translateText("Admin first name")}</span><strong>{displayValue(entry.admin.firstName)}</strong></div>
              <div className="fact"><span>{translateText("Admin last name")}</span><strong>{displayValue(entry.admin.lastName)}</strong></div>
            </div>
          </Card>
          <Card as="section" className="section activity-log-result-section" aria-labelledby="activity-log-result-heading">
            <CardHeader flush><h3 id="activity-log-result-heading">{translateText("Result")}</h3></CardHeader>
            <div className="facts">
              <div className="fact"><span>{translateText("Result version")}</span><strong>{displayValue(entry.resultVersion)}</strong></div>
              <div className="fact"><span>{translateText("Result timestamp")}</span><strong>{formatAdminTimestamp(entry.resultTimestamp)}</strong></div>
              <div className="fact"><span>{translateText("Relative time")}</span><strong>{formatActivityLogRelativeTime(entry.createdAt)}</strong></div>
            </div>
          </Card>
          <Card as="section" className="section activity-log-state-section" aria-labelledby="activity-log-state-heading">
            <CardHeader flush><h3 id="activity-log-state-heading">{translateText("State change")}</h3></CardHeader>
            {entry.previousState || entry.newState ? (
              <div className="activity-log-state-change">
                <div><span>{translateText("Previous state")}</span><strong>{translateText(activityLogStateLabel(entry.previousState))}</strong></div>
                <span className="activity-log-state-arrow" aria-hidden="true">→</span>
                <div><span>{translateText("New state")}</span><strong>{translateText(activityLogStateLabel(entry.newState))}</strong></div>
              </div>
            ) : <p className="activity-log-missing-context">{translateText("Before and after state are not included in this record.")}</p>}
            {entry.note ? <p className="activity-log-note"><strong>{translateText("Admin note")}</strong>{entry.note}</p> : null}
          </Card>
          <div className="drawer-actions">
            {targetHref ? <Button variant="primary" className="activity-log-linked-detail-button" type="button" onClick={() => onOpenTarget(entry)}>{translateText("View linked detail")}</Button> : null}
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
  const [page, setPage] = useState<ActivityLogPageData | null>(initialData ?? (mockEnabled ? activityLogFixturePageData() : null));
  const [appliedFilters, setAppliedFilters] = useState<ActivityLogFilters>(DEFAULT_ACTIVITY_LOG_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ActivityLogFilters>(DEFAULT_ACTIVITY_LOG_FILTERS);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(initialError ?? null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const [pageSize, setPageSize] = useState<AdminBoardPageSize>(10);
  const [pageNumber, setPageNumber] = useState(1);
  const requestId = useRef(0);
  const closeDetails = useCallback(() => setSelectedEntry(null), []);
  const openLinkedDetail = useCallback((entry: ActivityLogEntry) => {
    const href = activityTargetHref(entry.resourceType, entry.resourceId);
    if (!href) return;
    closeDetails();
    router.push(href, { scroll: false });
  }, [closeDetails, router]);

  const entries = page?.items ?? EMPTY_ACTIVITY_LOG_ENTRIES;
  const filteredEntries = useMemo(
    () => entries
      .filter((entry) => activityLogEntryMatchesFilters(entry, appliedFilters))
      .filter((entry) => activityLogMatchesSearch(entry, search)),
    [appliedFilters, entries, search],
  );
  const totalPages = pageCount(filteredEntries.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleEntries = useMemo(
    () => pageRows(filteredEntries, currentPage, pageSize),
    [currentPage, filteredEntries, pageSize],
  );
  const { start: pageStart, end: pageEnd } = pageRange(filteredEntries.length, currentPage, pageSize);

  const loadPage = useCallback(async (filters: ActivityLogFilters, cursor?: string, append = false) => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    if (!append) setPaginationError(null);
    if (!apiEnabled && mockEnabled) {
      const nextPage = cursor
        ? activityLogFixturePageData(filters, cursor)
        : loadAllActivityLogFromMock(filters);
      setPage((current) => append && current
        ? { ...nextPage, items: [...current.items, ...nextPage.items] }
        : nextPage);
      setLoading(false);
      return;
    }
    try {
      const nextPage = await loadActivityLogPageData(undefined, filters, cursor);
      if (currentRequestId !== requestId.current) return;
      if (append) setPaginationError(null);
      setPage((current) => append && current
        ? { ...nextPage, items: [...current.items, ...nextPage.items] }
        : nextPage);
    } catch (error: unknown) {
      if (currentRequestId !== requestId.current) return;
      const message = error instanceof Error ? error.message : "The Admin API is unavailable.";
      if (append) setPaginationError(message);
      else setLoadError(message);
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [apiEnabled, mockEnabled]);

  useEffect(() => {
    if (apiEnabled || !mockEnabled || initialData?.source === "api") return;
    let cancelled = false;
    try {
      const nextPage = loadAllActivityLogFromMock(DEFAULT_ACTIVITY_LOG_FILTERS);
      if (!cancelled) setPage(nextPage);
    } catch (error: unknown) {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "The Activity Log fixtures could not load.");
    }
    return () => {
      cancelled = true;
    };
  }, [apiEnabled, initialData, mockEnabled]);

  const applyFilters = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters = {
      action: draftFilters.action.trim(),
      resourceType: draftFilters.resourceType.trim(),
      resourceId: draftFilters.resourceId.trim(),
      adminId: draftFilters.adminId.trim(),
      fromDate: draftFilters.fromDate,
      toDate: draftFilters.toDate,
      sort: draftFilters.sort,
    } satisfies ActivityLogFilters;
    setAppliedFilters(nextFilters);
    setPageNumber(1);
    setPage(null);
    void loadPage(nextFilters);
  }, [draftFilters, loadPage]);

  const clearFilters = useCallback(() => {
    setDraftFilters(DEFAULT_ACTIVITY_LOG_FILTERS);
    setAppliedFilters(DEFAULT_ACTIVITY_LOG_FILTERS);
    setPageNumber(1);
    setPage(null);
    void loadPage(DEFAULT_ACTIVITY_LOG_FILTERS);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (!page?.nextCursor || loading) return;
    void loadPage(appliedFilters, page.nextCursor, true);
  }, [appliedFilters, loadPage, loading, page]);

  const retry = useCallback(() => {
    setPage(null);
    void loadPage(appliedFilters);
  }, [appliedFilters, loadPage]);

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
          <div className="empty activity-log-empty">
            <h2 id="activity-unavailable-title">{translateText("Activity Log unavailable")}</h2>
            <p>{translateText("The Admin API is required to display this read-only log.")}</p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main id="activity-main" className="admin-route-page activity-log-board" tabIndex={-1}>
        <AdminPageHeader title={translateText("Activity Log")} description={translateText("An audit trail of administrative decisions.")} actions={<Button variant="outline" type="button" onClick={exportCsv} disabled={!visibleEntries.length}>{translateText("Export CSV")}</Button>} />
      <Card as="section" className="overflow-hidden" aria-labelledby="activity-log-heading">
        <CardHeader flush className="flex min-h-[60px] items-center justify-between gap-4 border-b border-admin-border px-4 py-3"><div><h2 id="activity-log-heading" className="m-0 text-base font-semibold">{translateText("Activity Log")}</h2><p className="mt-0.5 text-sm text-admin-muted">{translateText("Review the administrative audit trail.")}</p></div><span className="count" aria-live="polite">{filteredEntries.length} {translateText("loaded entries")}</span></CardHeader>
        <form className="mb-4 grid gap-3.5 rounded-admin-sm border border-admin-border bg-admin-soft p-3.5" onSubmit={applyFilters}>
          <div className="grid grid-cols-2 gap-3 min-[701px]:grid-cols-3 min-[1101px]:grid-cols-5">
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-action-filter">{translateText("Action filter")}<Input id="activity-action-filter" type="search" value={draftFilters.action} onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-resource-type-filter">{translateText("Resource type filter")}<Input id="activity-resource-type-filter" type="search" value={draftFilters.resourceType} onChange={(event) => setDraftFilters((current) => ({ ...current, resourceType: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-resource-id-filter">{translateText("Resource ID filter")}<Input id="activity-resource-id-filter" type="search" value={draftFilters.resourceId} onChange={(event) => setDraftFilters((current) => ({ ...current, resourceId: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-admin-id-filter">{translateText("Admin ID filter")}<Input id="activity-admin-id-filter" type="search" value={draftFilters.adminId} onChange={(event) => setDraftFilters((current) => ({ ...current, adminId: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-from-date-filter">{translateText("From date")}<Input id="activity-from-date-filter" type="date" value={draftFilters.fromDate} onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-to-date-filter">{translateText("To date")}<Input id="activity-to-date-filter" type="date" value={draftFilters.toDate} onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-admin-muted" htmlFor="activity-sort">{translateText("Sort activity")}<Select value={draftFilters.sort} onValueChange={(value) => setDraftFilters((current) => ({ ...current, sort: value === "oldest" ? "oldest" : "newest" }))}><SelectTrigger id="activity-sort"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">{translateText("Newest first")}</SelectItem><SelectItem value="oldest">{translateText("Oldest first")}</SelectItem></SelectContent></Select></label>
          </div>
          <div className="flex justify-end gap-2 max-[700px]:justify-start"><Button variant="primary" type="submit" disabled={loading}>{translateText("Apply filters")}</Button><Button variant="outline" type="button" onClick={clearFilters} disabled={loading}>{translateText("Clear filters")}</Button></div>
        </form>
        <div className="flex min-h-[54px] flex-wrap items-end gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text" htmlFor="activity-search">{translateText("Search loaded activity")}<Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="activity-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPageNumber(1); }} placeholder={translateText("Search loaded activity")}/></label><PageSizeControls value={pageSize} translateText={translateText} onChange={(size) => { setPageSize(size); setPageNumber(1); }} /><span className="count text-sm text-admin-muted max-[720px]:block max-[720px]:w-full max-[720px]:ms-0" aria-live="polite">{filteredEntries.length ? pageSize === "all" ? `${translateText("Showing all")} ${filteredEntries.length} ${translateText(filteredEntries.length === 1 ? "result" : "results")}` : `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${filteredEntries.length} ${translateText(filteredEntries.length === 1 ? "result" : "results")}` : translateText("Showing 0 of 0 results")}</span></div>
        <output id="activity-status" className="mb-2 block min-h-5 text-sm text-admin-muted" aria-live="polite">{loading ? translateText("Loading activity") : `${filteredEntries.length} ${translateText("loaded entries")}`}</output>
        {mockEnabled ? <p className="api-data-notice activity-log-fixture-notice">{translateText("Fixture data is active. Some records do not include before and after state.")}</p> : null}
        {loadError ? <div className="mb-3 flex items-center gap-2.5 rounded-admin-sm border border-admin-danger bg-admin-danger-soft px-3 py-2.5 text-sm text-admin-danger" role="alert"><strong>{translateText("Activity log is not available")}</strong><p className="m-0 flex-1">{translateText(loadError)}</p><Button variant="outline" type="button" onClick={retry}>{translateText("Try again")}</Button></div> : null}
        {!loadError && loading && !entries.length ? <div className="empty activity-log-empty"><h3>{translateText("Loading activity")}</h3><p>{translateText("Loading activity records.")}</p></div> : null}
        {!loadError && !loading && !visibleEntries.length ? <div className="empty activity-log-empty"><h3>{translateText("No activity recorded")}</h3><p>{translateText("Administrative activity will appear here as actions are taken.")}</p></div> : null}
        {!loadError && visibleEntries.length ? <div className="table-wrap overflow-x-auto"><Table className="data min-w-[980px]"><caption>{translateText("Activity Log records")}</caption><thead><tr><th className="align-top" scope="col">{translateText("Timestamp")}</th><th className="align-top" scope="col">{translateText("Actor")}</th><th className="align-top" scope="col">{translateText("Activity")}</th><th className="align-top" scope="col">{translateText("Target")}</th><th className="align-top" scope="col">{translateText("Reason")}</th><th className="align-top" scope="col">{translateText("Details")}</th></tr></thead><tbody>{visibleEntries.map((entry) => {
          const target = activityLogTargetLabel(entry);
          return <tr key={entry.id} tabIndex={0} aria-label={`${translateText("View activity details")}: ${translateText(activityLogActionLabel(entry.action))}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; setSelectedEntry(entry); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedEntry(entry); } }}><td>{entry.createdAt ? <time className="grid gap-0.5 whitespace-nowrap tabular-nums" dateTime={entry.createdAt}>{formatActivityLogTimestamp(entry.createdAt)}<small className="text-xs font-normal text-admin-muted">{formatActivityLogRelativeTime(entry.createdAt)}</small></time> : translateText("Not provided")}</td><td aria-label={`${entry.adminName || translateText("Not provided")} · ${entry.adminId || translateText("Not provided")}`}><span className="grid min-w-[150px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><span className="avatar" aria-hidden="true">{entry.adminInitials}</span><span className="grid gap-0.5"><strong>{entry.adminName || translateText("Not provided")}</strong><small className="text-xs font-normal text-admin-muted">{entry.adminId || translateText("Not provided")}</small></span></span></td><td><strong className="break-words">{translateText(activityLogActionLabel(entry.action))}</strong></td><td><span className="block min-w-0 break-words text-admin-text">{translateText(displayValue(target))}</span></td><td>{translateText(activityLogReasonLabel(entry.reasonCode))}</td><td><Button variant="outline" size="xs" className="whitespace-nowrap" type="button" onClick={() => setSelectedEntry(entry)} aria-label={translateText("View activity details")}>{translateText("View")}</Button></td></tr>;
        })}</tbody></Table></div> : null}
        {filteredEntries.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Activity Log pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className="table-pagination" /> : null}
        {paginationError ? <div className="mb-3 flex items-center gap-2.5 rounded-admin-sm border border-admin-danger bg-admin-danger-soft px-3 py-2.5 text-sm text-admin-danger" role="alert"><p className="m-0 flex-1">{translateText(paginationError)}</p><Button variant="outline" type="button" onClick={loadMore}>{translateText("Try again")}</Button></div> : null}
        {page?.nextCursor ? <div className="flex justify-center pt-4"><Button variant="outline" type="button" onClick={loadMore} disabled={loading}>{translateText(loading ? "Loading more" : "Load more")}</Button></div> : null}
      </Card>
      {selectedEntry ? <ActivityLogDetail entry={selectedEntry} onClose={closeDetails} onOpenTarget={openLinkedDetail} /> : null}
    </main>
  );
}
