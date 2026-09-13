import type {
  AdminMemberListItem,
  AdminOverview,
  AdminOverviewQueue,
  AdminPayout,
  AdminQuest,
} from "../api/admin-api";
import { adminNavigationCountsFromMockData } from "../admin-navigation";
import {
  conductReportRoutes,
  disputeRoutes,
  memberRoutes,
  payoutRoutes,
  questRoutes,
  reportRoutes,
} from "../admin-routes";
import {
  MEMBER_STATUSES,
  QUEST_STATES,
  WALLET_STATUSES,
  memberStatusFor,
  payoutStatusFor,
  questStateFor,
  questStateLabel,
  walletStatusFor,
  type MemberStatus,
  type QuestState,
  type WalletStatus,
} from "../domain/rulebook";
import type { PersistedAdminData } from "../data/admin-records";
import type { DashboardActivity } from "../dashboard/dashboard-model";

type OverviewCount = number | null;
type OverviewQueueId = "payouts" | "disputes" | "reports" | "conductReports";
type OverviewSource = "Admin API" | "Local fallback" | "Unavailable";

type OverviewQueueRoute = {
  list: () => string;
  detail?: (identifier: string) => string;
};

export type OverviewQueue = {
  id: OverviewQueueId;
  title: string;
  count: OverviewCount;
  oldest: string;
  oldestHref: string | null;
  listHref: string;
  status: string;
  waiting: string;
  tone: string;
  source: OverviewSource;
};

export type OverviewQuestState = {
  status: QuestState;
  label: string;
  count: number;
  percentage: number;
};

export type OverviewModel = {
  source: "Admin API" | "Local demo data";
  hasSummaryOnlyData: boolean;
  hasUnavailableData: boolean;
  loadedAt: number;
  totalWorkLeft: OverviewCount;
  queues: OverviewQueue[];
  questTotal: number;
  questStates: OverviewQuestState[];
  memberSignals: OverviewCount;
  reportCases: OverviewCount;
  conductReports: OverviewCount;
  memberStatusCounts: Array<{ status: MemberStatus; count: OverviewCount }>;
  memberStatusSource: OverviewSource;
  walletStatusCounts: Array<{ status: WalletStatus; count: OverviewCount }>;
  walletStatusSource: OverviewSource;
  frozenWallets: number;
  suspendedWallets: number;
  inFlightPayouts: number | null;
  activity: DashboardActivity[];
};

export type OverviewFallback = {
  disputes: OverviewCount;
  reports: OverviewCount;
  conductReports: OverviewCount;
  memberStatusCounts: Array<{ status: MemberStatus; count: OverviewCount }>;
  walletStatusCounts: Array<{ status: WalletStatus; count: OverviewCount }>;
};

export type OverviewSearchResult = {
  kind: "quest" | "member" | "payout";
  id: string;
  title: string;
  detail: string;
  href: string;
  searchText?: string;
};

const questStateTones: Record<QuestState, string> = {
  QUEST_DRAFT: "overview-bar-draft",
  QUEST_OPEN: "overview-bar-open",
  QUEST_ASSIGNED: "overview-bar-assigned",
  QUEST_IN_PROGRESS: "overview-bar-progress",
  QUEST_COMPLETED: "overview-bar-completed",
  QUEST_CANCELLED: "overview-bar-cancelled",
  QUEST_FAILED: "overview-bar-failed",
};

function countValue(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function countOrFallback(value: unknown, fallback: OverviewCount): OverviewCount {
  return value === undefined || value === null ? fallback : countValue(value);
}

function memberStatusCountsFromApi(
  byStatus: Record<string, number> | undefined,
  fallback: Array<{ status: MemberStatus; count: OverviewCount }>,
): Array<{ status: MemberStatus; count: OverviewCount }> {
  if (!byStatus) return fallback;
  return [
    { status: "Normal", count: countValue(byStatus.NORMAL) },
    { status: "Flag", count: countValue(byStatus.FLAG) },
    { status: "Temp Ban", count: countValue(byStatus.TEMP_BAN) },
    { status: "Perm Ban", count: countValue(byStatus.PERM_BAN) },
  ];
}

function walletStatusCountsFromApi(
  byStatus: Record<string, number> | undefined,
  fallback: Array<{ status: WalletStatus; count: OverviewCount }>,
): Array<{ status: WalletStatus; count: OverviewCount }> {
  if (!byStatus) return fallback;
  return [
    { status: "ACTIVE", count: countValue(byStatus.ACTIVE) },
    { status: "FROZEN", count: countValue(byStatus.FROZEN) },
    { status: "SUSPENDED", count: countValue(byStatus.SUSPENDED) },
    { status: "CLOSED", count: countValue(byStatus.CLOSED) },
  ];
}

function waitingLabel(createdAt: string, now: number): string {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return "Time not provided";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function queueOldestLabel(
  summary: AdminOverviewQueue | undefined,
  count: OverviewCount,
  fallback: string,
): string {
  if (!summary) return fallback;
  if (summary.oldest) return summary.oldest.title;
  if (count === null) return "Queue count not provided";
  return count > 0 ? "Oldest record not provided" : "No open records";
}

function queueWaitingLabel(
  summary: AdminOverviewQueue | undefined,
  loadedAt: number,
  fallback: string,
): string {
  if (!summary) return fallback;
  return summary.oldest ? waitingLabel(summary.oldest.createdAt, loadedAt) : "—";
}

function queueStatusLabel(summary: AdminOverviewQueue | undefined, count: OverviewCount): string {
  if (summary) return summary.state === "OPEN" ? "Open" : "Clear";
  if (count === null) return "Not provided";
  return count > 0 ? "Open" : "Clear";
}

function queueFromApi(
  id: OverviewQueue["id"],
  title: string,
  fallbackCount: OverviewCount,
  summary: AdminOverviewQueue | undefined,
  fallbackSource: OverviewSource,
  fallbackOldest: string,
  fallbackWaiting: string,
  tone: string,
  loadedAt: number,
): OverviewQueue {
  const count = summary ? countValue(summary.count) : fallbackCount;
  return queue(
    id,
    title,
    count,
    summary ? "Admin API" : fallbackSource,
    queueStatusLabel(summary, count),
    queueOldestLabel(summary, count, fallbackOldest),
    queueWaitingLabel(summary, loadedAt, fallbackWaiting),
    count !== null && count > 0 ? tone : "",
    summary?.oldest?.id ?? null,
  );
}

function questStatesFromCounts(byState: Record<string, number>, total: number): OverviewQuestState[] {
  const counts = new Map<QuestState, number>(QUEST_STATES.map((status) => [status, 0]));
  Object.entries(byState).forEach(([status, count]) => {
    const canonicalStatus = questStateFor(status);
    counts.set(canonicalStatus, (counts.get(canonicalStatus) ?? 0) + countValue(count));
  });
  const safeTotal = Math.max(countValue(total), [...counts.values()].reduce((sum, count) => sum + count, 0));

  return QUEST_STATES.map((status) => ({
    status,
    label: questStateLabel(status),
    count: counts.get(status) ?? 0,
    percentage: safeTotal ? ((counts.get(status) ?? 0) / safeTotal) * 100 : 0,
  }));
}

function queue(
  id: OverviewQueue["id"],
  title: string,
  count: OverviewCount,
  source: OverviewSource,
  status: string,
  oldest: string,
  waiting: string,
  tone: string,
  oldestId: string | null = null,
): OverviewQueue {
  return {
    id,
    title,
    count,
    source,
    status,
    oldest,
    oldestHref: oldestId ? queueOldestHref(id, oldestId) : null,
    listHref: queueListHref(id),
    waiting,
    tone,
  };
}

const overviewQueueRoutes: Record<OverviewQueueId, OverviewQueueRoute> = {
  payouts: { list: payoutRoutes.list, detail: payoutRoutes.detail },
  disputes: { list: disputeRoutes.list, detail: disputeRoutes.detail },
  reports: { list: reportRoutes.list, detail: reportRoutes.detail },
  conductReports: { list: conductReportRoutes.list },
};

const overviewQueueIds: OverviewQueueId[] = ["payouts", "disputes", "reports", "conductReports"];

function queueListHref(id: OverviewQueueId): string {
  return overviewQueueRoutes[id].list();
}

function queueOldestHref(id: OverviewQueueId, identifier: string): string | null {
  const trimmedIdentifier = identifier.trim();
  if (!trimmedIdentifier) return null;
  const route = overviewQueueRoutes[id];
  return route.detail ? route.detail(trimmedIdentifier) : route.list();
}

function sumCounts(left: OverviewCount, right: OverviewCount): OverviewCount {
  return left === null || right === null ? null : left + right;
}

function totalQueueCount(queues: OverviewQueue[]): OverviewCount {
  return queues.some((item) => item.count === null)
    ? null
    : queues.reduce((sum, item) => sum + (item.count ?? 0), 0);
}

function sourceForCount(apiValue: OverviewCount, fallback: OverviewCount): OverviewSource {
  if (apiValue !== null) return "Admin API";
  return fallback === null ? "Unavailable" : "Local fallback";
}

function sourceForStatusCounts(
  apiValue: Record<string, number> | undefined,
  fallback: Array<{ status: string; count: OverviewCount }>,
): OverviewSource {
  if (apiValue) return "Admin API";
  return fallback.some((entry) => entry.count !== null) ? "Local fallback" : "Unavailable";
}

export function overviewModelFromApi(
  overview: AdminOverview,
  activity: DashboardActivity[],
  fallback: OverviewFallback,
  loadedAt = Date.now(),
): OverviewModel {
  const payouts = countValue(overview.payouts.pendingAdminApproval);
  const disputes = countValue(overview.disputes.awaitingResolution);
  const reportsFromApi = countOrFallback(overview.reports?.open, null);
  const conductReportsFromApi = countOrFallback(overview.conductReports?.open, null);
  const reports = countOrFallback(reportsFromApi, fallback.reports);
  const conductReports = countOrFallback(conductReportsFromApi, fallback.conductReports);
  const reportCountersAvailable = reportsFromApi !== null
    && conductReportsFromApi !== null;
  const memberStatusCounts = memberStatusCountsFromApi(overview.members.byStatus, fallback.memberStatusCounts);
  const walletStatusCounts = walletStatusCountsFromApi(overview.wallets?.byStatus, fallback.walletStatusCounts);
  const queues = [
    queueFromApi("payouts", "Payout Approvals", payouts, overview.queues?.payouts, "Admin API", "Queue detail not provided", "—", "overview-queue-status-review", loadedAt),
    queueFromApi("disputes", "Dispute Cases", disputes, overview.queues?.disputes, "Admin API", "Queue detail not provided", "—", "overview-queue-status-overdue", loadedAt),
    queueFromApi("reports", "Report Cases", reports, overview.queues?.reports, sourceForCount(reportsFromApi, fallback.reports), "Queue detail not provided", "—", "overview-queue-status-review", loadedAt),
    queueFromApi("conductReports", "Conduct Reports", conductReports, overview.queues?.conductReports, sourceForCount(conductReportsFromApi, fallback.conductReports), "Queue detail not provided", "—", "overview-queue-status-review", loadedAt),
  ];
  const hasSummaryOnlyData = !overview.queues
    || overviewQueueIds.some((id) => {
      const summary = overview.queues?.[id];
      return !summary || (summary.count > 0 && !summary.oldest);
    });
  const hasUnavailableData = !reportCountersAvailable
    || !overview.members.byStatus
    || !overview.wallets?.byStatus;

  return {
    source: "Admin API",
    hasSummaryOnlyData,
    hasUnavailableData,
    loadedAt,
    totalWorkLeft: totalQueueCount(queues),
    queues,
    questTotal: countValue(overview.quests.total),
    questStates: questStatesFromCounts(overview.quests.byState, overview.quests.total),
    memberSignals: sumCounts(reports, conductReports),
    reportCases: reports,
    conductReports,
    memberStatusCounts,
    memberStatusSource: sourceForStatusCounts(overview.members.byStatus, fallback.memberStatusCounts),
    walletStatusCounts,
    walletStatusSource: sourceForStatusCounts(overview.wallets?.byStatus, fallback.walletStatusCounts),
    frozenWallets: overview.wallets?.byStatus
      ? countValue(overview.wallets.byStatus.FROZEN)
      : countValue(overview.members.frozenWallets),
    suspendedWallets: overview.wallets?.byStatus
      ? countValue(overview.wallets.byStatus.SUSPENDED)
      : countValue(overview.members.suspendedWallets),
    inFlightPayouts: countValue(overview.payouts.inFlight),
    activity: activity.slice(0, 4),
  };
}

function statusCounts<T extends string>(statuses: readonly T[], values: T[]): Array<{ status: T; count: number }> {
  const counts = new Map<T, number>(statuses.map((status) => [status, 0]));
  values.forEach((status) => counts.set(status, (counts.get(status) ?? 0) + 1));
  return statuses.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

export function overviewFallbackWithoutApiData(): OverviewFallback {
  return {
    disputes: null,
    reports: null,
    conductReports: null,
    memberStatusCounts: MEMBER_STATUSES.map((status) => ({ status, count: null })),
    walletStatusCounts: WALLET_STATUSES.map((status) => ({ status, count: null })),
  };
}

export function overviewFallbackFromMockData(data: PersistedAdminData): OverviewFallback {
  const queueCounts = adminNavigationCountsFromMockData(data.collections);
  return {
    disputes: queueCounts.disputes ?? 0,
    reports: queueCounts.reports,
    conductReports: queueCounts.conductReports,
    memberStatusCounts: statusCounts(
      MEMBER_STATUSES,
      data.collections.users.map((record) => memberStatusFor(record.memberStatus)),
    ),
    walletStatusCounts: statusCounts(
      WALLET_STATUSES,
      data.collections.users.map((record) => walletStatusFor(record.walletStatus ?? record.status)),
    ),
  };
}

export function overviewModelFromMockData(
  data: PersistedAdminData,
  activity: DashboardActivity[] = [],
  loadedAt = Date.now(),
): OverviewModel {
  const fallback = overviewFallbackFromMockData(data);
  const reportCases = fallback.reports;
  const conductReports = fallback.conductReports;
  const disputes = fallback.disputes;
  const payouts = data.collections.payouts
    .filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object" && !Array.isArray(record))
    .filter((record) => payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL")
    .length;
  const questCounts = new Map<QuestState, number>(QUEST_STATES.map((status) => [status, 0]));
  data.collections.quests.forEach((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return;
    const quest = record as Record<string, unknown>;
    const status = questStateFor(quest.questState ?? quest.status);
    questCounts.set(status, (questCounts.get(status) ?? 0) + 1);
  });
  const questTotal = data.collections.quests.length;
  const queues = [
    queue("payouts", "Payout Approvals", payouts, "Local fallback", "Needs review", "Local demo queue", "—", "overview-queue-status-review"),
    queue("disputes", "Dispute Cases", disputes, "Local fallback", disputes ? "Open" : "Clear", "Local demo queue", "—", disputes ? "overview-queue-status-overdue" : ""),
    queue("reports", "Report Cases", reportCases, "Local fallback", reportCases ? "Open" : "Clear", "Local demo queue", "—", reportCases ? "overview-queue-status-review" : ""),
    queue("conductReports", "Conduct Reports", conductReports, "Local fallback", conductReports ? "Open" : "Clear", "Local demo queue", "—", conductReports ? "overview-queue-status-review" : ""),
  ];
  const walletCounts = data.collections.users.reduce(
    (counts, record) => {
      const status = walletStatusFor(record.walletStatus ?? record.status);
      if (status === "FROZEN") counts.frozen += 1;
      if (status === "SUSPENDED") counts.suspended += 1;
      return counts;
    },
    { frozen: 0, suspended: 0 },
  );

  return {
    source: "Local demo data",
    hasSummaryOnlyData: false,
    hasUnavailableData: false,
    loadedAt,
    totalWorkLeft: totalQueueCount(queues),
    queues,
    questTotal,
    questStates: QUEST_STATES.map((status) => ({
      status,
      label: questStateLabel(status),
      count: questCounts.get(status) ?? 0,
      percentage: questTotal ? ((questCounts.get(status) ?? 0) / questTotal) * 100 : 0,
    })),
    memberSignals: sumCounts(reportCases, conductReports),
    reportCases,
    conductReports,
    memberStatusCounts: fallback.memberStatusCounts,
    memberStatusSource: "Local fallback",
    walletStatusCounts: fallback.walletStatusCounts,
    walletStatusSource: "Local fallback",
    frozenWallets: walletCounts.frozen,
    suspendedWallets: walletCounts.suspended,
    inFlightPayouts: null,
    activity: activity.slice(0, 4),
  };
}

export { questStateTones };

function recordText(record: unknown, key: string): string {
  if (!record || typeof record !== "object") return "";
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function searchResultMatches(result: OverviewSearchResult, query: string): boolean {
  return `${result.id} ${result.title} ${result.detail} ${result.searchText ?? ""}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}

function matchingSearchResults(results: OverviewSearchResult[], query: string): OverviewSearchResult[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  return results.filter((result) => searchResultMatches(result, normalizedQuery)).slice(0, 12);
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
    href: memberRoutes.detail(member.id),
    searchText: recordText(member, "studentId"),
  }));
  const quests = data.collections.quests.flatMap((record): OverviewSearchResult[] => {
    const id = recordText(record, "id");
    const title = recordText(record, "title");
    return id && title ? [{ kind: "quest", id, title, detail: "Quest", href: questRoutes.detail(id) }] : [];
  });
  const payouts = data.collections.payouts.flatMap((record): OverviewSearchResult[] => {
    const id = recordText(record, "id");
    const title = recordText(record, "title");
    return id && title ? [{ kind: "payout", id, title, detail: "Payout", href: payoutRoutes.detail(id) }] : [];
  });
  return matchingSearchResults([...members, ...quests, ...payouts], query);
}

function memberName(member: Pick<AdminMemberListItem, "firstName" | "lastName" | "email">): string {
  return `${member.firstName} ${member.lastName}`.trim() || member.email;
}

export function overviewSearchResultsFromApi(
  records: {
    quests: readonly AdminQuest[];
    members: readonly AdminMemberListItem[];
    payouts: readonly AdminPayout[];
  },
  query: string,
): OverviewSearchResult[] {
  const members = records.members.map((member): OverviewSearchResult => ({
    kind: "member",
    id: member.id,
    title: memberName(member),
    detail: "Member",
    href: memberRoutes.detail(member.id),
    searchText: [member.email, member.studentId ?? ""].join(" "),
  }));
  const quests = records.quests.map((quest): OverviewSearchResult => ({
    kind: "quest",
    id: quest.displayId,
    title: quest.title,
    detail: "Quest",
    href: questRoutes.detail(quest.displayId),
  }));
  const payouts = records.payouts.map((payout): OverviewSearchResult => ({
    kind: "payout",
    id: payout.id,
    title: memberName(payout.student),
    detail: "Payout",
    href: payoutRoutes.detail(payout.id),
  }));
  return matchingSearchResults([...members, ...quests, ...payouts], query);
}
