import { describe, expect, it } from "bun:test";

import {
  overviewCloneFallbackWithoutApiData,
  overviewCloneModelFromApi,
  overviewSearchResultsFromMockData,
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
  it("maps available API counters and keeps missing fields as explicit fallback data", () => {
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
      ["Dispute Cases", 2, "Admin API"],
      ["Report Cases", 6, "Local fallback"],
      ["Conduct Reports", 4, "Local fallback"],
    ]);
    expect(model.questStates.find((entry) => entry.status === "QUEST_FAILED")).toMatchObject({ count: 1, label: "Failed" });
  });

  it("maps the complete documented Overview response with separate moderation queues", () => {
    const model = overviewCloneModelFromApi({
      ...apiOverview(),
      reports: { open: 6 },
      conductReports: { open: 4 },
      members: {
        frozenWallets: 1,
        suspendedWallets: 2,
        byStatus: { NORMAL: 10, FLAG: 2, TEMP_BAN: 1, PERM_BAN: 1 },
      },
      wallets: {
        byStatus: { ACTIVE: 10, FROZEN: 2, SUSPENDED: 1, CLOSED: 1 },
      },
      queues: {
        payouts: {
          count: 3,
          state: "OPEN",
          oldest: { id: "PAY-1", title: "Payout to Ari Wattanakul", createdAt: "2026-09-10T08:00:00.000Z" },
        },
        disputes: {
          count: 2,
          state: "OPEN",
          oldest: { id: "DSP-1", title: "Verify quiet study room availability", createdAt: "2026-09-09T08:00:00.000Z" },
        },
        reports: {
          count: 6,
          state: "OPEN",
          oldest: { id: "RPT-1", title: "Message content report", createdAt: "2026-09-08T08:00:00.000Z" },
        },
        conductReports: {
          count: 4,
          state: "OPEN",
          oldest: { id: "CND-1", title: "Quest conduct report", createdAt: "2026-09-07T08:00:00.000Z" },
        },
      },
    }, [], {
      disputes: 99,
      reports: 99,
      conductReports: 99,
      memberStatusCounts: [],
      walletStatusCounts: [],
    }, Date.parse("2026-09-13T00:00:00.000Z"));

    expect(model.hasFallbackQueues).toBe(false);
    expect(model.memberStatusSource).toBe("Admin API");
    expect(model.walletStatusSource).toBe("Admin API");
    expect(model.queues.map((row) => [row.title, row.count, row.oldest, row.status])).toEqual([
      ["Payout Approvals", 3, "Payout to Ari Wattanakul", "Open"],
      ["Dispute Cases", 2, "Verify quiet study room availability", "Open"],
      ["Report Cases", 6, "Message content report", "Open"],
      ["Conduct Reports", 4, "Quest conduct report", "Open"],
    ]);
    expect(model.queues[2]?.waiting).toBe("4 days ago");
    expect(model.queues[3]?.waiting).toBe("5 days ago");
    expect(model.queues.map((row) => row.listHref)).toEqual([
      "/payout",
      "/dispute",
      "/report",
      "/conduct-report",
    ]);
    expect(model.queues.map((row) => row.oldestHref)).toEqual([
      "/payout/PAY-1",
      "/dispute/DSP-1",
      "/report/RPT-1",
      "/conduct-report",
    ]);
  });

  it("does not invent local values when the API only returns summary fields", () => {
    const model = overviewCloneModelFromApi(
      apiOverview(),
      [],
      overviewCloneFallbackWithoutApiData(),
      123,
    );

    expect(model.totalWorkLeft).toBeNull();
    expect(model.memberSignals).toBeNull();
    expect(model.memberStatusSource).toBe("Unavailable");
    expect(model.walletStatusSource).toBe("Unavailable");
    expect(model.queues.map((row) => [row.title, row.count, row.source, row.status])).toEqual([
      ["Payout Approvals", 3, "Admin API", "Open"],
      ["Dispute Cases", 2, "Admin API", "Open"],
      ["Report Cases", null, "Unavailable", "Not provided"],
      ["Conduct Reports", null, "Unavailable", "Not provided"],
    ]);
  });
});

describe("Overview search results", () => {
  it("returns canonical Quest, Member, and Payout destinations", () => {
    const results = overviewSearchResultsFromMockData({
      version: "test",
      collections: {
        users: [{ id: "68000000", title: "Ari Member" }],
        quests: [{ id: "QST-12001", title: "Verify dorm fire exits" }],
        payouts: [{ id: "PAY-9637", title: "Ari Member" }],
        disputes: [],
        reports: [],
      },
    }, "ari");

    expect(results.map((result) => [result.kind, result.id, result.href])).toEqual([
      ["member", "68000000", "/member/68000000"],
      ["payout", "PAY-9637", "/payout/PAY-9637"],
    ]);
    expect(overviewSearchResultsFromMockData({
      version: "test",
      collections: {
        users: [],
        quests: [{ id: "QST-12001", title: "Verify dorm fire exits" }],
        payouts: [],
        disputes: [],
        reports: [],
      },
    }, "QST-12001")[0]?.href).toBe("/quest/QST-12001");
  });
});
