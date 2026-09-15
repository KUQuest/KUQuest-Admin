import { mockWalletFinanceSummary } from "../../src/features/admin/wallet/wallet-mock-data";

const adminOrigin = "http://localhost:3006";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": adminOrigin,
      "content-type": "application/json",
    },
  });
}

const server = Bun.serve({
  port: 5002,
  fetch(request) {
    const url = new URL(request.url);
    const cookie = request.headers.get("cookie") ?? "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-origin": adminOrigin,
        },
      });
    }

    if (url.pathname === "/health") return json({ ok: true });

    if (url.pathname === "/api/admin/auth/get-session") {
      if (cookie.includes("invalid-session")) return json({ success: false }, 401);
      if (!cookie.includes("kuquest-admin")) return json({ success: false }, 401);
      if (cookie.includes("disabled-session")) {
        return json({ success: false }, 403);
      }
      return json({
        session: { id: "valid-session", userId: "valid-admin" },
        user: {
          id: "valid-admin",
          email: "admin@ku.th",
          firstName: "Test",
          lastName: "Admin",
          disabledAt: null,
        },
      });
    }

    if (url.pathname === "/api/v1/admin/overview") {
      return json({
        success: true,
        data: {
          quests: { total: 0, hidden: 0, byState: {} },
          disputes: { total: 0, awaitingResolution: 0 },
          payouts: { pendingAdminApproval: 0, inFlight: 0 },
          members: { frozenWallets: 0, suspendedWallets: 0 },
        },
      });
    }

    if (url.pathname === "/api/v1/admin/finance/overview") {
      return json({
        success: true,
        data: {
          memberBalancesSummary: mockWalletFinanceSummary,
          platformBalances: { revenueSatang: 0, suspenseSatang: 0 },
          volumeLifetime: {
            totalTopUpDepositedSatang: 0,
            totalPayoutCompletedSatang: 0,
            totalPlatformFeesEarnedSatang: 0,
          },
          integrity: {
            subledgerBalanced: true,
            totalPostingsDiscrepancySatang: 0,
            lastAuditedAt: "2026-09-15T00:00:00.000Z",
          },
        },
      });
    }

    if (url.pathname === "/api/v1/admin/wallets") {
      return json({ success: true, data: { items: [], nextCursor: null } });
    }

    return json({ success: true, data: {} });
  },
});

console.log(`Admin security API fixture running at http://localhost:${server.port}`);
