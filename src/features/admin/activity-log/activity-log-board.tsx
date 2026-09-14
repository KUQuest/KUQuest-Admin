"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { isAdminApiEnabled } from "../api/admin-provider";
import {
  activityLogCsv,
  activityLogMatchesSearch,
  activityLogTargetLabel,
  activityTargetHref,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
  type ActivityLogEntry,
} from "./activity-log-model";
import {
  loadActivityLogPageData,
  type ActivityLogFilters,
  type ActivityLogPageData,
} from "./activity-log-service";

export type ActivityLogBoardProps = {
  initialData?: ActivityLogPageData;
  initialError?: string;
};

type ActivityLogDetailProps = {
  entry: ActivityLogEntry;
  onClose: () => void;
};
const EMPTY_ACTIVITY_LOG_ENTRIES: ActivityLogEntry[] = [];

function displayValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
}

function ActivityLogDetail({ entry, onClose }: ActivityLogDetailProps) {
  const { translateText } = useAdminShell();
  const targetHref = activityTargetHref(entry.resourceType, entry.resourceId);
  const target = activityLogTargetLabel(entry);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    (closeButtonRef.current ?? dialog)?.focus();

    const closeOnEscapeAndTrapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", closeOnEscapeAndTrapFocus);
    return () => {
      document.removeEventListener("keydown", closeOnEscapeAndTrapFocus);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [onClose]);

  return (
    <div className="activity-log-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <dialog
        ref={dialogRef}
        className="activity-log-dialog"
        open
        aria-modal="true"
        aria-labelledby="activity-log-detail-title"
        tabIndex={-1}
      >
        <div className="drawer-top">
          <div>
            <strong>{translateText("Activity log entry")}</strong>
            <small>{displayValue(entry.action)}</small>
          </div>
          <button ref={closeButtonRef} className="icon" type="button" aria-label={translateText("Close")} onClick={onClose}>×</button>
        </div>
        <div className="drawer-body activity-log-detail">
          <div className="drawer-title">
            <span className="att-icon neutral" aria-hidden="true">↺</span>
            <div>
              <h2 id="activity-log-detail-title">{displayValue(entry.action)}</h2>
              <p>
                {targetHref ? <Link href={targetHref}>{displayValue(target)}</Link> : displayValue(target)}
              </p>
            </div>
          </div>
          <div className="facts">
            <div className="fact"><span>{translateText("Timestamp")}</span><strong>{formatActivityLogTimestamp(entry.createdAt)}</strong></div>
            <div className="fact"><span>{translateText("Actor")}</span><strong>{displayValue(entry.adminName)}</strong></div>
            <div className="fact"><span>{translateText("Admin ID")}</span><strong>{displayValue(entry.adminId)}</strong></div>
            <div className="fact"><span>{translateText("Admin first name")}</span><strong>{displayValue(entry.admin.firstName)}</strong></div>
            <div className="fact"><span>{translateText("Admin last name")}</span><strong>{displayValue(entry.admin.lastName)}</strong></div>
            <div className="fact"><span>{translateText("Action")}</span><strong>{displayValue(entry.action)}</strong></div>
            <div className="fact"><span>{translateText("Resource type")}</span><strong>{displayValue(entry.resourceType)}</strong></div>
            <div className="fact"><span>{translateText("Resource ID")}</span><strong>{displayValue(entry.resourceId)}</strong></div>
            <div className="fact"><span>{translateText("Reason code")}</span><strong>{displayValue(entry.reasonCode)}</strong></div>
            <div className="fact"><span>{translateText("Reason catalog version")}</span><strong>{displayValue(entry.reasonCatalogVersion)}</strong></div>
            <div className="fact"><span>{translateText("Result version")}</span><strong>{displayValue(entry.resultVersion)}</strong></div>
            <div className="fact"><span>{translateText("Result timestamp")}</span><strong>{displayValue(entry.resultTimestamp)}</strong></div>
            <div className="fact"><span>{translateText("Activity ID")}</span><strong>{displayValue(entry.id)}</strong></div>
            <div className="fact"><span>{translateText("Relative time")}</span><strong>{formatActivityLogRelativeTime(entry.createdAt)}</strong></div>
          </div>
          <div className="drawer-actions">
            <button className="btn" type="button" onClick={onClose}>{translateText("Close")}</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export function ActivityLogBoard({ initialData, initialError }: ActivityLogBoardProps) {
  const { translateText } = useAdminShell();
  const apiEnabled = isAdminApiEnabled();
  const [page, setPage] = useState<ActivityLogPageData | null>(initialData ?? null);
  const [appliedFilters, setAppliedFilters] = useState<ActivityLogFilters>(DEFAULT_ACTIVITY_LOG_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ActivityLogFilters>(DEFAULT_ACTIVITY_LOG_FILTERS);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(initialError ?? null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const requestId = useRef(0);
  const closeDetails = useCallback(() => setSelectedEntry(null), []);

  const entries = page?.items ?? EMPTY_ACTIVITY_LOG_ENTRIES;
  const visibleEntries = useMemo(
    () => entries.filter((entry) => activityLogMatchesSearch(entry, search)),
    [entries, search],
  );

  const loadPage = useCallback(async (filters: ActivityLogFilters, cursor?: string, append = false) => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    if (!append) setPaginationError(null);
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
  }, []);

  const applyFilters = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters = {
      action: draftFilters.action.trim(),
      resourceType: draftFilters.resourceType.trim(),
      resourceId: draftFilters.resourceId.trim(),
      adminId: draftFilters.adminId.trim(),
      sort: draftFilters.sort,
    } satisfies ActivityLogFilters;
    setAppliedFilters(nextFilters);
    setPage(null);
    void loadPage(nextFilters);
  }, [draftFilters, loadPage]);

  const clearFilters = useCallback(() => {
    setDraftFilters(DEFAULT_ACTIVITY_LOG_FILTERS);
    setAppliedFilters(DEFAULT_ACTIVITY_LOG_FILTERS);
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
    const csv = activityLogCsv(visibleEntries);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "activity-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [visibleEntries]);

  if (!apiEnabled) {
    return (
      <main id="activity-main" className="admin-route-page activity-log-board" tabIndex={-1}>
        <div className="page-head"><div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Activity Log")}</h1><p>{translateText("An audit trail of administrative decisions.")}</p></div></div>
        <section className="panel activity-log-panel" aria-labelledby="activity-unavailable-title">
          <div className="empty activity-log-empty">
            <h2 id="activity-unavailable-title">{translateText("Activity Log unavailable")}</h2>
            <p>{translateText("The Admin API is required to display this read-only log.")}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="activity-main" className="admin-route-page activity-log-board" tabIndex={-1}>
      <div className="page-head">
        <div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Activity Log")}</h1><p>{translateText("An audit trail of administrative decisions.")}</p></div>
        <button className="btn" type="button" onClick={exportCsv} disabled={!visibleEntries.length}>{translateText("Export CSV")}</button>
      </div>
      <section className="panel activity-log-panel" aria-labelledby="activity-log-heading">
        <div className="panel-head"><div><h2 id="activity-log-heading">{translateText("Activity Log")}</h2><p>{translateText("Review the administrative audit trail.")}</p></div><span className="count" aria-live="polite">{visibleEntries.length} {translateText("loaded entries")}</span></div>
        <form className="activity-log-filters" onSubmit={applyFilters}>
          <div className="activity-filter-grid">
            <label htmlFor="activity-action-filter">{translateText("Action filter")}<input id="activity-action-filter" type="search" value={draftFilters.action} onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))} /></label>
            <label htmlFor="activity-resource-type-filter">{translateText("Resource type filter")}<input id="activity-resource-type-filter" type="search" value={draftFilters.resourceType} onChange={(event) => setDraftFilters((current) => ({ ...current, resourceType: event.target.value }))} /></label>
            <label htmlFor="activity-resource-id-filter">{translateText("Resource ID filter")}<input id="activity-resource-id-filter" type="search" value={draftFilters.resourceId} onChange={(event) => setDraftFilters((current) => ({ ...current, resourceId: event.target.value }))} /></label>
            <label htmlFor="activity-admin-id-filter">{translateText("Admin ID filter")}<input id="activity-admin-id-filter" type="search" value={draftFilters.adminId} onChange={(event) => setDraftFilters((current) => ({ ...current, adminId: event.target.value }))} /></label>
            <label htmlFor="activity-sort">{translateText("Sort activity")}<select id="activity-sort" value={draftFilters.sort} onChange={(event) => setDraftFilters((current) => ({ ...current, sort: event.target.value === "oldest" ? "oldest" : "newest" }))}><option value="newest">{translateText("Newest first")}</option><option value="oldest">{translateText("Oldest first")}</option></select></label>
          </div>
          <div className="activity-filter-actions"><button className="btn primary" type="submit" disabled={loading}>{translateText("Apply filters")}</button><button className="btn" type="button" onClick={clearFilters} disabled={loading}>{translateText("Clear filters")}</button></div>
        </form>
        <div className="toolbar activity-log-toolbar"><label className="inline-search" htmlFor="activity-search">{translateText("Search loaded activity")}<input id="activity-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText("Search loaded activity")}/></label></div>
        <output id="activity-status" className="activity-log-status" aria-live="polite">{loading ? translateText("Loading activity") : `${visibleEntries.length} ${translateText("loaded entries")}`}</output>
        {loadError ? <div className="activity-log-error" role="alert"><strong>{translateText("Activity log is not available")}</strong><p>{translateText(loadError)}</p><button className="btn" type="button" onClick={retry}>{translateText("Try again")}</button></div> : null}
        {!loadError && loading && !entries.length ? <div className="empty activity-log-empty"><h3>{translateText("Loading activity")}</h3><p>{translateText("Reading the Admin API.")}</p></div> : null}
        {!loadError && !loading && !visibleEntries.length ? <div className="empty activity-log-empty"><h3>{translateText("No activity recorded")}</h3><p>{translateText("Administrative activity will appear here as actions are taken.")}</p></div> : null}
        {!loadError && visibleEntries.length ? <div className="table-wrap activity-log-table-wrap"><table className="data activity-log-table"><caption>{translateText("Activity Log records")}</caption><thead><tr><th scope="col">{translateText("Timestamp")}</th><th scope="col">{translateText("Actor")}</th><th scope="col">{translateText("Activity")}</th><th scope="col">{translateText("Target")}</th><th scope="col">{translateText("Reason")}</th><th scope="col">{translateText("Details")}</th></tr></thead><tbody>{visibleEntries.map((entry) => {
          const targetHref = activityTargetHref(entry.resourceType, entry.resourceId);
          const target = activityLogTargetLabel(entry);
          return <tr key={entry.id}><td>{entry.createdAt ? <time dateTime={entry.createdAt}>{formatActivityLogTimestamp(entry.createdAt)}<small>{formatActivityLogRelativeTime(entry.createdAt)}</small></time> : translateText("Not provided")}</td><td aria-label={`${entry.adminName || translateText("Not provided")} · ${entry.adminId || translateText("Not provided")}`}><span className="activity-log-actor"><span className="avatar" aria-hidden="true">{entry.adminInitials}</span><span><strong>{entry.adminName || translateText("Not provided")}</strong><small>{entry.adminId || translateText("Not provided")}</small></span></span></td><td><strong className="activity-log-action">{displayValue(entry.action)}</strong></td><td>{targetHref ? <Link className="activity-log-target" href={targetHref}>{displayValue(target)}</Link> : <span className="activity-log-target">{displayValue(target)}</span>}</td><td>{displayValue(entry.reasonCode)}</td><td><button className="btn activity-log-detail-button" type="button" onClick={() => setSelectedEntry(entry)} aria-label={translateText("View activity details")}>{translateText("View")}</button></td></tr>;
        })}</tbody></table></div> : null}
        {paginationError ? <div className="activity-log-error" role="alert"><p>{translateText(paginationError)}</p><button className="btn" type="button" onClick={loadMore}>{translateText("Try again")}</button></div> : null}
        {page?.nextCursor ? <div className="activity-log-pagination"><button className="btn" type="button" onClick={loadMore} disabled={loading}>{translateText(loading ? "Loading more" : "Load more")}</button></div> : null}
      </section>
      {selectedEntry ? <ActivityLogDetail entry={selectedEntry} onClose={closeDetails} /> : null}
    </main>
  );
}
