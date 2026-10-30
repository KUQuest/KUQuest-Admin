import { describe, expect, it } from "bun:test";

import {
  adminNavigationCountsFromOverview,
} from "../../src/features/admin/admin-navigation";

describe("Admin navigation counts", () => {
  it("uses API queue counters and does not invent Report counters", () => {
    expect(adminNavigationCountsFromOverview({
      quests: { total: 488, hidden: 0, byState: {} },
      disputes: { total: 4, awaitingResolution: 2 },
      payouts: { pendingAdminApproval: 3, inFlight: 12 },
      members: { frozenWallets: 1, suspendedWallets: 2 },
    })).toEqual({
      disputes: 2,
      payouts: 3,
      reports: null,
      conductReports: null,
    });
  });

  it("keeps API Report Case and Conduct Report counts separate", () => {
    expect(adminNavigationCountsFromOverview({
      quests: { total: 10, hidden: 0, byState: {} },
      disputes: { total: 3, awaitingResolution: 2 },
      payouts: { pendingAdminApproval: 4, inFlight: 1 },
      members: { frozenWallets: 0, suspendedWallets: 0 },
      reports: { open: 7 },
      conductReports: { open: 5 },
      queues: {
        disputes: { count: 2, state: "OPEN", oldest: null },
        payouts: { count: 4, state: "OPEN", oldest: null },
        reports: { count: 3, state: "OPEN", oldest: null },
        conductReports: { count: 2, state: "OPEN", oldest: null },
      },
    })).toEqual({
      disputes: 2,
      payouts: 4,
      reports: 3,
      conductReports: 2,
    });
  });


});
