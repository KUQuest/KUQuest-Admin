"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { isAdminApiEnabled } from "../api/admin-provider";
import { disputeRoutes, questRoutes } from "../admin-routes";
import { loadAllDisputeCasesFromMock as loadAllDisputeCasesFromMockData, loadDisputeCasesFromMock } from "./dispute-adapter";
import {
  ADMIN_BOARD_PAGE_SIZES,
  pageCount,
  pageRange,
  pageRows,
  type AdminBoardPageSize,
} from "../data/board-pagination";
import {
  DISPUTE_CASE_UPDATED_EVENT,
  type DisputeCaseModel,
} from "./dispute-model";
import { loadDisputeCasePageData, type DisputeCasePageData } from "./dispute-service";

type DisputeCaseTab = "all" | "open" | "dismissed" | "resolved";

const tabs: Array<{ id: DisputeCaseTab; label: string }> = [
  { id: "open", label: "Open" },
  { id: "all", label: "All" },
  { id: "dismissed", label: "Dismissed" },
  { id: "resolved", label: "Resolved" },
];

function tabMatches(model: DisputeCaseModel, tab: DisputeCaseTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "open":
      return model.status === "DISPUTE_CASE_PENDING";
    case "dismissed":
      return model.status === "DISPUTE_CASE_DISMISSED";
    case "resolved":
      return model.status === "DISPUTE_CASE_RESOLVED";
  }
}

function modelMatchesQuery(model: DisputeCaseModel, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [
    model.id,
    model.displayId,
    model.questId,
    model.questTitle,
    model.category,
    model.filerId,
    model.filerName,
    model.respondentId,
    model.respondentName,
    model.detail,
  ].some((field) => field?.toLowerCase().includes(value));
}

function loadAllDisputeCasesFromMock(storage: Storage): DisputeCasePageData {
  return loadAllDisputeCasesFromMockData(storage);
}

export function DisputeCaseBoard({ initialData }: { initialData?: DisputeCasePageData }) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const [page, setPage] = useState<DisputeCasePageData | null>(initialData ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<DisputeCaseTab>("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<AdminBoardPageSize>(10);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (initialData || isAdminApiEnabled()) return;
    let cancelled = false;
    try {
      const nextPage = loadAllDisputeCasesFromMock(localStorage);
      if (!cancelled) setPage(nextPage);
    } catch (error: unknown) {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "Dispute Cases could not load.");
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
      const model = (event as CustomEvent<DisputeCaseModel>).detail;
      if (!model) return;
      setPage((current) => current
        ? { ...current, items: current.items.map((item) => item.id === model.id ? model : item) }
        : current);
    };
    window.addEventListener(DISPUTE_CASE_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(DISPUTE_CASE_UPDATED_EVENT, updateRecord);
  }, []);

  const openDrawer = (id: string) => {
    router.push(disputeRoutes.detail(id), { scroll: false });
  };

  const loadMore = async () => {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const nextPage = page.source === "mock"
        ? loadDisputeCasesFromMock(localStorage, page.nextCursor)
        : await loadDisputeCasePageData(undefined, page.nextCursor);
      setPage((current) => current
        ? { ...current, items: [...current.items, ...nextPage.items], nextCursor: nextPage.nextCursor }
        : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Dispute Cases could not load.");
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
        setPage(loadAllDisputeCasesFromMockData(localStorage));
        return;
      }
      const items = [...page.items];
      let cursor: string | undefined = page.nextCursor ?? undefined;
      while (cursor) {
        const nextPage: Pick<DisputeCasePageData, "items" | "nextCursor"> = await loadDisputeCasePageData(undefined, cursor);
        items.push(...nextPage.items);
        if (nextPage.nextCursor === cursor) break;
        cursor = nextPage.nextCursor ?? undefined;
      }
      setPage((current) => current ? { ...current, items, nextCursor: cursor ?? null } : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Dispute Cases could not load.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (!page) return <AdminLoading message={translateText(loadError ?? "Loading Dispute Cases…")} />;
  if (loadError) {
    return <main className="admin-feedback"><section className="panel"><h1>{translateText("Dispute Cases unavailable")}</h1><p>{translateText(loadError)}</p></section></main>;
  }

  const models = page.items.filter((model) => tabMatches(model, activeTab) && modelMatchesQuery(model, query));
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const openCount = page.items.filter((model) => model.status === "DISPUTE_CASE_PENDING").length;

  return (
    <main id="dispute-main" className="admin-route-page dispute-case-board" tabIndex={-1}>
      <div className="page-head"><div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Dispute Cases")}</h1><p>{translateText("Review failed Quest settlement decisions.")}</p></div></div>
      <section className="panel" aria-labelledby="dispute-case-board-heading">
        <div className="panel-head"><div><h2 id="dispute-case-board-heading">{translateText("Dispute Cases")}</h2><p>{translateText("A Dispute Case can redirect settlement from the Hirer to the Worker or dismiss the case.")}</p></div><span className="count">{visibleModels.length} {translateText("shown")}</span></div>
        <div className="tabs" role="tablist" aria-label={translateText("Dispute Case status filters")}>
          {tabs.map((tab) => <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} type="button" role="tab" aria-label={tab.id === "open" ? translateText("Open") : translateText(tab.label)} aria-selected={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setPageNumber(1); }}>{translateText(tab.label)}{tab.id === "open" ? <span className="tab-count" aria-hidden="true"> ({openCount})</span> : null}</button>)}
        </div>
        <div className="toolbar"><label className="inline-search" htmlFor="dispute-case-search">{translateText("Search Dispute Cases")}<input id="dispute-case-search" type="search" aria-label={translateText("Search Dispute Cases")} placeholder={translateText("Search by case, Quest, Member, or category")} value={query} onChange={(event) => { setQuery(event.target.value); setPageNumber(1); }} /></label><div className="page-size-controls" aria-label={translateText("Rows per page")}>{ADMIN_BOARD_PAGE_SIZES.map((size) => <button key={size} className={`page-size-button${pageSize === size ? " active" : ""}`} type="button" disabled={loadingMore} onClick={() => { setPageSize(size); setPageNumber(1); if (size === "all") void loadAllPages(); }}>{size === "all" ? translateText("Show all") : `${translateText("Show")} ${size}`}</button>)}</div><span className="count" aria-live="polite">{loadingMore ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span></div>
        <div className="table-wrap" aria-label={translateText("Dispute Cases table")}>
          <table className="data dispute-table">
            <caption>{translateText("Dispute Cases")}</caption>
            <thead><tr><th>{translateText("Dispute Case")}</th><th>{translateText("Quest")}</th><th>{translateText("Hirer")}</th><th>{translateText("Worker")}</th><th>{translateText("Category")}</th><th>{translateText("Amount at risk")}</th><th>{translateText("Status")}</th><th>{translateText("Opened")}</th></tr></thead>
            <tbody>
              {visibleModels.map((model) => {
                const hirer = partyMemberForRole(model, "Hirer");
                const worker = partyMemberForRole(model, "Worker");
                return <tr key={model.id} data-dispute-id={model.id} data-dispute-display-id={model.displayId} data-dispute-status={model.status} tabIndex={0} aria-label={`${translateText("Open Dispute Case")} ${model.displayId}`} onClick={() => openDrawer(model.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDrawer(model.id); } }}>
                  <td><button className="table-link" type="button" onClick={(event) => { event.stopPropagation(); openDrawer(model.id); }}>{model.displayId}</button></td>
                  <td><Link href={model.questHref ?? questRoutes.list()} onClick={(event) => event.stopPropagation()}>{model.questTitle}</Link><small>{model.questId || "—"}</small></td>
                  <td><MemberCell {...hirer} /></td>
                  <td><MemberCell {...worker} /></td>
                  <td>{translateText(model.category)}</td>
                  <td>{model.amountAtRiskLabel}</td>
                  <td><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></td>
                  <td>{model.submittedAt}</td>
                </tr>
              })}
            </tbody>
          </table>
          {models.length === 0 && <p className="empty-state">{translateText("No Dispute Cases match this view.")}</p>}
        </div>
        {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
        {models.length ? <div className="table-pagination" aria-label={translateText("Dispute Cases pagination")}><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPageNumber((value) => value - 1)}>{translateText("Previous")}</button><span className="page-indicator">{translateText("Page")} {currentPage} {translateText("of")} {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPageNumber((value) => value + 1)}>{translateText("Next")}</button></div> : null}
        {page.nextCursor && <button className="btn" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? translateText("Loading…") : translateText("Load more Dispute Cases")}</button>}
      </section>
    </main>
  );
}

function partyMemberForRole(model: DisputeCaseModel, role: "Hirer" | "Worker") {
  const filer = { id: model.filerId, name: model.filerName, href: model.filerHref, role: model.filerRole };
  const respondent = { id: model.respondentId, name: model.respondentName, href: model.respondentHref, role: model.respondentRole };
  const matchingParty = [filer, respondent].find((party) => party.role.toLowerCase() === role.toLowerCase());
  if (matchingParty) return matchingParty;
  if (role === "Worker" && model.workerId) {
    return { id: model.workerId, name: model.workerName, href: model.workerHref, role };
  }
  return role === "Hirer" ? filer : respondent;
}

function MemberCell({
  id,
  name,
  href,
}: {
  id: string | null;
  name: string;
  href: string | null;
}) {
  return <div>{href && id ? <Link href={href} onClick={(event) => event.stopPropagation()}>{name}</Link> : <span>{name}</span>}<small>{id ?? "—"}</small></div>;
}
