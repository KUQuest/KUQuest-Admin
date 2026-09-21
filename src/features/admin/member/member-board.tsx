"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { memberRoutes } from "../admin-routes";
import { pageCount, pageRange, pageRows } from "../data/board-pagination";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import {
  memberStatusClass,
  memberStatusText,
  type MemberModel,
  type MemberPageData,
  walletStatusClass,
  walletStatusText,
} from "./member-model";
import { useMemberBoardStore, type MemberSortKey, type MemberTab } from "./member-board-store";
import { useMemberBoardQuery } from "./member-query";
import { adminBoardCount, adminBoardPagination, adminBoardTable } from "../../../components/admin/admin-record-styles";
import { sortBoardRows } from "../data/board-sorting";

const tabs = [
  { id: "all", label: "All" },
  { id: "Normal", label: "Normal" },
  { id: "Flag", label: "Flag" },
  { id: "Temp Ban", label: "Temp Ban" },
  { id: "Perm Ban", label: "Perm Ban" },
] as const;

export { MEMBER_UPDATED_EVENT } from "./member-events";

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

function memberSortValue(model: MemberModel, key: MemberSortKey): string | number | null {
  switch (key) {
    case "id":
      return model.id;
    case "member":
      return model.title;
    case "studentId":
      return model.studentId;
    case "academicProfile":
      return [model.faculty, model.department, model.occupation].filter(Boolean).join(" · ") || null;
    case "status":
      return model.memberStatus ? memberStatusText(model) : null;
    case "walletStatus":
      return model.walletStatus ? walletStatusText(model) : null;
  }
}

export function MemberBoard({ initialData }: { initialData?: MemberPageData }) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const {
    data: page,
    isPending,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemberBoardQuery(initialData);
  const {
    activeTab,
    query,
    pageSize,
    pageNumber,
    sortKey,
    sortDirection,
    setActiveTab,
    setQuery,
    setPageSize,
    setPageNumber,
    sortBy,
    reset,
  } = useMemberBoardStore();
  const [paginationError, setPaginationError] = useState<string | null>(null);

  useAdminBoardReset(reset);

  const openDrawer = (id: string) => {
    router.push(memberRoutes.detail(id), { scroll: false });
  };

  const loadMore = async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    setPaginationError(null);
    try {
      await fetchNextPage();
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Members could not load.");
    }
  };

  const loadAllPages = async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    setPaginationError(null);
    try {
      let result = await fetchNextPage();
      while (result.hasNextPage) result = await fetchNextPage();
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Members could not load.");
    }
  };

  if (isPending) return <AdminLoading message={translateText("Loading Members…")} />;
  if (queryError) {
    const loadError = queryError instanceof Error ? queryError.message : "Members could not load.";
    return <main className="admin-feedback"><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Members unavailable")}</h1></CardHeader><p className="p-5">{translateText(loadError)}</p></Card></main>;
  }

  const filteredModels = page.items.filter((model) => matchesTab(model, activeTab) && matchesQuery(model, query));
  const models = sortKey ? sortBoardRows(filteredModels, (model) => memberSortValue(model, sortKey), sortDirection) : filteredModels;
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const visibleTabs = page.source === "api" && page.items.every((model) => model.memberStatus === null)
    ? tabs.slice(0, 1)
    : tabs;

  return (
    <main id="member-main" className="admin-route-page member-board" tabIndex={-1}>
      <AdminPageHeader title={translateText("Members")} description={translateText("Review Member profiles and account status.")} />
      <Card as="section" className="resource overflow-hidden" aria-labelledby="member-board-heading">
        <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
          <div>
            <CardTitle id="member-board-heading">{translateText("Members")}</CardTitle>
            <CardDescription>{translateText("Review Member profiles, Wallet status, and moderation history.")}</CardDescription>
          </div>
          <span className={adminBoardCount}>{visibleModels.length} {translateText("shown")}</span>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MemberTab)}>
          <TabsList className="px-3" aria-label={translateText("Filter Members")}>
            {visibleTabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{translateText(tab.label)}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2">
          <label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="member-search">
            <span className="visually-hidden">{translateText("Search Members")}</span>
            <Input
              className="h-9 min-h-9 px-3 py-1.5 text-sm"
              id="member-search"
              type="search"
              aria-label={translateText("Search Members")}
              placeholder={translateText("Search by name, Student ID, or Member ID")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <PageSizeControls value={pageSize} disabled={isFetchingNextPage} translateText={translateText} onChange={(size) => { setPageSize(size); if (size === "all") void loadAllPages(); }} />
          <span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span>
          <span className={adminBoardCount} aria-live="polite">
            {isFetchingNextPage ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}
          </span>
        </div>
        <div className="overflow-x-auto" role="region" aria-label={translateText("Members table")}>
          <Table className={`${adminBoardTable} member-table`}>
            <caption>{translateText("Members")}</caption>
            <thead><tr><AdminSortableHeader label={translateText("Member ID")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Member")} sortKey="member" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Student ID")} sortKey="studentId" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Academic profile")} sortKey="academicProfile" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Wallet status")} sortKey="walletStatus" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead>
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
                  <td><Button variant="ghost" size="xs" className="h-auto min-h-8 p-0 text-left font-bold hover:text-admin-accent hover:underline hover:underline-offset-4" type="button" aria-label={`${translateText("Open Member")} ${model.id}`} onClick={(event) => { event.stopPropagation(); openDrawer(model.id); }}>{model.id}</Button></td>
                  <td><Link className="user-record-link" href={memberRoutes.detail(model.id)} onClick={(event) => event.stopPropagation()}>{model.title}</Link><small>{model.email}</small></td>
                  <td>{model.studentId || "—"}</td>
                  <td>{[model.faculty, model.department, model.occupation].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{model.memberStatus ? <span className={`badge ${memberStatusClass(model)}`}>{translateText(memberStatusText(model))}</span> : <span className="audit-note">{translateText(memberStatusText(model))}</span>}</td>
                  <td>{model.walletStatus ? <span className={`badge ${walletStatusClass(model)}`}>{translateText(walletStatusText(model))}</span> : <span className="audit-note">{translateText(walletStatusText(model))}</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {models.length === 0 && <EmptyState className="border-0 rounded-none p-6" title={translateText("No matching Members")} />}
        </div>
        {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
        {models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Members pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
        {hasNextPage && <Button variant="outline" type="button" onClick={loadMore} disabled={isFetchingNextPage}>{isFetchingNextPage ? translateText("Loading…") : translateText("Load more Members")}</Button>}
      </Card>
    </main>
  );
}
