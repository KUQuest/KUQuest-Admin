import { describe, expect, it } from "bun:test";

import type { AdminTopUpListItem } from "../../src/features/admin/api/admin-api";
import { sortBoardRows } from "../../src/features/admin/data/board-sorting";
import { searchTopUps, topUpMatchesTab, topUpSortValue } from "../../src/features/admin/finance/top-ups-board-model";

function makeTopUp(overrides: Partial<AdminTopUpListItem> = {}): AdminTopUpListItem {
  return {
    id: "TOP-001",
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
    const topUp = makeTopUp();

    expect(searchTopUps([topUp], "top-001")).toEqual([topUp]);
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
});
