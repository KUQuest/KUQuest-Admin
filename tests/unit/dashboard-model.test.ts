import { describe, expect, it } from "bun:test";

import type { PersistedAdminData } from "../../src/features/admin/data/admin-records";
import { dashboardModel } from "../../src/features/admin/dashboard/dashboard-model";

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
});
