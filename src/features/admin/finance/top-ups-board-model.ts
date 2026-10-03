import type { AdminApiTopUpStatus, AdminTopUpListItem } from "../api/admin-api";
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
  fromStatus: AdminApiTopUpStatus | null;
  toStatus: AdminApiTopUpStatus;
  occurredAt: string | null;
};

export function topUpDisplayId(topUp: Pick<AdminTopUpListItem, "displayId">): string {
  return displayAdminId(topUp.displayId) ?? "Top-up";
}

export function topUpStatusTimeline(topUp: AdminTopUpListItem): TopUpStatusTimelineEntry[] {
  const initialStatus: TopUpStatusTimelineEntry = {
    fromStatus: null,
    toStatus: "PENDING",
    occurredAt: topUp.createdAt,
  };

  if (topUp.topUpStatus === "PENDING") return [initialStatus];

  return [
    initialStatus,
    {
      fromStatus: "PENDING",
      toStatus: topUp.topUpStatus,
      occurredAt: topUp.topUpStatus === "PAID" ? topUp.paidAt : null,
    },
  ];
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
