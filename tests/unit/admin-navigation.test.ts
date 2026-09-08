import { describe, expect, it } from "bun:test";

import {
  adminNavigationCountsFromMockData,
  adminNavigationCountsFromOverview,
} from "../../src/features/admin/admin-navigation";

describe("Admin navigation counts", () => {
  it("uses API queue counters and does not invent Report counters", () => {
    expect(adminNavigationCountsFromOverview({
      quests: { total: 488, hidden: 0, byStatus: {} },
      disputes: { total: 4, awaitingResolution: 2 },
      payouts: { pendingAdminApproval: 3, inFlight: 12 },
      members: { frozenWallets: 1, suspendedWallets: 2 },
    })).toEqual({
      disputes: 2,
      payouts: 3,
      reports: null,
      conductReports: null,
    });
  });

  it("counts mock Report Cases and Conduct Reports separately", () => {
    expect(adminNavigationCountsFromMockData({
      reports: [
        { id: "report-1", reportCaseStatus: "REPORT_CASE_PENDING" },
        { id: "report-2", reportCaseStatus: "REPORT_CASE_HIDDEN" },
        { id: "conduct-1", conductReportStatus: "CONDUCT_REPORT_PENDING" },
        { id: "conduct-2", conductReportStatus: "CONDUCT_REPORT_UPHELD" },
      ],
    })).toEqual({
      reports: 1,
      conductReports: 1,
    });
  });

  it("counts mock pending Dispute Cases when the API resource is unavailable", () => {
    expect(adminNavigationCountsFromMockData({
      disputes: [
        { id: "dispute-1", disputeCaseStatus: "DISPUTE_CASE_PENDING" },
        { id: "dispute-2", disputeCaseStatus: "DISPUTE_CASE_RESOLVED" },
      ],
      reports: [],
    })).toEqual({
      disputes: 1,
      reports: 0,
      conductReports: 0,
    });
  });
});
