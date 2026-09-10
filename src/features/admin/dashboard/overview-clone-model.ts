import type { AdminOverview } from "../api/admin-api";
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
  id: "payouts" | "disputes" | "reports" | "conduct-reports";
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
  walletStatusCounts: Array<{ status: WalletStatus; count: number }>;
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

function questStatesFromCounts(byStatus: Record<string, number>, total: number): OverviewCloneQuestState[] {
  const counts = new Map<QuestState, number>(QUEST_STATES.map((status) => [status, 0]));
  Object.entries(byStatus).forEach(([status, count]) => {
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
  const disputes = countValue(fallback.disputes);
  const reports = countValue(fallback.reports);
  const conductReports = countValue(fallback.conductReports);
  const queues = [
    queue("payouts", "Payout Approvals", payouts, "Admin API", "Needs review", "Queue detail not provided", "—", "overview-queue-status-review"),
    queue("disputes", "Dispute Cases", disputes, "Local fallback", disputes ? "Open" : "Clear", "API path not available", "—", disputes ? "overview-queue-status-overdue" : ""),
    queue("reports", "Report Cases", reports, "Local fallback", reports ? "Open" : "Clear", "API path not available", "—", reports ? "overview-queue-status-review" : ""),
    queue("conduct-reports", "Conduct Reports", conductReports, "Local fallback", conductReports ? "Open" : "Clear", "API path not available", "—", conductReports ? "overview-queue-status-review" : ""),
  ];

  return {
    source: "Admin API",
    hasFallbackQueues: true,
    loadedAt,
    totalWorkLeft: queues.reduce((sum, item) => sum + item.count, 0),
    queues,
    questTotal: countValue(overview.quests.total),
    questStates: questStatesFromCounts(overview.quests.byStatus, overview.quests.total),
    memberSignals: reports + conductReports,
    reportCases: reports,
    conductReports,
    memberStatusCounts: fallback.memberStatusCounts,
    walletStatusCounts: fallback.walletStatusCounts,
    frozenWallets: countValue(overview.members.frozenWallets),
    suspendedWallets: countValue(overview.members.suspendedWallets),
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
    queue("reports", "Report Cases", reportCases, "Local fallback", reportCases ? "Open" : "Clear", "Local demo queue", "—", reportCases ? "overview-queue-status-review" : ""),
    queue("conduct-reports", "Conduct Reports", conductReports, "Local fallback", conductReports ? "Open" : "Clear", "Local demo queue", "—", conductReports ? "overview-queue-status-review" : ""),
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
    walletStatusCounts: fallback.walletStatusCounts,
    frozenWallets: walletCounts.frozen,
    suspendedWallets: walletCounts.suspended,
    inFlightPayouts: null,
    activity: activity.slice(0, 4),
  };
}

export { questStateTones };
