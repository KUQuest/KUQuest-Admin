import type {
  AdminOverview,
  AdminOverviewQueue,
} from "../api/admin-api";
import { adminNavigationCountsFromMockData } from "../admin-navigation";
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
  disputeCaseStatusFor,
  memberStatusFor,
  payoutStatusFor,
  questStateFor,
  questStateLabel,
  reportCaseStatusFor,
  walletStatusFor,
  isConductReportStatus,
  type MemberStatus,
  type QuestState,
  type WalletStatus,
} from "../domain/rulebook";
import type { PersistedAdminData } from "../data/admin-records";
import type { DashboardActivity } from "../dashboard/dashboard-model";
import { recordText, timestampValue } from "./overview-values";

export {
  compareOverviewSearchResults,
  overviewSearchResultLabel,
  overviewSearchResultsFromApi,
  overviewSearchResultsFromMockData,
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

export type OverviewQueueCase = {
  id: string;
  queueId: OverviewQueueId;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
  priority: OverviewQueuePriority;
  age: string;
  slaState: OverviewQueueSla;
  assignedAdmin: string;
  href: string;
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

const mockQueueCases: Record<OverviewQueueId, OverviewQueueCase[]> = {
  payouts: [
    {
      id: "PAY-9637",
      queueId: "payouts",
      title: "Payout approval · Darin Intharawong",
      detail: "Payout Reserve is waiting for an Admin decision.",
      status: "PENDING_ADMIN_APPROVAL",
      createdAt: "2026-09-15T04:00:00.000Z",
      priority: "High",
      age: "2 days ago",
      slaState: "Due soon",
      assignedAdmin: "Unassigned",
      href: payoutRoutes.detail("PAY-9637"),
    },
    {
      id: "PAY-9631",
      queueId: "payouts",
      title: "Payout approval · Fah Lertwiroj",
      detail: "Masked Payout Destination is ready for review.",
      status: "PENDING_ADMIN_APPROVAL",
      createdAt: "2026-09-16T04:00:00.000Z",
      priority: "Medium",
      age: "1 day ago",
      slaState: "On track",
      assignedAdmin: "Narin Admin",
      href: payoutRoutes.detail("PAY-9631"),
    },
  ],
  disputes: [
    {
      id: "DSP-5201",
      queueId: "disputes",
      title: "Dispute Case · Verify dorm fire exits",
      detail: "Failed Quest case with money at risk.",
      status: "DISPUTE_CASE_PENDING",
      createdAt: "2026-09-14T04:00:00.000Z",
      priority: "High",
      age: "3 days ago",
      slaState: "Overdue",
      assignedAdmin: "Supansa Admin",
      href: disputeRoutes.detail("DSP-5201"),
    },
    {
      id: "DSP-5202",
      queueId: "disputes",
      title: "Dispute Case · Design orientation social cards",
      detail: "Evidence review is waiting for a first decision.",
      status: "DISPUTE_CASE_PENDING",
      createdAt: "2026-09-15T04:00:00.000Z",
      priority: "High",
      age: "2 days ago",
      slaState: "Due soon",
      assignedAdmin: "Unassigned",
      href: disputeRoutes.detail("DSP-5202"),
    },
  ],
  reports: [
    {
      id: "RPT-8201",
      queueId: "reports",
      title: "Report Case · Harassment or abuse",
      detail: "Message Evidence Reference is waiting for review.",
      status: "REPORT_CASE_PENDING",
      createdAt: "2026-09-16T04:00:00.000Z",
      priority: "Medium",
      age: "1 day ago",
      slaState: "Due soon",
      assignedAdmin: "Unassigned",
      href: reportRoutes.detail("RPT-8201"),
    },
    {
      id: "RPT-8202",
      queueId: "reports",
      title: "Report Case · Fraud or payment issue",
      detail: "Related Message evidence is ready for review.",
      status: "REPORT_CASE_PENDING",
      createdAt: "2026-09-16T08:00:00.000Z",
      priority: "Medium",
      age: "1 day ago",
      slaState: "On track",
      assignedAdmin: "Narin Admin",
      href: reportRoutes.detail("RPT-8202"),
    },
  ],
  conductReports: [
    {
      id: "CND-8301",
      queueId: "conductReports",
      title: "Conduct Report · Quest abandonment",
      detail: "Quest record and Proof Submission need review.",
      status: "CONDUCT_REPORT_PENDING",
      createdAt: "2026-09-16T23:00:00.000Z",
      priority: "High",
      age: "5 hours ago",
      slaState: "On track",
      assignedAdmin: "Supansa Admin",
      href: conductReportRoutes.detail("CND-8301"),
    },
    {
      id: "CND-8302",
      queueId: "conductReports",
      title: "Conduct Report · Out-of-scope work",
      detail: "Quest conduct record is waiting for confirmation.",
      status: "CONDUCT_REPORT_PENDING",
      createdAt: "2026-09-15T23:00:00.000Z",
      priority: "Medium",
      age: "1 day ago",
      slaState: "Due soon",
      assignedAdmin: "Unassigned",
      href: conductReportRoutes.detail("CND-8302"),
    },
  ],
};

function sortedMockQueueCases(queueId: OverviewQueueId): OverviewQueueCase[] {
  return mockQueueCases[queueId].toSorted((left, right) => {
    const leftCreatedAt = Date.parse(left.createdAt);
    const rightCreatedAt = Date.parse(right.createdAt);
    const leftHasTimestamp = Number.isFinite(leftCreatedAt);
    const rightHasTimestamp = Number.isFinite(rightCreatedAt);

    if (!leftHasTimestamp || !rightHasTimestamp) {
      if (leftHasTimestamp) return -1;
      if (rightHasTimestamp) return 1;
      return left.id.localeCompare(right.id);
    }

    return leftCreatedAt - rightCreatedAt || left.id.localeCompare(right.id);
  });
}

function mockQueueRecordsFor(
  data: PersistedAdminData,
  queueId: OverviewQueueId,
): readonly unknown[] {
  switch (queueId) {
    case "payouts":
      return data.collections.payouts;
    case "disputes":
      return data.collections.disputes;
    case "reports":
    case "conductReports":
      return data.collections.reports;
  }
}

function mockQueueRecordIsPending(queueId: OverviewQueueId, value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;

  switch (queueId) {
    case "payouts":
      return payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL";
    case "disputes":
      return disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING";
    case "reports": {
      const isConductReport = Boolean(record.conductReportStatus) || isConductReportStatus(record.status);
      return !isConductReport
        && reportCaseStatusFor(record.reportCaseStatus ?? record.status, record.decision) === "REPORT_CASE_PENDING";
    }
    case "conductReports":
      return reportCaseStatusFor(record.conductReportStatus ?? record.status, record.decision) === "CONDUCT_REPORT_PENDING";
  }
}

function firstRecordText(record: unknown, keys: readonly string[]): string {
  for (const key of keys) {
    const value = recordText(record, key);
    if (value) return value;
  }
  return "";
}

function mockQueueRecordCreatedAt(queueId: OverviewQueueId, record: unknown): string {
  const keys = queueId === "payouts"
    ? ["createdAt", "updatedAt"]
    : queueId === "disputes"
      ? ["disputeDate", "createdAt", "failedAt", "updatedAt"]
      : ["reportedAt", "createdAt", "updatedAt", "closedAt"];
  return firstRecordText(record, keys);
}

function mockQueueRecordTitle(queueId: OverviewQueueId, record: unknown): string {
  const title = firstRecordText(record, ["title", "category", "reasonCode"]);
  switch (queueId) {
    case "payouts":
      return `Payout approval · ${title || firstRecordText(record, ["id"])}`;
    case "disputes":
      return `Dispute Case · ${title || firstRecordText(record, ["id"])}`;
    case "reports":
      return `Report Case · ${title || "Report review"}`;
    case "conductReports":
      return `Conduct Report · ${title || "Conduct review"}`;
  }
}

function mockQueueRecordStatus(queueId: OverviewQueueId, record: unknown): string {
  switch (queueId) {
    case "payouts":
      return firstRecordText(record, ["payoutStatus", "status"]);
    case "disputes":
      return firstRecordText(record, ["disputeCaseStatus", "status"]);
    case "reports":
      return firstRecordText(record, ["reportCaseStatus", "status"]);
    case "conductReports":
      return firstRecordText(record, ["conductReportStatus", "status"]);
  }
}

function mockQueueCaseFromRecord(
  queueId: OverviewQueueId,
  record: unknown,
  loadedAt: number,
): OverviewQueueCase | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  if (!mockQueueRecordIsPending(queueId, record)) return null;

  const rawId = recordText(record, "id");
  const displayId = recordText(record, "displayId") || rawId;
  if (!rawId || !displayId) return null;

  const rawCreatedAt = mockQueueRecordCreatedAt(queueId, record);
  const createdAtTimestamp = timestampValue(rawCreatedAt);
  const createdAt = createdAtTimestamp ? new Date(createdAtTimestamp).toISOString() : rawCreatedAt;
  const detail = firstRecordText(record, ["details", "detail", "reason", "questRecord"])
    || "Record is waiting for Admin review.";

  return {
    id: displayId,
    queueId,
    title: mockQueueRecordTitle(queueId, record),
    detail,
    status: mockQueueRecordStatus(queueId, record),
    createdAt,
    priority: "Not provided",
    age: waitingLabel(createdAt, loadedAt),
    slaState: "Not provided",
    assignedAdmin: firstRecordText(record, ["assignedAdmin", "owner"]) || "Not assigned",
    href: queueOldestHref(queueId, rawId) ?? queueListHref(queueId),
  };
}

function dynamicMockQueueCases(
  data: PersistedAdminData,
  queueId: OverviewQueueId,
  loadedAt: number,
): OverviewQueueCase[] {
  return mockQueueRecordsFor(data, queueId)
    .flatMap((record) => {
      const queueCase = mockQueueCaseFromRecord(queueId, record, loadedAt);
      // A Queue map can only identify the oldest record when the fixture has a
      // usable timestamp. Keep the canonical demo fallback for incomplete
      // records instead of presenting an arbitrary ID as the oldest case.
      return queueCase && timestampValue(queueCase.createdAt) > 0 ? [queueCase] : [];
    })
    .toSorted((left, right) => {
      const leftCreatedAt = timestampValue(left.createdAt);
      const rightCreatedAt = timestampValue(right.createdAt);
      return leftCreatedAt - rightCreatedAt || left.id.localeCompare(right.id);
    });
}

function oldestPendingMockQueueCase(
  data: PersistedAdminData,
  queueId: OverviewQueueId,
  queueCount: number,
  loadedAt: number,
): OverviewQueueCase | null {
  if (queueCount <= 0) return null;

  const dynamicCases = dynamicMockQueueCases(data, queueId, loadedAt);
  if (dynamicCases.length) return dynamicCases[0];

  const records = mockQueueRecordsFor(data, queueId);
  return sortedMockQueueCases(queueId).find((queueCase) => {
    const record = records.find((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      return (value as Record<string, unknown>).id === queueCase.id;
    });
    // Keep a static demo case available when a test or older Mock session has
    // a queue count but does not include that fixture record yet.
    return record === undefined ? true : mockQueueRecordIsPending(queueId, record);
  }) ?? null;
}

export function overviewQueueCasesFor(queueId: OverviewQueueId): OverviewQueueCase[] {
  return sortedMockQueueCases(queueId).map((queueCase) => ({ ...queueCase }));
}

/** Resolve a queue's named oldest case to the mock work list without guessing. */
export function overviewQueueCaseIndexFor(queueId: OverviewQueueId, caseId: string | null): number | null {
  if (!caseId?.trim()) return null;
  const caseIndex = sortedMockQueueCases(queueId).findIndex((queueCase) => queueCase.id === caseId);
  return caseIndex >= 0 ? caseIndex : null;
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
    activity: activity.slice(0, 10),
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
  const oldestPayout = oldestPendingMockQueueCase(data, "payouts", payouts ?? 0, loadedAt);
  const oldestDispute = oldestPendingMockQueueCase(data, "disputes", disputes ?? 0, loadedAt);
  const oldestReport = oldestPendingMockQueueCase(data, "reports", reportCases ?? 0, loadedAt);
  const oldestConductReport = oldestPendingMockQueueCase(data, "conductReports", conductReports ?? 0, loadedAt);
  const queues = [
    queue({ id: "payouts", title: "Payout Approvals", count: payouts, source: "Local fallback", status: "Needs review", oldest: oldestPayout?.title ?? "Oldest record not provided", oldestId: oldestPayout?.id, waiting: oldestPayout?.age ?? "—", tone: "overview-queue-status-review", priority: oldestPayout?.priority ?? "Not provided", slaState: oldestPayout?.slaState ?? "Not provided", assignedAdmin: oldestPayout?.assignedAdmin ?? "Not assigned" }),
    queue({ id: "disputes", title: "Dispute Cases", count: disputes, source: "Local fallback", status: disputes ? "Open" : "Clear", oldest: oldestDispute?.title ?? "Oldest record not provided", oldestId: oldestDispute?.id, waiting: oldestDispute?.age ?? "—", tone: disputes ? "overview-queue-status-overdue" : "", priority: disputes ? oldestDispute?.priority ?? "Not provided" : "Not provided", slaState: disputes ? oldestDispute?.slaState ?? "Not provided" : "Not provided", assignedAdmin: disputes ? oldestDispute?.assignedAdmin ?? "Not assigned" : "Not assigned" }),
    queue({ id: "reports", title: "Report Cases", count: reportCases, source: "Local fallback", status: reportCases ? "Open" : "Clear", oldest: oldestReport?.title ?? "Oldest record not provided", oldestId: oldestReport?.id, waiting: oldestReport?.age ?? "—", tone: reportCases ? "overview-queue-status-review" : "", priority: reportCases ? oldestReport?.priority ?? "Not provided" : "Not provided", slaState: reportCases ? oldestReport?.slaState ?? "Not provided" : "Not provided", assignedAdmin: reportCases ? oldestReport?.assignedAdmin ?? "Not assigned" : "Not assigned" }),
    queue({ id: "conductReports", title: "Conduct Reports", count: conductReports, source: "Local fallback", status: conductReports ? "Open" : "Clear", oldest: oldestConductReport?.title ?? "Oldest record not provided", oldestId: oldestConductReport?.id, waiting: oldestConductReport?.age ?? "—", tone: conductReports ? "overview-queue-status-review" : "", priority: conductReports ? oldestConductReport?.priority ?? "Not provided" : "Not provided", slaState: conductReports ? oldestConductReport?.slaState ?? "Not provided" : "Not provided", assignedAdmin: conductReports ? oldestConductReport?.assignedAdmin ?? "Not assigned" : "Not assigned" }),
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
    activity: activity.slice(0, 10),
  };
}

export { questStateTones };
