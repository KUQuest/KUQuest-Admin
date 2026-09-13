import type { AdminOverview } from "./api/admin-api";
import {
  disputeCaseStatusFor,
  isConductReportStatus,
  reportCaseStatusFor,
} from "./domain/rulebook";

export type AdminNavigationCounts = {
  disputes: number;
  payouts: number;
  reports: null;
  conductReports: null;
};

export type MockNavigationCounts = {
  disputes?: number;
  reports: number;
  conductReports: number;
};

export function adminNavigationCountsFromOverview(
  overview: AdminOverview,
): AdminNavigationCounts {
  return {
    disputes: overview.disputes.awaitingResolution,
    payouts: overview.payouts.pendingAdminApproval,
    reports: null,
    conductReports: null,
  };
}

export function adminNavigationCountsFromMockData(
  collections: { disputes?: readonly unknown[]; reports: readonly unknown[] },
): MockNavigationCounts {
  const disputes = collections.disputes?.filter((record) => {
    if (!record || typeof record !== "object") return false;
    const candidate = record as Record<string, unknown>;
    return disputeCaseStatusFor(
      typeof candidate.disputeCaseStatus === "string"
        ? candidate.disputeCaseStatus
        : typeof candidate.status === "string" ? candidate.status : "",
    ) === "DISPUTE_CASE_PENDING";
  }).length;
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
    reports: reportCases,
    conductReports,
  };
  if (typeof disputes === "number") counts.disputes = disputes;
  return counts;
}
