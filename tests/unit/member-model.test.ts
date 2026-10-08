import { describe, expect, it } from "bun:test";

import type { AdminLedgerTransaction, AdminMemberDetail } from "../../src/features/admin/api/admin-api";
import {
  memberModelFromApi,
  memberTabFrom,
  memberTabHref,
  walletStatementRows,
} from "../../src/features/admin/member/member-model";
import type { MemberApiReadData, MemberCollection } from "../../src/features/admin/member/member-model";

function memberDetail(): AdminMemberDetail {
  return {
    member: {
      id: "member-api-1",
      displayId: "MEM-000001",
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
    displayReference: `LED-${id}`,
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
    }],
  };
}

function unavailableCollection<T>(): MemberCollection<T> {
  return { items: null, totalCount: null, complete: false, error: null };
}

function memberReads(ledger: AdminLedgerTransaction[] = []): MemberApiReadData {
  return {
    walletReadState: { kind: "available", source: "member-detail", warning: null },
    walletId: "wallet-1",
    walletStatus: "FROZEN",
    walletBalances: {
      spendingBalanceSatang: 150,
      earningsBalanceSatang: 0,
      fundingReservedSatang: 0,
      reservedForPayoutsSatang: 0,
    },
    walletProjectionMatchesLedger: true,
    walletStatement: { items: ledger, totalCount: null, complete: true, error: null },
    collections: {
      profileTags: unavailableCollection(),
      workExperiences: unavailableCollection(),
      certificates: unavailableCollection(),
      questHistory: unavailableCollection(),
      reviews: unavailableCollection(),
      reportsReceived: unavailableCollection(),
      reportsSubmitted: unavailableCollection(),
      payouts: unavailableCollection(),
      penaltyHistory: { ...unavailableCollection(), summary: null },
    },
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

  it("maps Member status and keeps unavailable collections distinct from empty collections", () => {
    const model = memberModelFromApi(memberDetail(), memberReads());

    expect(model.memberStatus).toBe("Normal");
    expect(model.walletStatus).toBe("FROZEN");
    expect(model.walletBalances).toMatchObject({ spendingBalanceSatang: 150 });
    expect(model.profileTags).toMatchObject({ items: null, complete: false });
    expect(model.reportsSubmitted).toMatchObject({ items: null, complete: false });
    expect(model.payouts).toMatchObject({ items: null, complete: false });
    expect(model.reviews).toMatchObject({ items: null, complete: false });
    expect(model.questHistory).toMatchObject({ items: null, complete: false });
  });

  it("keeps the current Wallet balance when filtering displayed Ledger rows", () => {
    const model = memberModelFromApi(memberDetail(), memberReads([
      ledgerTransaction("ledger-old", "PAYOUT", "2026-09-01T00:00:00.000Z", 100),
      ledgerTransaction("ledger-new", "TOP_UP", "2026-09-02T00:00:00.000Z", 50),
    ]));

    const rows = walletStatementRows({
      walletId: model.walletId,
      walletBalances: model.walletBalances,
      walletStatement: model.walletStatement.items ?? [],
    }, { eventType: "PAYOUT", from: "2026-09-01", to: "2026-09-01" }, 25);
    expect(rows.map((row) => row.transaction.id)).toEqual(["ledger-old"]);
    expect(rows[0]?.resultingWalletBalanceSatang).toBe(100);
  });
  it("does not show an unbalanced Ledger Transaction as a verified Wallet Statement row", () => {
    const unbalanced = {
      ...ledgerTransaction("ledger-unbalanced", "TOP_UP", "2026-09-03T00:00:00.000Z", 100),
      isBalanced: false,
    };
    const model = memberModelFromApi(memberDetail(), memberReads([unbalanced]));

    const rows = walletStatementRows({
      walletId: model.walletId,
      walletBalances: model.walletBalances,
      walletStatement: model.walletStatement.items ?? [],
    }, { eventType: "", from: "", to: "" }, 25);

    expect(rows).toEqual([]);
  });

  it("keeps the safe Ledger Display Reference on the Member Wallet Statement row", () => {
    const transaction = Object.assign(
      ledgerTransaction("ledger-1", "TOP_UP", "2026-09-03T00:00:00.000Z", 100),
      { displayReference: "LED-000001" },
    );
    const model = memberModelFromApi(memberDetail(), memberReads([transaction]));

    expect(model.walletStatement.items?.[0]?.displayReference).toBe("LED-000001");
  });

});
