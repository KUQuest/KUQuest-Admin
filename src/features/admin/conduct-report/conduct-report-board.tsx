"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { PageSizeControls, Pagination, Table } from "../../../components/ui";
import { isAdminApiEnabled } from "../api/admin-provider";
import { conductReportRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { loadAllConductReportsFromMock as loadAllConductReportsFromMockData, loadConductReportsFromMock } from "./conduct-report-adapter";
import { pageCount, pageRange, pageRows, type AdminBoardPageSize } from "../data/board-pagination";
import {
  CONDUCT_REPORT_UPDATED_EVENT,
  type ConductReportModel,
} from "./conduct-report-model";
import { loadConductReportPageData, type ConductReportPageData } from "./conduct-report-service";

type ConductReportTab = "all" | "open" | "confirmed" | "dismissed";

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
        <section className="panel">
          <h1>{translateText("Conduct Reports unavailable")}</h1>
          <p>{translateText(loadError)}</p>
        </section>
      </main>
    );
  }
  if (!page) return <AdminLoading message={translateText("Loading Conduct Reports…")} />;

  const models = page.items.filter((model) => tabMatches(model, activeTab) && modelMatchesQuery(model, query));
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const openCount = page.items.filter((model) => model.status === "CONDUCT_REPORT_PENDING").length;
  const openDrawer = (id: string) => {
    router.push(conductReportRoutes.detail(id), { scroll: false });
  };

  return (
    <>
      <main id="conduct-report-main" className="admin-route-page conduct-report-board" tabIndex={-1}>
        <div className="page-head">
          <div>
            <p className="admin-route-kicker">{translateText("KUQuest Admin")}</p>
            <h1>{translateText("Conduct Reports")}</h1>
            <p>{translateText("Review Member behavior on Quests.")}</p>
          </div>
        </div>
        <section className="panel" aria-labelledby="conduct-report-board-heading">
          <div className="panel-head">
            <div>
              <h2 id="conduct-report-board-heading">{translateText("Conduct Reports")}</h2>
              <p>{translateText("Conduct Report behavior is separate from Report Case behavior.")}</p>
            </div>
            <span className="count">{visibleModels.length} {translateText("shown")}</span>
          </div>
          <div className="tabs" role="tablist" aria-label={translateText("Conduct Report status filters")}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
                type="button"
                role="tab"
                aria-label={tab.id === "open" ? translateText("Open") : translateText(tab.label)}
                aria-selected={activeTab === tab.id}
                onClick={() => { setActiveTab(tab.id); setPageNumber(1); }}
              >
                {translateText(tab.label)}{tab.id === "open" ? <span className="tab-count" aria-hidden="true"> ({openCount})</span> : null}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <label className="inline-search" htmlFor="conduct-report-search">
              {translateText("Search Conduct Reports")}
              <input
                id="conduct-report-search"
                type="search"
                aria-label={translateText("Search Conduct Reports")}
                placeholder={translateText("Search by Conduct Report, Member, Quest, or reason")}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPageNumber(1); }}
              />
            </label>
            <PageSizeControls value={pageSize} disabled={loadingMore} translateText={translateText} onChange={(size) => { setPageSize(size); setPageNumber(1); if (size === "all") void loadAllPages(); }} />
            <span className="count" aria-live="polite">{loadingMore ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span>
          </div>
          <div className="table-wrap" aria-label={translateText("Conduct Reports table")}>
            <Table className="data report-table">
              <caption>{translateText("Conduct Reports")}</caption>
              <thead>
                <tr>
                  <th>{translateText("Conduct Report")}</th>
                  <th>{translateText("Quest")}</th>
                  <th>{translateText("Reported Member")}</th>
                  <th>{translateText("Reported by")}</th>
                  <th>{translateText("Reason")}</th>
                  <th>{translateText("Status")}</th>
                  <th>{translateText("Reported")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleModels.map((model) => (
                  <tr
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
                    <td>
                      <button
                        className="row-record-button"
                        type="button"
                        data-conduct-report-id={model.id}
                        aria-label={`${translateText("Open Conduct Report")} ${model.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDrawer(model.id);
                        }}
                      >
                        {model.id}
                      </button>
                      <small>{translateText(model.title)}</small>
                    </td>
                    <td><strong>{model.questTitle}</strong><small>{model.questId ?? "—"}</small></td>
                    <td>
                      {model.reportedMemberHref
                        ? <Link href={model.reportedMemberHref} onClick={(event) => event.stopPropagation()}>{model.reportedMemberName}</Link>
                        : model.reportedMemberName}
                      <small>{model.reportedMemberId || "—"}</small>
                    </td>
                    <td>
                      {model.reporterHref
                        ? <Link href={model.reporterHref} onClick={(event) => event.stopPropagation()}>{model.reporterName}</Link>
                        : model.reporterName}
                      <small>{model.reporterId ?? "—"}</small>
                    </td>
                    <td>{translateText(model.reason)}</td>
                    <td><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></td>
                    <td>{formatAdminTimestamp(model.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!models.length && (
              <div className="empty">
                <h3>{translateText("No matching Conduct Reports")}</h3>
                <p>{translateText("Change the status filter or search text.")}</p>
              </div>
            )}
          </div>
          {page.nextCursor && (
            <div className="conduct-report-next-page">
              {models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Conduct Reports pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className="table-pagination" /> : null}
              <button className="btn" type="button" data-conduct-report-load-more onClick={loadMore} disabled={loadingMore}>
                {translateText(loadingMore ? "Loading more Conduct Reports…" : "Load more Conduct Reports")}
              </button>
              {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
            </div>
          )}
          {!page.nextCursor && models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Conduct Reports pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className="table-pagination" /> : null}
        </section>
      </main>
    </>
  );
}
