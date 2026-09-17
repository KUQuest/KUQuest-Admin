import { describe, expect, it } from "bun:test";

import {
  loadConductReportsFromMock,
  saveMockConductReportDecision,
} from "../../src/features/admin/conduct-report/conduct-report-adapter";
import { ADMIN_DEMO_DATA_KEY } from "../../src/features/admin/data/legacy-admin-data-adapter";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("Conduct Report mock adapter", () => {
  it("loads only Conduct Reports from the demo collection", () => {
    const page = loadConductReportsFromMock(memoryStorage());

    expect(page.items.map((record) => record.id)).toEqual(["CND-8301", "CND-8302", "CND-8303"]);
    expect(page.items.map((record) => record.status)).toEqual([
      "CONDUCT_REPORT_PENDING",
      "CONDUCT_REPORT_UPHELD",
      "CONDUCT_REPORT_DISMISSED",
    ]);
  });

  it("persists a Conduct Report decision without changing Report Case fields", () => {
    const storage = memoryStorage();
    const updated = saveMockConductReportDecision(
      storage,
      "CND-8301",
      "CONDUCT_REPORT_UPHELD",
      "The Quest record confirms the reported conduct violation.",
    );

    expect(updated).toMatchObject({
      id: "CND-8301",
      status: "CONDUCT_REPORT_UPHELD",
      conductReportStatus: "CONDUCT_REPORT_UPHELD",
      decision: "confirmed-violation",
      decisionReason: "The Quest record confirms the reported conduct violation.",
    });
    expect(updated).not.toHaveProperty("reportCaseStatus");
    expect(loadConductReportsFromMock(storage).items[0]).toMatchObject({
      id: "CND-8301",
      status: "CONDUCT_REPORT_UPHELD",
    });
  });

  it("does not apply a Conduct Report command to a Report Case", () => {
    expect(saveMockConductReportDecision(
      memoryStorage(),
      "RPT-8201",
      "CONDUCT_REPORT_DISMISSED",
      "This command must stay within the Conduct Report boundary.",
    )).toBeNull();
  });

  it("adds the Conduct Report seed to the previous dashboard seed", () => {
    const storage = memoryStorage();
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify({
      version: "dashboard-bootstrap-v2-canonical-statuses",
      collections: {
        users: [{ id: "member-1", title: "Member One" }],
        quests: [],
        payouts: [],
        disputes: [],
        reports: [{ id: "RPT-1", status: "REPORT_CASE_PENDING" }],
      },
    }));

    const firstPage = loadConductReportsFromMock(storage);
    expect(firstPage.items).toHaveLength(3);
    expect(firstPage.nextCursor).toBe("mock-page-2");
    expect(loadConductReportsFromMock(storage, firstPage.nextCursor ?? undefined).items.length).toBeGreaterThan(0);
    expect(JSON.parse(storage.getItem(ADMIN_DEMO_DATA_KEY) ?? "{}").version).toBe(
      "dashboard-bootstrap-v4-expanded-mock-fixtures",
    );
  });
});
