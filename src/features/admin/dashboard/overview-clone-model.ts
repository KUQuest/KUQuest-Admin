import type { AdminOverview, AdminOverviewQueue } from "../api/admin-api";
import { adminNavigationCountsFromMockData } from "../admin-navigation";
import {
  MEMBER_STATUSES,
  QUEST_STATES,
  WALLET_STATUSES,
  memberStatusFor,
  questStateFor,
  questStateLabel,
  walletStatusFor,
  type MemberStatus,
  type QuestState,
  type WalletStatus,
} from "../domain/rulebook";
import type { PersistedAdminData } from "../data/admin-records";
import type { DashboardActivity } from "./dashboard-model";

export type OverviewCloneQueue = {
  id: "payouts" | "disputes" | "reports";
  title: string;
  count: number;
  oldest: string;
  status: string;
  waiting: string;
  tone: string;
  source: "Admin API" | "Local fallback";
};

export type OverviewCloneQuestState = {
  status: QuestState;
  label: string;
  count: number;
  percentage: number;
};

export type OverviewCloneModel = {
  source: "Admin API" | "Local demo data";
  hasFallbackQueues: boolean;
  loadedAt: number;
  totalWorkLeft: number;
  queues: OverviewCloneQueue[];
  questTotal: number;
  questStates: OverviewCloneQuestState[];
  memberSignals: number;
  reportCases: number;
  conductReports: number;
  memberStatusCounts: Array<{ status: MemberStatus; count: number }>;
  memberStatusSource: "Admin API" | "Local fallback";
  walletStatusCounts: Array<{ status: WalletStatus; count: number }>;
  walletStatusSource: "Admin API" | "Local fallback";
  frozenWallets: number;
  suspendedWallets: number;
  inFlightPayouts: number | null;
  activity: DashboardActivity[];
};

export type OverviewCloneFallback = {
  disputes: number;
  reports: number;
  conductReports: number;
  memberStatusCounts: Array<{ status: MemberStatus; count: number }>;
  walletStatusCounts: Array<{ status: WalletStatus; count: number }>;
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

function countOrFallback(value: unknown, fallback: number): number {
  return value === undefined || value === null ? fallback : countValue(value);
}

function memberStatusCountsFromApi(
  byStatus: Record<string, number> | undefined,
  fallback: Array<{ status: MemberStatus; count: number }>,
): Array<{ status: MemberStatus; count: number }> {
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
  fallback: Array<{ status: WalletStatus; count: number }>,
): Array<{ status: WalletStatus; count: number }> {
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
  count: number,
  fallback: string,
): string {
  if (!summary) return fallback;
  if (summary.oldest) return summary.oldest.title;
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

function queueStatusLabel(summary: AdminOverviewQueue | undefined, count: number): string {
  if (summary) return summary.state === "OPEN" ? "Open" : "Clear";
  return count > 0 ? "Open" : "Clear";
}

function queueFromApi(
  id: OverviewCloneQueue["id"],
  title: string,
  fallbackCount: number,
  summary: AdminOverviewQueue | undefined,
  fallbackSource: OverviewCloneQueue["source"],
  fallbackOldest: string,
  fallbackWaiting: string,
  tone: string,
  loadedAt: number,
): OverviewCloneQueue {
  const count = summary ? countValue(summary.count) : fallbackCount;
  return queue(
    id,
    title,
    count,
    summary ? "Admin API" : fallbackSource,
    queueStatusLabel(summary, count),
    queueOldestLabel(summary, count, fallbackOldest),
    queueWaitingLabel(summary, loadedAt, fallbackWaiting),
    count > 0 ? tone : "",
  );
}

function oldestRecord(summaries: Array<AdminOverviewQueue | undefined>): AdminOverviewQueue["oldest"] {
  return summaries
    .flatMap((summary) => summary?.oldest ? [summary.oldest] : [])
    .toSorted((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))[0] ?? null;
}

function combinedReportQueue(
  reportCount: number,
  reportSummary: AdminOverviewQueue | undefined,
  conductReportSummary: AdminOverviewQueue | undefined,
  apiCountersAvailable: boolean,
  fallbackSource: OverviewCloneQueue["source"],
  fallbackOldest: string,
  fallbackWaiting: string,
  loadedAt: number,
): OverviewCloneQueue {
  const hasApiQueueDetails = Boolean(reportSummary && conductReportSummary);
  const oldest = hasApiQueueDetails ? oldestRecord([reportSummary, conductReportSummary]) : null;
  const count = hasApiQueueDetails
    ? countValue(reportSummary?.count) + countValue(conductReportSummary?.count)
    : reportCount;
  return queue(
    "reports",
    "Report",
    count,
    apiCountersAvailable || hasApiQueueDetails ? "Admin API" : fallbackSource,
    hasApiQueueDetails
      ? (reportSummary?.state === "OPEN" || conductReportSummary?.state === "OPEN" ? "Open" : "Clear")
      : count > 0 ? "Open" : "Clear",
    hasApiQueueDetails
      ? oldest?.title ?? (count > 0 ? "Oldest record not provided" : "No open records")
      : fallbackOldest,
    hasApiQueueDetails ? (oldest ? waitingLabel(oldest.createdAt, loadedAt) : "—") : fallbackWaiting,
    count > 0 ? "overview-queue-status-review" : "",
  );
}

function questStatesFromCounts(byState: Record<string, number>, total: number): OverviewCloneQuestState[] {
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
  id: OverviewCloneQueue["id"],
  title: string,
  count: number,
  source: OverviewCloneQueue["source"],
  status: string,
  oldest: string,
  waiting: string,
  tone: string,
): OverviewCloneQueue {
  return { id, title, count, source, status, oldest, waiting, tone };
}

export function overviewCloneModelFromApi(
  overview: AdminOverview,
  activity: DashboardActivity[],
  fallback: OverviewCloneFallback,
  loadedAt = Date.now(),
): OverviewCloneModel {
  const payouts = countValue(overview.payouts.pendingAdminApproval);
  const disputes = countValue(overview.disputes.awaitingResolution);
  const reports = countOrFallback(overview.reports?.open, fallback.reports);
  const conductReports = countOrFallback(overview.conductReports?.open, fallback.conductReports);
  const reportCount = reports + conductReports;
  const reportCountersAvailable = overview.reports?.open !== undefined
    && overview.conductReports?.open !== undefined;
  const memberStatusCounts = memberStatusCountsFromApi(overview.members.byStatus, fallback.memberStatusCounts);
  const walletStatusCounts = walletStatusCountsFromApi(overview.wallets?.byStatus, fallback.walletStatusCounts);
  const queues = [
    queueFromApi("payouts", "Payout Approvals", payouts, overview.queues?.payouts, "Admin API", "Queue detail not provided", "—", "overview-queue-status-review", loadedAt),
    queueFromApi("disputes", "Dispute Cases", disputes, overview.queues?.disputes, "Admin API", "Queue detail not provided", "—", "overview-queue-status-overdue", loadedAt),
    combinedReportQueue(
      reportCount,
      overview.queues?.reports,
      overview.queues?.conductReports,
      reportCountersAvailable,
      "Local fallback",
      "API path not available",
      "—",
      loadedAt,
    ),
  ];

  return {
    source: "Admin API",
    hasFallbackQueues: !overview.queues
      || !overview.queues.payouts
      || !overview.queues.disputes
      || !overview.queues.reports
      || !overview.queues.conductReports
      || !reportCountersAvailable
      || !overview.members.byStatus
      || !overview.wallets?.byStatus,
    loadedAt,
    totalWorkLeft: queues.reduce((sum, item) => sum + item.count, 0),
    queues,
    questTotal: countValue(overview.quests.total),
    questStates: questStatesFromCounts(overview.quests.byState, overview.quests.total),
    memberSignals: reports + conductReports,
    reportCases: reports,
    conductReports,
    memberStatusCounts,
    memberStatusSource: overview.members.byStatus ? "Admin API" : "Local fallback",
    walletStatusCounts,
    walletStatusSource: overview.wallets?.byStatus ? "Admin API" : "Local fallback",
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

export function overviewCloneFallbackFromMockData(data: PersistedAdminData): OverviewCloneFallback {
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

export function overviewCloneModelFromMockData(
  data: PersistedAdminData,
  activity: DashboardActivity[] = [],
  loadedAt = Date.now(),
): OverviewCloneModel {
  const fallback = overviewCloneFallbackFromMockData(data);
  const reportCases = fallback.reports;
  const conductReports = fallback.conductReports;
  const reportCount = reportCases + conductReports;
  const disputes = fallback.disputes;
  const payouts = data.collections.payouts.filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object" && !Array.isArray(record)).filter((record) => record.payoutStatus === "PENDING_ADMIN_APPROVAL").length;
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
    queue("reports", "Report", reportCount, "Local fallback", reportCount ? "Open" : "Clear", "Local demo queue", "—", reportCount ? "overview-queue-status-review" : ""),
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
    hasFallbackQueues: true,
    loadedAt,
    totalWorkLeft: queues.reduce((sum, item) => sum + item.count, 0),
    queues,
    questTotal,
    questStates: QUEST_STATES.map((status) => ({
      status,
      label: questStateLabel(status),
      count: questCounts.get(status) ?? 0,
      percentage: questTotal ? ((questCounts.get(status) ?? 0) / questTotal) * 100 : 0,
    })),
    memberSignals: reportCases + conductReports,
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
