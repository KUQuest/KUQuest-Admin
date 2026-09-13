import type { AdminOverview } from "./api/admin-api";
import {
  disputeCaseStatusFor,
  isConductReportStatus,
  payoutStatusFor,
  reportCaseStatusFor,
} from "./domain/rulebook";

export type AdminNavigationCounts = {
  disputes: number;
  payouts: number;
  reports: number | null;
  conductReports: number | null;
};

export type AdminNavigationCountKey = keyof AdminNavigationCounts;

export type MockNavigationCounts = {
  disputes: number;
  payouts: number;
  reports: number;
  conductReports: number;
};

export function adminNavigationCountsFromOverview(
  overview: AdminOverview,
): AdminNavigationCounts {
  return {
    disputes: overview.queues?.disputes?.count ?? overview.disputes.awaitingResolution,
    payouts: overview.queues?.payouts?.count ?? overview.payouts.pendingAdminApproval,
    reports: overview.queues?.reports?.count ?? overview.reports?.open ?? null,
    conductReports: overview.queues?.conductReports?.count ?? overview.conductReports?.open ?? null,
  };
}

export function adminNavigationCountsFromMockData(
  collections: {
    disputes?: readonly unknown[];
    payouts?: readonly unknown[];
    reports: readonly unknown[];
  },
): MockNavigationCounts {
  const disputes = collections.disputes?.filter((record) => {
    if (!record || typeof record !== "object") return false;
    const candidate = record as Record<string, unknown>;
    return disputeCaseStatusFor(
      typeof candidate.disputeCaseStatus === "string"
        ? candidate.disputeCaseStatus
        : typeof candidate.status === "string" ? candidate.status : "",
    ) === "DISPUTE_CASE_PENDING";
  }).length ?? 0;
  const payouts = collections.payouts?.filter((record) => {
    if (!record || typeof record !== "object") return false;
    const candidate = record as Record<string, unknown>;
    return payoutStatusFor(candidate.payoutStatus ?? candidate.status) === "PENDING_ADMIN_APPROVAL";
  }).length ?? 0;
  const conductReports = collections.reports.filter((record) => {
    if (!record || typeof record !== "object") return false;
    const candidate = record as Record<string, unknown>;
    const status = candidate.conductReportStatus ?? candidate.status;
    return (Boolean(candidate.conductReportStatus) || isConductReportStatus(candidate.status))
      && reportCaseStatusFor(status) === "CONDUCT_REPORT_PENDING";
  }).length;
  const reportCases = collections.reports.filter((record) => {
    if (!record || typeof record !== "object") return false;
    const candidate = record as Record<string, unknown>;
    const isConductReport = Boolean(candidate.conductReportStatus) || isConductReportStatus(candidate.status);
    return !isConductReport
      && reportCaseStatusFor(candidate.reportCaseStatus ?? candidate.status, candidate.decision) === "REPORT_CASE_PENDING";
  }).length;

  const counts: MockNavigationCounts = {
    disputes,
    payouts,
    reports: reportCases,
    conductReports,
  };
  return counts;
}
