import { describe, expect, it } from "bun:test";

import { decisionActivityFromResponse, decisionActivityStateFromQuery } from "../../src/features/admin/activity-log/activity-log-query";

const actions = ["REPORT_CASE_DISMISS", "REPORT_CASE_HIDE", "REPORT_CASE_RESTORE"];

function activity(overrides: Record<string, unknown> = {}) {
  return {
    activityDisplayId: "ACT-000042",
    admin: { firstName: "Mali", lastName: "Admin" },
    action: "REPORT_CASE_HIDE",
    resourceType: "report_case",
    resourceDisplayId: "RPT-000042",
    beforeState: "REPORT_CASE_PENDING",
    afterState: "REPORT_CASE_HIDDEN",
    reasonCode: "REPORT_SPAM_CONFIRMED",
    decisionReasonText: "The Message contains repeated unsolicited links.",
    reasonCatalogVersion: 2,
    resultVersion: 3,
    resultTimestamp: "2026-10-08T08:00:00.000Z",
    createdAt: "2026-10-08T08:00:00.000Z",
    ...overrides,
  };
}

describe("Admin decision Activity readback", () => {
  it("keeps loading and unavailable requests separate from empty results", () => {
    expect(decisionActivityStateFromQuery({ isPending: true, isError: false })).toEqual({ kind: "loading" });
    expect(decisionActivityStateFromQuery({ isPending: false, isError: true })).toEqual({ kind: "unavailable" });
    expect(decisionActivityStateFromQuery({ isPending: false, isError: false, data: { kind: "empty" } })).toEqual({ kind: "empty" });
  });

  it("maps a matching Admin Action and its optional note", () => {
    expect(decisionActivityFromResponse({ items: [activity()] }, "report_case", actions)).toEqual({
      kind: "found",
      entry: {
        action: "REPORT_CASE_HIDE",
        reasonCode: "REPORT_SPAM_CONFIRMED",
        decisionReasonText: "The Message contains repeated unsolicited links.",
        adminName: "Mali Admin",
      },
    });
  });

  it("keeps a returned null note separate from an invalid response", () => {
    expect(decisionActivityFromResponse({
      items: [activity({ reasonCode: null, decisionReasonText: null })],
    }, "report_case", actions)).toMatchObject({
      kind: "found",
      entry: { reasonCode: null, decisionReasonText: null },
    });
    expect(decisionActivityFromResponse({ items: [] }, "report_case", actions)).toEqual({ kind: "empty" });
    expect(decisionActivityFromResponse({ items: [activity({ decisionReasonText: undefined })] }, "report_case", actions)).toEqual({ kind: "invalid" });
    expect(decisionActivityFromResponse(null, "report_case", actions)).toEqual({ kind: "invalid" });
  });

  it("does not use an unrelated action or resource type", () => {
    expect(decisionActivityFromResponse({
      items: [activity({ action: "REPORT_CASE_EVIDENCE_ACCESS" })],
    }, "report_case", actions)).toEqual({ kind: "empty" });
    expect(decisionActivityFromResponse({
      items: [activity({ resourceType: "conduct_report" })],
    }, "report_case", actions)).toEqual({ kind: "empty" });
  });

  it("selects the latest matching outcome when the API returns separate action pages", () => {
    expect(decisionActivityFromResponse({
      items: [
        activity({ action: "REPORT_CASE_HIDE", createdAt: "2026-10-08T08:00:00.000Z" }),
        activity({ action: "REPORT_CASE_RESTORE", createdAt: "2026-10-08T09:00:00.000Z", reasonCode: "REPORT_NEW_EVIDENCE_OVERTURNS_HIDE" }),
      ],
    }, "report_case", actions)).toMatchObject({
      kind: "found",
      entry: { action: "REPORT_CASE_RESTORE", reasonCode: "REPORT_NEW_EVIDENCE_OVERTURNS_HIDE" },
    });
  });
});
