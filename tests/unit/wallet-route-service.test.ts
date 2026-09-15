import { afterEach, describe, expect, it } from "bun:test";

import { mockWalletDetails, mockWallets } from "../../src/features/admin/wallet/wallet-mock-data";
import {
  loadWalletBoardPageData,
  loadWalletDrawerData,
  loadWalletStatementPageData,
  verifyWalletProjection,
} from "../../src/features/admin/wallet/wallet-service";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Wallet route service boundary", () => {
  it("loads mock Wallet rows without a browser or API read", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return jsonResponse({ success: true, data: null });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadWalletBoardPageData(undefined, "mock");

    expect(calls).toBe(0);
    expect(result.rows.map((row) => row.id)).toEqual([
      "WAL-1001",
      "WAL-1002",
      "WAL-1003",
      "WAL-1004",
      "WAL-1005",
    ]);
    expect(result.dataSource).toBe("mock");
  });

  it("reads Wallet rows and Finance Overview through the Admin API with the server cookie", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/wallets") {
        return jsonResponse({
          success: true,
          data: url.searchParams.has("cursor")
            ? { items: [mockWallets[1]], nextCursor: null }
            : { items: [mockWallets[0]], nextCursor: "wallet-next" },
        });
      }

      return jsonResponse({
        success: true,
        data: {
          memberBalancesSummary: {
            totalSpendingSatang: 10,
            totalEarningsSatang: 20,
            totalFundingReservedSatang: 30,
            totalPayoutReservedSatang: 40,
            totalCirculatingSatang: 100,
          },
        },
      });
    }) as typeof globalThis.fetch;

    const result = await loadWalletBoardPageData("kuquest-admin=session", "api");

    expect(result.rows.map((row) => row.id)).toEqual(["WAL-1001"]);
    if (result.remainingRows) {
      const remaining = await result.remainingRows;
      expect(remaining.rows.map((row) => row.id)).toEqual(["WAL-1002"]);
      expect(remaining.error).toBeNull();
    }
    expect(result.summary?.totalCirculatingSatang).toBe(100);
    expect(result.dataSource).toBe("api");
    expect(requests).toHaveLength(3);
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
    expect(requests.every((request) => request.cache === "no-store")).toBe(true);
    const walletRequests = requests.filter((request) => new URL(request.url).pathname === "/api/v1/admin/wallets");
    expect(walletRequests).toHaveLength(2);
    expect(walletRequests.every((request) => new URL(request.url).searchParams.get("limit") === "50")).toBe(true);
    expect(requests.some((request) => new URL(request.url).searchParams.get("cursor") === "wallet-next")).toBe(true);
  });

  it("loads Wallet drawer data through the service with the server cookie", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/wallets/WAL-1001") {
        return jsonResponse({ success: true, data: { wallet: mockWalletDetails[0] } });
      }
      if (url.pathname === "/api/v1/admin/wallets/WAL-1001/status-history") {
        return jsonResponse({ success: true, data: { history: [] } });
      }
      return jsonResponse({
        success: true,
        data: {
          items: [{
            id: "ledger-1001",
            businessReference: "TOPUP-1001",
            eventType: "TOP_UP",
            description: "Wallet top-up",
            createdByUserId: null,
            correctionOfTransactionId: null,
            createdAt: "2026-09-12T08:30:00.000Z",
            sealedAt: "2026-09-12T08:30:01.000Z",
            isBalanced: true,
            postings: [{
              id: "posting-1001",
              accountId: "wallet-account-1001",
              accountType: "SPENDING",
              walletId: "WAL-1001",
              amountSatang: 100,
              member: null,
            }],
          }],
          nextCursor: null,
        },
      });
    }) as typeof globalThis.fetch;

    const result = await loadWalletDrawerData("WAL-1001", "kuquest-admin=session", "api");

    expect(result.detail.id).toBe("WAL-1001");
    expect(result.history).toEqual([]);
    expect(result.ledger[0]?.businessReference).toBe("TOPUP-1001");
    expect(requests).toHaveLength(3);
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
    expect(requests.every((request) => request.cache === "no-store")).toBe(true);
  });

  it("loads every Ledger page for the full Wallet Statement", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/wallets") {
        return jsonResponse({ success: true, data: { items: [mockWallets[0]], nextCursor: null } });
      }
      if (url.searchParams.get("cursor") === "ledger-next") {
        return jsonResponse({
          success: true,
          data: {
            items: [{
              id: "ledger-1002",
              businessReference: "PAYOUT-1001",
              eventType: "PAYOUT",
              description: "Wallet payout",
              createdByUserId: null,
              correctionOfTransactionId: null,
              createdAt: "2026-09-11T08:30:00.000Z",
              sealedAt: "2026-09-11T08:30:01.000Z",
              isBalanced: true,
              postings: [{
                id: "posting-1002",
                accountId: "wallet-account-1001",
                accountType: "EARNINGS",
                walletId: "WAL-1001",
                amountSatang: -50,
                member: null,
              }],
            }],
            nextCursor: null,
          },
        });
      }
      return jsonResponse({
        success: true,
        data: {
          items: [{
            id: "ledger-1001",
            businessReference: "TOPUP-1001",
            eventType: "TOP_UP",
            description: "Wallet top-up",
            createdByUserId: null,
            correctionOfTransactionId: null,
            createdAt: "2026-09-12T08:30:00.000Z",
            sealedAt: "2026-09-12T08:30:01.000Z",
            isBalanced: true,
            postings: [{
              id: "posting-1001",
              accountId: "wallet-account-1001",
              accountType: "SPENDING",
              walletId: "WAL-1001",
              amountSatang: 100,
              member: null,
            }],
          }],
          nextCursor: "ledger-next",
        },
      });
    }) as typeof globalThis.fetch;

    const result = await loadWalletStatementPageData("68000000", "kuquest-admin=session", "api");

    expect(result.wallet.id).toBe("WAL-1001");
    expect(result.ledger.map((transaction) => transaction.id)).toEqual([
      "ledger-1001",
      "ledger-1002",
    ]);
    const ledgerRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"));
    expect(ledgerRequests).toHaveLength(2);
    expect(ledgerRequests[0]?.url).toContain("walletId=WAL-1001");
    expect(ledgerRequests[0]?.url).toContain("limit=50");
    expect(ledgerRequests[1]?.url).toContain("cursor=ledger-next");
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
    expect(requests.every((request) => request.cache === "no-store")).toBe(true);
  });

  it("loads Wallet verification through the service with the server cookie", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return jsonResponse({
        success: true,
        data: {
          matches: false,
          activityCountMatches: true,
          projected: { spendingBalanceSatang: 100, earningsBalanceSatang: 200, fundingReservedSatang: 0, reservedForPayoutsSatang: 0 },
          ledger: { spendingBalanceSatang: 90, earningsBalanceSatang: 200, fundingReservedSatang: 0, reservedForPayoutsSatang: 0 },
        },
      });
    }) as typeof globalThis.fetch;

    const result = await verifyWalletProjection("WAL-1001", "kuquest-admin=session", "api");

    expect(result).toEqual({ matches: false, activityCountMatches: true, projectedTotal: 300, ledgerTotal: 290 });
    expect(requests[0]?.headers.get("cookie")).toBe("kuquest-admin=session");
    expect(requests[0]?.cache).toBe("no-store");
  });

  it("returns the first Wallet page while later pages load in the background", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let releaseMorePage!: (response: Response) => void;
    const morePage = new Promise<Response>((resolve) => { releaseMorePage = resolve; });
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/wallets") {
        if (url.searchParams.get("cursor") === "wallet-next") return morePage;
        return jsonResponse({
          success: true,
          data: { items: [mockWallets[0]], nextCursor: "wallet-next" },
        });
      }

      return jsonResponse({
        success: true,
        data: { memberBalancesSummary: { totalSpendingSatang: 10, totalEarningsSatang: 20, totalFundingReservedSatang: 30, totalPayoutReservedSatang: 40, totalCirculatingSatang: 100 } },
      });
    }) as typeof globalThis.fetch;

    const resultPromise = loadWalletBoardPageData("kuquest-admin=session", "api");
    try {
      const result = await Promise.race([
        resultPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("First Wallet page did not render before the next page.")), 100)),
      ]);

      expect(result.rows.map((row) => row.id)).toEqual(["WAL-1001"]);
      expect(result.remainingRows).not.toBeNull();

      releaseMorePage(jsonResponse({ success: true, data: { items: [mockWallets[1]], nextCursor: null } }));
      await expect(result.remainingRows).resolves.toEqual({
        rows: expect.arrayContaining([expect.objectContaining({ id: "WAL-1002" })]),
        error: null,
      });
    } finally {
      releaseMorePage(jsonResponse({ success: true, data: { items: [], nextCursor: null } }));
      await resultPromise.catch(() => undefined);
    }
  });

  it("returns an error when a later Wallet page cannot load", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/wallets") {
        if (url.searchParams.get("cursor") === "wallet-next") {
          return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Wallet page unavailable" } }, 503);
        }
        return jsonResponse({ success: true, data: { items: [mockWallets[0]], nextCursor: "wallet-next" } });
      }

      return jsonResponse({
        success: true,
        data: { memberBalancesSummary: { totalSpendingSatang: 10, totalEarningsSatang: 20, totalFundingReservedSatang: 30, totalPayoutReservedSatang: 40, totalCirculatingSatang: 100 } },
      });
    }) as typeof globalThis.fetch;

    const result = await loadWalletBoardPageData("kuquest-admin=session", "api");
    if (!result.remainingRows) throw new Error("Expected a background Wallet page request.");

    await expect(result.remainingRows).resolves.toEqual({ rows: [], error: "Some Wallet records could not be loaded." });
  });

  it("keeps the Wallet board when the optional Finance Overview read fails", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      if (new URL(request.url).pathname === "/api/v1/admin/wallets") {
        return jsonResponse({ success: true, data: { items: [mockWallets[0]], nextCursor: null } });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const result = await loadWalletBoardPageData(undefined, "api");

    expect(result.rows).toHaveLength(1);
    expect(result.summary).toBeNull();
    expect(result.summaryError).toBe("Wallet summary is not available.");
  });

  it("keeps a recoverable Wallet board when the first page read fails", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (new URL(String(input)).pathname === "/api/v1/admin/wallets") {
        return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Wallets unavailable" } }, 503);
      }
      return jsonResponse({
        success: true,
        data: { memberBalancesSummary: { totalSpendingSatang: 10, totalEarningsSatang: 20, totalFundingReservedSatang: 30, totalPayoutReservedSatang: 40, totalCirculatingSatang: 100 } },
      });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadWalletBoardPageData("kuquest-admin=session", "api");

    expect(result.rows).toEqual([]);
    expect(result.remainingRows).toBeNull();
    expect(result.boardError).toBe("Wallet records are not available.");
  });
});
