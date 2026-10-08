import { describe, expect, it } from "bun:test";

import {
  conductReportDecisionFor,
  conductReportModelFromRecord,
  conductReportsOnly,
  isConductReportActionable,
  isConductReportRecord,
  conductReportDecisionDetailsForCommand,
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
      questState: "QUEST_FAILED",
      failedAt: "2026-09-12T11:00:00.000Z",
      relatedQuestTitle: "Verify dorm fire exits",
      details: "The Worker was asked to perform work outside the Quest Condition.",
      submittedAt: "2026-09-12T12:00:00.000Z",
      reportedMemberStatus: "ACTIVE",
      previousReportCount: 2,
      confirmedViolationCount: 1,
      previousModerationActions: ["Red Flag"],
      version: 3,
    });

    expect(model).toMatchObject({
      id: "CND-42",
      status: "CONDUCT_REPORT_PENDING",
      statusLabel: "Pending",
      badgeClass: "status-conduct-pending",
      reason: "Out of scope work",
      reasonCode: "CONDUCT_OUT_OF_SCOPE",
      questId: "QST-12001",
      questTitle: "Verify dorm fire exits",
      questState: "QUEST_FAILED",
      questFailedAt: "2026-09-12T11:00:00.000Z",
      reportedMemberName: "Amara Ariyawat",
      reporterName: "Benja Ariyawat",
      detail: "The Worker was asked to perform work outside the Quest Condition.",
      submittedAt: "12 Sep 2026 12:00",
      version: 3,
    });
    expect(model?.reportedMemberHref).toBe("/member/member-reported");
    expect(model?.reporterHref).toBe("/member/member-reporter");
    expect(model?.questHref).toBe("/quest/QST-12001");
    expect(model?.moderationHistory).toMatchObject({
      currentMemberStatus: "ACTIVE",
      previousReportCount: 2,
      confirmedViolationCount: 1,
      previousActions: ["Red Flag"],
    });
    expect(model?.title).toBe("Out of scope work");
    expect(conductReportModelFromRecord({
      id: "RPT-1",
      status: "REPORT_CASE_PENDING",
    })).toBeNull();
  });

  it("maps nested API Members, readable Quest ID, resolution time, Assignment, and Proof Submission", () => {
    const model = conductReportModelFromRecord({
      id: "0a000000-0000-4000-8000-000000000001",
      displayId: "CND-000042",
      status: "CONDUCT_REPORT_DISMISSED",
      filer: {
        id: "0b000000-0000-4000-8000-000000000001",
        email: "filer@ku.th",
        firstName: "Fah",
        lastName: "Ariyawat",
      },
      reportedMember: {
        id: "0c000000-0000-4000-8000-000000000001",
        email: "worker@ku.th",
        firstName: "Chayut",
        lastName: "Boonprasert",
      },
      quest: {
        id: "0d000000-0000-4000-8000-000000000001",
        displayId: "QST-120042",
        title: "Review campus map labels",
        questStatus: "QUEST_FAILED",
      },
      reason: "CONDUCT_NO_SHOW",
      detail: "The Worker did not attend the agreed session.",
      version: 2,
      createdAt: "2026-09-12T12:00:00.000Z",
      updatedAt: "2026-09-12T12:30:00.000Z",
      resolvedAt: "2026-09-12T12:30:00.000Z",
      assignment: {
        id: "0e000000-0000-4000-8000-000000000001",
        worker: {
          id: "0c000000-0000-4000-8000-000000000001",
          email: "worker@ku.th",
          firstName: "Chayut",
          lastName: "Boonprasert",
        },
        assignmentStatus: "ASSIGNMENT_INCOMPLETE",
        startedAt: null,
        createdAt: "2026-09-10T12:00:00.000Z",
      },
      proofSubmission: {
        id: "0f000000-0000-4000-8000-000000000001",
        workerId: "0c000000-0000-4000-8000-000000000001",
        teamId: null,
        submittedBy: {
          id: "0c000000-0000-4000-8000-000000000001",
          email: "worker@ku.th",
          firstName: "Chayut",
          lastName: "Boonprasert",
        },
        description: "No files were submitted.",
        workerMessage: "I could not attend.",
        content: null,
        submissionStatus: "PROOF_SUBMISSION_MISSING",
        reviewNote: "Awaited the requested submission.",
        sentAt: null,
        submittedAt: null,
        reviewedAt: null,
        createdAt: "2026-09-12T11:00:00.000Z",
        updatedAt: null,
      },
      evidenceHandles: [],
    });

    expect(model).toMatchObject({
      displayId: "CND-000042",
      reportedMemberId: "0c000000-0000-4000-8000-000000000001",
      reportedMemberName: "Chayut Boonprasert",
      reportedMemberDisplayId: null,
      reporterId: "0b000000-0000-4000-8000-000000000001",
      reporterName: "Fah Ariyawat",
      reporterDisplayId: null,
      reason: "No show",
      questId: "0d000000-0000-4000-8000-000000000001",
      questDisplayId: "QST-120042",
      questTitle: "Review campus map labels",
      detail: "The Worker did not attend the agreed session.",
      resolutionAt: "2026-09-12T12:30:00.000Z",
      assignment: {
        workerName: "Chayut Boonprasert",
        workerEmail: "worker@ku.th",
        status: "Incomplete",
        startedAt: null,
        createdAt: "2026-09-10T12:00:00.000Z",
      },
      proofSubmission: {
        submittedByName: "Chayut Boonprasert",
        status: "Missing",
        description: "No files were submitted.",
        workerMessage: "I could not attend.",
        content: null,
        reviewNote: "Awaited the requested submission.",
        submittedAt: null,
        sentAt: null,
        reviewedAt: null,
      },
    });
    expect(model?.questHref).toBe("/quest/0d000000-0000-4000-8000-000000000001");
  });

  it("keeps the filed reason separate from the Admin-selected uphold reason", () => {
    const model = conductReportModelFromRecord({
      id: "0a000000-0000-4000-8000-000000000052",
      displayId: "CND-000052",
      status: "CONDUCT_REPORT_UPHELD",
      reason: "CONDUCT_NO_SHOW",
      decision: {
        reason: "CONDUCT_REPORT_PROOF_RECORD_CONFIRMS_VIOLATION",
        decisionReasonText: "The Proof Submission confirms the reported conduct.",
        resolvedAt: "2026-10-08T08:30:00.000Z",
        admin: { firstName: "Mali", lastName: "Admin" },
      },
      quest: {
        id: "0d000000-0000-4000-8000-000000000052",
        displayId: "QST-000052",
        title: "Review campus map labels",
        questStatus: "QUEST_FAILED",
        failedAt: null,
      },
    });

    expect(model).toMatchObject({
      reason: "No show",
      reasonCode: "CONDUCT_NO_SHOW",
      decisionReasonCode: "CONDUCT_REPORT_PROOF_RECORD_CONFIRMS_VIOLATION",
      decisionReason: "The Proof Submission confirms the reported conduct.",
      decisionAdminName: "Mali Admin",
      resolutionAt: "2026-10-08T08:30:00.000Z",
      questFailedAt: null,
      questFailedAtWasReturned: true,
    });
  });

  it("does not show UUIDs as Member names when the API omits names", () => {
    const model = conductReportModelFromRecord({
      id: "0a000000-0000-4000-8000-000000000001",
      displayId: "CND-000043",
      status: "CONDUCT_REPORT_PENDING",
      reportedMemberId: "0b000000-0000-4000-8000-000000000001",
      reporterId: "0c000000-0000-4000-8000-000000000001",
    });

    expect(model?.reportedMemberName).toBe("Member not provided");
    expect(model?.reporterName).toBe("Reporter not provided");
  });

  it("makes only pending Conduct Reports actionable", () => {
    expect(isConductReportActionable("CONDUCT_REPORT_PENDING")).toBe(true);
    expect(isConductReportActionable("CONDUCT_REPORT_UPHELD")).toBe(false);
    expect(isConductReportActionable("CONDUCT_REPORT_DISMISSED")).toBe(false);
  });

  it("maps dismissal and uphold decisions to their canonical commands", () => {
    expect(conductReportDecisionFor("dismiss")).toBe("CONDUCT_REPORT_DISMISSED");
    expect(conductReportDecisionFor("confirmed-violation")).toBe("CONDUCT_REPORT_UPHELD");
  });
  it("maps dismissal reason and uphold to decision details", () => {
    expect(conductReportDecisionDetailsForCommand({
      outcome: "CONDUCT_REPORT_DISMISSED",
      decisionReasonCode: "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE",
    })).toEqual({
      label: "Insufficient evidence",
      decisionReasonCode: "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE",
      resolution: "Conduct Report dismissed; the evidence did not establish a policy violation.",
    });
    expect(conductReportDecisionDetailsForCommand({
      outcome: "CONDUCT_REPORT_UPHELD",
      decisionReasonCode: "CONDUCT_REPORT_PROOF_RECORD_CONFIRMS_VIOLATION",
    })).toEqual({
      label: "Proof Submission confirms a violation",
      decisionReasonCode: "CONDUCT_REPORT_PROOF_RECORD_CONFIRMS_VIOLATION",
      resolution: "Violation confirmed; the Member Misconduct ladder was applied.",
    });
  });

});
