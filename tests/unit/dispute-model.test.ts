import { describe, expect, it } from "bun:test";

import {
  disputeCaseDecisionFor,
  disputeCaseModelFromRecord,
  disputeCasesOnly,
  isDisputeCaseActionable,
  isDisputeCaseRecord,
} from "../../src/features/admin/dispute/dispute-model";

describe("Dispute Case model", () => {
  it("keeps Report Cases and Conduct Reports out of the Dispute Case collection", () => {
    const records = [
      { id: "DSP-1", status: "DISPUTE_CASE_PENDING", questId: "QST-1" },
      { id: "RPT-1", status: "REPORT_CASE_PENDING" },
      { id: "CND-1", status: "CONDUCT_REPORT_PENDING" },
    ];

    expect(disputeCasesOnly(records).map((record) => record.id)).toEqual(["DSP-1"]);
    expect(isDisputeCaseRecord(records[1])).toBe(false);
    expect(isDisputeCaseRecord(records[2])).toBe(false);
  });

  it("maps the Admin API snapshot and preserves canonical Quest and Member links", () => {
    const model = disputeCaseModelFromRecord({
      id: "dispute-internal-42",
      displayId: "DSP-42",
      status: "DISPUTE_CASE_PENDING",
      questId: "QST-42",
      questState: "QUEST_FAILED",
      questTitle: "Verify dorm fire exits",
      category: "EVIDENCE",
      detail: "The Proof Submission needs review.",
      filerUserId: "member-hirer",
      filerRole: "Hirer",
      filerName: "Hirer One",
      respondentUserId: "member-worker",
      respondentRole: "Worker",
      respondentName: "Worker One",
      amountAtRiskSatang: 12501,
      failedAt: "2026-09-12T12:00:00.000Z",
      reportedMemberStatus: "ACTIVE",
      createdAt: "2026-09-12T12:00:00.000Z",
      version: 3,
    });

    expect(model).toMatchObject({
      id: "dispute-internal-42",
      status: "DISPUTE_CASE_PENDING",
      questId: "QST-42",
      questTitle: "Verify dorm fire exits",
      amountAtRiskSatang: 12501,
      amountAtRiskLabel: "฿125.01",
      isActionable: true,
      version: 3,
    });
    expect(model?.questHref).toBe("/quest/QST-42");
    expect(model?.filerHref).toBe("/member/member-hirer");
    expect(model?.workerHref).toBe("/member/member-worker");
    expect(model?.submittedAt).not.toContain("Invalid Date");
    expect(model?.displayId).toBe("DSP-42");
    expect(model?.moneyHoldDeadline).toBe("19 Sep 2026 19:00");
    expect(model?.moderationHistory.currentMemberStatus).toBe("ACTIVE");
  });

  it("uses canonical status values and only pending failed Quests are actionable", () => {
    expect(isDisputeCaseActionable("DISPUTE_CASE_PENDING")).toBe(true);
    expect(isDisputeCaseActionable("DISPUTE_CASE_DISMISSED")).toBe(false);
    expect(isDisputeCaseActionable("DISPUTE_CASE_RESOLVED")).toBe(false);
    expect(disputeCaseModelFromRecord({ id: "DSP-1", status: "DISPUTE_CASE_PENDING", questState: "QUEST_OPEN" })?.isActionable).toBe(false);
  });

  it("allocates to the Worker when the Worker is the Filer", () => {
    const model = disputeCaseModelFromRecord({
      id: "DSP-43",
      displayId: "DSP-43",
      status: "DISPUTE_CASE_PENDING",
      questId: "QST-43",
      questState: "QUEST_FAILED",
      filerUserId: "member-worker",
      filerRole: "Worker",
      filerName: "Worker One",
      respondentUserId: "member-hirer",
      respondentRole: "Hirer",
      respondentName: "Hirer One",
      amountAtRiskSatang: 100,
    });

    expect(model).toMatchObject({ workerId: "member-worker", workerName: "Worker One" });
  });

  it("does not turn an API resolved amount field into historical amount at risk", () => {
    const model = disputeCaseModelFromRecord({
      id: "DSP-44",
      status: "DISPUTE_CASE_PENDING",
      questId: "QST-44",
      questState: "QUEST_FAILED",
      amountSatang: 9000,
    });

    expect(model?.amountAtRiskSatang).toBeNull();
    expect(model?.amountAtRiskLabel).toBe("Not provided by the Admin API.");
  });

  it("maps Dispute Case submission fields, Display IDs, and Admin decision readback", () => {
    const model = disputeCaseModelFromRecord({
      id: "dispute-45",
      displayId: "DSP-000045",
      status: "DISPUTE_CASE_RESOLVED",
      questId: "quest-45",
      filerUserId: "member-filer",
      filerDisplayId: "MEM-000045",
      respondentUserId: "member-respondent",
      respondentDisplayId: "MEM-000046",
      category: "PARTIAL_WORK",
      submittedDetail: "The Worker completed part of the task.",
      filerStatement: "The submitted Proof shows partial completion.",
      respondentStatement: null,
      decision: {
        reasonCode: "DISPUTE_PARTIAL_WORK_EARNED_REWARD",
        decisionReasonText: "The Admin confirmed a partial reward.",
      },
      quest: {
        id: "quest-45",
        displayId: "QST-000045",
        title: "Collect field readings",
        questStatus: "QUEST_FAILED",
        failedAt: null,
      },
      createdAt: "2026-10-08T08:00:00.000Z",
    });

    expect(model).toMatchObject({
      category: "Partial work",
      detail: "The Worker completed part of the task.",
      filerDisplayId: "MEM-000045",
      respondentDisplayId: "MEM-000046",
      filerStatement: "The submitted Proof shows partial completion.",
      respondentStatement: "No respondent statement was submitted.",
      decisionReasonCode: "DISPUTE_PARTIAL_WORK_EARNED_REWARD",
      decisionReasonText: "The Admin confirmed a partial reward.",
      decisionReasonCodeWasReturned: true,
      decisionReasonTextWasReturned: true,
      questFailedAt: null,
      questFailedAtWasReturned: true,
    });
  });

  it("keeps a missing failedAt field separate from a returned null", () => {
    const model = disputeCaseModelFromRecord({
      id: "dispute-46",
      status: "DISPUTE_CASE_PENDING",
      questId: "quest-46",
      quest: { id: "quest-46", questStatus: "QUEST_FAILED" },
    });

    expect(model?.questFailedAt).toBeNull();
    expect(model?.questFailedAtWasReturned).toBe(false);
  });

  it("keeps returned null Dispute fields separate from absent fields", () => {
    const returnedNull = disputeCaseModelFromRecord({
      id: "dispute-47",
      status: "DISPUTE_CASE_DISMISSED",
      questId: "quest-47",
      category: null,
      submittedDetail: null,
      filerStatement: null,
      respondentStatement: null,
      decision: { reasonCode: null, decisionReasonText: null },
      quest: { id: "quest-47", questStatus: "QUEST_FAILED", failedAt: null },
    });
    const absent = disputeCaseModelFromRecord({
      id: "dispute-48",
      status: "DISPUTE_CASE_PENDING",
      questId: "quest-48",
      quest: { id: "quest-48", questStatus: "QUEST_FAILED" },
    });

    expect(returnedNull).toMatchObject({
      category: "No category was recorded.",
      detail: "No submitted detail was recorded.",
      filerStatement: "No filer statement was submitted.",
      respondentStatement: "No respondent statement was submitted.",
      decisionReasonCodeWasReturned: true,
      decisionReasonTextWasReturned: true,
      questFailedAtWasReturned: true,
    });
    expect(absent).toMatchObject({
      category: "Not provided by the Admin API.",
      detail: "Not provided by the Admin API.",
      filerStatement: "Not provided by the Admin API.",
      respondentStatement: "Not provided by the Admin API.",
      decisionReasonCodeWasReturned: false,
      decisionReasonTextWasReturned: false,
      questFailedAtWasReturned: false,
    });
  });

  it("preserves the financial decision command mapping", () => {
    expect(disputeCaseDecisionFor("dismiss")).toBe("DISPUTE_CASE_DISMISSED");
    expect(disputeCaseDecisionFor("resolve")).toBe("DISPUTE_CASE_RESOLVED");
  });
});
