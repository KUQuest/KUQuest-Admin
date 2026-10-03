import { describe, expect, it } from "bun:test";

import type { AdminTopUpListItem } from "../../src/features/admin/api/admin-api";
import { sortBoardRows } from "../../src/features/admin/data/board-sorting";
import { searchTopUps, topUpMatchesTab, topUpSortValue, topUpStatusTimeline } from "../../src/features/admin/finance/top-ups-board-model";

function makeTopUp(overrides: Partial<AdminTopUpListItem> = {}): AdminTopUpListItem {
  return {
    id: "TOP-001",
    displayId: "TOP-001",
    userId: "member-001",
    member: { firstName: "Ariya", lastName: "Wat", studentId: "650000001" },
    topUpStatus: "PENDING",
    creditAmountSatang: 10000,
    providerFeeSatang: 0,
    providerTaxSatang: 0,
    paymentTotalSatang: 10000,
    paymentMethod: "PROMPTPAY",
    providerReference: "provider-ref-001",
    expiresAt: "2026-10-01T12:00:00.000Z",
    paidAt: null,
    createdAt: "2026-10-01T11:00:00.000Z",
    ...overrides,
  };
}

describe("Top-up board model", () => {
  it("matches All and each Top-up status tab", () => {
    const pending = makeTopUp();
    const paid = makeTopUp({ id: "TOP-002", topUpStatus: "PAID" });

    expect(topUpMatchesTab(pending, "all")).toBe(true);
    expect(topUpMatchesTab(pending, "PENDING")).toBe(true);
    expect(topUpMatchesTab(pending, "PAID")).toBe(false);
    expect(topUpMatchesTab(paid, "PAID")).toBe(true);
  });

  it("searches Top-up ID, Member details, and Provider reference", () => {
    const topUp = makeTopUp({ id: "top-up-uuid-001", displayId: "TOP-001" });

    expect(searchTopUps([topUp], "top-001")).toEqual([topUp]);
    expect(topUpSortValue(topUp, "id")).toBe("TOP-001");
    expect(searchTopUps([topUp], "650000001")).toEqual([topUp]);
    expect(searchTopUps([topUp], "PROVIDER-REF-001")).toEqual([topUp]);
    expect(searchTopUps([topUp], "not-found")).toEqual([]);
  });

  it("sorts credit amounts as numbers", () => {
    const larger = makeTopUp({ id: "TOP-002", creditAmountSatang: 20000 });
    const smaller = makeTopUp({ id: "TOP-001", creditAmountSatang: 10000 });

    const sorted = sortBoardRows([larger, smaller], (topUp) => topUpSortValue(topUp, "creditAmount"), "ascending");

    expect(sorted.map(({ id }) => id)).toEqual(["TOP-001", "TOP-002"]);
  });

  it("shows the initial Pending status and the known Paid status time", () => {
    const paid = makeTopUp({
      topUpStatus: "PAID",
      paidAt: "2026-10-01T11:05:00.000Z",
    });

    expect(topUpStatusTimeline(paid)).toEqual([
      { fromStatus: null, toStatus: "PENDING", occurredAt: paid.createdAt },
      { fromStatus: "PENDING", toStatus: "PAID", occurredAt: paid.paidAt },
    ]);
  });

  it("does not use the quote expiry deadline as a status-change time", () => {
    for (const status of ["EXPIRED", "FAILED"] as const) {
      const topUp = makeTopUp({ topUpStatus: status });

      expect(topUpStatusTimeline(topUp)).toEqual([
        { fromStatus: null, toStatus: "PENDING", occurredAt: topUp.createdAt },
        { fromStatus: "PENDING", toStatus: status, occurredAt: null },
      ]);
    }
  });
});
