import type { LegacyPageState, LegacyRecord, LegacyRuntimeData } from "./runtime";
import {
  disputeCaseStatusFor,
  payoutStatusFor,
  questStateFor,
  reportCaseStatusFor,
  walletStatusFor,
} from "../domain/rulebook";

export type ResourceView = keyof Pick<
  LegacyRuntimeData,
  "disputes" | "quests" | "users" | "payouts" | "reports"
>;
export type ResourceColumn = [string, string];
export type Pagination = { page: number; size: number | "all" };
export type PaginationResult = {
  rows: LegacyRecord[];
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
};
export type ResourceState = Pick<
  LegacyPageState,
  "tab" | "query" | "questFilters" | "filters" | "orderBy" | "pagination"
>;

export const resourceColumns: Record<ResourceView, ResourceColumn[]> = {
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
    ["createdAt", "Created At"],
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

export const resourceTabs: Record<ResourceView, string[]> = {
  disputes: ["All", "DISPUTE_CASE_PENDING", "DISPUTE_CASE_DISMISSED", "DISPUTE_CASE_RESOLVED"],
  payouts: ["All", "PENDING_ADMIN_APPROVAL", "SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "SUCCEEDED", "FAILED", "CANCELLED"],
  quests: [
    "All",
    "Team",
    "Solo",
    "QUEST_DRAFT",
    "QUEST_OPEN",
    "QUEST_ASSIGNED",
    "QUEST_IN_PROGRESS",
    "QUEST_COMPLETED",
    "QUEST_CANCELLED",
    "QUEST_FAILED",
  ],
  users: ["All", "ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"],
  reports: ["All", "REPORT_CASE_PENDING", "REPORT_CASE_DISMISSED", "REPORT_CASE_HIDDEN", "REPORT_CASE_RESTORED", "CONDUCT_REPORT_PENDING", "CONDUCT_REPORT_UPHELD", "CONDUCT_REPORT_DISMISSED"],
};

export const pageSizeOptions: Array<[number | "all", string]> = [
  [10, "Show 10"],
  [25, "Show 25"],
  [50, "Show 50"],
  ["all", "Show all"],
];

function compareSortText(a: string | number | null, b: string | number | null): number {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function resetResourceState(state: ResourceState): void {
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

export function matchingRows(
  collections: Pick<LegacyRuntimeData, ResourceView>,
  state: ResourceState,
  view: ResourceView,
): LegacyRecord[] {
  const query = state.query.trim().toLowerCase();
  const statuses = state.filters[view] || [];
  const questFilters = state.questFilters || { mode: "all", status: "all" };
  const rows = collections[view].filter((record) => {
    const displayStatus = statusForView(view, record);
    const rawStatus = record.status.toLowerCase();
    const searchable = [
      record.id,
      record.title,
      record.person,
      record.other,
      record.status,
      displayStatus,
      record.disputeDate || "",
      record.disputeType || "",
      record.reporterName || "",
      record.reportedUserName || "",
      record.category || "",
      record.details || "",
      record.reportedAt || "",
      record.requestedAt || "",
      record.createdAt || "",
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
            displayStatus === questFilters.status ||
            record.status === questFilters.status)
        : state.tab === "all" || displayStatus.toLowerCase() === state.tab || rawStatus.includes(state.tab);
    return (
      (!query || searchable.includes(query)) &&
      matchesTab &&
      (!statuses.length || statuses.includes(record.status) || statuses.includes(displayStatus))
    );
  });
  const activeSort = sortSpec(view, state.orderBy[view]);
  if (!activeSort) return rows;
  const { key, direction } = activeSort;
  return rows
    .map((record, index) => ({ record, index }))
    .toSorted((leftRecord, rightRecord) => {
      const left = sortValue(leftRecord.record, key);
      const right = sortValue(rightRecord.record, key);
      const leftEmpty = isEmptySortValue(left);
      const rightEmpty = isEmptySortValue(right);
      if (leftEmpty || rightEmpty) {
        if (leftEmpty && rightEmpty) return leftRecord.index - rightRecord.index;
        return leftEmpty ? 1 : -1;
      }
      const difference =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : compareSortText(left, right);
      return difference
        ? direction === "desc"
          ? -difference
          : difference
        : leftRecord.index - rightRecord.index;
    })
    .map(({ record }) => record);
}

function statusForView(view: ResourceView, record: LegacyRecord): string {
  if (view === "quests") return questStateFor(record.questState ?? record.status);
  if (view === "disputes") return disputeCaseStatusFor(record.disputeCaseStatus ?? record.status);
  if (view === "payouts") return payoutStatusFor(record.payoutStatus ?? record.status);
  if (view === "reports") return reportCaseStatusFor(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision);
  return walletStatusFor(record.walletStatus ?? record.status);
}

export function sortSpec(
  view: ResourceView,
  order: string | null | undefined,
): { key: string; direction: "asc" | "desc" } | null {
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
  const generic = /^(.*)-(asc|desc)$/.exec(order);
  if (generic && resourceColumns[view].some(([column]) => column === generic[1])) {
    return {
      key: generic[1],
      direction: generic[2] === "desc" ? "desc" : "asc",
    };
  }
  return null;
}

function sortValue(record: LegacyRecord, key: string): string | number | null {
  if (key === "amount") return record.amount;
  if (key === "disputeDate") return dateSortValue(record.disputeDate);
  if (key === "requestedAt") return dateSortValue(record.requestedAt);
  if (key === "reportedAt") return dateSortValue(record.reportedAt);
  if (key === "createdAt") return dateSortValue(record.createdAt);
  const value = record[key];
  if (typeof value === "string" || typeof value === "number") return value;
  if (value == null) return null;
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(value) ?? null;
}

function dateSortValue(value: unknown): number | null {
  if (!value) return null;
  const text = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  if (!text) return null;
  const timestamp = Date.parse(text.replace(" · ", " "));
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isEmptySortValue(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || value === "" || Number.isNaN(value);
}

export function paginationFor(state: ResourceState, view: ResourceView): Pagination {
  return state.pagination[view] || (state.pagination[view] = { page: 1, size: 10 });
}

export function resetPagination(state: ResourceState, view: ResourceView): void {
  paginationFor(state, view).page = 1;
}

export function paginateRows(
  state: ResourceState,
  view: ResourceView,
  rows: LegacyRecord[],
): PaginationResult {
  const pagination = paginationFor(state, view);
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
  const size = pagination.size || 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  pagination.page = Math.min(Math.max(1, pagination.page || 1), pageCount);
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

export function resultCount(
  state: ResourceState,
  view: ResourceView,
  pagination: PaginationResult,
): string {
  const noun = pagination.total === 1 ? "result" : "results";
  if (!pagination.total) return "Showing 0 of 0 results";
  if (paginationFor(state, view).size === "all") {
    return `Showing all ${pagination.total} ${noun}`;
  }
  return `Showing ${pagination.start}–${pagination.end} of ${pagination.total} ${noun}`;
}

export function questFilterKind(tab: string): "all" | "mode" | "status" {
  const normalized = tab.toLowerCase();
  if (normalized === "all") return "all";
  if (["team", "solo"].includes(normalized)) return "mode";
  return "status";
}

export function resourceTabValue(tab: string): string {
  const normalized = tab.trim().toLowerCase();
  if (normalized === "all") return "All";
  if (normalized === "team") return "Team";
  if (normalized === "solo") return "Solo";
  return tab.trim().toUpperCase();
}

export function resourceTabIsActive(
  state: ResourceState,
  view: ResourceView,
  tab: string,
): boolean {
  const normalized = tab.toLowerCase();
  if (view !== "quests") return state.tab === normalized;
  const filters = state.questFilters || { mode: "all", status: "all" };
  if (normalized === "all") return filters.mode === "all" && filters.status === "all";
  if (["team", "solo"].includes(normalized)) return filters.mode === normalized;
  return filters.status === tab || filters.status === legacyStatusForTab(tab);
}

function legacyStatusForTab(tab: string): string {
  const values: Record<string, string> = {
    QUEST_DRAFT: "Draft",
    QUEST_OPEN: "Open",
    QUEST_ASSIGNED: "Assigned",
    QUEST_IN_PROGRESS: "In progress",
    QUEST_COMPLETED: "Completed",
    QUEST_CANCELLED: "Cancelled",
    QUEST_FAILED: "Failed",
  };
  return values[tab] || tab;
}
