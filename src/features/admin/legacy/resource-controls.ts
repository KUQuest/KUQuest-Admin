import {
  badge,
  bind,
  data,
  disputeTypeLabel,
  escapeActivityText,
  fmt,
  heads,
  ico,
  main,
  pageHead,
  renderActivity,
  renderPolicies,
  renderResource,
  setBind,
  setRenderResource,
  state,
} from "./script";
import type { LegacyDomElement, LegacyRecord, LegacyRuntimeData } from "./runtime";

type ResourceView = keyof Pick<LegacyRuntimeData, "disputes" | "quests" | "users" | "payouts" | "reports">;
type ResourceColumn = [string, string];
type Pagination = { page: number; size: number | "all" };
type PaginationResult = { rows: LegacyRecord[]; page: number; pageCount: number; start: number; end: number; total: number };

const resourceCollections: Record<string, LegacyRecord[]> = data;
const resourceColumns: Record<ResourceView, ResourceColumn[]> = {
  disputes: [
    ["id", "Case"],
    ["title", "Quest"],
    ["amount", "Amount"],
    ["status", "Status"],
    ["disputeDate", "Dispute date"],
    ["disputeType", "Category"],
  ],
  quests: [
    ["id", "Quest"],
    ["title", "Title"],
    ["person", "Hirer"],
    ["other", "Tag"],
    ["amount", "Wage"],
    ["status", "Status"],
  ],
  users: [
    ["id", "Student ID"],
    ["title", "User"],
    ["person", "Email"],
    ["other", "Academic profile"],
    ["status", "Status"],
  ],
  payouts: [
    ["id", "Payout"],
    ["title", "Recipient"],
    ["person", "Account"],
    ["amount", "Amount"],
    ["requestedAt", "Requested"],
    ["status", "Status"],
  ],
  reports: [
    ["id", "Report"],
    ["reportedUserName", "Reported user"],
    ["reporterName", "Reported by"],
    ["category", "Type"],
    ["status", "Status"],
    ["reportedAt", "Reported"],
  ],
};
const resourceTabs: Record<ResourceView, string[]> = {
  disputes: ["All", "Active", "Closed"],
  payouts: ["All", "Needs approval", "Processing", "Completed", "Rejected"],
  quests: ["All", "Team", "Solo", "Draft", "Open", "Assigned", "In progress", "Submitted", "Change pending", "Approved", "Disputed", "Completed", "Cancelled", "Hidden"],
  users: ["All", "Normal", "Red Flag", "Temp ban", "Perm ban"],
  reports: ["All", "Active", "Closed"],
};
const pageSizeOptions: Array<[number | "all", string]> = [
  [10, "Show 10"],
  [25, "Show 25"],
  [50, "Show 50"],
  ["all", "Show all"],
];
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
  state.filters = {};
  state.questFilters = { mode: "all", status: "all" };
  state.orderBy = Object.fromEntries(
    Object.keys(resourceColumns).map((view) => [view, null]),
  );
  state.pagination = Object.fromEntries(
    Object.keys(resourceColumns).map((view) => [view, { page: 1, size: 10 }]),
  );
  state.tab = "all";
  state.query = "";
}

function matchingRows(view: ResourceView): LegacyRecord[] {
  const query = state.query.trim().toLowerCase(),
    statuses = state.filters[view] || [],
    questFilters = state.questFilters || { mode: "all", status: "all" };
  const rows = resourceCollections[view].filter((record: LegacyRecord) => {
    const searchable = [
      record.id,
      record.title,
      record.person,
      record.other,
      record.status,
      record.disputeDate || "",
      record.disputeType || "",
      record.reporterName || "",
      record.reportedUserName || "",
      record.category || "",
      record.details || "",
      record.reportedAt || "",
      record.requestedAt || "",
      record.detail || "",
    ]
      .join(" ")
      .toLowerCase();
    const matchesTab =
      view === "quests"
        ? (questFilters.mode === "all" ||
            (questFilters.mode === "team"
              ? Boolean(record.teamQuest)
              : !record.teamQuest)) &&
          (questFilters.status === "all" ||
            record.status === questFilters.status)
        : state.tab === "all" || record.status.toLowerCase().includes(state.tab);
    return (
      (!query || searchable.includes(query)) &&
      matchesTab &&
      (!statuses.length || statuses.includes(record.status))
    );
  });
  const order = state.orderBy[view],
    activeSort = sortSpec(view, order);
  if (!activeSort) return rows;
  const { key, direction } = activeSort,
    compareText = (a: string | number | null, b: string | number | null) =>
      String(a ?? "").localeCompare(String(b ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
  return rows
    .map((record, index) => ({ record, index }))
    .sort((leftRecord, rightRecord) => {
      const left = sortValue(view, leftRecord.record, key),
        right = sortValue(view, rightRecord.record, key),
        leftEmpty = isEmptySortValue(left),
        rightEmpty = isEmptySortValue(right);
      if (leftEmpty || rightEmpty) {
        if (leftEmpty && rightEmpty) return leftRecord.index - rightRecord.index;
        return leftEmpty ? 1 : -1;
      }
      const difference =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : compareText(left, right);
      return difference ? (direction === "desc" ? -difference : difference) : leftRecord.index - rightRecord.index;
    })
    .map(({ record }) => record);
}

function sortSpec(view: ResourceView, order: string | null | undefined): { key: string; direction: "asc" | "desc" } | null {
  if (!order) return null;
  const aliases: Record<string, { key: string; direction: "asc" | "desc" }> = {
    newest: { key: "disputeDate", direction: "desc" },
    oldest: { key: "disputeDate", direction: "asc" },
    "quest-id-desc": { key: "id", direction: "desc" },
    "quest-id-asc": { key: "id", direction: "asc" },
    "amount-high": { key: "amount", direction: "desc" },
    "amount-low": { key: "amount", direction: "asc" },
    title: { key: "title", direction: "asc" },
    "title-desc": { key: "title", direction: "desc" },
    status: { key: "status", direction: "asc" },
    id: { key: "id", direction: "asc" },
  };
  if (aliases[order]) return aliases[order];
  const generic = /^(.*)-(asc|desc)$/.exec(order || "");
  if (generic && resourceColumns[view].some(([column]) => column === generic[1]))
    return { key: generic[1], direction: generic[2] === "desc" ? "desc" : "asc" };
  return null;
}

function sortValue(view: ResourceView, record: LegacyRecord, key: string): string | number | null {
  if (key === "amount") return record.amount == null ? null : Number(record.amount);
  if (key === "disputeDate") return dateSortValue(record.disputeDate);
  if (key === "requestedAt")
    return dateSortValue(record.requestedAt);
  if (key === "reportedAt") return dateSortValue(record.reportedAt);
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? value : value == null ? null : String(value);
}

function dateSortValue(value: unknown): number | null {
  if (!value) return null;
  const timestamp = Date.parse(String(value).replace(" · ", " "));
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isEmptySortValue(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || value === "" || Number.isNaN(value);
}

function paginationFor(view: ResourceView): Pagination {
  return state.pagination[view] || (state.pagination[view] = { page: 1, size: 10 });
}

function resetPagination(view: ResourceView): void {
  paginationFor(view).page = 1;
}

function paginateRows(view: ResourceView, rows: LegacyRecord[]): PaginationResult {
  const pagination = paginationFor(view);
  if (pagination.size === "all") {
    pagination.page = 1;
    return {
      rows,
      page: 1,
      pageCount: 1,
      start: rows.length ? 1 : 0,
      end: rows.length,
      total: rows.length,
    };
  }
  const size = Number(pagination.size) || 10,
    pageCount = Math.max(1, Math.ceil(rows.length / size));
  pagination.page = Math.min(Math.max(1, Number(pagination.page) || 1), pageCount);
  const startIndex = (pagination.page - 1) * size;
  return {
    rows: rows.slice(startIndex, startIndex + size),
    page: pagination.page,
    pageCount,
    start: rows.length ? startIndex + 1 : 0,
    end: Math.min(startIndex + size, rows.length),
    total: rows.length,
  };
}

function resultCount(view: ResourceView, pagination: PaginationResult): string {
  const noun = pagination.total === 1 ? "result" : "results";
  if (!pagination.total) return "Showing 0 of 0 results";
  if (paginationFor(view).size === "all")
    return `Showing all ${pagination.total} ${noun}`;
  return `Showing ${pagination.start}–${pagination.end} of ${pagination.total} ${noun}`;
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

function questFilterKind(tab: string): "all" | "mode" | "status" {
  const normalized = tab.toLowerCase();
  if (normalized === "all") return "all";
  if (["team", "solo"].includes(normalized)) return "mode";
  return "status";
}

function resourceTabIsActive(view: ResourceView, tab: string): boolean {
  const normalized = tab.toLowerCase();
  if (view !== "quests") return state.tab === normalized;
  const filters = state.questFilters || { mode: "all", status: "all" };
  if (normalized === "all") return filters.mode === "all" && filters.status === "all";
  if (["team", "solo"].includes(normalized)) return filters.mode === normalized;
  return filters.status === tab;
}

setRenderResource(function resourceRender(view: string): void {
  if (view === "policies") return renderPolicies();
  if (view === "activity") return renderActivity();
  if (!(view in resourceColumns)) return;
  const resourceView = view as ResourceView;
  const rows = matchingRows(resourceView),
    pagination = paginateRows(resourceView, rows),
    tabs = resourceTabs[resourceView],
    hasQuery = Boolean(state.query);
  main.innerHTML = `${pageHead(...heads[resourceView])}<section class="panel resource"><div class="tabs" aria-label="Filter ${view} records">${tabs.map((tab: string) => `<button class="tab ${state.tab === tab.toLowerCase() ? "active" : ""}" data-tab="${tab.toLowerCase()}" aria-pressed="${state.tab === tab.toLowerCase()}">${escapeActivityText(tab)}${tab === "All" ? ` (${resourceCollections[resourceView].length})` : ""}</button>`).join("")}</div><div class="toolbar resource-toolbar"><div class="inline-search search-field">${ico("search")}<input id="resource-search" value="${escapeActivityText(state.query)}" placeholder="Search ${view}…" aria-label="Search ${view}" autocomplete="off">${hasQuery ? '<button class="clear-search" aria-label="Clear search"><span class="close-lines"></span></button>' : ""}</div><span class="sort-help">Click a column to sort</span>${pageSizeControls(resourceView)}<span class="count" aria-live="polite">${resultCount(resourceView, pagination)}</span></div>${rows.length ? `${controlledTable(resourceView, pagination.rows)}${paginationControls(resourceView, pagination)}` : `<div class="empty"><h3>No matching records</h3><p>${hasQuery ? "Clear your search to see more results." : "There are no records in this view."}</p><button class="btn reset-results">Reset view</button></div>`}</section>`;
  main.querySelectorAll<LegacyDomElement>("[data-tab]").forEach((button) => {
    const tab = button.textContent.trim().replace(/\s+\(\d+\)$/, ""),
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
    return `<tr class="${view === "disputes" && record.status === "Active" ? "dispute-active-row" : ""}" data-open="${target}">${columns.map(([key]) => tableCell(view, record, key, target)).join("")}</tr>`;
  }).join("")}</tbody></table></div>`;
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
  if (key === "status") return `<td>${badge(record.status, record.tone)}</td>`;
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
if (state.view !== "home") renderResource(state.view);
window.__KUQUEST_RESET_RESOURCE_STATE__ = resetResourceState;
