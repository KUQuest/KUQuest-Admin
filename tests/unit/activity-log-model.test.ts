import { describe, expect, it } from "bun:test";

import type { AdminActivityLog } from "../../src/features/admin/api/admin-api";
import {
  activityLogEntryFromApi,
  activityLogMatchesSearch,
  activityTargetHref,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
} from "../../src/features/admin/activity-log/activity-log-model";

const entry: AdminActivityLog = {
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
};

describe("Activity Log model", () => {
  it("keeps the API audit fields and derives the Admin display identity", () => {
    expect(activityLogEntryFromApi(entry)).toEqual({
      ...entry,
      adminId: "admin-1",
      adminName: "YouTube Admin",
      adminInitials: "YA",
      createdAtTimestamp: Date.parse(entry.createdAt),
    });
  });

  it("formats the API timestamp in ICT and keeps a relative time for scanning", () => {
    expect(formatActivityLogTimestamp(entry.createdAt)).toBe("08 Sep 2026, 15:00 ICT");
    expect(formatActivityLogRelativeTime(entry.createdAt, Date.parse("2026-09-08T10:00:00.000Z"))).toBe("2 hours ago");
  });

  it("searches the API values and links only supported Admin records", () => {
    const view = activityLogEntryFromApi(entry);

    expect(activityLogMatchesSearch(view, "policy_review")).toBe(true);
    expect(activityLogMatchesSearch(view, "admin-1")).toBe(true);
    expect(activityLogMatchesSearch(view, "result-timestamp")).toBe(false);
    expect(activityLogMatchesSearch(view, "2026-09-08T08:00:00.000Z")).toBe(true);
    expect(activityLogMatchesSearch(view, "missing-value")).toBe(false);
    expect(activityTargetHref(view.resourceType, view.resourceId)).toBe("/quests/quest-1");
    expect(activityTargetHref("UNKNOWN", "record-1")).toBeNull();
  });
});
