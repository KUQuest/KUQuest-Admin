import { describe, expect, it } from "bun:test";

import {
  overviewCloneModelFromApi,
} from "../../src/features/admin/dashboard/overview-clone-model";

function apiOverview() {
  return {
    quests: {
      total: 8,
      hidden: 1,
      byState: {
        QUEST_OPEN: 2,
        QUEST_IN_PROGRESS: 3,
        QUEST_FAILED: 1,
        QUEST_COMPLETED: 2,
      },
    },
    disputes: { total: 4, awaitingResolution: 2 },
    payouts: { pendingAdminApproval: 3, inFlight: 5 },
    members: { frozenWallets: 1, suspendedWallets: 2 },
  };
}

describe("Overview clone model", () => {
  it("maps API overview values and keeps missing queues as explicit fallback data", () => {
    const model = overviewCloneModelFromApi(apiOverview(), [], {
      disputes: 2,
      reports: 6,
      conductReports: 4,
      memberStatusCounts: [
        { status: "Normal", count: 10 },
        { status: "Flag", count: 2 },
        { status: "Temp Ban", count: 1 },
        { status: "Perm Ban", count: 1 },
      ],
      walletStatusCounts: [
        { status: "ACTIVE", count: 10 },
        { status: "FROZEN", count: 2 },
        { status: "SUSPENDED", count: 1 },
        { status: "CLOSED", count: 1 },
      ],
    }, 123);

    expect(model).toMatchObject({
      source: "Admin API",
      loadedAt: 123,
      totalWorkLeft: 15,
      questTotal: 8,
      reportCases: 6,
      conductReports: 4,
      frozenWallets: 1,
      suspendedWallets: 2,
      inFlightPayouts: 5,
    });
    expect(model.memberStatusCounts).toEqual([
      { status: "Normal", count: 10 },
      { status: "Flag", count: 2 },
      { status: "Temp Ban", count: 1 },
      { status: "Perm Ban", count: 1 },
    ]);
    expect(model.walletStatusCounts).toEqual([
      { status: "ACTIVE", count: 10 },
      { status: "FROZEN", count: 2 },
      { status: "SUSPENDED", count: 1 },
      { status: "CLOSED", count: 1 },
    ]);
    expect(model.queues.map((row) => [row.title, row.count, row.source])).toEqual([
      ["Payout Approvals", 3, "Admin API"],
      ["Dispute Cases", 2, "Local fallback"],
      ["Report Cases", 6, "Local fallback"],
      ["Conduct Reports", 4, "Local fallback"],
    ]);
    expect(model.questStates.find((entry) => entry.status === "QUEST_FAILED")).toMatchObject({ count: 1, label: "Failed" });
  });
});
