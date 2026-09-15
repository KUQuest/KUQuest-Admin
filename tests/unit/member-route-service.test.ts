import { afterEach, describe, expect, it } from "bun:test";

import type {
  AdminLedgerTransaction,
  AdminMemberDetail,
  AdminMemberFinance,
} from "../../src/features/admin/api/admin-api";
import { loadMemberDetailFromApi } from "../../src/features/admin/member/member-service";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const memberDetail: AdminMemberDetail = {
  member: {
    id: "member-1",
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
    walletStatus: "ACTIVE",
    spendingBalanceSatang: 100,
    earningsBalanceSatang: 200,
    fundingReservedSatang: 300,
    reservedForPayoutsSatang: 400,
    totalBalanceSatang: 1000,
    projectionMatchesLedger: true,
  },
  stats: {
    questsCreatedCount: 0,
    questsCompletedAsWorkerCount: 0,
    reviewsReceivedCount: 0,
    averageRating: null,
    payoutsCount: 0,
    totalEarnedSatang: 0,
    totalPaidOutSatang: 0,
  },
};

const memberFinance: AdminMemberFinance = {
  member: {
    userId: "member-1",
    firstName: "Ari",
    lastName: "Member",
    studentId: "68000001",
    email: "member@ku.th",
  },
  wallet: {
    id: "wallet-1",
    walletStatus: "ACTIVE",
    spendingBalanceSatang: 100,
    earningsBalanceSatang: 200,
    fundingReservedSatang: 300,
    reservedForPayoutsSatang: 400,
    projectionMatchesLedger: true,
  },
  lifetimeStats: {
    totalToppedUpSatang: 0,
    totalEarnedFromQuestsSatang: 0,
    totalSpentOnQuestsSatang: 0,
    totalPaidOutSatang: 0,
    totalEarningsConvertedSatang: 0,
  },
  activeFundingReservations: [],
};

function ledgerTransaction(id: string): AdminLedgerTransaction {
  return {
    id,
    businessReference: id,
    eventType: "TOP_UP",
    description: "Wallet top-up",
    createdByUserId: null,
    correctionOfTransactionId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    sealedAt: "2026-09-01T00:00:01.000Z",
    isBalanced: true,
    postings: [{
      id: `${id}-posting`,
      accountId: "wallet-account-1",
      accountType: "SPENDING",
      walletId: "wallet-1",
      amountSatang: 100,
      member: null,
    }],
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Member detail route service", () => {
  it("loads every Ledger page for the Member Wallet Statement", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/members/member-1") {
        return jsonResponse({ success: true, data: memberDetail });
      }
      if (url.pathname === "/api/v1/admin/finance/members/member-1") {
        return jsonResponse({ success: true, data: memberFinance });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return url.searchParams.get("cursor") === "ledger-next"
          ? jsonResponse({ success: true, data: { items: [ledgerTransaction("ledger-2")], nextCursor: null } })
          : jsonResponse({ success: true, data: { items: [ledgerTransaction("ledger-1")], nextCursor: "ledger-next" } });
      }

      throw new Error(`Unexpected request: ${request.url}`);
    }) as typeof globalThis.fetch;

    const result = await loadMemberDetailFromApi("member-1", "kuquest-admin=session");

    expect(result?.walletStatement.map((transaction) => transaction.id)).toEqual([
      "ledger-1",
      "ledger-2",
    ]);
    const ledgerRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"));
    expect(ledgerRequests).toHaveLength(2);
    expect(ledgerRequests[0]?.url).toContain("walletId=wallet-1");
    expect(ledgerRequests[0]?.url).toContain("limit=50");
    expect(ledgerRequests[1]?.url).toContain("cursor=ledger-next");
  });
});
