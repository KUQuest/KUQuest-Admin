import type {
  AdminOverview,
  AdminOverviewQueue,
} from "../api/admin-api";
import {
  conductReportRoutes,
  disputeRoutes,
  payoutRoutes,
  reportRoutes,
} from "../admin-routes";
import {
  MEMBER_STATUSES,
  QUEST_STATES,
  WALLET_STATUSES,
  questStateFor,
  questStateLabel,
  type MemberStatus,
  type QuestState,
  type WalletStatus,
} from "../domain/rulebook";
import type { DashboardActivity } from "../dashboard/dashboard-model";
import { timestampValue } from "./overview-values";

export {
  compareOverviewSearchResults,
  overviewSearchResultLabel,
  overviewSearchResultsFromApi,
  overviewSearchResultsFromSearchApi,
  sortOverviewSearchResults,
} from "./overview-search-model";
export type { OverviewApiSearchData, OverviewSearchResult } from "./overview-search-model";

type OverviewCount = number | null;
export type OverviewQueueId = "payouts" | "disputes" | "reports" | "conductReports";
type OverviewSource = "Admin API" | "Local fallback" | "Unavailable";
export type OverviewQueuePriority = "High" | "Medium" | "Low" | "Not provided";
export type OverviewQueueSla = "Overdue" | "Due soon" | "On track" | "Not provided";

type OverviewQueueRoute = {
  list: () => string;
  detail?: (identifier: string) => string;
};

type OverviewQueueInput = {
  id: OverviewQueueId;
  title: string;
  count: OverviewCount;
  source: OverviewSource;
  status: string;
  oldest: string;
  waiting: string;
  tone: string;
  oldestId?: string | null;
  priority?: OverviewQueuePriority;
  slaState?: OverviewQueueSla;
  assignedAdmin?: string;
};

type OverviewApiQueueConfig = {
  id: OverviewQueueId;
  title: string;
  fallbackCount: OverviewCount;
  summary: AdminOverviewQueue | undefined;
  fallbackSource: OverviewSource;
  fallbackOldest: string;
  fallbackWaiting: string;
  tone: string;
  loadedAt: number;
};

export type OverviewQueue = {
  id: OverviewQueueId;
  title: string;
  count: OverviewCount;
  oldest: string;
  oldestId: string | null;
  oldestHref: string | null;
  listHref: string;
  status: string;
  waiting: string;
  tone: string;
  source: OverviewSource;
  priority: OverviewQueuePriority;
  slaState: OverviewQueueSla;
  assignedAdmin: string;
};

export type OverviewQuestState = {
  status: QuestState;
  label: string;
  count: number;
  percentage: number;
};

export type OverviewModel = {
  hasSummaryOnlyData: boolean;
  hasUnavailableData: boolean;
  loadedAt: number;
  totalWorkLeft: OverviewCount;
  queues: OverviewQueue[];
  questTotal: number;
  hiddenQuestCount: number;
  disputeTotal: number;
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

const questStateTones: Record<QuestState, string> = {
  QUEST_DRAFT: "overview-quest-draft",
  QUEST_OPEN: "overview-quest-open",
  QUEST_ASSIGNED: "overview-quest-assigned",
  QUEST_IN_PROGRESS: "overview-quest-in-progress",
  QUEST_COMPLETED: "overview-quest-completed",
  QUEST_CANCELLED: "overview-quest-cancelled",
  QUEST_FAILED: "overview-quest-failed",
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
  frozenWallets: number,
  suspendedWallets: number,
): Array<{ status: WalletStatus; count: OverviewCount }> {
  if (!byStatus) {
    return [
      { status: "ACTIVE", count: null },
      { status: "FROZEN", count: countValue(frozenWallets) },
      { status: "SUSPENDED", count: countValue(suspendedWallets) },
      { status: "CLOSED", count: null },
    ];
  }
  return [
    { status: "ACTIVE", count: countValue(byStatus.ACTIVE) },
    { status: "FROZEN", count: countValue(byStatus.FROZEN) },
    { status: "SUSPENDED", count: countValue(byStatus.SUSPENDED) },
    { status: "CLOSED", count: countValue(byStatus.CLOSED) },
  ];
}

function waitingLabel(createdAt: string, now: number): string {
  const timestamp = timestampValue(createdAt);
  if (!timestamp) return "Time not provided";
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

function queueFromApi({
  id,
  title,
  fallbackCount,
  summary,
  fallbackSource,
  fallbackOldest,
  fallbackWaiting,
  tone,
  loadedAt,
}: OverviewApiQueueConfig): OverviewQueue {
  const count = summary ? countValue(summary.count) : fallbackCount;
  return queue({
    id,
    title,
    count,
    source: summary ? "Admin API" : fallbackSource,
    status: queueStatusLabel(summary, count),
    oldest: queueOldestLabel(summary, count, fallbackOldest),
    waiting: queueWaitingLabel(summary, loadedAt, fallbackWaiting),
    tone: count !== null && count > 0 ? tone : "",
    oldestId: summary?.oldest?.id ?? null,
  });
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

function queue(input: OverviewQueueInput): OverviewQueue {
  const {
    oldestId,
    priority = "Not provided",
    slaState = "Not provided",
    assignedAdmin = "Not assigned",
    ...queueData
  } = input;
  return {
    ...queueData,
    oldestId: oldestId ?? null,
    priority,
    slaState,
    assignedAdmin,
    oldestHref: oldestId ? queueOldestHref(input.id, oldestId) : null,
    listHref: queueListHref(input.id),
  };
}

const overviewQueueRoutes: Record<OverviewQueueId, OverviewQueueRoute> = {
  payouts: { list: payoutRoutes.list, detail: payoutRoutes.detail },
  disputes: { list: disputeRoutes.list, detail: disputeRoutes.detail },
  reports: { list: reportRoutes.list, detail: reportRoutes.detail },
  conductReports: { list: conductReportRoutes.list, detail: conductReportRoutes.detail },
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
  hasApiCounts = false,
): OverviewSource {
  if (apiValue || hasApiCounts) return "Admin API";
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
  const walletStatusCounts = walletStatusCountsFromApi(
    overview.wallets?.byStatus,
    fallback.walletStatusCounts,
    overview.members.frozenWallets,
    overview.members.suspendedWallets,
  );
  const queues = [
    queueFromApi({ id: "payouts", title: "Payout Approvals", fallbackCount: payouts, summary: overview.queues?.payouts, fallbackSource: "Admin API", fallbackOldest: "Queue detail not provided", fallbackWaiting: "—", tone: "overview-queue-status-review", loadedAt }),
    queueFromApi({ id: "disputes", title: "Dispute Cases", fallbackCount: disputes, summary: overview.queues?.disputes, fallbackSource: "Admin API", fallbackOldest: "Queue detail not provided", fallbackWaiting: "—", tone: "overview-queue-status-overdue", loadedAt }),
    queueFromApi({ id: "reports", title: "Report Cases", fallbackCount: reports, summary: overview.queues?.reports, fallbackSource: sourceForCount(reportsFromApi, fallback.reports), fallbackOldest: "Queue detail not provided", fallbackWaiting: "—", tone: "overview-queue-status-review", loadedAt }),
    queueFromApi({ id: "conductReports", title: "Conduct Reports", fallbackCount: conductReports, summary: overview.queues?.conductReports, fallbackSource: sourceForCount(conductReportsFromApi, fallback.conductReports), fallbackOldest: "Queue detail not provided", fallbackWaiting: "—", tone: "overview-queue-status-review", loadedAt }),
  ];
  const hasSummaryOnlyData = !overview.queues
    || overviewQueueIds.some((id) => {
      const summary = overview.queues?.[id];
      return !summary || (summary.count > 0 && !summary.oldest);
    });
  const hasUnavailableData = !reportCountersAvailable
    || !overview.members.byStatus;

  return {
    hasSummaryOnlyData,
    hasUnavailableData,
    loadedAt,
    totalWorkLeft: totalQueueCount(queues),
    queues,
    questTotal: countValue(overview.quests.total),
    hiddenQuestCount: countValue(overview.quests.hidden),
    disputeTotal: countValue(overview.disputes.total),
    questStates: questStatesFromCounts(overview.quests.byState, overview.quests.total),
    memberSignals: sumCounts(reports, conductReports),
    reportCases: reports,
    conductReports,
    memberStatusCounts,
    memberStatusSource: sourceForStatusCounts(overview.members.byStatus, fallback.memberStatusCounts),
    walletStatusCounts,
    walletStatusSource: sourceForStatusCounts(
      overview.wallets?.byStatus,
      fallback.walletStatusCounts,
      true,
    ),
    frozenWallets: overview.wallets?.byStatus
      ? countValue(overview.wallets.byStatus.FROZEN)
      : countValue(overview.members.frozenWallets),
    suspendedWallets: overview.wallets?.byStatus
      ? countValue(overview.wallets.byStatus.SUSPENDED)
      : countValue(overview.members.suspendedWallets),
    inFlightPayouts: countValue(overview.payouts.inFlight),
    activity: activity.slice(0, 10),
  };
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

export { questStateTones };
