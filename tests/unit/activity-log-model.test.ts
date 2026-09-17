import { describe, expect, it } from "bun:test";

import type { AdminActivityLog } from "../../src/features/admin/api/admin-api";
import {
  activityLogCsv,
  activityLogActionLabel,
  activityLogTargetLabel,
  activityLogReasonLabel,
  activityLogResourceTypeLabel,
  activityLogStateLabel,
  activityLogEntryFromApi,
  activityLogFixtures,
  activityLogFixturePageData,
  activityLogEntryMatchesFilters,
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
    expect(activityLogStateLabel("REPORT_CASE_PENDING")).toBe("Report Case Pending");
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
      '"id","createdAt","adminId","adminName","action","resourceType","resourceId","target","reasonCode","reasonCatalogVersion","resultVersion","resultTimestamp","previousState","newState","note"',
    );
    expect(csv).toContain('"EXPORT, ""quoted"""');
    expect(csv).toContain('"\'=UNSAFE(A1)"');
  });

  it("provides mock before and after state for the Activity Log workflow", () => {
    const page = activityLogFixturePageData();
    const reportEntry = page.items.find((item) => item.resourceType === "REPORT_CASE");

    expect(reportEntry).toMatchObject({
      previousState: "REPORT_CASE_PENDING",
      newState: "REPORT_CASE_HIDDEN",
    });
    if (!reportEntry) throw new Error("The mock Activity Log must include a Report Case entry.");
    expect(activityLogEntryMatchesFilters(reportEntry, {
      action: "REPORT_CASE",
      resourceType: "REPORT_CASE",
      resourceId: "RPT-8201",
      adminId: "admin-supansa",
      fromDate: "2026-09-15",
      toDate: "2026-09-15",
      sort: "newest",
    })).toBe(true);
  });

  it("provides a deterministic mock collection large enough to exercise board pagination", () => {
    const first = activityLogFixtures();
    const second = activityLogFixtures();

    expect(first).toHaveLength(200);
    expect(new Set(first.map((item) => item.id)).size).toBe(200);
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(first.map((item) => item.createdAt)).toEqual(second.map((item) => item.createdAt));
  });

  it("keeps mock cursor pages deterministic until all Activity Log fixtures are loaded", () => {
    const ids: string[] = [];
    let cursor: string | undefined;

    do {
      const page = activityLogFixturePageData(undefined, cursor);
      ids.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    expect(ids).toHaveLength(200);
    expect(new Set(ids).size).toBe(200);
    expect(ids[0]).toBe("ACT-9006");
    expect(ids.at(-1)).toBe("ACT-8807");
  });
});
