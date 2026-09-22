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
      filerRole: "HIRER",
      filerName: "Hirer One",
      respondentUserId: "member-worker",
      respondentRole: "WORKER",
      respondentName: "Worker One",
      amountAtRiskSatang: 12501,
      failedAt: "2026-09-12T12:00:00.000Z",
      reportedMemberStatus: "ACTIVE",
      createdAt: "2026-09-12T12:00:00.000Z",
      version: 3,
    }, "api");

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

  it("derives both parties from the API Quest Hirer and Worker fields", () => {
    const model = disputeCaseModelFromRecord({
      id: "DSP-5203",
      displayId: "DSP-5203",
      status: "DISPUTE_CASE_RESOLVED",
      filerUserId: "hirer-1",
      resolvedWorkerId: "worker-1",
      quest: {
        id: "QST-5203",
        title: "Organize community garden records",
        hirerId: "hirer-1",
        questStatus: "QUEST_FAILED",
      },
    }, "api");

    expect(model).toMatchObject({
      filerId: "hirer-1",
      filerRole: "Hirer",
      respondentId: "worker-1",
      respondentRole: "Worker",
      filerName: "Member hirer-1",
      respondentName: "Member worker-1",
      filerStatement: "Not provided by the Admin API.",
      respondentStatement: "Not provided by the Admin API.",
    });
    expect(model?.filerName).not.toContain("Hirer not provided");
    expect(model?.respondentName).not.toContain("Worker not provided");
  });

  it("keeps the Worker as the filer when the API identifies the Worker party", () => {
    const model = disputeCaseModelFromRecord({
      id: "DSP-5204",
      displayId: "DSP-5204",
      status: "DISPUTE_CASE_PENDING",
      filerUserId: "worker-1",
      workerId: "worker-1",
      quest: {
        id: "QST-5204",
        hirerId: "hirer-1",
        questStatus: "QUEST_FAILED",
      },
    }, "api");

    expect(model).toMatchObject({
      filerId: "worker-1",
      filerRole: "Worker",
      respondentId: "hirer-1",
      respondentRole: "Hirer",
      workerId: "worker-1",
    });
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
    }, "api");

    expect(model).toMatchObject({ workerId: "member-worker", workerName: "Worker One" });
  });

  it("does not turn an API resolved amount field into historical amount at risk", () => {
    const model = disputeCaseModelFromRecord({
      id: "DSP-44",
      status: "DISPUTE_CASE_PENDING",
      questId: "QST-44",
      questState: "QUEST_FAILED",
      amountSatang: 9000,
    }, "api");

    expect(model?.amountAtRiskSatang).toBeNull();
    expect(model?.amountAtRiskLabel).toBe("Not provided by the Admin API.");
  });

  it("preserves the financial decision command mapping", () => {
    expect(disputeCaseDecisionFor("dismiss")).toBe("DISPUTE_CASE_DISMISSED");
    expect(disputeCaseDecisionFor("resolve")).toBe("DISPUTE_CASE_RESOLVED");
  });
});
