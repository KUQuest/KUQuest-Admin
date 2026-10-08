import { describe, expect, it } from "bun:test";

import { adminWalletFixtures } from "../fixtures/admin-wallet-api-fixtures";
import {
  pageWalletRows,
  searchWalletRows,
  sortWalletRows,
  walletMatchesTab,
  walletDetailFromApi,
  walletHistoryFromApi,
  walletLedgerRowsFromApi,
  walletRowFromApi,
  walletSummaryFromApi,
  walletEventTypeLabel,
  walletBusinessReferenceLabel,
  walletCompartmentLabel,
  formatWalletMovementAmount,
} from "../../src/features/admin/wallet/wallet-model";

describe("Wallet route model", () => {
  it("shows readable labels for Wallet Statement event types", () => {
    expect(walletEventTypeLabel("TOP_UP")).toBe("Top-up");
    expect(walletEventTypeLabel("FUNDING_RESERVE")).toBe("Funding Reserve");
    expect(walletEventTypeLabel("EARNINGS_CONVERSION")).toBe("Earnings Conversion");
    expect(walletEventTypeLabel("NEW_EVENT_TYPE")).toBe("New Event Type");
  });

  it("shows Wallet Statement business references without underscores", () => {
    expect(walletBusinessReferenceLabel("TOP_UP-1")).toBe("TOP UP-1");
    expect(walletBusinessReferenceLabel("PAYOUT-WAL-1001-01")).toBe("PAYOUT-WAL-1001-01");
  });

  it("shows Wallet Statement compartments with readable labels", () => {
    expect(walletCompartmentLabel("SPENDING")).toBe("Spending Balance");
    expect(walletCompartmentLabel("EARNINGS")).toBe("Earnings Balance");
    expect(walletCompartmentLabel("FUNDING_RESERVED")).toBe("Funding Reserved");
    expect(walletCompartmentLabel("RESERVED_FOR_PAYOUTS")).toBe("Reserved For Payouts");
    expect(walletCompartmentLabel("NEW_COMPARTMENT")).toBe("New Compartment");
  });

  it("shows a sign before each Wallet Statement compartment movement amount", () => {
    expect(formatWalletMovementAmount(1125)).toBe("+฿11.25");
    expect(formatWalletMovementAmount(-1125)).toBe("-฿11.25");
  });

  it("maps Wallet DTOs to a separate view model and keeps the API balance", () => {
    const wallet = {
      ...adminWalletFixtures[0],
      balances: {
        ...adminWalletFixtures[0].balances,
        totalBalanceSatang: 12345,
      },
    };

    const row = walletRowFromApi(wallet);

    expect(row).toMatchObject({
      id: "WAL-1001",
      displayId: "WAL-1001",
      memberId: "68000000",
      memberName: "Akarin Ariyawat",
      status: "FROZEN",
      statusLabel: "Frozen",
      currentBalanceSatang: 12345,
    });
    expect(row).not.toHaveProperty("walletStatus");
    expect(row).not.toHaveProperty("memberStatus");
  });

  it("keeps Wallet rows usable when the API omits the Member association", () => {
    const wallet = {
      ...adminWalletFixtures[0],
      id: "WAL-MISSING-MEMBER",
      userId: "member-orphan",
      member: null,
    } as unknown as Parameters<typeof walletRowFromApi>[0];

    expect(walletRowFromApi(wallet)).toMatchObject({
      id: "WAL-MISSING-MEMBER",
      memberId: "member-orphan",
      memberAvailable: false,
      memberName: "Member not provided",
      studentId: null,
      email: "Email not provided",
    });
  });

  it("keeps Wallet status tabs separate from Member status values", () => {
    const rows = adminWalletFixtures.map(walletRowFromApi);
    const frozen = rows.filter((row) => walletMatchesTab(row, "FROZEN"));

    expect(frozen.map((row) => row.status)).toEqual(["FROZEN"]);
    expect(rows.map((row) => row.statusLabel)).toEqual([
      "Frozen",
      "Active",
      "Suspended",
      "Closed",
      "Active",
    ]);
  });

  it("searches Wallet and Member identifiers and paginates sorted rows", () => {
    const rows = adminWalletFixtures.map(walletRowFromApi);
    const searched = searchWalletRows(rows, "68000040");
    const sorted = sortWalletRows(rows, "balance", "descending");

    expect(searched.map((row) => row.id)).toEqual(["WAL-1003"]);
    expect(sortWalletRows(rows, null, "ascending").map((row) => row.id)).toEqual(rows.map((row) => row.id));
    expect(sorted[0]?.id).toBe("WAL-1005");
    expect(pageWalletRows(sorted, 2, 2).map((row) => row.id)).toEqual(["WAL-1001", "WAL-1003"]);
  });

  it("copies Finance Overview summary values without calculating them", () => {
    const summary = walletSummaryFromApi({
      totalSpendingSatang: 1,
      totalEarningsSatang: 2,
      totalFundingReservedSatang: 3,
      totalPayoutReservedSatang: 4,
      totalCirculatingSatang: 999,
    });

    expect(summary).toEqual({
      totalSpendingSatang: 1,
      totalEarningsSatang: 2,
      totalFundingReservedSatang: 3,
      totalPayoutReservedSatang: 4,
      totalCirculatingSatang: 999,
    });
  });

  it("maps Wallet drawer detail, history, and sealed Ledger Transactions", () => {
    const wallet = {
      ...adminWalletFixtures[0],
      projectionMatchesLedger: false,
    };
    const detail = walletDetailFromApi(wallet);
    const history = walletHistoryFromApi([{
      id: "history-1",
      walletId: wallet.id,
      fromStatus: "ACTIVE",
      toStatus: "FROZEN",
      reason: "Risk review",
      actorUserId: null,
      actorAdminId: "admin-1",
      actorDisplayName: "Nicha P.",
      createdAt: "2026-09-12T08:30:00.000Z",
    }]);
    expect(history[0]?.actorDisplayName).toBe("Nicha P.");
    const ledger = walletLedgerRowsFromApi([{
      id: "ledger-1",
      displayReference: "LED-000001",
      businessReference: "TOPUP-1",
      eventType: "TOP_UP",
      description: "Wallet credit",
      createdByUserId: null,
      correctionOfTransactionId: null,
      createdAt: "2026-09-12T08:30:00.000Z",
      sealedAt: "2026-09-12T08:31:00.000Z",
      isBalanced: true,
        postings: [
          { id: "posting-1", accountId: "account-1", accountType: "SPENDING", walletId: wallet.id, amountSatang: 5000, member: null },
          { id: "posting-2", accountId: "account-2", accountType: "PLATFORM_REVENUE", walletId: wallet.id, amountSatang: 400, member: null },
          { id: "posting-3", accountId: "account-3", accountType: "PLATFORM_REVENUE", walletId: null, amountSatang: -5000, member: null },
      ],
    }, {
      id: "ledger-2",
      displayReference: "LED-000002",
      businessReference: "OPEN-1",
      eventType: "TOP_UP",
      description: null,
      createdByUserId: null,
      correctionOfTransactionId: null,
      createdAt: "2026-09-12T08:32:00.000Z",
      sealedAt: null,
      isBalanced: true,
      postings: [],
    }, {
      id: "ledger-0",
      displayReference: "LED-000000",
      businessReference: "OLD-1",
      eventType: "TOP_UP",
      description: "Older Wallet credit",
      createdByUserId: null,
      correctionOfTransactionId: null,
      createdAt: "2026-09-11T08:32:00.000Z",
      sealedAt: "2026-09-11T08:33:00.000Z",
      isBalanced: true,
      postings: [{ id: "posting-0", accountId: "account-0", accountType: "EARNINGS", walletId: wallet.id, amountSatang: 100, member: null }],
    }], wallet.id, wallet.balances);

    expect(detail.projectionMatchesLedger).toBe(false);
    expect(history[0]).toMatchObject({ fromStatus: "ACTIVE", toStatus: "FROZEN", reason: "Risk review" });
    expect(ledger.map((item) => item.id)).toEqual(["ledger-1", "ledger-0"]);
    expect(ledger[0]).toEqual(expect.objectContaining({
      id: "ledger-1",
      amountSatang: 5000,
      movement: [{ accountType: "SPENDING", amountSatang: 5000 }],
      resultingBalanceSatang: wallet.balances.totalBalanceSatang,
    }));
  });
});
