import type { AdminSearchResult } from "../api/admin-api";
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
  memberStatusLabel,
  payoutStatusLabel,
  questStateLabel,
  reportCaseStatusLabel,
  walletStatusLabel,
} from "../domain/rulebook";
import {
  apiStatusLabel,
  timestampValue,
} from "./overview-values";
import {
  searchResultLabel,
  searchResultOrder,
  type AdminSearchResultKind,
} from "../search/search-descriptors";
import { displayAdminId } from "../display-admin-id";

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

export type OverviewApiSearchData = {
  quests: Array<{ id: string; displayId?: string; title: string; hiddenAt?: string | null; status?: string; newestAt?: string | number | null }>;
  members: Array<{ id: string; firstName: string; lastName: string; studentId: string | null; status?: string; newestAt?: string | number | null }>;
  payouts: Array<{ id: string; student: { firstName: string; lastName: string }; status?: string; newestAt?: string | number | null }>;
  disputes?: Array<{ id: string; displayId?: string; title: string; questId?: string; status?: string; newestAt?: string | number | null }>;
  reports?: Array<{ id: string; displayId?: string; title: string; reportedMemberId?: string; conduct?: boolean; status?: string; newestAt?: string | number | null }>;
  wallets?: Array<{ id: string; memberId: string; memberName: string; status?: string; newestAt?: string | number | null }>;
};

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

export function overviewSearchResultsFromApi(
  records: OverviewApiSearchData,
  query: string,
): OverviewSearchResult[] {
  const members = records.members.map((member): OverviewSearchResult => ({
    kind: "member",
    id: displayAdminId(member.studentId) ?? "",
    title: memberName(member),
    detail: "Member",
    status: apiStatusLabel(member.status, memberStatusLabel),
    newestAt: timestampValue(member.newestAt),
    href: memberRoutes.detail(member.id),
    searchText: `${member.id} ${member.studentId ?? ""}`,
  }));
  const quests = records.quests
    .filter((quest) => !quest.hiddenAt)
    .map((quest): OverviewSearchResult => ({
      kind: "quest",
      id: displayAdminId(quest.displayId, quest.id) ?? "",
      title: quest.title,
      detail: "Quest",
      status: apiStatusLabel(quest.status, questStateLabel),
      newestAt: timestampValue(quest.newestAt),
      href: questRoutes.detail(quest.id),
      searchText: quest.id,
    }));
  const payouts = records.payouts.map((payout): OverviewSearchResult => ({
    kind: "payout",
    id: displayAdminId(payout.id) ?? "",
    title: memberName(payout.student),
    detail: "Payout",
    status: apiStatusLabel(payout.status, payoutStatusLabel),
    newestAt: timestampValue(payout.newestAt),
    href: payoutRoutes.detail(payout.id),
    searchText: payout.id,
  }));
  const disputes = (records.disputes ?? []).map((dispute): OverviewSearchResult => ({
    kind: "dispute",
    id: displayAdminId(dispute.displayId, dispute.id) ?? "",
    title: dispute.title,
    detail: "Dispute Case",
    status: apiStatusLabel(dispute.status, disputeCaseStatusLabel),
    newestAt: timestampValue(dispute.newestAt),
    href: disputeRoutes.detail(dispute.id),
    searchText: `${dispute.id} ${dispute.questId ?? ""}`,
  }));
  const reports = (records.reports ?? []).map((report): OverviewSearchResult => ({
    kind: report.conduct ? "conduct-report" : "report",
    id: displayAdminId(report.displayId, report.id) ?? "",
    title: report.title,
    detail: report.conduct ? "Conduct Report" : "Report Case",
    status: apiStatusLabel(report.status, reportCaseStatusLabel),
    newestAt: timestampValue(report.newestAt),
    href: report.conduct ? conductReportRoutes.detail(report.id) : reportRoutes.detail(report.id),
    searchText: `${report.id} ${report.reportedMemberId ?? ""}`,
  }));
  const wallets = (records.wallets ?? []).map((wallet): OverviewSearchResult => ({
    kind: "wallet",
    id: "",
    title: `${wallet.memberName} Wallet`,
    detail: "Wallet",
    status: apiStatusLabel(wallet.status, walletStatusLabel),
    newestAt: timestampValue(wallet.newestAt),
    href: walletRoutes.list(),
    searchText: `${wallet.memberId} ${wallet.status ?? ""}`,
  }));
  return matchingSearchResults([...members, ...quests, ...payouts, ...disputes, ...reports, ...wallets], query);
}

export function overviewSearchResultsFromSearchApi(items: AdminSearchResult[]): OverviewSearchResult[] {
  return items.map((item): OverviewSearchResult => ({
    kind: item.kind,
    id: item.kind === "member"
      ? displayAdminId(item.studentId) ?? ""
      : displayAdminId(item.displayId, item.id) ?? "",
    title: item.title,
    detail: searchResultLabel(item.kind),
    status: searchApiStatusLabel(item),
    newestAt: timestampValue(item.newestAt),
    href: searchApiResultHref(item),
    searchText: item.resourceId,
  }));
}

function searchApiResultHref(item: AdminSearchResult): string {
  switch (item.kind) {
    case "member": return memberRoutes.detail(item.resourceId);
    case "quest": return questRoutes.detail(item.resourceId);
    case "payout": return payoutRoutes.detail(item.resourceId);
    case "dispute": return disputeRoutes.detail(item.resourceId);
    case "report": return reportRoutes.detail(item.resourceId);
    case "conduct-report": return conductReportRoutes.detail(item.resourceId);
    case "wallet": return walletRoutes.list();
    case "activity": return activityRoutes.list();
  }
}

function searchApiStatusLabel(item: AdminSearchResult): string {
  const status = item.status ?? undefined;
  switch (item.kind) {
    case "member": return apiStatusLabel(status, memberStatusLabel);
    case "quest": return apiStatusLabel(status, questStateLabel);
    case "payout": return apiStatusLabel(status, payoutStatusLabel);
    case "dispute": return apiStatusLabel(status, disputeCaseStatusLabel);
    case "report":
    case "conduct-report": return apiStatusLabel(status, reportCaseStatusLabel);
    case "wallet": return apiStatusLabel(status, walletStatusLabel);
    case "activity": return status ?? "Recorded";
  }
}

export function overviewSearchResultLabel(kind: OverviewSearchResult["kind"]): string {
  return searchResultLabel(kind);
}
