import { mockWalletFinanceSummary } from "../../src/features/admin/wallet/wallet-mock-data";

const adminOrigin = "http://localhost:3006";
const adminSessionCookieName = "kuquest-admin.session_token";

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

function cookieValue(cookie: string, name: string): string | null {
  const prefix = `${name}=`;
  const part = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return part ? part.slice(prefix.length) : null;
}

function adminApiAuthorizationResponse(cookie: string): Response | null {
  const sessionToken = cookieValue(cookie, adminSessionCookieName);
  if (sessionToken === "disabled-session") {
    return json({ success: false, error: { code: "FORBIDDEN", message: "Admin is disabled." } }, 403);
  }
  if (sessionToken !== "valid-session") {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin Session required." } }, 401);
  }

  return null;
}

const activityLogItems = [
  {
    id: "activity-1",
    admin: { id: "valid-admin", firstName: "Test", lastName: "Admin" },
    action: "QUEST_HIDDEN",
    resourceType: "QUEST",
    resourceId: "quest-1",
    reasonCode: "POLICY_REVIEW",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-15T00:00:00.000Z",
    createdAt: "2026-09-15T00:00:00.000Z",
  },
  {
    id: "activity-2",
    admin: { id: "valid-admin", firstName: "Test", lastName: "Admin" },
    action: "PAYOUT_APPROVED",
    resourceType: "PAYOUT",
    resourceId: "payout-1",
    reasonCode: "PAYOUT_REVIEWED",
    reasonCatalogVersion: 1,
    resultVersion: 3,
    resultTimestamp: "2026-09-14T00:00:00.000Z",
    createdAt: "2026-09-14T00:00:00.000Z",
  },
  {
    id: "activity-3",
    admin: { id: "valid-admin", firstName: "Test", lastName: "Admin" },
    action: "DISPUTE_CASE_RESOLVED",
    resourceType: "DISPUTE_CASE",
    resourceId: "dispute-1",
    reasonCode: "DISPUTE_POLICY_REVIEW",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-13T00:00:00.000Z",
    createdAt: "2026-09-13T00:00:00.000Z",
  },
];

const server = Bun.serve({
  port: 5002,
  async fetch(request) {
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
      const sessionToken = cookieValue(cookie, adminSessionCookieName);
      if (sessionToken === "disabled-session") {
        return json({ success: false }, 403);
      }
      if (sessionToken !== "valid-session") return json({ success: false }, 401);
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

    if (url.pathname.startsWith("/api/v1/admin/")) {
      const authorizationResponse = adminApiAuthorizationResponse(cookie);
      if (authorizationResponse) return authorizationResponse;
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

    if (url.pathname === "/api/v1/admin/activity-log") {
      const action = url.searchParams.get("action");
      if (action === "ACTIVITY_ERROR") {
        return json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Activity Log is unavailable." } }, 503);
      }
      if (action === "ACTIVITY_SLOW") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const filters = ["action", "resourceType", "resourceId", "adminId"] as const;
      const filteredItems = activityLogItems.filter((item) => action === "ACTIVITY_SLOW" || filters.every((filter) => {
        const value = url.searchParams.get(filter);
        const itemValue = filter === "adminId" ? item.admin.id : item[filter];
        return !value || itemValue.includes(value);
      }));
      filteredItems.sort((left, right) => {
        const direction = url.searchParams.get("sort") === "oldest" ? 1 : -1;
        return direction * (Date.parse(left.createdAt) - Date.parse(right.createdAt));
      });
      const cursor = url.searchParams.get("cursor");
      const items = cursor === "activity-next" ? filteredItems.slice(2) : filteredItems.slice(0, 2);
      return json({
        success: true,
        data: {
          items,
          nextCursor: !cursor && items.length === 2 && filteredItems.length > items.length ? "activity-next" : null,
        },
      });
    }

    return json({ success: false, error: { code: "NOT_FOUND", message: "Admin API route not found." } }, 404);
  },
});

console.log(`Admin security API fixture running at http://localhost:${server.port}`);
