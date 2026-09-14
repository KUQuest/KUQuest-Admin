import { mockWalletFinanceSummary, mockWallets } from "../../src/features/admin/wallet/wallet-mock-data";

const apiOrigin = "http://localhost:3004";
const initialWalletFailure = process.env.WALLET_FIXTURE_INITIAL_ERROR === "1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": apiOrigin,
      "content-type": "application/json",
    },
  });
}

const server = Bun.serve({
  port: 5001,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, {
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-origin": apiOrigin,
      },
    });
    if (url.pathname === "/health") return json({ ok: true });
    if (url.pathname === "/api/admin/auth/get-session") {
      return json({
        session: {
          id: "test-session",
          userId: "test-admin",
          expiresAt: "2027-01-01T00:00:00.000Z",
          createdAt: "2026-09-14T00:00:00.000Z",
          updatedAt: "2026-09-14T00:00:00.000Z",
        },
        user: {
          id: "test-admin",
          email: "admin@ku.th",
          firstName: "Test",
          lastName: "Admin",
          disabledAt: null,
        },
      });
    }
    if (url.pathname === "/api/v1/admin/overview") {
      return json({ success: true, data: {
        quests: { total: 0, hidden: 0, byState: {} },
        disputes: { total: 0, awaitingResolution: 0 },
        payouts: { pendingAdminApproval: 0, inFlight: 0 },
        members: { frozenWallets: 0, suspendedWallets: 0 },
      } });
    }
    if (url.pathname === "/api/v1/admin/finance/overview") {
      return json({ success: true, data: {
        memberBalancesSummary: mockWalletFinanceSummary,
        platformBalances: { revenueSatang: 0, suspenseSatang: 0 },
        volumeLifetime: { totalTopUpDepositedSatang: 0, totalPayoutCompletedSatang: 0, totalPlatformFeesEarnedSatang: 0 },
        integrity: { subledgerBalanced: true, totalPostingsDiscrepancySatang: 0, lastAuditedAt: "2026-09-14T00:00:00.000Z" },
      } });
    }
    if (url.pathname === "/api/v1/admin/wallets") {
      if (url.searchParams.has("cursor")) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return json({ success: false, error: { code: "UNAVAILABLE", message: "Wallet page unavailable" } }, 503);
      }
      if (initialWalletFailure) return json({ success: false, error: { code: "UNAVAILABLE", message: "Wallets unavailable" } }, 503);
      return json({ success: true, data: { items: [mockWallets[0]], nextCursor: "wallet-next" } });
    }
    return json({ success: true, data: {} });
  },
});
