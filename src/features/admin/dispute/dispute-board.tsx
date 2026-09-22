"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { Button, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, TableCell, TableRow, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { disputeRoutes, questRoutes } from "../admin-routes";
import { pageCount, pageRange, pageRows } from "../data/board-pagination";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import { dateSortValue, sortBoardRows } from "../data/board-sorting";
import type { DisputeCaseModel } from "./dispute-model";
import type { DisputeCasePageData } from "./dispute-service";
import { useDisputeBoardStore, type DisputeCaseSortKey, type DisputeCaseTab } from "./dispute-board-store";
import { useDisputeBoardQuery } from "./dispute-query";
import { adminBoardCount, adminBoardPagination, adminBoardTable } from "../../../components/admin/admin-record-styles";

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

function disputeSortValue(model: DisputeCaseModel, key: DisputeCaseSortKey): string | number | null {
  switch (key) {
    case "id":
      return model.displayId;
    case "quest":
      return model.questTitle;
    case "hirer":
      return partyMemberForRole(model, "Hirer").name;
    case "worker":
      return partyMemberForRole(model, "Worker").name;
    case "category":
      return model.category;
    case "amount":
      return model.amountAtRiskSatang;
    case "status":
      return model.statusLabel;
    case "opened":
      return dateSortValue(model.submittedAt);
  }
}

export function DisputeCaseBoard({ initialData }: { initialData?: DisputeCasePageData }) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const {
    data: page,
    isPending,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDisputeBoardQuery(initialData);
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
  } = useDisputeBoardStore();
  const [paginationError, setPaginationError] = useState<string | null>(null);

  useAdminBoardReset(reset);

  const openDrawer = (id: string) => {
    router.push(disputeRoutes.detail(id), { scroll: false });
  };

  const loadMore = async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    setPaginationError(null);
    try {
      await fetchNextPage();
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Dispute Cases could not load.");
    }
  };

  const loadAllPages = async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    setPaginationError(null);
    try {
      let result = await fetchNextPage();
      while (result.hasNextPage) result = await fetchNextPage();
    } catch (error: unknown) {
      setPaginationError(error instanceof Error ? error.message : "More Dispute Cases could not load.");
    }
  };

  if (isPending) return <AdminLoading message={translateText("Loading Dispute Cases…")} />;
  if (queryError) {
    const loadError = queryError instanceof Error ? queryError.message : "Dispute Cases could not load.";
    return <main className="admin-feedback"><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Dispute Cases unavailable")}</h1></CardHeader><p className="p-5">{translateText(loadError)}</p></Card></main>;
  }

  const filteredModels = page.items.filter((model) => tabMatches(model, activeTab) && modelMatchesQuery(model, query));
  const models = sortKey ? sortBoardRows(filteredModels, (model) => disputeSortValue(model, sortKey), sortDirection) : filteredModels;
  const totalPages = pageCount(models.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleModels = pageRows(models, currentPage, pageSize);
  const { start: pageStart, end: pageEnd } = pageRange(models.length, currentPage, pageSize);
  const tabCounts: Record<DisputeCaseTab, number> = {
    all: page.items.length,
    open: page.items.filter((model) => model.status === "DISPUTE_CASE_PENDING").length,
    dismissed: page.items.filter((model) => model.status === "DISPUTE_CASE_DISMISSED").length,
    resolved: page.items.filter((model) => model.status === "DISPUTE_CASE_RESOLVED").length,
  };

  return (
    <main id="dispute-main" className="admin-route-page dispute-case-board" tabIndex={-1}>
      <AdminPageHeader title={translateText("Dispute Cases")} description={translateText("Review failed Quest settlement decisions.")} />
      <Card as="section" className="overflow-hidden" aria-labelledby="dispute-case-board-heading">
        <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
          <div><CardTitle id="dispute-case-board-heading">{translateText("Dispute Cases")}</CardTitle><CardDescription>{translateText("A Dispute Case can redirect settlement from the Hirer to the Worker or dismiss the case.")}</CardDescription></div><span className={adminBoardCount}>{visibleModels.length} {translateText("shown")}</span>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DisputeCaseTab)}>
          <TabsList className="px-3" aria-label={translateText("Dispute Case status filters")}>
            {tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{translateText(tab.label)} ({tabCounts[tab.id]})</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="dispute-case-search"><span className="visually-hidden">{translateText("Search Dispute Cases")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="dispute-case-search" type="search" aria-label={translateText("Search Dispute Cases")} placeholder={translateText("Search by case, Quest, Member, or category")} value={query} onChange={(event) => setQuery(event.target.value)} /></label><span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><PageSizeControls value={pageSize} disabled={isFetchingNextPage} translateText={translateText} onChange={(size) => { setPageSize(size); if (size === "all") void loadAllPages(); }} /><span className={adminBoardCount} aria-live="polite">{isFetchingNextPage ? translateText("Loading more records…") : models.length ? `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${models.length} ${translateText("results")}` : translateText("Showing 0 of 0 results")}</span></div>
        <div className="overflow-x-auto" aria-label={translateText("Dispute Cases table")}>
          <Table className={`${adminBoardTable} !min-w-[980px]`}>
            <caption>{translateText("Dispute Cases")}</caption>
            <thead><TableRow><AdminSortableHeader label={translateText("Dispute Case")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Quest")} sortKey="quest" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Hirer")} sortKey="hirer" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Worker")} sortKey="worker" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Category")} sortKey="category" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Amount at risk")} sortKey="amount" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Opened")} sortKey="opened" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></TableRow></thead>
            <tbody>
              {visibleModels.map((model) => {
                const hirer = partyMemberForRole(model, "Hirer");
                const worker = partyMemberForRole(model, "Worker");
                return <TableRow className="focus-visible:outline-2 focus-visible:outline-admin-accent focus-visible:outline-offset-[-2px]" key={model.id} data-dispute-id={model.id} data-dispute-display-id={model.displayId} data-dispute-status={model.status} tabIndex={0} aria-label={`${translateText("Open Dispute Case")} ${model.displayId}`} onClick={() => openDrawer(model.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDrawer(model.id); } }}>
                  <TableCell><button className="min-h-8 border-0 bg-transparent p-0 text-left text-sm text-admin-text hover:text-admin-accent hover:underline hover:underline-offset-4" type="button" data-dispute-id={model.id} onClick={(event) => { event.stopPropagation(); openDrawer(model.id); }}><strong>{model.displayId}</strong></button></TableCell>
                  <TableCell><Link className="text-admin-accent no-underline hover:underline hover:underline-offset-4" href={model.questHref ?? questRoutes.list()} onClick={(event) => event.stopPropagation()}>{model.questTitle}</Link><small>{model.questId || "—"}</small></TableCell>
                  <TableCell><MemberCell {...hirer} /></TableCell>
                  <TableCell><MemberCell {...worker} /></TableCell>
                  <TableCell>{translateText(model.category)}</TableCell>
                  <TableCell>{model.amountAtRiskLabel}</TableCell>
                  <TableCell><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></TableCell>
                  <TableCell>{model.submittedAt}</TableCell>
                </TableRow>
              })}
            </tbody>
          </Table>
          {models.length === 0 && <EmptyState title={translateText("No Dispute Cases match this view.")} />}
        </div>
        {paginationError && <p className="field-error" role="alert">{translateText(paginationError)}</p>}
        {models.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Dispute Cases pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
        {hasNextPage && <Button variant="outline" size="sm" className="m-3" type="button" onClick={loadMore} disabled={isFetchingNextPage}>{isFetchingNextPage ? translateText("Loading…") : translateText("Load more Dispute Cases")}</Button>}
      </Card>
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
  return <div>{href && id ? <Link className="text-admin-accent no-underline hover:underline hover:underline-offset-4" href={href} onClick={(event) => event.stopPropagation()}>{name}</Link> : <span>{name}</span>}<small>{id ?? "—"}</small></div>;
}
