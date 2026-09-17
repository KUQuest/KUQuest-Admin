import { describe, expect, it } from "bun:test";

import {
  isReportCaseActionable,
  isReportCaseRecord,
  reportCaseDecisionFor,
  reportCaseModelFromRecord,
  reportCasesOnly,
} from "../../src/features/admin/report/report-model";

describe("Report Case model", () => {
  it("keeps Conduct Reports out of the Report Case collection", () => {
    const records = [
      {
        id: "RPT-1",
        status: "REPORT_CASE_PENDING",
        reportedMemberId: "member-1",
      },
      {
        id: "CND-1",
        status: "CONDUCT_REPORT_PENDING",
        reportedMemberId: "member-2",
        questId: "QST-1",
      },
      {
        id: "RPT-2",
        status: "REPORT_CASE_HIDDEN",
        reportedMemberId: "member-3",
      },
    ];

    expect(reportCasesOnly(records).map((record) => record.id)).toEqual(["RPT-1", "RPT-2"]);
    expect(isReportCaseRecord(records[1])).toBe(false);
  });

  it("rejects a mixed record that carries a Conduct Report status", () => {
    expect(isReportCaseRecord({
      id: "mixed-1",
      status: "REPORT_CASE_PENDING",
      reportCaseStatus: "REPORT_CASE_PENDING",
      conductReportStatus: "CONDUCT_REPORT_PENDING",
      reportedMemberId: "member-1",
    })).toBe(false);
  });

  it("maps API fields to a Report Case view and canonical Member links", () => {
    const model = reportCaseModelFromRecord({
      id: "RPT-42",
      status: "REPORT_CASE_PENDING",
      reportedMemberId: "member-reported",
      reportedMemberName: "Amara Ariyawat",
      reporterId: "member-reporter",
      reporterName: "Benja Ariyawat",
      category: "Harassment",
      details: "The submitted report requires review.",
      evidenceRefs: ["evidence-42"],
      questId: "QST-42",
      questTitle: "Verify dorm fire exits",
      reportedMemberStatus: "ACTIVE",
      submittedAt: "2026-09-12T12:00:00.000Z",
      version: 3,
    });

    expect(model).toMatchObject({
      id: "RPT-42",
      status: "REPORT_CASE_PENDING",
      reportedMemberId: "member-reported",
      reportedMemberName: "Amara Ariyawat",
      reporterId: "member-reporter",
      reporterName: "Benja Ariyawat",
      reportType: "Harassment",
      detail: "The submitted report requires review.",
      submittedAt: "2026-09-12T12:00:00.000Z",
      version: 3,
    });
    expect(model?.reportedMemberHref).toBe("/member/member-reported");
    expect(model?.reporterHref).toBe("/member/member-reporter");
    expect(model?.relatedQuestHref).toBe("/quest/QST-42");
    expect(model?.moderationHistory.currentMemberStatus).toBe("ACTIVE");
    expect(model?.evidence).toEqual([{ reference: "evidence-42", label: "Evidence Reference 1" }]);
    expect(model?.reportedMemberHref).not.toContain("/users/");
  });

  it("makes pending and hidden Report Cases actionable, but not closed cases", () => {
    expect(isReportCaseActionable("REPORT_CASE_PENDING")).toBe(true);
    expect(isReportCaseActionable("REPORT_CASE_HIDDEN")).toBe(true);
    expect(isReportCaseActionable("REPORT_CASE_DISMISSED")).toBe(false);
    expect(isReportCaseActionable("REPORT_CASE_RESTORED")).toBe(false);
  });

  it("preserves the Report Case decision command mapping", () => {
    expect(reportCaseDecisionFor("no-violation")).toBe("REPORT_CASE_DISMISSED");
    expect(reportCaseDecisionFor("confirmed-violation")).toBe("REPORT_CASE_HIDDEN");
    expect(reportCaseDecisionFor("restore")).toBe("REPORT_CASE_RESTORED");
  });
});
