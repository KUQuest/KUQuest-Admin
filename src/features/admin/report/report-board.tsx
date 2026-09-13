"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { isAdminApiEnabled } from "../api/admin-provider";
import { reportRoutes } from "../admin-routes";
import { loadReportCasesFromMock } from "./report-adapter";
import { ReportCaseDrawer } from "./report-detail";
import {
  reportCaseModelFromRecord,
  type ReportCaseModel,
  type ReportCaseRecord,
} from "./report-model";
import type { ReportCasePageData } from "./report-service";

type ReportCaseTab = "all" | "open" | "dismissed" | "confirmed" | "restored";

const tabs: Array<{ id: ReportCaseTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "dismissed", label: "Dismissed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "restored", label: "Restored" },
];

function tabMatches(model: ReportCaseModel, tab: ReportCaseTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "open":
      return model.isActionable;
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

function routeDrawerId(): string | null {
  if (typeof window === "undefined") return null;
  const prefix = `${reportRoutes.list()}/`;
  if (!window.location.pathname.startsWith(prefix)) return null;
  const id = decodeURIComponent(window.location.pathname.slice(prefix.length));
  return id || null;
}

export function ReportCaseBoard({ initialData }: { initialData?: ReportCasePageData }) {
  const { translateText } = useAdminShell();
  const [page, setPage] = useState<ReportCasePageData | null>(initialData ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportCaseTab>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ReportCaseRecord | null>(null);

  useEffect(() => {
    if (initialData || isAdminApiEnabled()) return;
    let cancelled = false;
    try {
      const nextPage = loadReportCasesFromMock(localStorage);
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
    const syncDrawer = () => {
      const id = routeDrawerId();
      setSelectedId(id);
      setSelectedRecord(id ? page?.items.find((record) => record.id === id) ?? null : null);
    };
    window.addEventListener("popstate", syncDrawer);
    return () => window.removeEventListener("popstate", syncDrawer);
  }, [page]);

  useEffect(() => {
    if (!selectedId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  });

  const openDrawer = (record: ReportCaseRecord) => {
    const id = record.id;
    window.history.pushState({ reportCaseDrawer: id }, "", reportRoutes.detail(id));
    setSelectedId(id);
    setSelectedRecord(record);
  };

  function closeDrawer() {
    if (selectedId && window.location.pathname === reportRoutes.detail(selectedId)) {
      window.history.back();
      return;
    }
    setSelectedId(null);
    setSelectedRecord(null);
  }

  const updateRecord = (updated: ReportCaseRecord) => {
    setPage((current) => current
      ? { ...current, items: current.items.map((record) => record.id === updated.id ? updated : record) }
      : current);
    setSelectedRecord(updated);
  };

  if (!page) return <AdminLoading message={translateText(loadError ?? "Loading Report Cases…")} />;
  if (loadError) {
    return <main className="admin-feedback"><section className="panel"><h1>{translateText("Report Cases unavailable")}</h1><p>{translateText(loadError)}</p></section></main>;
  }

  const models = page.items.flatMap((record) => {
    const model = reportCaseModelFromRecord(record);
    return model && tabMatches(model, activeTab) && modelMatchesQuery(model, query) ? [model] : [];
  });

  return (
    <>
      <main id="report-main" className="admin-route-page report-case-board" tabIndex={-1}>
        <div className="page-head"><div><p className="admin-route-kicker">{translateText("KUQuest Admin")}</p><h1>{translateText("Report Cases")}</h1><p>{translateText("Review Report Cases about Message or Attachment content.")}</p></div></div>
        <section className="panel" aria-labelledby="report-case-board-heading">
          <div className="panel-head"><div><h2 id="report-case-board-heading">{translateText("Report Cases")}</h2><p>{translateText("Report Case behavior is separate from Conduct Report behavior.")}</p></div><span className="count">{models.length} {translateText("shown")}</span></div>
          <div className="tabs" role="tablist" aria-label={translateText("Report Case status filters")}>
            {tabs.map((tab) => <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{translateText(tab.label)}</button>)}
          </div>
          <div className="toolbar"><label className="inline-search" htmlFor="report-case-search">{translateText("Search Report Cases")}<input id="report-case-search" type="search" aria-label={translateText("Search Report Cases")} placeholder={translateText("Search by Report Case, Member, or Report type")} value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
          <div className="table-wrap" aria-label={translateText("Report Cases table")}>
            <table className="data report-table">
              <caption>{translateText("Report Cases")}</caption>
              <thead><tr><th>{translateText("Report Case")}</th><th>{translateText("Source")}</th><th>{translateText("Reported Member")}</th><th>{translateText("Reported by")}</th><th>{translateText("Report type")}</th><th>{translateText("Status")}</th><th>{translateText("Reported")}</th></tr></thead>
              <tbody>
                {models.map((model) => {
                  const record = page.items.find((candidate) => candidate.id === model.id);
                  if (!record) return null;
                  return <tr key={model.id} data-report-id={model.id} tabIndex={0} aria-label={`${translateText("Open Report Case")} ${model.id}`} onClick={() => openDrawer(record)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDrawer(record); } }}>
                    <td><button className="row-record-button" type="button" aria-label={`${translateText("Open Report Case")} ${model.id}`} onClick={(event) => { event.stopPropagation(); openDrawer(record); }}>{model.id}</button><small>{model.title}</small></td>
                    <td>{model.source}</td>
                    <td>{model.reportedMemberHref ? <Link href={model.reportedMemberHref} onClick={(event) => event.stopPropagation()}>{model.reportedMemberName}</Link> : model.reportedMemberName}<small>{model.reportedMemberId || "—"}</small></td>
                    <td>{model.reporterHref ? <Link href={model.reporterHref} onClick={(event) => event.stopPropagation()}>{model.reporterName}</Link> : model.reporterName}<small>{model.reporterId ?? "—"}</small></td>
                    <td>{model.reportType}</td>
                    <td><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></td>
                    <td>{model.submittedAt}</td>
                  </tr>;
                })}
              </tbody>
            </table>
            {!models.length && <div className="empty"><h3>{translateText("No matching Report Cases")}</h3><p>{translateText("Change the status filter or search text.")}</p></div>}
          </div>
          {page.nextCursor && <p className="report-case-next-page">{translateText("More Report Cases are available.")}</p>}
        </section>
      </main>
      {selectedId && selectedRecord && <ReportCaseDrawer reportId={selectedId} initialRecord={selectedRecord} onClose={closeDrawer} onUpdated={updateRecord} />}
    </>
  );
}
