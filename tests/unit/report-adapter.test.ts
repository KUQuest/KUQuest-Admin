import { describe, expect, it } from "bun:test";

import {
  loadReportCasesFromMock,
  saveMockReportDecision,
} from "../../src/features/admin/report/report-adapter";
import { findMemberFromMock } from "../../src/features/admin/member/member-adapter";
import { ADMIN_DEMO_DATA_KEY } from "../../src/features/admin/data/admin-demo-data-adapter";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("Report Case mock adapter", () => {
  it("loads only Report Cases from the demo collection", () => {
    const page = loadReportCasesFromMock(memoryStorage());

    expect(page.items.map((record) => record.id)).toEqual(["RPT-8201", "RPT-8202"]);
    expect(page.items.every((record) => record.status === "REPORT_CASE_PENDING")).toBe(true);
  });

  it("persists the Report Case reason and canonical command status", () => {
    const storage = memoryStorage();
    const updated = saveMockReportDecision(
      storage,
      "RPT-8201",
      "REPORT_CASE_HIDDEN",
      "The evidence confirms a policy violation.",
    );

    expect(updated).toMatchObject({
      id: "RPT-8201",
      status: "REPORT_CASE_HIDDEN",
      reportCaseStatus: "REPORT_CASE_HIDDEN",
      decision: "confirmed-violation",
      decisionReason: "The evidence confirms a policy violation.",
    });
    expect(loadReportCasesFromMock(storage).items[0]).toMatchObject({
      id: "RPT-8201",
      status: "REPORT_CASE_HIDDEN",
    });
  });

  it("applies the Misconduct ladder to the reported Member", () => {
    const storage = memoryStorage();
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify({
      version: "test",
      collections: {
        users: [{
          id: "member-report",
          title: "Reported Member",
          memberStatus: "Normal",
          walletStatus: "ACTIVE",
          confirmedViolationCount: 0,
        }],
        quests: [],
        payouts: [],
        disputes: [],
        reports: [{
          id: "RPT-1",
          reportedMemberId: "member-report",
          status: "REPORT_CASE_PENDING",
          reportCaseStatus: "REPORT_CASE_PENDING",
        }],
      },
    }));

    const updated = saveMockReportDecision(storage, "RPT-1", "REPORT_CASE_HIDDEN", "Evidence confirms a violation.");
    saveMockReportDecision(storage, "RPT-1", "REPORT_CASE_HIDDEN", "The same decision must stay idempotent.");

    expect(updated).toMatchObject({
      reportedMemberStatus: "Flag",
      confirmedViolationCount: 1,
    });

    expect(findMemberFromMock(storage, "member-report")).toMatchObject({
      memberStatus: "Flag",
      walletStatus: "ACTIVE",
      confirmedViolationCount: 1,
    });
  });
});
