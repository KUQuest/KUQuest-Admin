import { describe, expect, it } from "bun:test";

import {
  loadDisputeCasesFromMock,
  saveMockDisputeDecision,
} from "../../src/features/admin/dispute/dispute-adapter";
import { ADMIN_DEMO_DATA_KEY } from "../../src/features/admin/data/admin-demo-data-adapter";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("Dispute Case mock adapter", () => {
  it("loads only Dispute Cases from the demo collection", () => {
    const page = loadDisputeCasesFromMock(memoryStorage());

    expect(page.items.map((record) => record.id)).toEqual(["DSP-5201", "DSP-5202"]);
    expect(page.items.every((record) => record.status === "DISPUTE_CASE_PENDING")).toBe(true);
    expect(page.items[0]).toMatchObject({
      questId: "QST-12001",
      questHref: "/quest/QST-12001",
      amountAtRiskSatang: 248300,
    });
  });

  it("migrates older stored Dispute Cases with the current Quest and party fields", () => {
    const storage = memoryStorage();
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify({
      version: "dashboard-bootstrap-v3-canonical-conduct-reports",
      collections: {
        users: [{ id: "member-1", title: "Member One" }],
        quests: [],
        payouts: [],
        disputes: [{ id: "DSP-5201", title: "Verify dorm fire exits", status: "DISPUTE_CASE_PENDING", disputeCaseStatus: "DISPUTE_CASE_PENDING" }],
        reports: [],
      },
    }));

    expect(loadDisputeCasesFromMock(storage).items[0]).toMatchObject({
      displayId: "DSP-5201",
      questId: "QST-12001",
      questState: "QUEST_FAILED",
      workerId: "68000020",
    });
  });

  it("persists a dismissal without money movement", () => {
    const storage = memoryStorage();
    const updated = saveMockDisputeDecision(storage, "DSP-5201", "DISPUTE_CASE_DISMISSED", "The Quest record does not support the claim.", {
      reasonCode: "DISPUTE_EVIDENCE_REVIEW",
    });

    expect(updated).toMatchObject({
      id: "DSP-5201",
      status: "DISPUTE_CASE_DISMISSED",
      disputeCaseStatus: "DISPUTE_CASE_DISMISSED",
      decision: "dismiss",
      resolvedAmountSatang: null,
      decisionReason: "The Quest record does not support the claim.",
    });
    expect(loadDisputeCasesFromMock(storage).items[0]?.status).toBe("DISPUTE_CASE_DISMISSED");
  });

  it("persists a resolved full Satang outcome", () => {
    const updated = saveMockDisputeDecision(memoryStorage(), "DSP-5202", "DISPUTE_CASE_RESOLVED", "The Worker completed the agreed Quest Condition.", {
      reasonCode: "DISPUTE_POLICY_REVIEW",
      workerId: "68000040",
      amountSatang: 787100,
    });

    expect(updated).toMatchObject({
      status: "DISPUTE_CASE_RESOLVED",
      resolvedWorkerId: "68000040",
      resolvedAmountSatang: 787100,
      reasonCode: "DISPUTE_POLICY_REVIEW",
    });
  });
});
