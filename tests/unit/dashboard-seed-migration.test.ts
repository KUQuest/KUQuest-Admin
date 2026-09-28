import { describe, expect, it } from "bun:test";

import { migrateDashboardData } from "../../src/features/admin/dashboard/dashboard-seed-migration";
import type { PersistedAdminData } from "../../src/features/admin/data/admin-records";

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
  };
}

function emptyData(
  dispute: Record<string, unknown>,
  quests: Record<string, unknown>[] = [],
  users: Array<{ id: string; title: string }> = [],
): PersistedAdminData {
  return {
    version: "legacy",
    collections: {
      users,
      quests,
      payouts: [],
      disputes: [dispute],
      reports: [],
    },
  };
}

describe("dashboard mock seed migration", () => {
  it("repairs legacy Dispute Case party fields from existing Quest and Worker data", () => {
    const browserStorage = storage();
    const migrated = migrateDashboardData(browserStorage, emptyData({
      id: "DSP-5203",
      status: "DISPUTE_CASE_RESOLVED",
      quest: { hirerId: "68000102" },
      resolvedWorkerId: "68000103",
      hirer: { name: "Demo Member 03" },
      worker: { name: "Demo Member 04" },
    }), {
      dashboardSeedVersion: "current",
      previousDashboardSeedVersion: "previous",
      previousCanonicalDashboardSeedVersion: "older",
      dashboardConductReportSeedData: [],
      dashboardDisputeSeedData: [],
      dashboardSeedData: {
        version: "current",
        collections: { users: [], quests: [], payouts: [], disputes: [], reports: [] },
      },
    });

    expect(migrated.collections.disputes[0]).toMatchObject({
      filerUserId: "68000102",
      filerName: "Demo Member 03",
      respondentUserId: "68000103",
      respondentName: "Demo Member 04",
    });
  });

  it("repairs legacy party fields from a related Quest and legacy member labels", () => {
    const browserStorage = storage();
    const migrated = migrateDashboardData(browserStorage, emptyData({
      id: "DSP-5203",
      questId: "QST-12003",
      status: "DISPUTE_CASE_RESOLVED",
      person: "Demo Member 03",
      other: "Demo Member 04",
      workerId: "68000103",
    }, [
      { id: "QST-12003", person: "Demo Member 03", memberId: "68000102" },
    ], [
      { id: "68000102", title: "Demo Member 03" },
      { id: "68000103", title: "Demo Member 04" },
    ]), {
      dashboardSeedVersion: "current",
      previousDashboardSeedVersion: "previous",
      previousCanonicalDashboardSeedVersion: "older",
      dashboardConductReportSeedData: [],
      dashboardDisputeSeedData: [],
      dashboardSeedData: {
        version: "current",
        collections: { users: [], quests: [], payouts: [], disputes: [], reports: [] },
      },
    });

    expect(migrated.collections.disputes[0]).toMatchObject({
      filerUserId: "68000102",
      filerName: "Demo Member 03",
      respondentUserId: "68000103",
      respondentName: "Demo Member 04",
    });
  });
});
