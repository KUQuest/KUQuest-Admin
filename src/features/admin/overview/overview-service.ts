import type {
  AdminDisputeListPage,
  AdminFinanceOverview,
  AdminOverviewQueue,
  AdminReportListPage,
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
    activityPage.items.map(dashboardActivityFromApi),
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
