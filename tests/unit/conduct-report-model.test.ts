import { describe, expect, it } from "bun:test";

import {
  conductReportDecisionFor,
  conductReportModelFromRecord,
  conductReportsOnly,
  isConductReportActionable,
  isConductReportRecord,
} from "../../src/features/admin/conduct-report/conduct-report-model";

describe("Conduct Report model", () => {
  it("keeps Report Cases out of the Conduct Report collection", () => {
    const records = [
      { id: "RPT-1", status: "REPORT_CASE_PENDING", reportedMemberId: "member-1" },
      { id: "CND-1", status: "CONDUCT_REPORT_PENDING", questId: "quest-1" },
      { id: "CND-2", conductReportStatus: "CONDUCT_REPORT_UPHELD", questId: "quest-2" },
      {
        id: "mixed-1",
        status: "REPORT_CASE_PENDING",
        conductReportStatus: "CONDUCT_REPORT_PENDING",
      },
      {
        id: "mixed-2",
        status: "CONDUCT_REPORT_PENDING",
        reportCaseStatus: "REPORT_CASE_PENDING",
      },
    ];

    expect(conductReportsOnly(records).map((record) => record.id)).toEqual(["CND-1", "CND-2"]);
    expect(isConductReportRecord(records[0])).toBe(false);
    expect(isConductReportRecord(records[3])).toBe(false);
    expect(isConductReportRecord(records[4])).toBe(false);
  });

  it("maps the Conduct Report fields and canonical Member links", () => {
    const model = conductReportModelFromRecord({
      id: "CND-42",
      status: "CONDUCT_REPORT_PENDING",
      reportedMemberId: "member-reported",
      reportedUserName: "Amara Ariyawat",
      reporterId: "member-reporter",
      reporterName: "Benja Ariyawat",
      reasonCode: "CONDUCT_OUT_OF_SCOPE",
      questId: "QST-12001",
      relatedQuestTitle: "Verify dorm fire exits",
      details: "The Worker was asked to perform work outside the Quest Condition.",
      submittedAt: "2026-09-12T12:00:00.000Z",
      version: 3,
    });

    expect(model).toMatchObject({
      id: "CND-42",
      status: "CONDUCT_REPORT_PENDING",
      statusLabel: "Open",
      badgeClass: "status-conduct-pending",
      reason: "Out of scope work",
      reasonCode: "CONDUCT_OUT_OF_SCOPE",
      questId: "QST-12001",
      questTitle: "Verify dorm fire exits",
      reportedMemberName: "Amara Ariyawat",
      reporterName: "Benja Ariyawat",
      detail: "The Worker was asked to perform work outside the Quest Condition.",
      submittedAt: "2026-09-12T12:00:00.000Z",
      version: 3,
    });
    expect(model?.reportedMemberHref).toBe("/member/member-reported");
    expect(model?.reporterHref).toBe("/member/member-reporter");
    expect(model?.title).toBe("Out of scope work");
    expect(conductReportModelFromRecord({
      id: "RPT-1",
      status: "REPORT_CASE_PENDING",
    })).toBeNull();
  });

  it("makes only pending Conduct Reports actionable", () => {
    expect(isConductReportActionable("CONDUCT_REPORT_PENDING")).toBe(true);
    expect(isConductReportActionable("CONDUCT_REPORT_UPHELD")).toBe(false);
    expect(isConductReportActionable("CONDUCT_REPORT_DISMISSED")).toBe(false);
  });

  it("maps Conduct Report decisions to the canonical commands", () => {
    expect(conductReportDecisionFor("no-violation")).toBe("CONDUCT_REPORT_DISMISSED");
    expect(conductReportDecisionFor("confirmed-violation")).toBe("CONDUCT_REPORT_UPHELD");
  });
});
