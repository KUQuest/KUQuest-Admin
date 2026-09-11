import { describe, expect, it } from "bun:test";

import type { PersistedAdminData } from "../../src/features/admin/data/admin-records";
import {
  dashboardActivityFromApi,
  dashboardModel,
  dashboardModelFromApi,
} from "../../src/features/admin/dashboard/dashboard-model";

const data: PersistedAdminData = {
  version: "test",
  collections: {
    users: [{ id: "68000000", title: "Akarin Ariyawat", status: "Temp ban", tone: "danger", age: "6 days left" }],
    quests: [{ id: "QST-1", title: "Draft quest", status: "Draft" }, { id: "QST-2", title: "Open quest", status: "Open" }],
    payouts: [{ id: "PAY-1", title: "Akarin Ariyawat", amount: 850, status: "Needs approval", tone: "warning" }],
    disputes: [{ id: "DSP-1", title: "Proof issue", disputeType: "Evidence", amount: 1200, status: "Active", tone: "danger", disputeDate: "27 Aug 2026 · 12:36" }],
    reports: [{ id: "RPT-1", reportedUserName: "Akarin Ariyawat", status: "Active", tone: "warning", reportedAt: "28 Aug 2026 · 08:00" }],
  },
};

describe("dashboard model", () => {
  it("derives review counts, latest decisions, and quest flow from stored records", () => {
    const model = dashboardModel(data, [{ actor: "NP", title: "Review hidden", detail: "RPT-1", timestamp: 1 }]);

    expect(model.totalWorkLeft).toBe(3);
    expect(model.decisions.map((decision) => decision.id)).toEqual(["RPT-1", "DSP-1"]);
    expect(model.questStatusCounts.find((entry) => entry.status === "QUEST_DRAFT")?.count).toBe(1);
    expect(model.payouts[0]?.amount).toBe(850);
    expect(model.payouts[0]?.status).toBe("PENDING_ADMIN_APPROVAL");
    expect(model.users[0]?.status).toBe("FROZEN");
    expect(model.activity).toHaveLength(1);
  });

  it("maps the Admin Overview counters and Activity Log to canonical dashboard data", () => {
    const activity = dashboardActivityFromApi({
      id: "action-1",
      admin: { id: "admin-1", firstName: "YouTube", lastName: "Admin" },
      action: "QUEST_HIDDEN",
      resourceType: "QUEST",
      resourceId: "quest-1",
      reasonCode: "POLICY_REVIEW",
      reasonCatalogVersion: 1,
      resultVersion: 2,
      resultTimestamp: "2026-09-08T08:00:00.000Z",
      createdAt: "2026-09-08T08:00:00.000Z",
    });
    const model = dashboardModelFromApi({
      quests: {
        total: 7,
        hidden: 1,
        byState: {
          QUEST_DRAFT: 1,
          QUEST_AWAITING_CONSENT: 2,
          QUEST_SUBMITTED: 1,
          QUEST_DISPUTED: 1,
          QUEST_COMPLETED: 2,
        },
      },
      disputes: { total: 3, awaitingResolution: 2 },
      payouts: { pendingAdminApproval: 4, inFlight: 1 },
      members: { frozenWallets: 1, suspendedWallets: 1 },
    }, [activity]);

    expect(model.activeDisputes).toBe(2);
    expect(model.payoutsNeedingReview).toBe(4);
    expect(model.totalWorkLeft).toBe(6);
    expect(model.openReports).toBeNull();
    expect(model.summaryOnly).toBe(true);
    expect(model.questStatusCounts.find((entry) => entry.status === "QUEST_ASSIGNED")?.count).toBe(2);
    expect(model.questStatusCounts.find((entry) => entry.status === "QUEST_IN_PROGRESS")?.count).toBe(1);
    expect(model.questStatusCounts.find((entry) => entry.status === "QUEST_FAILED")?.count).toBe(1);
    expect(model.activity[0]).toEqual(activity);
  });

  it("uses mock Dispute Cases when the Admin API has no Dispute Case resource", () => {
    const model = dashboardModelFromApi({
      quests: { total: 7, hidden: 1, byState: {} },
      disputes: { total: 0, awaitingResolution: 0 },
      payouts: { pendingAdminApproval: 4, inFlight: 1 },
      members: { frozenWallets: 1, suspendedWallets: 1 },
    }, [], dashboardModel(data));

    expect(model.activeDisputes).toBe(1);
    expect(model.decisions.map((decision) => decision.id)).toEqual(["DSP-1"]);
    expect(model.totalWorkLeft).toBe(5);
  });
});
