import { afterEach, describe, expect, it } from "bun:test";

import { loadMemberDetailFromApi } from "../../src/features/admin/member/member-service";
import { mockWalletDetails } from "../../src/features/admin/wallet/wallet-mock-data";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function ledgerTransaction(id: string, createdAt: string) {
  return {
    id,
    businessReference: `REF-${id}`,
    eventType: "TOP_UP",
    description: "Wallet top-up",
    createdByUserId: null,
    correctionOfTransactionId: null,
    createdAt,
    sealedAt: createdAt,
    isBalanced: true,
    postings: [{
      id: `posting-${id}`,
      accountId: "wallet-account-1001",
      accountType: "SPENDING",
      walletId: "WAL-1001",
      amountSatang: 100,
      member: null,
    }],
  };
}

const memberDetail = {
  member: {
    id: "68000000",
    email: "akarin.a@ku.th",
    firstName: "Akarin",
    lastName: "Ariyawat",
    studentId: "6810000000",
    telephone: null,
    academicYear: 1,
    faculty: null,
    department: null,
    occupation: null,
    bio: null,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  wallet: {
    id: "WAL-1001",
    walletStatus: mockWalletDetails[0]!.walletStatus,
    spendingBalanceSatang: 100,
    earningsBalanceSatang: 0,
    fundingReservedSatang: 0,
    reservedForPayoutsSatang: 0,
    totalBalanceSatang: 100,
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

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Member detail service", () => {
  it("loads every Ledger page for the Member Wallet Statement", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: memberDetail });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return jsonResponse({
          success: true,
          data: url.searchParams.get("cursor") === "ledger-next"
            ? { items: [ledgerTransaction("ledger-1002", "2026-09-11T08:30:00.000Z")], nextCursor: null }
            : { items: [ledgerTransaction("ledger-1001", "2026-09-12T08:30:00.000Z")], nextCursor: "ledger-next" },
        });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000", "kuquest-admin=session");

    expect(model?.walletStatement.map((transaction) => transaction.id)).toEqual(["ledger-1001", "ledger-1002"]);
    expect(model?.walletStatementError).toBeNull();
    const ledgerRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"));
    expect(ledgerRequests).toHaveLength(2);
    expect(ledgerRequests[0]?.url).toContain("walletId=WAL-1001");
    expect(ledgerRequests[1]?.url).toContain("cursor=ledger-next");
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
  });

  it("loads Ledger Transactions from the effective Wallet when detail has no Wallet", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: { ...memberDetail, wallet: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/members/68000000") {
        return jsonResponse({ success: true, data: { wallet: memberDetail.wallet } });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return jsonResponse({
          success: true,
          data: { items: [ledgerTransaction("ledger-from-finance", "2026-09-12T08:30:00.000Z")], nextCursor: null },
        });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Unexpected request" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000", "kuquest-admin=session");

    expect(model?.walletId).toBe("WAL-1001");
    expect(model?.walletStatement.map((transaction) => transaction.id)).toEqual(["ledger-from-finance"]);
    expect(model?.walletStatementError).toBeNull();
    const ledgerRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"));
    expect(ledgerRequests).toHaveLength(1);
    expect(ledgerRequests[0]?.url).toContain("walletId=WAL-1001");
  });
});
