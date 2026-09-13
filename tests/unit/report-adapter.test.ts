import { describe, expect, it } from "bun:test";

import {
  loadReportCasesFromMock,
  saveMockReportDecision,
} from "../../src/features/admin/report/report-adapter";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("Report Case mock adapter", () => {
  it("loads only Report Cases from the demo collection", () => {
    const page = loadReportCasesFromMock(memoryStorage());

    expect(page.items.map((record) => record.id)).toEqual(["RPT-8201", "RPT-8202"]);
    expect(page.items.every((record) => record.reportCaseStatus === "REPORT_CASE_PENDING")).toBe(true);
  });

  it("persists the Report Case reason and canonical command status", () => {
    const storage = memoryStorage();
    const updated = saveMockReportDecision(
      storage,
      "RPT-8201",
      "REPORT_CASE_HIDDEN",
      "The evidence confirms a policy violation.",
    );

    expect(updated).toMatchObject({
      id: "RPT-8201",
      status: "REPORT_CASE_HIDDEN",
      reportCaseStatus: "REPORT_CASE_HIDDEN",
      decision: "confirmed-violation",
      decisionReason: "The evidence confirms a policy violation.",
    });
    expect(loadReportCasesFromMock(storage).items[0]).toMatchObject({
      id: "RPT-8201",
      status: "REPORT_CASE_HIDDEN",
    });
  });
});
