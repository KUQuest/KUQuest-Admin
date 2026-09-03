import {
  badge,
  bind,
  data,
  disputeCases,
  disputeTypeLabel,
  escapeActivityText,
  fmt,
  heads,
  ico,
  main,
  pageHead,
  payoutBadge,
  renderActivity,
  renderPolicies,
  renderResource,
  setBind,
  setRenderResource,
  state,
} from "./script";
import {
  matchingRows as matchingResourceRows,
  pageSizeOptions,
  paginateRows as paginateResourceRows,
  paginationFor as getPagination,
  questFilterKind,
  resetPagination as resetResourcePagination,
  resetResourceState as resetResourceStateModel,
  resourceColumns,
  resourceTabIsActive as resourceTabIsActiveModel,
  resourceTabs,
  resultCount as getResultCount,
  resourceTabValue,
  sortSpec,
  type Pagination,
  type PaginationResult,
  type ResourceColumn,
  type ResourceView,
} from "./resource-controls-model";
import type { LegacyDomElement, LegacyRecord } from "./runtime";
import { liveResourceState } from "./live-review-data";
import {
  disputeCaseStatusFor,
  disputeCaseStatusLabel,
  hasHiddenQuestOverlay,
  payoutStatusFor,
  payoutStatusLabel,
  questStateLabel,
  questStateFor,
  reportCaseStatusFor,
  walletStatusFor,
} from "../domain/rulebook";

const resourceCollections: Record<ResourceView, LegacyRecord[]> = data;
state.filters = {};
state.questFilters = { mode: "all", status: "all" };
state.orderBy = {
  disputes: null,
  quests: null,
  users: null,
  payouts: null,
  reports: null,
};
state.pagination = Object.fromEntries(
  Object.keys(resourceColumns).map((view) => [view, { page: 1, size: 10 }]),
);
state.visibleColumns = Object.fromEntries(
  Object.entries(resourceColumns).map(([view, cols]) => [
    view,
    cols.map((col) => col[0]),
  ]),
);

function resetResourceState(): void {
  resetResourceStateModel(state);
}

function matchingRows(view: ResourceView): LegacyRecord[] {
  return matchingResourceRows(resourceCollections, state, view);
}

function paginationFor(view: ResourceView): Pagination {
  return getPagination(state, view);
}

function resetPagination(view: ResourceView): void {
  resetResourcePagination(state, view);
}

function paginateRows(view: ResourceView, rows: LegacyRecord[]): PaginationResult {
  return paginateResourceRows(state, view, rows);
}

function resultCount(view: ResourceView, pagination: PaginationResult): string {
  return getResultCount(state, view, pagination);
}

function resourceTabIsActive(view: ResourceView, tab: string): boolean {
  return resourceTabIsActiveModel(state, view, tab);
}

function pageSizeControls(view: ResourceView): string {
  const pagination = paginationFor(view);
  return `<div class="page-size-controls" aria-label="Rows per page">${pageSizeOptions
    .map(
      ([size, label]) =>
        `<button class="page-size-button${String(pagination.size) === String(size) ? " active" : ""}" type="button" data-page-size="${size}">${label}</button>`,
    )
    .join("")}</div>`;
}

function paginationControls(view: ResourceView, pagination: PaginationResult): string {
  return `<div class="table-pagination" aria-label="${view} pagination"><button class="page-nav" type="button" data-page-number="${pagination.page - 1}"${pagination.page === 1 ? " disabled" : ""}>Previous</button><span class="page-indicator">Page ${pagination.page} of ${pagination.pageCount}</span><button class="page-nav" type="button" data-page-number="${pagination.page + 1}"${pagination.page === pagination.pageCount ? " disabled" : ""}>Next</button></div>`;
}

setRenderResource(function resourceRender(view: string): void {
  if (view === "policies") return renderPolicies();
  if (view === "activity") return renderActivity();
  if (!(view in resourceColumns)) return;
  const resourceView = view as ResourceView;
  const rows = matchingRows(resourceView),
    pagination = paginateRows(resourceView, rows),
    tabs = resourceTabs[resourceView],
    hasQuery = Boolean(state.query),
    liveState = resourceView === "payouts" || resourceView === "disputes" || resourceView === "quests" ? liveResourceState[resourceView] : null,
    resultContent = liveState?.loading
      ? '<div class="empty"><h3>Loading records</h3><p>Reading the Admin API.</p></div>'
      : liveState?.error
        ? `<div class="empty"><h3>Records are not available</h3><p>${escapeActivityText(liveState.error)}</p></div>`
        : rows.length
          ? `${controlledTable(resourceView, pagination.rows)}${paginationControls(resourceView, pagination)}`
          : `<div class="empty"><h3>No matching records</h3><p>${hasQuery ? "Clear your search to see more results." : "There are no records in this view."}</p><button class="btn reset-results">Reset view</button></div>`;
  main.innerHTML = `${pageHead(...heads[resourceView])}<section class="panel resource"><div class="tabs" aria-label="Filter ${view} records">${tabs.map((tab: string) => { const label = tab === "All" || tab === "Team" || tab === "Solo" ? tab : resourceView === "payouts" ? payoutStatusLabel(tab) : resourceView === "disputes" ? disputeCaseStatusLabel(tab) : resourceView === "quests" ? questStateLabel(tab) : tab; return `<button class="tab ${state.tab === tab.toLowerCase() ? "active" : ""}" data-tab="${tab.toLowerCase()}" aria-pressed="${state.tab === tab.toLowerCase()}">${escapeActivityText(label)}${tab === "All" ? ` (${resourceCollections[resourceView].length})` : ""}</button>`; }).join("")}</div><div class="toolbar resource-toolbar"><div class="inline-search search-field">${ico("search")}<input id="resource-search" value="${escapeActivityText(state.query)}" placeholder="Search ${view}…" aria-label="Search ${view}" autocomplete="off">${hasQuery ? '<button class="clear-search" aria-label="Clear search"><span class="close-lines"></span></button>' : ""}</div><span class="sort-help">Click a column to sort</span>${pageSizeControls(resourceView)}<span class="count" aria-live="polite">${resultCount(resourceView, pagination)}</span></div>${resultContent}</section>`;
  main.querySelectorAll<LegacyDomElement>("[data-tab]").forEach((button) => {
    const tab = resourceTabValue(button.dataset.tab || "all"),
      kind = resourceView === "quests" ? questFilterKind(tab) : "status",
      active = resourceTabIsActive(resourceView, tab);
    button.setAttribute("type", "button");
    button.dataset.filterKind = kind;
    if (kind === "status") button.dataset.filterValue = tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  bind();
});

function controlledTable(view: ResourceView, rows: LegacyRecord[]): string {
  const visible = state.visibleColumns[view] || [],
    columns = resourceColumns[view].filter(([key]) => visible.includes(key));
  const activeSort = sortSpec(view, state.orderBy[view]);
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${view} table"><table class="data"><thead><tr>${columns.map(([key, label]: ResourceColumn) => { const active = activeSort?.key === key; return `<th scope="col" aria-sort="${active ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}"><span class="table-sort${active ? " is-active" : ""}" data-sort-key="${key}">${label}<span class="sort-indicator" aria-hidden="true">${active ? (activeSort.direction === "asc" ? "↑" : "↓") : "↕"}</span></span></th>`; }).join("")}</tr></thead><tbody>${rows.map((record: LegacyRecord) => {
    const target = `${view}:${resourceCollections[view].indexOf(record)}`;
    return `<tr class="${view === "disputes" && disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING" ? "dispute-active-row" : ""}" data-open="${target}">${columns.map(([key]) => tableCell(view, record, key, target)).join("")}</tr>`;
  }).join("")}</tbody></table></div>`;
}

function disputeCaseIdForQuest(record: LegacyRecord): string | undefined {
  if (questStateFor(record.questState ?? record.status) !== "QUEST_FAILED") return undefined;
  return Object.entries(disputeCases).find(
    ([, caseData]) => String(caseData.questId || "") === record.id,
  )?.[0];
}

function tableCell(view: ResourceView, record: LegacyRecord, key: string, target: string): string {
  if (key === "id")
    return `<td><button class="row-record-button" data-open="${target}" aria-label="Open ${view.slice(0, -1)} ${escapeActivityText(record.id)}">${escapeActivityText(record.id)}</button></td>`;
  if (key === "title") {
    const title = `<strong>${escapeActivityText(record.title)}</strong>${view === "disputes" ? `<small>${escapeActivityText(record.detail).slice(0, 45)}…</small>` : view === "quests" && record.teamQuest ? `<small>${record.teamSize} selected participants · Team quest</small>` : ""}`;
    return view === "users" ? `<td><a class="user-record-link" href="/users/${encodeURIComponent(record.id)}">${title}</a></td>` : `<td>${title}</td>`;
  }
  if (key === "person") return `<td><strong>${escapeActivityText(record.person)}</strong></td>`;
  if (key === "other") return `<td>${escapeActivityText(record.other)}</td>`;
  if (key === "amount") return `<td class="money">฿${fmt(record.amount)}</td>`;
  if (key === "requestedAt") return `<td>${escapeActivityText(record.requestedAt || "—")}</td>`;
  if (key === "status") {
    const disputeCaseId = view === "quests" ? disputeCaseIdForQuest(record) : undefined;
    const status = view === "quests"
      ? questStateFor(record.questState ?? record.status)
      : view === "disputes"
        ? disputeCaseStatusFor(record.disputeCaseStatus ?? record.status)
        : view === "payouts"
          ? payoutStatusFor(record.payoutStatus ?? record.status)
          : view === "reports"
            ? reportCaseStatusFor(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision)
            : walletStatusFor(record.walletStatus ?? record.status);
    const hiddenOverlay = view === "quests" && hasHiddenQuestOverlay(record)
      ? '<span class="badge neutral quest-hidden-overlay">Hidden</span>'
      : "";
    return `<td>${view === "payouts" ? payoutBadge(status, record.tone) : badge(status, record.tone)}${hiddenOverlay}${disputeCaseId ? `<a class="link quest-dispute-link" href="/disputes/${encodeURIComponent(disputeCaseId)}">View dispute case</a>` : ""}</td>`;
  }
  if (key === "disputeDate") return `<td>${escapeActivityText(record.disputeDate || "—")}</td>`;
  if (key === "disputeType")
    return `<td><strong>${escapeActivityText(disputeTypeLabel(record))}</strong></td>`;
  if (key === "reportedUserName")
    return `<td><a class="user-record-link" href="/users/${encodeURIComponent(String(record.reportedUserId || ""))}"><strong>${escapeActivityText(record.reportedUserName)}</strong></a></td>`;
  if (key === "reporterName")
    return `<td><a class="user-record-link" href="/users/${encodeURIComponent(String(record.reporterId || ""))}">${escapeActivityText(record.reporterName)}</a></td>`;
  if (key === "category") return `<td>${escapeActivityText(record.category)}</td>`;
  if (key === "reportedAt") return `<td>${escapeActivityText(record.reportedAt)}</td>`;
  if (key === "age") return `<td>${escapeActivityText(record.age)}</td>`;
  return "<td>—</td>";
}

const originalBind = bind;
let resourceSearchTimer: ReturnType<typeof setTimeout> | undefined;
const resourceBind = function (): void {
  originalBind();
  const search = document.querySelector<HTMLInputElement>("#resource-search");
  if (search)
    search.oninput = (event: Event) => {
      const input = event.currentTarget;
      if (!(input instanceof HTMLInputElement)) return;
      const start = input.selectionStart;
      state.query = input.value;
      if (state.view in resourceColumns) resetPagination(state.view as ResourceView);
      clearTimeout(resourceSearchTimer);
      resourceSearchTimer = setTimeout(() => {
        renderResource(state.view);
        const next = document.querySelector<HTMLInputElement>("#resource-search");
        next?.focus();
        next?.setSelectionRange(start, start);
      }, 160);
    };
  document.querySelector<LegacyDomElement>(".clear-search")?.addEventListener("click", () => {
    state.query = "";
      resetPagination(state.view as ResourceView);
    renderResource(state.view);
  });
  document.querySelectorAll<LegacyDomElement>(".table-sort").forEach((header) => header.addEventListener("click", () => {
      const key = header.dataset.sortKey;
      if (!(state.view in resourceColumns)) return;
      const resourceView = state.view as ResourceView;
      const current = sortSpec(resourceView, state.orderBy[resourceView]);
      const direction = current?.key === key && current?.direction === "asc" ? "desc" : "asc";
      if (!key) return;
      state.orderBy[resourceView] = `${key}-${direction}`;
      resetPagination(resourceView);
      renderResource(state.view);
    }));
  document.querySelectorAll<LegacyDomElement>(".page-size-button").forEach((button) => button.addEventListener("click", () => {
      if (!(state.view in resourceColumns)) return;
      const pagination = paginationFor(state.view as ResourceView);
      pagination.size = button.dataset.pageSize === "all" ? "all" : Number(button.dataset.pageSize) || 10;
      pagination.page = 1;
      renderResource(state.view);
    }));
  document.querySelectorAll<LegacyDomElement>(".page-nav").forEach((button) => button.addEventListener("click", () => {
      if (!(state.view in resourceColumns)) return;
      paginationFor(state.view as ResourceView).page = Number(button.dataset.pageNumber) || 1;
      renderResource(state.view);
    }));
  document.querySelector<LegacyDomElement>(".reset-results")?.addEventListener("click", () => {
    state.query = "";
    state.tab = "all";
    state.questFilters = { mode: "all", status: "all" };
    if (!(state.view in resourceColumns)) return;
    resetPagination(state.view as ResourceView);
    renderResource(state.view);
  });
};
setBind(resourceBind);
window.addEventListener("pageshow", (event) => {
  if (!event.persisted || !(state.view in resourceColumns)) return;
  resetResourceState();
  renderResource(state.view);
});
window.__KUQUEST_RESET_RESOURCE_STATE__ = resetResourceState;
