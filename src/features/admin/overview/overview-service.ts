import type {
  AdminActivityLog,
  AdminApiRequestOptions,
  AdminDisputeListPage,
  AdminFinanceOverview,
  AdminOverviewQueue,
  AdminReportListPage,
  AdminSearchResultKind,
} from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { dashboardActivityFromApi } from "../dashboard/dashboard-model";
import {
  overviewFallbackWithoutApiData,
  overviewModelFromApi,
  type OverviewModel,
} from "./overview-model";

export type OverviewPageData = {
  model: OverviewModel;
  financeOverview: AdminFinanceOverview | null;
  financeOverviewError: string | null;
};

function queueSummary(
  count: number,
  oldest: AdminOverviewQueue["oldest"],
): AdminOverviewQueue {
  return {
    count,
    state: count > 0 ? "OPEN" : "CLEAR",
    oldest,
  };
}

function oldestQueueRecord(
  record: { id: string; displayId: string; createdAt: string } | undefined,
): AdminOverviewQueue["oldest"] {
  return record ? { id: record.id, title: record.displayId, createdAt: record.createdAt } : null;
}

function reportQueueSummary(page: AdminReportListPage): AdminOverviewQueue {
  return queueSummary(page.totalCount, oldestQueueRecord(page.items[0]));
}

function disputeQueueSummary(page: AdminDisputeListPage): AdminOverviewQueue {
  return queueSummary(page.totalCount, oldestQueueRecord(page.items[0]));
}

function activityTargetKind(resourceType: string): AdminSearchResultKind | null {
  switch (resourceType.trim().toUpperCase()) {
    case "CONDUCT_REPORT": return "conduct-report";
    case "DISPUTE_CASE": return "dispute";
    case "MEMBER":
    case "USER": return "member";
    case "PAYOUT": return "payout";
    case "QUEST": return "quest";
    case "REPORT_CASE": return "report";
    case "WALLET": return "wallet";
    default: return null;
  }
}

function activityTargetKey(entry: Pick<AdminActivityLog, "resourceType" | "resourceId">): string {
  return `${entry.resourceType.trim().toUpperCase()}\u0000${entry.resourceId}`;
}

async function activityDisplayIds(
  entries: AdminActivityLog[],
  options: AdminApiRequestOptions,
): Promise<Map<string, string>> {
  const targets = new Map<string, AdminActivityLog>();
  entries.forEach((entry) => targets.set(activityTargetKey(entry), entry));
  const displayIds = new Map<string, string>();
  await Promise.all([...targets.entries()].map(async ([key, entry]) => {
    const kind = activityTargetKind(entry.resourceType);
    if (!kind) return;
    const result = await adminApiProvider.read.searchAdminRecords(
      { q: entry.resourceId, kind },
      options,
    ).catch(() => null);
    const displayId = result?.items.find((item) => (
      item.kind === kind
      && item.resourceId === entry.resourceId
      && item.displayId?.trim()
    ))?.displayId?.trim();
    if (displayId) displayIds.set(key, displayId);
  }));
  return displayIds;
}

export async function loadOverviewFromApi(cookieHeader?: string): Promise<OverviewModel> {
  const options = adminApiRequestOptions(cookieHeader);
  const [overview, activityPage, payoutPage, disputePage, reportCases, conductReports] = await Promise.all([
    adminApiProvider.read.getOverview(options),
    adminApiProvider.read.listActivityLogs({ limit: 10, sort: "newest" }, options).catch(() => ({ items: [], nextCursor: null })),
    adminApiProvider.read.listPayouts(
      { status: "PENDING_ADMIN_APPROVAL", limit: 1, sort: "oldest" },
      options,
    ).catch(() => null),
    adminApiProvider.read.listDisputes(
      { status: "DISPUTE_CASE_PENDING", limit: 1, sort: "oldest" },
      options,
    ).catch(() => null),
    adminApiProvider.read.listReports(
      { kind: "REPORT_CASE", status: "REPORT_CASE_PENDING", limit: 1, sort: "oldest" },
      options,
    ).catch(() => null),
    adminApiProvider.read.listReports(
      { kind: "CONDUCT_REPORT", status: "CONDUCT_REPORT_PENDING", limit: 1, sort: "oldest" },
      options,
    ).catch(() => null),
  ]);
  const payoutCount = overview.queues?.payouts?.count ?? overview.payouts.pendingAdminApproval;
  const disputeCount = overview.queues?.disputes?.count ?? overview.disputes.awaitingResolution;
  const reportQueues = {
    ...(reportCases ? { reports: reportQueueSummary(reportCases) } : {}),
    ...(conductReports ? { conductReports: reportQueueSummary(conductReports) } : {}),
  };
  const activityIds = await activityDisplayIds(activityPage.items, options);
  const activity = activityPage.items.map((entry) => dashboardActivityFromApi(
    entry,
    activityIds.get(activityTargetKey(entry)),
  ));
  const overviewWithQueueData = {
    ...overview,
    ...(reportCases ? { reports: { open: reportCases.totalCount } } : {}),
    ...(conductReports ? { conductReports: { open: conductReports.totalCount } } : {}),
    queues: {
      ...overview.queues,
      payouts: queueSummary(
        payoutCount,
        oldestQueueRecord(payoutPage?.items[0]) ?? overview.queues?.payouts?.oldest ?? null,
      ),
      disputes: disputePage
        ? disputeQueueSummary(disputePage)
        : queueSummary(disputeCount, overview.queues?.disputes?.oldest ?? null),
      ...reportQueues,
    },
  };
  return overviewModelFromApi(
    overviewWithQueueData,
    activity,
    overviewFallbackWithoutApiData(),
  );
}

export function loadFinanceOverview(cookieHeader?: string): Promise<AdminFinanceOverview> {
  return adminApiProvider.read.getFinanceOverview(adminApiRequestOptions(cookieHeader));
}

export async function loadOverviewPageData(cookieHeader?: string): Promise<OverviewPageData> {
  const [model, finance] = await Promise.allSettled([
    loadOverviewFromApi(cookieHeader),
    loadFinanceOverview(cookieHeader),
  ]);
  if (model.status === "rejected") throw model.reason;

  return {
    model: model.value,
    financeOverview: finance.status === "fulfilled" ? finance.value : null,
    financeOverviewError: finance.status === "rejected" ? "Finance Overview is not available." : null,
  };
}
