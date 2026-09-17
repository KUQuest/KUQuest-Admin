"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { isAdminApiEnabled } from "../api/admin-provider";
import { memberRoutes } from "../admin-routes";
import { loadAllMembersFromMock as loadAllMembersFromMockData, loadMembersFromMock } from "./member-adapter";
import {
  ADMIN_BOARD_PAGE_SIZES,
  pageCount,
  pageRange,
  pageRows,
  type AdminBoardPageSize,
} from "../data/board-pagination";
import {
  memberStatusClass,
  memberStatusText,
  type MemberModel,
  type MemberPageData,
  walletStatusClass,
  walletStatusText,
} from "./member-model";
import { loadMemberPageData } from "./member-service";

const tabs = [
  { id: "all", label: "All" },
  { id: "Normal", label: "Normal" },
  { id: "Flag", label: "Flag" },
  { id: "Temp Ban", label: "Temp Ban" },
  { id: "Perm Ban", label: "Perm Ban" },
] as const;

type MemberTab = (typeof tabs)[number]["id"];

export const MEMBER_UPDATED_EVENT = "kuquest:member-updated";

function matchesTab(model: MemberModel, tab: MemberTab): boolean {
  return tab === "all" || model.memberStatus === tab;
}

function matchesQuery(model: MemberModel, query: string): boolean {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [
    model.id,
    model.studentId,
    model.title,
    model.email,
    model.faculty,
    model.department,
    model.occupation,
    model.memberStatus,
    model.walletStatus,
  ].some((field) => field?.toLowerCase().includes(value));
}

function loadAllMembersFromMock(storage: Storage): MemberPageData {
  return loadAllMembersFromMockData(storage);
}

export function MemberBoard({ initialData }: { initialData?: MemberPageData }) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const [page, setPage] = useState<MemberPageData | null>(initialData ?? null);
  const [activeTab, setActiveTab] = useState<MemberTab>("all");
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState<AdminBoardPageSize>(10);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (initialData || isAdminApiEnabled()) return;
    let cancelled = false;
    try {
      const nextPage = loadAllMembersFromMock(localStorage);
      if (!cancelled) setPage(nextPage);
    } catch (error: unknown) {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "Members could not load.");
    }
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  useEffect(() => {
    if (initialData) setPage(initialData);
  }, [initialData]);

  useEffect(() => {
    const updateMember = (event: Event) => {
      const model = (event as CustomEvent<MemberModel>).detail;
      if (!model) return;
      setPage((current) => current
        ? { ...current, items: current.items.map((item) => item.id === model.id ? model : item) }
        : current);
    };
    window.addEventListener(MEMBER_UPDATED_EVENT, updateMember);
    return () => window.removeEventListener(MEMBER_UPDATED_EVENT, updateMember);
  }, []);

  const openDrawer = (id: string) => {
    router.push(memberRoutes.detail(id), { scroll: false });
  };

  const loadMore = async () => {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPaginationError(null);
    try {
      const nextPage = page.source === "mock"
        ? loadMembersFromMock(localStorage, page.nextCursor)
        : await loadMemberPageData(undefined, page.nextCursor);
      setPage((current) => current
        ? { ...current, items: [...current.items, ...nextPage.items], nextCursor: nextPage.nextCursor }
        : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Members could not load.");
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
        setPage(loadAllMembersFromMockData(localStorage));
        return;
      }
      const items = [...page.items];
      let cursor: string | undefined = page.nextCursor ?? undefined;
      while (cursor) {
        const nextPage: Pick<MemberPageData, "items" | "nextCursor"> = await loadMemberPageData(undefined, cursor);
        items.push(...nextPage.items);
        if (nextPage.nextCursor === cursor) break;
        cursor = nextPage.nextCursor ?? undefined;
      }
      setPage((current) => current ? { ...current, items, nextCursor: cursor ?? null } : current);
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Members could not load.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (!page) return <AdminLoading message={translateText(loadError ?? "Loading Members…")} />;
  if (loadError) {
    return <main className="admin-feedback"><section className="panel"><h1>{translateText("Members unavailable")}</h1><p>{translateText(loadError)}</p></section></main>;
  }

  const models = page.items.filter((model) => matchesTab(model, activeTab) && matchesQuery(model, query));
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const visibleTabs = page.source === "api" && page.items.every((model) => model.memberStatus === null)
    ? tabs.slice(0, 1)
    : tabs;

  return (
    <main id="member-main" className="admin-route-page member-board" tabIndex={-1}>
      <div className="page-head">
        <div>
          <p className="admin-route-kicker">{translateText("KUQuest Admin")}</p>
          <h1>{translateText("Members")}</h1>
          <p>{translateText("Review Member profiles and account status.")}</p>
        </div>
      </div>
      <section className="panel resource" aria-labelledby="member-board-heading">
        <div className="panel-head">
          <div>
            <h2 id="member-board-heading">{translateText("Members")}</h2>
            <p>{translateText("Review Member profiles, Wallet status, and moderation history.")}</p>
          </div>
          <span className="count">{visibleModels.length} {translateText("shown")}</span>
        </div>
        <div className="tabs" role="tablist" aria-label={translateText("Filter Members")}>{visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => { setActiveTab(tab.id); setPageNumber(1); }}
          >
            {translateText(tab.label)}
          </button>
        ))}</div>
        <div className="toolbar">
          <label className="inline-search" htmlFor="member-search">
            {translateText("Search Members")}
            <input
              id="member-search"
              type="search"
              aria-label={translateText("Search Members")}
              placeholder={translateText("Search by name, Student ID, or Member ID")}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPageNumber(1); }}
            />
          </label>
          <div className="page-size-controls" aria-label={translateText("Rows per page")}>{ADMIN_BOARD_PAGE_SIZES.map((size) => (
            <button
              key={size}
              className={`page-size-button${pageSize === size ? " active" : ""}`}
              type="button"
              disabled={loadingMore}
              onClick={() => {
                setPageSize(size);
                setPageNumber(1);
                if (size === "all") void loadAllPages();
              }}
            >
              {size === "all" ? translateText("Show all") : `${translateText("Show")} ${size}`}
            </button>
          ))}</div>
          <span className="count" aria-live="polite">
            {loadingMore ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}
          </span>
        </div>
        <div className="table-wrap" role="region" aria-label={translateText("Members table")}>
          <table className="data member-table">
            <caption>{translateText("Members")}</caption>
            <thead><tr><th>{translateText("Student ID")}</th><th>{translateText("Member")}</th><th>{translateText("Member ID")}</th><th>{translateText("Academic profile")}</th><th>{translateText("Status")}</th><th>{translateText("Wallet status")}</th></tr></thead>
            <tbody>
              {visibleModels.map((model) => (
                <tr
                  key={model.id}
                  data-member-id={model.id}
                  tabIndex={0}
                  aria-label={`${translateText("Open Member")} ${model.id}`}
                  onClick={() => openDrawer(model.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDrawer(model.id);
                    }
                  }}
                >
                  <td><button className="table-link" type="button" aria-label={`${translateText("Open Member")} ${model.id}`} onClick={(event) => { event.stopPropagation(); openDrawer(model.id); }}>{model.studentId}</button></td>
                  <td><Link className="user-record-link" href={memberRoutes.detail(model.id)} onClick={(event) => event.stopPropagation()}>{model.title}</Link><small>{model.email}</small></td>
                  <td>{model.id}</td>
                  <td>{[model.faculty, model.department, model.occupation].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{model.memberStatus ? <span className={`badge ${memberStatusClass(model)}`}>{translateText(memberStatusText(model))}</span> : <span className="audit-note">{translateText(memberStatusText(model))}</span>}</td>
                  <td>{model.walletStatus ? <span className={`badge ${walletStatusClass(model)}`}>{translateText(walletStatusText(model))}</span> : <span className="audit-note">{translateText(walletStatusText(model))}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {models.length === 0 && <p className="empty-state">{translateText("No matching Members")}</p>}
        </div>
        {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
        {models.length ? <div className="table-pagination" aria-label={translateText("Members pagination")}><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPageNumber((value) => value - 1)}>{translateText("Previous")}</button><span className="page-indicator">{translateText("Page")} {currentPage} {translateText("of")} {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPageNumber((value) => value + 1)}>{translateText("Next")}</button></div> : null}
        {page.nextCursor && <button className="btn" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? translateText("Loading…") : translateText("Load more Members")}</button>}
      </section>
    </main>
  );
}
