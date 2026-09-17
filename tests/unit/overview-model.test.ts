import { describe, expect, it } from "bun:test";

import type { PersistedAdminData } from "../../src/features/admin/data/admin-records";
import {
  overviewFallbackWithoutApiData,
  overviewQueueCaseIndexFor,
  overviewModelFromMockData,
  overviewModelFromApi,
  overviewSearchResultsFromApi,
  overviewSearchResultsFromMockData,
} from "../../src/features/admin/overview/overview-model";

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

describe("Overview model", () => {
  it("keeps the ten latest Activity Log entries for the Overview", () => {
    const activity = Array.from({ length: 12 }, (_, index) => ({
      id: `ACT-${index}`,
      actor: "AD",
      title: "Administrative activity",
      detail: "Overview",
      timestamp: 12 - index,
    }));
    const model = overviewModelFromApi(apiOverview(), activity, overviewFallbackWithoutApiData(), 123);

    expect(model.activity).toHaveLength(10);
    expect(model.activity.map((entry) => entry.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `ACT-${index}`),
    );
  });

  it("maps available API counters and keeps missing fields as explicit fallback data", () => {
    const model = overviewModelFromApi(apiOverview(), [], {
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
    const model = overviewModelFromApi({
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

    expect(model.hasSummaryOnlyData).toBe(false);
    expect(model.hasUnavailableData).toBe(false);
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
      "/conduct-report/CND-1",
    ]);
    expect(model.queues.map((row) => row.oldestId)).toEqual([
      "PAY-1",
      "DSP-1",
      "RPT-1",
      "CND-1",
    ]);
  });

  it("resolves a mock Process next action from the queue's named oldest case", () => {
    expect(overviewQueueCaseIndexFor("payouts", "PAY-9637")).toBe(0);
    expect(overviewQueueCaseIndexFor("disputes", "DSP-5202")).toBe(1);
    expect(overviewQueueCaseIndexFor("conductReports", null)).toBeNull();
    expect(overviewQueueCaseIndexFor("reports", "unknown-case")).toBeNull();
  });

  it("selects the oldest Mock case for each Queue map row", () => {
    const data: PersistedAdminData = {
      version: "test",
      collections: {
        users: [],
        quests: [],
        payouts: [{ id: "PAY-1", status: "PENDING_ADMIN_APPROVAL" }],
        disputes: [{ id: "DSP-1", status: "DISPUTE_CASE_PENDING" }],
        reports: [
          { id: "RPT-1", status: "REPORT_CASE_PENDING" },
          { id: "CND-1", status: "CONDUCT_REPORT_PENDING", conductReportStatus: "CONDUCT_REPORT_PENDING" },
        ],
      },
    };

    const model = overviewModelFromMockData(data, [], Date.parse("2026-09-17T04:00:00.000Z"));

    expect(model.queues.map((row) => row.oldestId)).toEqual([
      "PAY-9637",
      "DSP-5201",
      "RPT-8201",
      "CND-8302",
    ]);
  });

  it("does not invent local values when the API only returns summary fields", () => {
    const model = overviewModelFromApi(
      apiOverview(),
      [],
      overviewFallbackWithoutApiData(),
      123,
    );

    expect(model.hasSummaryOnlyData).toBe(true);
    expect(model.hasUnavailableData).toBe(true);
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

  it("keeps API counters visible when queue detail records are not provided", () => {
    const model = overviewModelFromApi({
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
    }, [], overviewFallbackWithoutApiData(), 123);

    expect(model.hasSummaryOnlyData).toBe(true);
    expect(model.hasUnavailableData).toBe(false);
    expect(model.totalWorkLeft).toBe(15);
    expect(model.queues.map((row) => [row.count, row.source, row.oldest])).toEqual([
      [3, "Admin API", "Queue detail not provided"],
      [2, "Admin API", "Queue detail not provided"],
      [6, "Admin API", "Queue detail not provided"],
      [4, "Admin API", "Queue detail not provided"],
    ]);
  });
});

describe("Overview search results", () => {
  it("returns canonical Quest, Member, and Payout destinations", () => {
    const results = overviewSearchResultsFromMockData({
      version: "test",
      collections: {
        users: [{ id: "68000000", title: "Ari Member", studentId: "6612345678" }],
        quests: [{ id: "QST-12001", title: "Verify dorm fire exits" }],
        payouts: [{ id: "PAY-9637", title: "Ari Member" }],
        disputes: [],
        reports: [],
      },
    }, "ari");

    expect(results.map((result) => [result.kind, result.id, result.href])).toEqual([
      ["member", "68000000", "/member/68000000"],
      ["payout", "PAY-9637", "/payout/PAY-9637"],
      ["wallet", "WLT-68000000", "/wallet"],
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
    expect(overviewSearchResultsFromMockData({
      version: "test",
      collections: {
        users: [{ id: "68000000", title: "Ari Member", studentId: "6612345678" }],
        quests: [],
        payouts: [],
        disputes: [],
        reports: [],
      },
    }, "6612345678")[0]?.href).toBe("/member/68000000");
  });

  it("finds API members by Student ID", () => {
    const results = overviewSearchResultsFromApi({
      quests: [],
      members: [{
        id: "68000000",
        firstName: "Ari",
        lastName: "Member",
        studentId: "6612345678",
      }],
      payouts: [],
    }, "6612345678");

    expect(results[0]).toMatchObject({ kind: "member", id: "68000000", href: "/member/68000000" });
  });
});
