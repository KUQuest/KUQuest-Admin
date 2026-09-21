import type { PersistedAdminData } from "../data/admin-records";
import {
  conductReportRoutes,
  activityRoutes,
  disputeRoutes,
  memberRoutes,
  payoutRoutes,
  questRoutes,
  reportRoutes,
  walletRoutes,
} from "../admin-routes";
import {
  disputeCaseStatusLabel,
  isConductReportStatus,
  memberStatusLabel,
  payoutStatusLabel,
  questStateLabel,
  reportCaseStatusLabel,
  walletStatusLabel,
} from "../domain/rulebook";
import {
  apiStatusLabel,
  recordNewestAt,
  recordStatusLabel,
  recordText,
  timestampValue,
} from "./overview-values";
import {
  searchResultLabel,
  searchResultOrder,
  type AdminSearchResultKind,
} from "../search/search-descriptors";
import { hasHiddenQuestOverlay } from "../domain/rulebook";

export type OverviewSearchResult = {
  kind: AdminSearchResultKind;
  id: string;
  title: string;
  detail: string;
  status: string;
  newestAt: number;
  href: string;
  searchText?: string;
};

type OverviewSearchDate = string | number | null;

export type OverviewApiSearchData = {
  quests: Array<{ id: string; displayId?: string; title: string; hiddenAt?: string | null; status?: string; newestAt?: OverviewSearchDate }>;
  members: Array<{ id: string; firstName: string; lastName: string; studentId: string | null; status?: string; newestAt?: OverviewSearchDate }>;
  payouts: Array<{ id: string; student: { firstName: string; lastName: string }; status?: string; newestAt?: OverviewSearchDate }>;
  disputes?: Array<{ id: string; title: string; questId?: string; status?: string; newestAt?: OverviewSearchDate }>;
  reports?: Array<{ id: string; title: string; reportedMemberId?: string; conduct?: boolean; status?: string; newestAt?: OverviewSearchDate }>;
  wallets?: Array<{ id: string; memberId: string; memberName: string; status?: string; newestAt?: OverviewSearchDate }>;
};

const mockMemberStatusById: Record<string, "Normal" | "Flag" | "Perm Ban"> = {
  "68000000": "Normal",
  "68000020": "Flag",
  "68000040": "Perm Ban",
};

function mockMemberSearchStatus(member: unknown): string {
  const storedStatus = recordText(member, "memberStatus");
  return storedStatus ? memberStatusLabel(storedStatus) : mockMemberStatusById[recordText(member, "id")] ?? "Not provided";
}

function memberName(member: { firstName: string; lastName: string }): string {
  return `${member.firstName} ${member.lastName}`.trim() || "Member";
}

export function compareOverviewSearchResults(left: OverviewSearchResult, right: OverviewSearchResult): number {
  const categoryDifference = searchResultOrder(left.kind) - searchResultOrder(right.kind);
  if (categoryDifference) return categoryDifference;
  return right.newestAt - left.newestAt || right.id.localeCompare(left.id);
}

export function sortOverviewSearchResults(results: OverviewSearchResult[]): OverviewSearchResult[] {
  return results.toSorted(compareOverviewSearchResults);
}

function matchingSearchResults(results: OverviewSearchResult[], query: string): OverviewSearchResult[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const lowerQuery = normalizedQuery.toLowerCase();
  return sortOverviewSearchResults(results.filter((result) => (
    `${result.id} ${result.title} ${result.detail} ${result.status} ${result.searchText ?? ""}`
      .toLowerCase()
      .includes(lowerQuery)
  ))).slice(0, 12);
}

export function overviewSearchResultsFromMockData(
  data: PersistedAdminData,
  query: string,
): OverviewSearchResult[] {
  const members = data.collections.users.map((member): OverviewSearchResult => ({
    kind: "member",
    id: member.id,
    title: member.title,
    detail: "Member",
    status: mockMemberSearchStatus(member),
    newestAt: recordNewestAt(member, ["updatedAt", "lastActiveAt", "createdAt", "accountCreatedAt"]),
    href: memberRoutes.detail(member.id),
    searchText: recordText(member, "studentId"),
  }));
  const quests = data.collections.quests.flatMap((record): OverviewSearchResult[] => {
    if (record && typeof record === "object" && hasHiddenQuestOverlay(record as { hiddenAt?: unknown; status?: unknown; questState?: unknown })) return [];
    const id = recordText(record, "id");
    const title = recordText(record, "title");
    return id && title ? [{
      kind: "quest",
      id,
      title,
      detail: "Quest",
      status: recordStatusLabel(record, ["questState", "status"], questStateLabel),
      newestAt: recordNewestAt(record, ["updatedAt", "createdAt", "startTime"]),
      href: questRoutes.detail(id),
    }] : [];
  });
  const payouts = data.collections.payouts.flatMap((record): OverviewSearchResult[] => {
    const id = recordText(record, "id");
    const title = recordText(record, "title");
    return id && title ? [{
      kind: "payout",
      id,
      title,
      detail: "Payout",
      status: recordStatusLabel(record, ["payoutStatus", "status"], payoutStatusLabel),
      newestAt: recordNewestAt(record, ["updatedAt", "createdAt"]),
      href: payoutRoutes.detail(id),
    }] : [];
  });
  const disputes = data.collections.disputes.flatMap((record): OverviewSearchResult[] => {
    const id = recordText(record, "displayId") || recordText(record, "id");
    const title = recordText(record, "title") || "Dispute Case";
    const questId = recordText(record, "questId");
    return id ? [{
      kind: "dispute",
      id,
      title,
      detail: "Dispute Case",
      status: recordStatusLabel(record, ["disputeCaseStatus", "status"], disputeCaseStatusLabel),
      newestAt: recordNewestAt(record, ["updatedAt", "disputeDate", "createdAt", "failedAt"]),
      href: disputeRoutes.detail(recordText(record, "id") || id),
      searchText: `${questId} ${recordText(record, "status")} ${recordText(record, "filerName")}`,
    }] : [];
  });
  const reports = data.collections.reports.flatMap((record): OverviewSearchResult[] => {
    const id = recordText(record, "id");
    const conduct = isConductReportStatus(recordText(record, "status")) || isConductReportStatus(recordText(record, "conductReportStatus"));
    const title = recordText(record, conduct ? "reasonCode" : "category") || (conduct ? "Conduct Report" : "Report Case");
    return id ? [{
      kind: conduct ? "conduct-report" : "report",
      id,
      title,
      detail: conduct ? "Conduct Report" : "Report Case",
      status: recordStatusLabel(record, [conduct ? "conductReportStatus" : "reportCaseStatus", "status"], reportCaseStatusLabel),
      newestAt: recordNewestAt(record, ["updatedAt", "reportedAt", "createdAt", "closedAt"]),
      href: conduct ? conductReportRoutes.detail(id) : reportRoutes.detail(id),
      searchText: `${recordText(record, "reportedMemberId")} ${recordText(record, "reportedUserName")} ${recordText(record, "questId")} ${recordText(record, "details")}`,
    }] : [];
  });
  const wallets = data.collections.users.map((member): OverviewSearchResult => ({
    kind: "wallet",
    id: `WLT-${member.id}`,
    title: `${member.title} Wallet`,
    detail: "Wallet",
    status: recordStatusLabel(member, ["walletStatus"], walletStatusLabel),
    newestAt: recordNewestAt(member, ["walletUpdatedAt", "updatedAt", "lastActiveAt", "createdAt"]),
    href: walletRoutes.list(),
    searchText: `${member.id} ${recordText(member, "walletStatus")} ${recordText(member, "studentId")}`,
  }));
  const activity: OverviewSearchResult = {
    kind: "activity",
    id: "ACTIVITY-LOG",
    title: "Activity Log",
    detail: "Activity Log",
    status: "Recorded",
    newestAt: 0,
    href: activityRoutes.list(),
    searchText: "audit administrative action history",
  };
  return matchingSearchResults([...members, ...quests, ...payouts, ...disputes, ...reports, ...wallets, activity], query);
}

export function overviewSearchResultsFromApi(
  records: OverviewApiSearchData,
  query: string,
): OverviewSearchResult[] {
  const members = records.members.map((member): OverviewSearchResult => ({
    kind: "member",
    id: member.id,
    title: memberName(member),
    detail: "Member",
    status: apiStatusLabel(member.status, memberStatusLabel),
    newestAt: timestampValue(member.newestAt),
    href: memberRoutes.detail(member.id),
    searchText: member.studentId ?? "",
  }));
  const quests = records.quests
    .filter((quest) => !quest.hiddenAt)
    .map((quest): OverviewSearchResult => ({
      kind: "quest",
      id: quest.displayId ?? quest.id,
      title: quest.title,
      detail: "Quest",
      status: apiStatusLabel(quest.status, questStateLabel),
      newestAt: timestampValue(quest.newestAt),
      href: questRoutes.detail(quest.id),
    }));
  const payouts = records.payouts.map((payout): OverviewSearchResult => ({
    kind: "payout",
    id: payout.id,
    title: memberName(payout.student),
    detail: "Payout",
    status: apiStatusLabel(payout.status, payoutStatusLabel),
    newestAt: timestampValue(payout.newestAt),
    href: payoutRoutes.detail(payout.id),
  }));
  const disputes = (records.disputes ?? []).map((dispute): OverviewSearchResult => ({
    kind: "dispute",
    id: dispute.id,
    title: dispute.title,
    detail: "Dispute Case",
    status: apiStatusLabel(dispute.status, disputeCaseStatusLabel),
    newestAt: timestampValue(dispute.newestAt),
    href: disputeRoutes.detail(dispute.id),
    searchText: dispute.questId ?? "",
  }));
  const reports = (records.reports ?? []).map((report): OverviewSearchResult => ({
    kind: report.conduct ? "conduct-report" : "report",
    id: report.id,
    title: report.title,
    detail: report.conduct ? "Conduct Report" : "Report Case",
    status: apiStatusLabel(report.status, reportCaseStatusLabel),
    newestAt: timestampValue(report.newestAt),
    href: report.conduct ? conductReportRoutes.detail(report.id) : reportRoutes.detail(report.id),
    searchText: report.reportedMemberId ?? "",
  }));
  const wallets = (records.wallets ?? []).map((wallet): OverviewSearchResult => ({
    kind: "wallet",
    id: wallet.id,
    title: `${wallet.memberName} Wallet`,
    detail: "Wallet",
    status: apiStatusLabel(wallet.status, walletStatusLabel),
    newestAt: timestampValue(wallet.newestAt),
    href: walletRoutes.list(),
    searchText: `${wallet.memberId} ${wallet.status ?? ""}`,
  }));
  return matchingSearchResults([...members, ...quests, ...payouts, ...disputes, ...reports, ...wallets], query);
}

export function overviewSearchResultLabel(kind: OverviewSearchResult["kind"]): string {
  return searchResultLabel(kind);
}
