"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table } from "../../../components/ui";
import { adminBoardCount, adminBoardPagination, adminBoardTable, adminRecordFact, adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection } from "../../../components/admin/admin-record-styles";
import {
  activityLogCsv,
  activityLogActionLabel,
  activityLogMatchesSearch,
  activityLogReasonLabel,
  activityLogResourceTypeLabel,
  activityLogTargetLabel,
  activityLogValueLabel,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
  type ActivityLogEntry,
} from "./activity-log-model";
import { pageCount, pageRange, pageRows } from "../data/board-pagination";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import { sortBoardRows } from "../data/board-sorting";
import {
  canOpenActivityTarget,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  resolveActivityTargetHref,
  type ActivityLogPageData,
} from "./activity-log-service";
import { useActivityLogBoardStore, type ActivityLogSortKey } from "./activity-log-board-store";
import { useActivityLogQuery } from "./activity-log-query";
import { displayAdminId } from "../display-admin-id";

export type ActivityLogBoardProps = {
  initialData?: ActivityLogPageData;
  initialError?: string;
};

type ActivityLogDetailProps = {
  entry: ActivityLogEntry;
  onClose: () => void;
  onOpenTarget: (entry: ActivityLogEntry) => void;
  openingTarget: boolean;
  targetOpenError: string | null;
};
const EMPTY_ACTIVITY_LOG_ENTRIES: ActivityLogEntry[] = [];

function displayValue(value: string | number | null | undefined): string {
  if (typeof value === "number") return String(value);
  return displayAdminId(value) ?? "Not provided";
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

function ActivityLogDetail({ entry, onClose, onOpenTarget, openingTarget, targetOpenError }: ActivityLogDetailProps) {
  const { translateText } = useAdminShell();
  const targetCanOpen = canOpenActivityTarget(entry);
  const target = activityLogTargetLabel(entry);

  return (
    <AdminDrawer
      ariaLabel={translateText("Close Activity Log detail")}
      title={translateText("Activity log entry")}
      titleId="activity-log-detail-title"
      subtitle={translateText(activityLogActionLabel(entry.action))}
      className="activity-log-dialog"
      onClose={onClose}
      actions={
        <>
          {targetCanOpen ? <Button variant="primary" className="min-w-0" type="button" disabled={openingTarget} onClick={() => onOpenTarget(entry)}>{translateText(openingTarget ? "Opening linked record…" : "View linked detail")}</Button> : null}
          <Button variant="outline" type="button" onClick={onClose}>{translateText("Close")}</Button>
        </>
      }
    >
        <div className="activity-log-detail admin-drawer-content-flow grid min-w-0 content-start gap-[18px]">
          {targetOpenError ? <p className="field-error m-0" role="alert">{translateText(targetOpenError)}</p> : null}
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
              <div className={adminRecordFact}><span>{translateText("Activity ID")}</span><strong>{displayValue(entry.activityDisplayId ?? entry.id)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Actor")}</span><strong>{displayValue(entry.adminName)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Action")}</span><strong>{translateText(activityLogActionLabel(entry.action))}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Event type")}</span><strong>{translateText(activityLogResourceTypeLabel(entry.resourceType))}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Event ID")}</span><strong>{displayValue(entry.resourceDisplayId ?? entry.resourceId)}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Reason code")}</span><strong>{translateText(activityLogReasonLabel(entry.reasonCode))}</strong></div>
            </div>
          </Card>
          <Card as="section" className={`${adminRecordSection} activity-log-state-section`} aria-labelledby="activity-log-state-heading">
            <CardHeader flush className={adminRecordHeader}><h3 id="activity-log-state-heading" className={adminRecordHeading}>{translateText("State change")}</h3></CardHeader>
            <div className={adminRecordFacts}>
              <div className={adminRecordFact}><span>{translateText("Before")}</span><strong>{translateText(entry.beforeState === null ? "No state summary recorded" : activityLogValueLabel(entry.beforeState))}</strong></div>
              <div className={adminRecordFact}><span>{translateText("After")}</span><strong>{translateText(entry.afterState === null ? "No state summary recorded" : activityLogValueLabel(entry.afterState))}</strong></div>
            </div>
            {entry.note ? <p className="activity-log-note m-0 mt-3 grid gap-1 rounded-admin-sm bg-admin-soft p-2.5 text-[15px] leading-[1.45] text-admin-muted"><strong className="text-[17px] leading-[1.4] text-admin-text">{translateText("Admin note")}</strong>{entry.note}</p> : null}
          </Card>
        </div>
    </AdminDrawer>
  );
}

export function ActivityLogBoard({ initialData, initialError }: ActivityLogBoardProps) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const {

    search,
    pageSize,
    pageNumber,
    sortKey,
    sortDirection,

    setSearch,
    setPageSize,
    setPageNumber,
    sortBy,
    reset,
  } = useActivityLogBoardStore();
  const query = useActivityLogQuery(DEFAULT_ACTIVITY_LOG_FILTERS, initialData);
  const page = query.data?.pages.reduce<ActivityLogPageData | null>((current, next) => current
    ? { ...next, items: [...current.items, ...next.items] }
    : next, null) ?? null;
  const entries = page?.items ?? EMPTY_ACTIVITY_LOG_ENTRIES;
  const queryError = query.error instanceof Error ? query.error.message : query.error ? "The Admin API is unavailable." : null;
  const loadError = queryError ?? initialError ?? null;
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const targetResolutionIdRef = useRef(0);
  const [openingTarget, setOpeningTarget] = useState(false);
  const [targetOpenError, setTargetOpenError] = useState<string | null>(null);
  const loading = query.isPending || query.isFetching;
  useAdminBoardReset(reset);
  const selectEntry = useCallback((entry: ActivityLogEntry) => {
    targetResolutionIdRef.current += 1;
    setOpeningTarget(false);
    setTargetOpenError(null);
    setSelectedEntry(entry);
  }, []);
  const closeDetails = useCallback(() => {
    targetResolutionIdRef.current += 1;
    setOpeningTarget(false);
    setSelectedEntry(null);
    setTargetOpenError(null);
  }, []);
  const openLinkedDetail = useCallback(async (entry: ActivityLogEntry) => {
    const resolutionId = targetResolutionIdRef.current + 1;
    targetResolutionIdRef.current = resolutionId;
    setOpeningTarget(true);
    setTargetOpenError(null);
    try {
      const href = await resolveActivityTargetHref(entry);
      if (targetResolutionIdRef.current !== resolutionId) return;
      if (!href) {
        setTargetOpenError("The linked record was not found.");
        return;
      }
      closeDetails();
      router.push(href, { scroll: false });
    } catch {
      if (targetResolutionIdRef.current === resolutionId) setTargetOpenError("The linked record is unavailable.");
    } finally {
      if (targetResolutionIdRef.current === resolutionId) setOpeningTarget(false);
    }
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

  return (
    <main id="activity-main" className="admin-route-page activity-log-board" tabIndex={-1}>
        <AdminPageHeader title={translateText("Activity Log")} description={translateText("An audit trail of administrative decisions.")} actions={<Button variant="outline" type="button" onClick={exportCsv} disabled={!visibleEntries.length}>{translateText("Export CSV")}</Button>} showActionsOnMobile />
      <Card as="section" className="overflow-hidden" aria-labelledby="activity-log-heading">
        <CardHeader className="flex min-h-[60px] items-center justify-between gap-4"><div><CardTitle id="activity-log-heading">{translateText("Activity Log")}</CardTitle><CardDescription>{translateText("Review the administrative audit trail.")}</CardDescription></div><span className={adminBoardCount} aria-live="polite">{filteredEntries.length} {translateText("loaded entries")}</span></CardHeader>

        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="activity-search"><span className="visually-hidden">{translateText("Search loaded activity")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="activity-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText("Search loaded activity")}/></label><span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><PageSizeControls value={pageSize} translateText={translateText} onChange={setPageSize} /><span className={`${adminBoardCount} max-[720px]:block max-[720px]:w-full max-[720px]:ms-0`} aria-live="polite">{sortedEntries.length ? pageSize === "all" ? `${translateText("Showing all")} ${sortedEntries.length} ${translateText(sortedEntries.length === 1 ? "result" : "results")}` : `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${sortedEntries.length} ${translateText(sortedEntries.length === 1 ? "result" : "results")}` : translateText("Showing 0 of 0 results")}</span></div>
        <output id="activity-status" className="mb-2 block min-h-5 text-sm text-admin-muted" aria-live="polite">{loading ? translateText("Loading activity") : `${filteredEntries.length} ${translateText("loaded entries")}`}</output>
        {loadError ? <div className="mb-3 flex items-center gap-2.5 rounded-admin-sm border border-admin-danger bg-admin-danger-soft px-3 py-2.5 text-sm text-admin-danger" role="alert"><strong>{translateText("Activity log is not available")}</strong><p className="m-0 flex-1">{translateText(loadError)}</p><Button variant="outline" type="button" onClick={retry}>{translateText("Try again")}</Button></div> : null}
        {!loadError && loading && !entries.length ? <EmptyState className="border-0 rounded-none p-[60px_24px]" title={translateText("Loading activity")} description={translateText("Loading activity records.")} /> : null}
        {!loadError && !loading && !visibleEntries.length ? <EmptyState className="border-0 rounded-none p-[60px_24px]" title={translateText("No activity recorded")} description={translateText("Administrative activity will appear here as actions are taken.")} /> : null}
        {!loadError && visibleEntries.length ? <div className="overflow-x-auto"><Table className={`${adminBoardTable} min-w-[980px]`}><caption>{translateText("Activity Log records")}</caption><thead><tr><AdminSortableHeader label={translateText("Timestamp")} sortKey="timestamp" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Actor")} sortKey="actor" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Activity")} sortKey="activity" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Target")} sortKey="target" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Reason")} sortKey="reason" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><th className="align-top" scope="col">{translateText("Details")}</th></tr></thead><tbody>{visibleEntries.map((entry) => {
          const target = activityLogTargetLabel(entry);
          return <tr key={entry.activityDisplayId ?? entry.id} tabIndex={0} aria-label={`${translateText("View activity details")}: ${translateText(activityLogActionLabel(entry.action))}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; selectEntry(entry); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectEntry(entry); } }}><td>{entry.createdAt ? <time className="grid gap-0.5 whitespace-nowrap tabular-nums" dateTime={entry.createdAt}>{formatActivityLogTimestamp(entry.createdAt)}<small className="text-xs font-normal text-admin-muted">{formatActivityLogRelativeTime(entry.createdAt)}</small></time> : translateText("Not provided")}</td><td aria-label={entry.adminName || translateText("Not provided")}><span className="grid min-w-[150px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><span className="avatar" aria-hidden="true">{entry.adminInitials}</span><span className="grid gap-0.5"><strong>{entry.adminName || translateText("Not provided")}</strong></span></span></td><td><strong className="break-words">{translateText(activityLogActionLabel(entry.action))}</strong></td><td><span className="block min-w-0 break-words text-admin-text">{translateText(displayValue(target))}</span></td><td>{translateText(activityLogReasonLabel(entry.reasonCode))}</td><td><Button variant="outline" size="xs" className="whitespace-nowrap" type="button" onClick={() => selectEntry(entry)} aria-label={translateText("View activity details")}>{translateText("View")}</Button></td></tr>;
        })}</tbody></Table></div> : null}
        {filteredEntries.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Activity Log pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
        {paginationError ? <div className="mb-3 flex items-center gap-2.5 rounded-admin-sm border border-admin-danger bg-admin-danger-soft px-3 py-2.5 text-sm text-admin-danger" role="alert"><p className="m-0 flex-1">{translateText(paginationError)}</p><Button variant="outline" type="button" onClick={loadMore}>{translateText("Try again")}</Button></div> : null}
        {query.hasNextPage ? <div className="flex justify-center pt-4"><Button variant="outline" type="button" onClick={loadMore} disabled={query.isFetchingNextPage}>{translateText(query.isFetchingNextPage ? "Loading more" : "Load more")}</Button></div> : null}
      </Card>
      {selectedEntry ? <ActivityLogDetail entry={selectedEntry} onClose={closeDetails} onOpenTarget={openLinkedDetail} openingTarget={openingTarget} targetOpenError={targetOpenError} /> : null}
    </main>
  );
}
