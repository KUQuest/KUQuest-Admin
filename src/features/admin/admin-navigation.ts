import type { AdminOverview } from "./api/admin-api";

export type AdminNavigationCounts = {
  disputes: number;
  payouts: number;
  reports: number | null;
  conductReports: number | null;
};

export type AdminNavigationCountKey = keyof AdminNavigationCounts;

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
