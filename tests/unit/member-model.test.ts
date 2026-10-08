import { describe, expect, it } from "bun:test";

import type { AdminLedgerTransaction, AdminMemberDetail, AdminMemberFinance, AdminMemberListItem } from "../../src/features/admin/api/admin-api";
import { pendingPayoutApiFixture } from "../fixtures/admin-payout-api-fixtures";
import {
  memberListModelFromApi,
  memberModelFromApi,
  memberTabFrom,
  memberTabHref,
  walletStatementRows,
} from "../../src/features/admin/member/member-model";

function memberDetail(): AdminMemberDetail {
  return {
    member: {
      id: "member-api-1",
      email: "member@ku.th",
      firstName: "Ari",
      lastName: "Member",
      studentId: "68000001",
      telephone: null,
      academicYear: 2,
      faculty: "Engineering",
      department: "Computer Engineering",
      occupation: "Student",
      memberStatus: "NORMAL",
      bio: "About Ari",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    wallet: {
      id: "wallet-1",
      walletStatus: "FROZEN",
      spendingBalanceSatang: 150,
      earningsBalanceSatang: 0,
      fundingReservedSatang: 0,
      reservedForPayoutsSatang: 0,
      totalBalanceSatang: 150,
      projectionMatchesLedger: true,
    },
    stats: {
      questsCreatedCount: 1,
      questsCompletedAsWorkerCount: 2,
      reviewsReceivedCount: 3,
      averageRating: 4.5,
      payoutsCount: 1,
      totalEarnedSatang: 200,
      totalPaidOutSatang: 100,
    },
  };
}

function ledgerTransaction(id: string, eventType: "PAYOUT" | "TOP_UP", createdAt: string, amountSatang: number): AdminLedgerTransaction {
  return {
    id,
    businessReference: `${eventType}-${id}`,
    eventType,
    description: eventType,
    createdByUserId: null,
    correctionOfTransactionId: null,
    createdAt,
    sealedAt: createdAt,
    isBalanced: true,
    postings: [{
      id: `${id}-posting`,
      accountId: "spending-account",
      accountType: "SPENDING",
      walletId: "wallet-1",
      amountSatang,
      member: null,
    }, {
      id: `${id}-platform-posting`,
      accountId: "platform-account",
      accountType: "PLATFORM_SUSPENSE",
      walletId: null,
      amountSatang: -amountSatang,
      member: null,
    }],
  };
}

describe("Member route model", () => {
  it("normalizes tabs and uses the canonical Member detail helper", () => {
    expect(memberTabFrom("top-ups")).toBe("top-ups");
    expect(memberTabFrom("wallet-statement")).toBe("wallet-statement");
    expect(memberTabFrom("unknown")).toBe("overview");
    expect(memberTabHref("member-1", "top-ups")).toBe("/member/member-1?tab=top-ups");
    expect(memberTabHref("member/1", "wallet-statement")).toBe("/member/member%2F1?tab=wallet-statement");
  });

  it("uses Admin API Member and Wallet status as separate values", () => {
    const model = memberModelFromApi(memberDetail());
    expect(model.memberStatus).toBe("Normal");
    expect(model.walletStatus).toBe("FROZEN");
    expect(model.walletBalances).toMatchObject({ spendingBalanceSatang: 150 });
    expect(model.confirmedViolationCount).toBeNull();
    expect(model.reportsSubmitted).toBeNull();
    expect(model.reportsSubmittedError).toBe("Reports submitted are not available.");
    expect(model.reportsComplete).toBe(false);
    expect(model.payouts).toBeNull();
    expect(model.reviews).toBeNull();
    expect(model.quests).toBeNull();
  });

  it("keeps the full Ledger balance when filtering displayed rows", () => {
    const model = memberModelFromApi(memberDetail(), null, [], [
      ledgerTransaction("ledger-old", "PAYOUT", "2026-09-01T00:00:00.000Z", 100),
      ledgerTransaction("ledger-new", "TOP_UP", "2026-09-02T00:00:00.000Z", 50),
    ]);

    const rows = walletStatementRows(model, { eventType: "PAYOUT", from: "2026-09-01", to: "2026-09-01" }, 25);
    expect(rows.map((row) => row.transaction.id)).toEqual(["ledger-old"]);
    expect(rows[0]?.resultingWalletBalanceSatang).toBe(100);
  });

  it("does not replace a successful null Finance Wallet with Member detail data", () => {
    const finance: AdminMemberFinance = {
      member: { userId: "member-api-1", firstName: "Ari", lastName: "Member", studentId: "68000001", email: "member@ku.th" },
      wallet: null,
      lifetimeStats: {
        totalToppedUpSatang: 0,
        totalEarnedFromQuestsSatang: 0,
        totalSpentOnQuestsSatang: 0,
        totalPaidOutSatang: 0,
        totalEarningsConvertedSatang: 0,
      },
      activeFundingReservations: [],
    };

    const model = memberModelFromApi(memberDetail(), finance);

    expect(model.walletId).toBeNull();
    expect(model.walletBalances).toBeNull();
    expect(model.walletState).toBe("unverified");
  });

  it("does not infer missing Wallet compartments from the Member list summary", () => {
    const detail = memberDetail();
    const listItem: AdminMemberListItem = {
      ...detail.member,
      wallet: {
        id: "wallet-1",
        walletStatus: "ACTIVE",
        spendingBalanceSatang: 150,
        earningsBalanceSatang: 0,
        totalBalanceSatang: 150,
      },
    };

    const model = memberListModelFromApi(listItem);

    expect(model.walletBalances).toBeNull();
    expect(model.walletState).toBe("unverified");
    expect(model.walletSource).toBe("member-list");
  });

  it("compares complete Payout history with the successful Payout count", () => {
    const payout = { ...pendingPayoutApiFixture, payoutStatus: "SUCCEEDED" as const };
    const matchingDetail = memberDetail();
    matchingDetail.stats.payoutsCount = 1;
    const matching = memberModelFromApi(matchingDetail, null, [], [], {
      payouts: [payout],
      payoutsComplete: true,
    });
    const conflictingDetail = memberDetail();
    conflictingDetail.stats.payoutsCount = 0;
    const conflict = memberModelFromApi(conflictingDetail, null, [], [], {
      payouts: [payout],
      payoutsComplete: true,
    });
    const partial = memberModelFromApi(memberDetail(), null, [], [], {
      payouts: [payout],
      payoutsComplete: false,
    });

    expect(matching.payoutSuccessfulCountMatchesHistory).toBe(true);
    expect(conflict.payoutSuccessfulCountMatchesHistory).toBe(false);
    expect(partial.payoutSuccessfulCountMatchesHistory).toBeNull();
  });
});
