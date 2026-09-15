import { describe, expect, it } from "bun:test";
import {
  ADMIN_DEMO_DATA_KEY,
  type BrowserStorage,
} from "../../src/features/admin/data/legacy-admin-data-adapter";
import { recordMemberViolation } from "../../src/features/admin/member/member-adapter";

import type { AdminMemberDetail } from "../../src/features/admin/api/admin-api";
import {
  memberModelFromApi,
  memberModelFromMockRecord,
  memberTabFrom,
  memberTabHref,
  walletStatementRows,
} from "../../src/features/admin/member/member-model";
import type { PersistedAdminData } from "../../src/features/admin/data/admin-records";

function mockData(): PersistedAdminData {
  return {
    version: "test",
    collections: {
      users: [],
      quests: [
        { id: "QST-1", title: "Review campus map", status: "QUEST_COMPLETED", amount: 100 },
      ],
      payouts: [],
      disputes: [],
      reports: [
        {
          id: "RPT-1",
          reportedMemberId: "member-1",
          reporterId: "member-2",
          reporterName: "Reporter",
          category: "Harassment",
          status: "REPORT_CASE_PENDING",
        },
      ],
    },
  };
}

describe("Member route model", () => {
  it("normalizes tabs and uses the canonical Member detail helper", () => {
    expect(memberTabFrom("wallet-statement")).toBe("wallet-statement");
    expect(memberTabFrom("unknown")).toBe("overview");
    expect(memberTabHref("member/1", "wallet-statement")).toBe("/member/member%2F1?tab=wallet-statement");
  });

  it("keeps mock Member profile sections and Wallet Statement filters available", () => {
    const data = mockData();
    data.collections.users.push({
      id: "member-1",
      title: "Ari Member",
      person: "ari@ku.th",
      memberStatus: "Flag",
      walletStatus: "ACTIVE",
      walletSpendingBalanceSatang: 10000,
      walletEarningsBalanceSatang: 5000,
    });
    const model = memberModelFromMockRecord(data.collections.users[0], data);
    expect(model).not.toBeNull();
    expect(model).toMatchObject({
      id: "member-1",
      memberStatus: "Flag",
      walletStatus: "ACTIVE",
    });
    expect(model?.quests[0]?.href).toBe("/quest/QST-1");
    expect(model?.reports[0]?.href).toBe("/report/RPT-1");
    expect(model?.walletStatement).toHaveLength(50);
    expect(walletStatementRows(model!, { eventType: "TOP_UP", from: "", to: "" }, 25)).toHaveLength(11);
  });

  it("keeps the complete Ledger balance when filtering displayed rows", () => {
    const data = mockData();
    data.collections.users.push({
      id: "member-1",
      title: "Ari Member",
      person: "ari@ku.th",
      walletStatus: "ACTIVE",
      walletSpendingBalanceSatang: 150,
      walletEarningsBalanceSatang: 0,
      walletFundingReservedSatang: 0,
      walletReservedForPayoutsSatang: 0,
      walletStatement: [
        {
          id: "ledger-old",
          eventType: "PAYOUT",
          description: "Payout",
          createdAt: "2026-09-01T00:00:00.000Z",
          sealedAt: "2026-09-01T00:00:00.000Z",
          postings: [{ accountType: "SPENDING", walletId: "WAL-member-1", amountSatang: 100 }],
        },
        {
          id: "ledger-new",
          eventType: "TOP_UP",
          description: "Top-up",
          createdAt: "2026-09-02T00:00:00.000Z",
          sealedAt: "2026-09-02T00:00:00.000Z",
          postings: [{ accountType: "SPENDING", walletId: "WAL-member-1", amountSatang: 50 }],
        },
      ],
    });
    const model = memberModelFromMockRecord(data.collections.users[0], data);

    const rows = walletStatementRows(model!, { eventType: "PAYOUT", from: "2026-09-01", to: "2026-09-01" }, 25);

    expect(rows.map((row) => row.transaction.id)).toEqual(["ledger-old"]);
    expect(rows[0]?.resultingWalletBalanceSatang).toBe(100);
  });

  it("uses Ledger Transaction ID order when timestamps are equal", () => {
    const data = mockData();
    data.collections.users.push({
      id: "member-1",
      title: "Ari Member",
      person: "ari@ku.th",
      walletStatus: "ACTIVE",
      walletSpendingBalanceSatang: 150,
      walletEarningsBalanceSatang: 0,
      walletFundingReservedSatang: 0,
      walletReservedForPayoutsSatang: 0,
      walletStatement: [
        {
          id: "ledger-a",
          eventType: "PAYOUT",
          description: "Payout",
          createdAt: "2026-09-01T00:00:00.000Z",
          sealedAt: "2026-09-01T00:00:00.000Z",
          postings: [{ accountType: "SPENDING", walletId: "WAL-member-1", amountSatang: 100 }],
        },
        {
          id: "ledger-b",
          eventType: "TOP_UP",
          description: "Top-up",
          createdAt: "2026-09-01T00:00:00.000Z",
          sealedAt: "2026-09-01T00:00:00.000Z",
          postings: [{ accountType: "SPENDING", walletId: "WAL-member-1", amountSatang: 50 }],
        },
      ],
    });
    const model = memberModelFromMockRecord(data.collections.users[0], data);

    const rows = walletStatementRows(model!, { eventType: "PAYOUT", from: "", to: "" }, 25);

    expect(rows[0]?.resultingWalletBalanceSatang).toBe(100);
  });

  it("does not infer Member penalty status from API Wallet status", () => {
    const detail: AdminMemberDetail = {
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
        bio: "About Ari",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      wallet: {
        id: "wallet-1",
        walletStatus: "FROZEN",
        spendingBalanceSatang: 100,
        earningsBalanceSatang: 200,
        fundingReservedSatang: 300,
        reservedForPayoutsSatang: 400,
        totalBalanceSatang: 1000,
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
    const model = memberModelFromApi(detail);
    expect(model.memberStatus).toBeNull();
    expect(model.walletStatus).toBe("FROZEN");
    expect(model.memberStatusSource).toBe("NOT_PROVIDED_BY_API");
  });
  it("applies PC-12 Red Flag exemptions before the misconduct ladder", () => {
    const data = mockData();
    data.collections.users.push({
      id: "member-exempt",
      title: "Exempt Member",
      person: "exempt@ku.th",
      memberStatus: "Normal",
      walletStatus: "ACTIVE",
      newUserExemptionRemaining: 1,
    });
    const values: Record<string, string> = {
      [ADMIN_DEMO_DATA_KEY]: JSON.stringify(data),
    };
    const storage: BrowserStorage = {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => {
        values[key] = value;
      },
    };
    const result = recordMemberViolation(storage, "member-exempt", "The evidence confirms a policy violation.");
    expect(result?.outcome.exempted).toBe(true);
    expect(result?.outcome.label).toBe("Red Flag exempted");
    expect(result?.model.memberStatus).toBe("Normal");
    expect(result?.model.confirmedViolationCount).toBe(1);
    expect(result?.model.newUserExemptionRemaining).toBe(0);
  });
});
