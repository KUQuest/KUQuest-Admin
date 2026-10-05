import { describe, expect, it } from "bun:test";

import {
  dashboardActivityFromApi,
  dashboardActivityKey,
} from "../../src/features/admin/dashboard/dashboard-model";

describe("Dashboard Activity Log model", () => {
  it("maps an Activity Log entry to the Overview presentation", () => {
    const activity = dashboardActivityFromApi({
      id: "action-1",
      admin: { id: "admin-1", firstName: "Ari", lastName: "Nicha" },
      action: "QUEST_HIDDEN",
      resourceType: "QUEST",
      resourceId: "quest-1",
      reasonCode: "POLICY_REVIEW",
      reasonCatalogVersion: 1,
      resultVersion: 2,
      resultTimestamp: "2026-09-08T08:00:00.000Z",
      createdAt: "2026-09-08T08:00:00.000Z",
    }, "QST-1");

    expect(activity).toMatchObject({
      id: "action-1",
      actor: "AN",
      timestamp: Date.parse("2026-09-08T08:00:00.000Z"),
    });
    expect(activity.title).toBeTruthy();
    expect(activity.detail).toContain("QST-1");
  });

  it("preserves distinct Activity Log identities when display fields are identical", () => {
    const activities = ["action-1", "action-2"].map((id) => dashboardActivityFromApi({
      id,
      admin: { id: "admin-1", firstName: "Ari", lastName: "Nicha" },
      action: "DISPUTE_CASE_EVIDENCE_ACCESS",
      resourceType: "DISPUTE_CASE",
      resourceId: "case-1",
      reasonCode: null,
      reasonCatalogVersion: 1,
      resultVersion: null,
      resultTimestamp: null,
      createdAt: "2026-09-08T08:00:00.000Z",
    }));

    expect(activities.map((entry) => entry.id)).toEqual(["action-1", "action-2"]);
    expect(activities.map((entry, index) => dashboardActivityKey(entry, index))).toEqual([
      "activity-action-1",
      "activity-action-2",
    ]);
  });

  it("keeps older Activity items renderable after a hot reload", () => {
    const olderActivity = {
      actor: "YA",
      title: "DISPUTE_CASE_EVIDENCE_ACCESS",
      detail: "DISPUTE_CASE · case-1",
      timestamp: 1789209639002,
    } as Parameters<typeof dashboardActivityKey>[0];

    expect(dashboardActivityKey(olderActivity, 1)).toBe(
      "activity-1789209639002-YA-DISPUTE_CASE_EVIDENCE_ACCESS-DISPUTE_CASE · case-1-1",
    );
  });
});
