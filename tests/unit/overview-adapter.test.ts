import { describe, expect, it } from "bun:test";

import type { BrowserStorage } from "../../src/features/admin/data/admin-demo-data-adapter";
import { loadOverviewModelFromMock } from "../../src/features/admin/overview/overview-adapter";
import { mockPendingPayout } from "../../src/features/admin/payout/payout-mock-data";
import {
  applyMockPayoutDecision,
  payoutMockOverrideFromDetail,
  saveMockPayoutOverride,
} from "../../src/features/admin/payout/payout-mock-state";
import { payoutDetailViewFromApi } from "../../src/features/admin/payout/payout-model";

function memoryStorage(initial: Record<string, string> = {}): BrowserStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("Overview mock adapter", () => {
  it("shows recent deterministic Activity Log fixtures in the Overview model", () => {
    const model = loadOverviewModelFromMock(memoryStorage());

    expect(model.activity).toHaveLength(10);
    expect(model.activity[0]).toMatchObject({
      id: "ACT-9006",
      actor: "SA",
      title: "Dispute Case Resolved",
      detail: "Dispute Case · DSP-5201 · Evidence Reviewed",
    });
    expect(model.activity.some((entry) => entry.id === "ACT-9005")).toBe(true);
  });

  it("keeps locally persisted Admin actions alongside the mock Activity Log fixtures", () => {
    const model = loadOverviewModelFromMock(memoryStorage({
      "kuquest-admin-activity-v2": JSON.stringify([{
        id: "local-activity-1",
        actor: "NP",
        title: "Local Admin action",
        detail: "RPT-8201",
        timestamp: Date.parse("2026-09-17T03:00:00.000Z"),
      }]),
    }));

    expect(model.activity[0]).toMatchObject({
      id: "local-activity-1",
      title: "Local Admin action",
      detail: "RPT-8201",
    });
    expect(model.activity.some((entry) => entry.id === "ACT-9006")).toBe(true);
  });

  it("removes a processed Mock Payout from the Overview queue", () => {
    const storage = memoryStorage();
    const detail = payoutDetailViewFromApi(mockPendingPayout, [mockPendingPayout]);
    const processed = applyMockPayoutDecision(detail, "approve", null, "2026-09-17T03:25:00.000Z");
    saveMockPayoutOverride(storage, { id: processed.id, ...payoutMockOverrideFromDetail(processed) });

    const model = loadOverviewModelFromMock(storage);
    const payoutQueue = model.queues.find((queue) => queue.id === "payouts");

    expect(payoutQueue?.count).toBe(52);
    expect(payoutQueue?.oldestId).not.toBe("PAY-9637");
  });
});
