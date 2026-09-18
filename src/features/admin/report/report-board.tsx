"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { isAdminApiEnabled } from "../api/admin-provider";
import { reportRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { loadAllReportCasesFromMock as loadAllReportCasesFromMockData, loadReportCasesFromMock } from "./report-adapter";
import {
  ADMIN_BOARD_PAGE_SIZES,
  pageCount,
  pageRange,
  pageRows,
  type AdminBoardPageSize,
} from "../data/board-pagination";
import {
  REPORT_CASE_UPDATED_EVENT,
  type ReportCaseModel,
} from "./report-model";
import { loadReportCasePageData, type ReportCasePageData } from "./report-service";

type ReportCaseTab = "all" | "open" | "dismissed" | "confirmed" | "restored";

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
    return <main className="admin-feedback"><section className="panel"><h1>{translateText("Report Cases unavailable")}</h1><p>{translateText(loadError)}</p></section></main>;
  }

  const models = page.items.filter((model) => tabMatches(model, activeTab) && modelMatchesQuery(model, query));
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const openCount = page.items.filter((model) => model.status === "REPORT_CASE_PENDING").length;

  return (
      <main id="report-main" className="admin-route-page report-case-board" tabIndex={-1}>
        <div className="page-head"><div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Report Cases")}</h1><p>{translateText("Review Report Cases about Message or Attachment content.")}</p></div></div>
        <section className="panel" aria-labelledby="report-case-board-heading">
          <div className="panel-head"><div><h2 id="report-case-board-heading">{translateText("Report Cases")}</h2><p>{translateText("Report Case behavior is separate from Conduct Report behavior.")}</p></div><span className="count">{visibleModels.length} {translateText("shown")}</span></div>
          <div className="tabs" role="tablist" aria-label={translateText("Report Case status filters")}>
            {tabs.map((tab) => <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} type="button" role="tab" aria-label={tab.id === "open" ? translateText("Open") : translateText(tab.label)} aria-selected={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setPageNumber(1); }}>{translateText(tab.label)}{tab.id === "open" ? <span className="tab-count" aria-hidden="true"> ({openCount})</span> : null}</button>)}
          </div>
          <div className="toolbar"><label className="inline-search" htmlFor="report-case-search">{translateText("Search Report Cases")}<input id="report-case-search" type="search" aria-label={translateText("Search Report Cases")} placeholder={translateText("Search by Report Case, Member, or Report type")} value={query} onChange={(event) => { setQuery(event.target.value); setPageNumber(1); }} /></label><div className="page-size-controls" aria-label={translateText("Rows per page")}>{ADMIN_BOARD_PAGE_SIZES.map((size) => <button key={size} className={`page-size-button${pageSize === size ? " active" : ""}`} type="button" disabled={loadingMore} onClick={() => { setPageSize(size); setPageNumber(1); if (size === "all") void loadAllPages(); }}>{size === "all" ? translateText("Show all") : `${translateText("Show")} ${size}`}</button>)}</div><span className="count" aria-live="polite">{loadingMore ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span></div>
          <div className="table-wrap" aria-label={translateText("Report Cases table")}>
            <table className="data report-table">
              <caption>{translateText("Report Cases")}</caption>
              <thead><tr><th>{translateText("Report Case")}</th><th>{translateText("Source")}</th><th>{translateText("Reported Member")}</th><th>{translateText("Reported by")}</th><th>{translateText("Report type")}</th><th>{translateText("Status")}</th><th>{translateText("Reported")}</th></tr></thead>
              <tbody>
                {visibleModels.map((model) => {
                  return <tr key={model.id} data-report-id={model.id} tabIndex={0} aria-label={`${translateText("Open Report Case")} ${model.id}`} onClick={() => openDrawer(model.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDrawer(model.id); } }}>
                    <td><button className="row-record-button" type="button" data-report-id={model.id} aria-label={`${translateText("Open Report Case")} ${model.id}`} onClick={(event) => { event.stopPropagation(); openDrawer(model.id); }}>{model.id}</button><small>{translateText(model.title)}</small></td>
                    <td>{translateText(model.source)}</td>
                    <td>{model.reportedMemberHref ? <Link href={model.reportedMemberHref} onClick={(event) => event.stopPropagation()}>{model.reportedMemberName}</Link> : model.reportedMemberName}<small>{model.reportedMemberId || "—"}</small></td>
                    <td>{model.reporterHref ? <Link href={model.reporterHref} onClick={(event) => event.stopPropagation()}>{model.reporterName}</Link> : model.reporterName}<small>{model.reporterId ?? "—"}</small></td>
                    <td>{translateText(model.reportType)}</td>
                    <td><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></td>
                    <td>{formatAdminTimestamp(model.submittedAt)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
            {!models.length && <div className="empty"><h3>{translateText("No matching Report Cases")}</h3><p>{translateText("Change the status filter or search text.")}</p></div>}
          </div>
          {page.nextCursor && (
            <div className="report-case-next-page">
              {models.length ? <div className="table-pagination" aria-label={translateText("Report Cases pagination")}><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPageNumber((value) => value - 1)}>{translateText("Previous")}</button><span className="page-indicator">{translateText("Page")} {currentPage} {translateText("of")} {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPageNumber((value) => value + 1)}>{translateText("Next")}</button></div> : null}
              <button className="btn" type="button" data-report-load-more onClick={loadMore} disabled={loadingMore}>
                {translateText(loadingMore ? "Loading more Report Cases…" : "Load more Report Cases")}
              </button>
              {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
            </div>
          )}
          {!page.nextCursor && models.length ? <div className="table-pagination" aria-label={translateText("Report Cases pagination")}><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPageNumber((value) => value - 1)}>{translateText("Previous")}</button><span className="page-indicator">{translateText("Page")} {currentPage} {translateText("of")} {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPageNumber((value) => value + 1)}>{translateText("Next")}</button></div> : null}
        </section>
      </main>
  );
}
