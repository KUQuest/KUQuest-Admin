"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { adminBoardCount, adminBoardPagination, adminBoardTable } from "../../../components/admin/admin-record-styles";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button as UiButton, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { questRoutes } from "../admin-routes";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import {
  formatQuestDate,
  formatQuestMoney,
  pageQuestRows,
  QUEST_BOARD_TABS,
  questMatchesTab,
  questPageCount,
  questStatusClass,
  searchQuestRows,
  sortQuestRows,
  type QuestBoardTab,
} from "./quest-model";
import { useQuestBoardStore } from "./quest-board-store";
import { useQuestBoardQuery } from "./quest-query";
import type { QuestBoardPageData, QuestDataSource } from "./quest-service";

export function AdminQuestPage({ initialData, dataSource = "api" }: { initialData: QuestBoardPageData; dataSource?: QuestDataSource }) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const { data, isPending, error } = useQuestBoardQuery(initialData, dataSource);
  const {
    search,
    tab,
    pageSize,
    pageNumber,
    sortKey,
    sortDirection,
    setSearch,
    setTab,
    setPageSize,
    setPageNumber,
    sortBy,
    reset,
  } = useQuestBoardStore();

  useAdminBoardReset(reset);

  if (isPending) return <AdminLoading message={translateText("Loading Quests…")} />;
  if (error || !data) {
    return <main className="admin-feedback"><Card as="section" className="overflow-hidden"><CardHeader><CardTitle>{translateText("Quests unavailable")}</CardTitle></CardHeader><CardContent><p>{translateText(error instanceof Error ? error.message : "Quests could not load.")}</p></CardContent></Card></main>;
  }

  const rows = data.rows;
  const filteredRows = searchQuestRows(rows, search).filter((row) => questMatchesTab(row, tab));
  const sortedRows = sortQuestRows(filteredRows, sortKey, sortDirection);
  const totalPages = questPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleRows = pageQuestRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  return (
    <main className="admin-route-page quest-route-page" tabIndex={-1}>
      <AdminPageHeader title={translateText("Quests")} description={translateText("Review Quests through every Quest State.")} />
      <Card as="section" className="min-w-0 overflow-hidden" aria-label={translateText("Quest board")}>
        <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
          <div><CardTitle>{translateText("Quests")}</CardTitle><CardDescription>{translateText("Review Quests through every Quest State.")}</CardDescription></div>
          <span className={adminBoardCount}>{sortedRows.length} {translateText("shown")}</span>
        </CardHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as QuestBoardTab)}>
          <TabsList className="px-3" aria-label={translateText("Quest filters")}>
            {QUEST_BOARD_TABS.map((item) => <TabsTrigger key={item.id} value={item.id}>{translateText(item.label)}{item.id === "all" ? ` (${rows.length})` : ""}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="quest-search"><span className="visually-hidden">{translateText("Search Quests")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="quest-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText("Search Quests…")} autoComplete="off" /></label><span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><PageSizeControls value={pageSize} translateText={translateText} onChange={setPageSize} /><span className="ml-auto text-sm text-admin-muted max-[600px]:hidden" aria-live="polite">{translateText("Showing")} {pageStart}–{pageEnd} {translateText("of")} {sortedRows.length} {translateText("results")}</span></div>
        {!sortedRows.length ? <EmptyState title={translateText("No matching records")} description={translateText("There are no Quests in this view.")} action={<UiButton variant="outline" type="button" onClick={() => { setSearch(""); setTab("all"); }}>{translateText("Reset view")}</UiButton>} /> : <div className="overflow-x-auto" aria-label={translateText("Quests table")}><Table className={adminBoardTable}><caption>{translateText("Quests")}</caption><thead><tr><AdminSortableHeader label={translateText("Quest")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Title")} sortKey="title" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Hirer")} sortKey="hirer" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Created At")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Quest Reward")} sortKey="reward" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="focus-visible:relative focus-visible:outline-3 focus-visible:outline-admin-accent focus-visible:outline-offset-[-3px]" data-quest-id={row.id} data-quest-drawer-trigger={row.displayId} key={row.id} tabIndex={0} aria-label={`${translateText("Open Quest")} ${row.title}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; router.push(questRoutes.detail(row.displayId)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(questRoutes.detail(row.displayId)); } }}><td><Link className="row-record-button" data-quest-drawer-trigger={row.displayId} href={questRoutes.detail(row.displayId)} aria-label={`${translateText("Open Quest")} ${row.displayId}`}>{row.displayId}</Link></td><td><Link className="row-record-button block text-inherit no-underline visited:text-inherit hover:text-admin-accent" data-quest-drawer-trigger={row.displayId} href={questRoutes.detail(row.displayId)} aria-label={`${translateText("Open Quest")} ${row.title}`}><strong>{row.title}</strong><small>{translateText(row.participationLabel)} · {translateText(row.modeLabel)}</small></Link></td><td><strong>{row.hirerName}</strong><small>{row.hirerEmail}</small></td><td>{formatQuestDate(row.createdAt)}</td><td className="money">{formatQuestMoney(row.rewardSatang)}</td><td><span className={`badge ${questStatusClass(row.state)}`}>{translateText(row.stateLabel)}</span>{row.hiddenAt ? <span className="badge neutral ms-1 mt-[3px]">{translateText("Hidden")}</span> : null}</td></tr>)}</tbody></Table></div>}
        {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Quests pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
      </Card>
    </main>
  );
}
