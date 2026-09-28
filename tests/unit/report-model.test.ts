import { describe, expect, it } from "bun:test";

import {
  isReportCaseActionable,
  isReportCaseRecord,
  reportCaseDecisionFor,
  reportCaseModelFromRecord,
  reportCaseModelWithEvidenceSender,
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
      submittedAt: "12 Sep 2026 12:00",
      version: 3,
    });
    expect(model?.reportedMemberHref).toBe("/member/member-reported");
    expect(model?.reporterHref).toBe("/member/member-reporter");
    expect(model?.relatedQuestHref).toBe("/quest/QST-42");
    expect(model?.moderationHistory.currentMemberStatus).toBe("ACTIVE");
    expect(model?.evidence).toEqual([{ reference: "evidence-42", label: "Evidence Reference 1" }]);
    expect(model?.reportedMemberHref).not.toContain("/users/");
  });

  it("maps nested API reporter entries and evidence references without showing UUIDs as IDs", () => {
    const model = reportCaseModelFromRecord({
      id: "0a000000-0000-4000-8000-000000000001",
      displayId: "RPT-000042",
      status: "REPORT_CASE_PENDING",
      messageId: "0b000000-0000-4000-8000-000000000001",
      questId: "0c000000-0000-4000-8000-000000000001",
      createdAt: "2026-09-12T12:00:00.000Z",
      caseClosedAt: null,
      version: 1,
      reporterEntries: [{
        id: "0d000000-0000-4000-8000-000000000001",
        reporterMemberId: "0e000000-0000-4000-8000-000000000001",
        reporter: {
          id: "0e000000-0000-4000-8000-000000000001",
          email: "benja@ku.th",
          firstName: "Benja",
          lastName: "Ariyawat",
        },
        reason: "REPORT_SPAM",
        detail: "This Message is repeated spam.",
        createdAt: "2026-09-12T12:00:00.000Z",
      }],
      evidenceReferences: [{
        id: "0f000000-0000-4000-8000-000000000001",
        messageId: "0b000000-0000-4000-8000-000000000001",
        attachmentId: null,
        createdAt: "2026-09-12T12:00:00.000Z",
      }],
    });

    expect(model).toMatchObject({
      displayId: "RPT-000042",
      reporterId: "0e000000-0000-4000-8000-000000000001",
      reporterName: "Benja Ariyawat",
      reporterDisplayId: null,
      reportType: "Spam",
      detail: "This Message is repeated spam.",
      relatedQuestId: "0c000000-0000-4000-8000-000000000001",
      relatedQuestDisplayId: null,
      closedAt: null,
    });
    expect(model?.evidence).toEqual([{
      reference: "0f000000-0000-4000-8000-000000000001",
      label: "Evidence Reference 1",
    }]);
    expect(model?.reporterHref).toBe("/member/0e000000-0000-4000-8000-000000000001");
  });

  it("does not show UUIDs as Member names when the API omits names", () => {
    const model = reportCaseModelFromRecord({
      id: "0a000000-0000-4000-8000-000000000001",
      displayId: "RPT-000043",
      status: "REPORT_CASE_PENDING",
      reportedMemberId: "0b000000-0000-4000-8000-000000000001",
      reporterId: "0c000000-0000-4000-8000-000000000001",
    });

    expect(model?.reportedMemberName).toBe("Member not provided");
    expect(model?.reporterName).toBe("Reporter not provided");
  });

  it("uses the reported Message sender only from matching case evidence", () => {
    const model = reportCaseModelFromRecord({
      id: "0a000000-0000-4000-8000-000000000001",
      displayId: "RPT-000044",
      status: "REPORT_CASE_PENDING",
    });
    expect(model).not.toBeNull();
    if (!model) return;

    const evidence = {
      caseId: model.id,
      evidenceRefId: "0b000000-0000-4000-8000-000000000001",
      reportedMessageId: "0c000000-0000-4000-8000-000000000001",
      truncated: false,
      adminActionId: "0d000000-0000-4000-8000-000000000001",
      messages: [
        {
          id: "0e000000-0000-4000-8000-000000000001",
          sender: { id: "0f000000-0000-4000-8000-000000000001", email: "context@ku.th", firstName: "Context", lastName: "Member" },
        },
        {
          id: "0c000000-0000-4000-8000-000000000001",
          sender: { id: "10000000-0000-4000-8000-000000000001", email: "reported@ku.th", firstName: "Reported", lastName: "Member" },
        },
      ],
    };

    const enriched = reportCaseModelWithEvidenceSender(model, evidence);
    expect(enriched.reportedMemberName).toBe("Reported Member");
    expect(enriched.reportedMemberDisplayId).toBeNull();
    expect(enriched.reportedMemberHref).toBe("/member/10000000-0000-4000-8000-000000000001");
    expect(reportCaseModelWithEvidenceSender(enriched, evidence)).toBe(enriched);
    expect(reportCaseModelWithEvidenceSender(model, { ...evidence, caseId: "another-case" })).toBe(model);
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
