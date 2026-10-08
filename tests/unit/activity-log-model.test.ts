import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import type { AdminActivityLog } from "../../src/features/admin/api/admin-api";
import {
  activityLogCsv,
  activityLogActionLabel,
  activityLogEntryKeys,
  activityLogTargetLabel,
  activityLogReasonLabel,
  activityLogResourceTypeLabel,
  activityLogEntryFromApi,
  activityLogEntryMatchesFilters,
  activityLogMatchesSearch,
  activityTargetHref,
  type ActivityLogEntry,
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
  it("does not render rows with missing or repeated React keys", () => {
    const entries: Pick<ActivityLogEntry, "activityDisplayId" | "id">[] = [
      { activityDisplayId: undefined, id: undefined },
      { activityDisplayId: undefined, id: undefined },
      { activityDisplayId: "ACT-000001", id: "action-1" },
      { activityDisplayId: "ACT-000001", id: "action-1" },
    ];
    const keys = activityLogEntryKeys(entries);
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => errors.push(args.map(String).join(" "));

    try {
      renderToString(createElement("table", null, createElement(
        "tbody",
        null,
        keys.map((key) => createElement("tr", { key })),
      )));
    } finally {
      console.error = originalError;
    }

    expect(new Set(keys).size).toBe(entries.length);
    expect(errors).toEqual([]);
  });

  it("keeps the API audit fields and derives the Admin display identity", () => {
    expect(activityLogEntryFromApi(entry)).toEqual({
      ...entry,
      adminId: "admin-1",
      adminName: "YouTube Admin",
      adminInitials: "YA",
      createdAtTimestamp: Date.parse(entry.createdAt),
    });
  });

  it("preserves an API decision note and keeps legacy entries without one", () => {
    const note = "Decision note returned by the Admin API.";
    const notedEntry = activityLogEntryFromApi({ ...entry, note });

    expect(notedEntry.note).toBe(note);
    expect(activityLogEntryFromApi(entry).note).toBeUndefined();
  });

  it("formats the API timestamp and keeps a relative time for scanning", () => {
    expect(formatActivityLogTimestamp(entry.createdAt)).toBe("08 Sep 2026 15:00");
    expect(formatActivityLogRelativeTime(entry.createdAt, Date.parse("2026-09-08T10:00:00.000Z"))).toBe("2 hours ago");
  });

  it("searches the API values and links only supported Admin records", () => {
    const view = activityLogEntryFromApi(entry);

    expect(activityLogMatchesSearch(view, "policy_review")).toBe(true);
    expect(activityLogMatchesSearch(view, "YouTube Admin")).toBe(true);
    expect(activityLogMatchesSearch(view, "admin-1")).toBe(false);
    expect(activityLogMatchesSearch(view, "result-timestamp")).toBe(false);
    expect(activityLogMatchesSearch(view, "2026-09-08T08:00:00.000Z")).toBe(true);
    expect(activityLogMatchesSearch(view, "missing-value")).toBe(false);
    expect(activityTargetHref(view.resourceType, view.resourceId)).toBe("/quest/quest-1");
    expect(activityTargetHref("PAYOUT", "payout-1")).toBe("/payout/payout-1");
    expect(activityTargetHref("CONDUCT_REPORT", "CND-8301")).toBe("/conduct-report/CND-8301");
    expect(activityTargetHref("WALLET", "WLT-68000000")).toBe("/wallet");
    expect(activityTargetHref("UNKNOWN", "record-1")).toBeNull();
  });
  it("keeps invalid timestamps safe and treats a blank search as a match", () => {
    const view = activityLogEntryFromApi({ ...entry, createdAt: "not-a-date" });

    expect(view.createdAtTimestamp).toBeNull();
    expect(formatActivityLogTimestamp("not-a-date")).toBe("Not provided");
    expect(formatActivityLogRelativeTime(null)).toBe("Not provided");
    expect(activityLogMatchesSearch(view, "   ")).toBe(true);
  });

  it("builds target labels for complete, partial, and empty resources", () => {
    const view = activityLogEntryFromApi(entry);

    expect(activityLogTargetLabel(view)).toBe("Quest · quest-1");
    expect(activityLogTargetLabel({ ...view, resourceType: "", resourceId: "record-1" })).toBe("record-1");
    expect(activityLogTargetLabel({ ...view, resourceType: "", resourceId: "" })).toBe("");
  });

  it("normalises machine enum values for the Admin display without changing API values", () => {
    expect(activityLogActionLabel("DISPUTE_CASE_RESOLVED")).toBe("Dispute Case Resolved");
    expect(activityLogReasonLabel("EVIDENCE_REVIEWED")).toBe("Evidence Reviewed");
    expect(activityLogResourceTypeLabel("CONDUCT_REPORT")).toBe("Conduct Report");
    expect(activityLogActionLabel(null)).toBe("Not provided");
  });

  it("exports quoted CSV cells and neutralizes formula-leading values", () => {
    const view = activityLogEntryFromApi({
      ...entry,
      action: 'EXPORT, "quoted"',
      reasonCode: "=UNSAFE(A1)",
    });
    const csv = activityLogCsv([view]);

    expect(csv.split("\r\n")[0]).toBe(
      '"id","createdAt","adminId","adminName","action","resourceType","resourceId","target","reasonCode","reasonCatalogVersion","resultVersion","resultTimestamp","note"',
    );
    expect(csv).toContain('"EXPORT, ""quoted"""');
    expect(csv).toContain('"\'=UNSAFE(A1)"');
  });

});
