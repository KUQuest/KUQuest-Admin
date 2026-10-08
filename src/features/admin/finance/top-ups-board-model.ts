import { ADMIN_API_TOP_UP_STATUSES, type AdminApiTopUpStatus, type AdminTopUpListItem, type AdminTopUpStatusHistoryEntry } from "../api/admin-api";
import { displayAdminId } from "../display-admin-id";
import { dateSortValue } from "../data/board-sorting";

export const TOP_UP_BOARD_TABS = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "PAID", label: "Paid" },
  { id: "EXPIRED", label: "Expired" },
  { id: "FAILED", label: "Failed" },
] as const satisfies readonly { id: "all" | AdminApiTopUpStatus; label: string }[];

export type TopUpBoardTab = (typeof TOP_UP_BOARD_TABS)[number]["id"];
export type TopUpSortKey = "id" | "member" | "creditAmount" | "paymentTotal" | "status" | "createdAt";

export type TopUpStatusTimelineEntry = {
  id: string;
  fromStatus: AdminApiTopUpStatus | null;
  toStatus: AdminApiTopUpStatus;
  occurredAt: string;
};

export type TopUpStatusHistoryReadback =
  | { kind: "history"; entries: TopUpStatusTimelineEntry[] }
  | { kind: "empty" }
  | { kind: "invalid" };

export type TopUpStatusHistoryState = TopUpStatusHistoryReadback | { kind: "loading" | "unavailable" };

export function topUpDisplayId(topUp: Pick<AdminTopUpListItem, "displayId">): string {
  return displayAdminId(topUp.displayId) ?? "Top-up";
}

function isTopUpStatus(value: unknown): value is AdminApiTopUpStatus {
  return typeof value === "string" && ADMIN_API_TOP_UP_STATUSES.includes(value as AdminApiTopUpStatus);
}

export function topUpStatusHistoryFromResponse(value: unknown): TopUpStatusHistoryReadback {
  if (!Array.isArray(value)) return { kind: "invalid" };
  if (!value.length) return { kind: "empty" };

  const entries: TopUpStatusTimelineEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { kind: "invalid" };
    const entry = item as Partial<AdminTopUpStatusHistoryEntry>;
    if (
      typeof entry.id !== "string"
      || !isTopUpStatus(entry.toStatus)
      || (entry.fromStatus !== null && !isTopUpStatus(entry.fromStatus))
      || !(entry.providerStatus === null || typeof entry.providerStatus === "string")
      || typeof entry.source !== "string"
      || !(entry.reason === null || typeof entry.reason === "string")
      || typeof entry.occurredAt !== "string"
      || !Number.isFinite(Date.parse(entry.occurredAt))
    ) return { kind: "invalid" };
    entries.push({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      occurredAt: entry.occurredAt,
    });
  }

  return { kind: "history", entries };
}

export function topUpStatusHistoryStateFromQuery(query: {
  isPending: boolean;
  isError: boolean;
  data?: unknown;
}): TopUpStatusHistoryState {
  if (query.isPending) return { kind: "loading" };
  if (query.isError) return { kind: "unavailable" };
  return topUpStatusHistoryFromResponse(query.data);
}

export function topUpMatchesTab(topUp: AdminTopUpListItem, tab: TopUpBoardTab): boolean {
  return tab === "all" || topUp.topUpStatus === tab;
}

export function searchTopUps(topUps: AdminTopUpListItem[], query: string): AdminTopUpListItem[] {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return topUps;

  return topUps.filter((topUp) => [
    topUpDisplayId(topUp),
    topUp.id,
    topUp.member.firstName,
    topUp.member.lastName,
    topUp.member.studentId,
    topUp.providerReference,
    topUp.topUpStatus,
  ].some((field) => field?.toLocaleLowerCase().includes(value)));
}

export function topUpSortValue(topUp: AdminTopUpListItem, key: TopUpSortKey): number | string | null {
  switch (key) {
    case "id": return topUpDisplayId(topUp);
    case "member": return `${topUp.member.firstName} ${topUp.member.lastName}`.trim();
    case "creditAmount": return topUp.creditAmountSatang;
    case "paymentTotal": return topUp.paymentTotalSatang;
    case "status": return topUp.topUpStatus;
    case "createdAt": return dateSortValue(topUp.createdAt);
  }
}
