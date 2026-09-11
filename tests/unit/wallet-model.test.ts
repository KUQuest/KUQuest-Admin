import { describe, expect, it } from "bun:test";

import {
  currentWalletBalance,
  filterWalletStatementTransactions,
  latestWalletTransactionDate,
  totalWalletFunds,
  walletStatementRows,
  type WalletStatementTransaction,
} from "../../src/features/admin/legacy/wallet-model";

const walletBalances = {
  spendingBalanceSatang: 14000,
  earningsBalanceSatang: 2000,
  fundingReservedSatang: 3000,
  reservedForPayoutsSatang: 1000,
};

function transaction(
  id: string,
  createdAt: string,
  postings: WalletStatementTransaction["postings"] = [],
  sealedAt: string | null = createdAt,
): WalletStatementTransaction {
  return {
    id,
    eventType: "TOP_UP",
    description: null,
    createdAt,
    sealedAt,
    postings,
  };
}

describe("Wallet model", () => {
  it("sums all four Wallet compartments for Current Wallet Balance", () => {
    expect(currentWalletBalance(walletBalances)).toBe(20000);
  });

  it("sums Current Wallet Balance across Wallet statuses", () => {
    expect(totalWalletFunds([
      walletBalances,
      {
        spendingBalanceSatang: 500,
        earningsBalanceSatang: 0,
        fundingReservedSatang: 0,
        reservedForPayoutsSatang: 0,
      },
    ])).toBe(20500);
  });

  it("returns only sealed transactions newest first with resulting balances", () => {
    const rows = walletStatementRows(
      [
        transaction("tx-old", "2026-09-01T01:00:00.000Z", [
          { accountType: "SPENDING", walletId: "wallet-1", amountSatang: 2000 },
          { accountType: "EARNINGS", walletId: "wallet-1", amountSatang: -2000 },
        ]),
        transaction("tx-new", "2026-09-02T01:00:00.000Z", [
          { accountType: "SPENDING", walletId: "wallet-1", amountSatang: 5000 },
        ]),
        transaction("tx-unsealed", "2026-09-03T01:00:00.000Z", [
          { accountType: "SPENDING", walletId: "wallet-1", amountSatang: 9000 },
        ], null),
      ],
      "wallet-1",
      walletBalances,
    );

    expect(rows.map((row) => row.transaction.id)).toEqual(["tx-new", "tx-old"]);
    expect(rows[0].signedAmountSatang).toBe(5000);
    expect(rows[0].resultingBalances).toEqual(walletBalances);
    expect(rows[1].movement).toEqual([
      { accountType: "SPENDING", amountSatang: 2000 },
      { accountType: "EARNINGS", amountSatang: -2000 },
    ]);
    expect(rows[1].resultingBalances).toEqual({
      spendingBalanceSatang: 9000,
      earningsBalanceSatang: 2000,
      fundingReservedSatang: 3000,
      reservedForPayoutsSatang: 1000,
    });
  });

  it("filters Statement transactions by event type and inclusive ICT date range", () => {
    const transactions = [
      transaction("tx-1", "2026-09-01T16:59:59.000Z", [], "2026-09-01T16:59:59.000Z"),
      { ...transaction("tx-2", "2026-09-02T01:00:00.000Z", []), eventType: "PAYOUT" },
      transaction("tx-3", "2026-09-03T01:00:00.000Z", []),
    ];

    expect(filterWalletStatementTransactions(transactions, {
      eventType: "PAYOUT",
      from: "2026-09-02",
      to: "2026-09-02",
    }).map((item) => item.id)).toEqual(["tx-2"]);
  });

  it("finds the newest sealed Ledger Transaction date", () => {
    expect(latestWalletTransactionDate([
      transaction("tx-1", "2026-09-01T01:00:00.000Z"),
      transaction("tx-2", "2026-09-03T01:00:00.000Z"),
      transaction("tx-open", "2026-09-05T01:00:00.000Z", [], null),
    ])).toBe("2026-09-03T01:00:00.000Z");
  });
});
