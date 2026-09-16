import { afterEach, describe, expect, it } from "bun:test";

import {
  adminApi,
  subscribeToAdminEvents,
  type AdminEvent,
} from "../../src/features/admin/api/admin-api";
import { ApiError, apiRequest } from "../../src/lib/api/client";

const originalEventSource = globalThis.EventSource;
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  globalThis.fetch = handler as typeof globalThis.fetch;
}

afterEach(() => {
  globalThis.EventSource = originalEventSource;
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Admin API boundary", () => {
  it("unwraps the shared envelope and includes the Admin Session cookie", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          quests: { total: 6, hidden: 1, byState: { QUEST_OPEN: 4, QUEST_COMPLETED: 2 } },
          disputes: { total: 3, awaitingResolution: 1 },
          payouts: { pendingAdminApproval: 2, inFlight: 4 },
          members: { frozenWallets: 1, suspendedWallets: 2 },
        },
      });
    });

    const overview = await adminApi.getOverview();

    expect(overview.quests.total).toBe(6);
    expect(overview.payouts.pendingAdminApproval).toBe(2);
    expect(request?.url).toBe("https://api.example.test/api/v1/admin/overview");
    expect(request?.credentials).toBe("include");
    expect(request?.headers.get("accept")).toBe("application/json");
    expect(request?.headers.get("content-type")).toBeNull();
  });

  it("forwards an explicit Admin cookie for server-scoped Overview reads", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          quests: { total: 0, hidden: 0, byState: {} },
          disputes: { total: 0, awaitingResolution: 0 },
          payouts: { pendingAdminApproval: 0, inFlight: 0 },
          members: { frozenWallets: 0, suspendedWallets: 0 },
        },
      });
    });

    await adminApi.getOverview({ headers: { Cookie: "kuquest-admin=server-session" } });

    expect(request?.headers.get("cookie")).toBe("kuquest-admin=server-session");
  });

  it("forwards an explicit Admin cookie for Report Case reads", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const cookies: Array<string | null> = [];

    mockFetch(async (input, init) => {
      const request = new Request(input, init);
      cookies.push(request.headers.get("cookie"));
      if (request.url.includes("/evidence/")) {
        return jsonResponse({ success: true, data: { evidenceRef: "evidence-1" } });
      }
      if (request.url.endsWith("/reports/report-1")) {
        return jsonResponse({
          success: true,
          data: { id: "report-1", status: "REPORT_CASE_PENDING", reportedMemberId: "member-1" },
        });
      }
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });

    const options = { headers: { Cookie: "kuquest-admin=server-session" } };
    await adminApi.listReports({}, options);
    await adminApi.getReport("report-1", options);
    await adminApi.getEvidence("evidence-1", options);

    expect(cookies).toEqual([
      "kuquest-admin=server-session",
      "kuquest-admin=server-session",
      "kuquest-admin=server-session",
    ]);
  });

  it("coalesces simultaneous Overview requests", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return jsonResponse({
        success: true,
        data: {
          quests: { total: 0, hidden: 0, byState: {} },
          disputes: { total: 0, awaitingResolution: 0 },
          payouts: { pendingAdminApproval: 0, inFlight: 0 },
          members: { frozenWallets: 0, suspendedWallets: 0 },
        },
      });
    });

    const [first, second] = await Promise.all([
      adminApi.getOverview(),
      adminApi.getOverview(),
    ]);

    expect(calls).toBe(1);
    expect(first).toEqual(second);
  });

  it("loads the Member Wallet summary from the Finance Overview API", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          platformBalances: { revenueSatang: 0, suspenseSatang: 0 },
          memberBalancesSummary: {
            totalSpendingSatang: 100,
            totalEarningsSatang: 200,
            totalFundingReservedSatang: 300,
            totalPayoutReservedSatang: 400,
            totalCirculatingSatang: 1000,
          },
          volumeLifetime: {
            totalTopUpDepositedSatang: 0,
            totalPayoutCompletedSatang: 0,
            totalPlatformFeesEarnedSatang: 0,
          },
          integrity: {
            subledgerBalanced: true,
            totalPostingsDiscrepancySatang: 0,
            lastAuditedAt: "2026-09-12T00:00:00.000Z",
          },
        },
      });
    });

    const overview = await adminApi.getFinanceOverview();

    expect(overview.memberBalancesSummary.totalSpendingSatang).toBe(100);
    expect(overview.memberBalancesSummary.totalCirculatingSatang).toBe(1000);
    expect(request?.url).toBe("https://api.example.test/api/v1/admin/finance/overview");
  });

  it("uses the Member and Quest finance detail routes", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const urls: string[] = [];

    mockFetch(async (input, init) => {
      const request = new Request(input, init);
      urls.push(request.url);
      if (request.url.endsWith("/finance/members/member-1")) {
        return jsonResponse({
          success: true,
          data: {
            member: {
              userId: "member-1",
              firstName: "Ari",
              lastName: "Wattanakul",
              studentId: "68000001",
              email: "ari@ku.th",
            },
            wallet: {
              id: "wallet-1",
              walletStatus: "ACTIVE",
              spendingBalanceSatang: 1000,
              earningsBalanceSatang: 2000,
              fundingReservedSatang: 3000,
              reservedForPayoutsSatang: 4000,
              projectionMatchesLedger: true,
            },
            lifetimeStats: {
              totalToppedUpSatang: 5000,
              totalEarnedFromQuestsSatang: 6000,
              totalSpentOnQuestsSatang: 7000,
              totalPaidOutSatang: 8000,
              totalEarningsConvertedSatang: 9000,
            },
            activeFundingReservations: [],
          },
        });
      }
      return jsonResponse({
        success: true,
        data: {
          quest: {
            id: "quest-1",
            title: "Campus survey",
            questStatus: "QUEST_OPEN",
            headcount: 1,
            rewardSatang: 12000,
            platformFeePerWorkerSatang: 240,
            questFundingTotalSatang: 12240,
            hirer: {
              id: "member-1",
              firstName: "Ari",
              lastName: "Wattanakul",
              studentId: "68000001",
            },
          },
          reservation: null,
          transfers: [],
          ledgerTransactions: [],
        },
      });
    });

    const [memberFinance, questFinance] = await Promise.all([
      adminApi.getMemberFinance("member-1"),
      adminApi.getQuestFinance("quest-1"),
    ]);

    expect(memberFinance.wallet?.earningsBalanceSatang).toBe(2000);
    expect(questFinance.quest.platformFeePerWorkerSatang).toBe(240);
    expect(urls).toEqual([
      "https://api.example.test/api/v1/admin/finance/members/member-1",
      "https://api.example.test/api/v1/admin/finance/quests/quest-1",
    ]);
  });

  it("uses the API Server Admin sign-in route", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        redirect: false,
        token: "session-token",
        user: {
          id: "admin-1",
          email: "admin@ku.th",
          firstName: "Nicha",
          lastName: "Prasert",
          disabledAt: null,
        },
      });
    });

    const session = await adminApi.signInEmail("admin@ku.th", "password123");

    expect(session.user.id).toBe("admin-1");
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.example.test/api/admin/auth/sign-in/email");
    expect(await request?.json()).toEqual({
      email: "admin@ku.th",
      password: "password123",
    });
  });

  it("uses the API Server Admin sign-out route", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true });
    });

    await adminApi.signOut();

    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.example.test/api/admin/auth/sign-out");
    expect(request?.credentials).toBe("include");
  });

  it("uses the new singular Activity Log route and filters", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });

    await adminApi.listActivityLogs({
      action: "QUEST_HIDDEN",
      resourceType: "QUEST",
      resourceId: "quest-1",
      adminId: "admin-1",
      limit: 50,
      cursor: "next-page",
      sort: "oldest",
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/activity-log?action=QUEST_HIDDEN&resourceType=QUEST&resourceId=quest-1&adminId=admin-1&limit=50&cursor=next-page&sort=oldest");
  });

  it("uses the Top-up list query and reconcile routes", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];

    mockFetch(async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });

    await adminApi.listTopUps({
      status: "PENDING",
      userId: "member-1",
      limit: 50,
      cursor: "next-page",
    });
    await adminApi.reconcileTopUp("top-up-1");

    expect(requests[0].url).toBe("https://api.example.test/api/v1/admin/top-ups?status=PENDING&userId=member-1&limit=50&cursor=next-page");
    expect(requests[0].method).toBe("GET");
    expect(requests[1].url).toBe("https://api.example.test/api/v1/admin/top-ups/top-up-1/reconcile");
    expect(requests[1].method).toBe("POST");
  });

  it("reads the current Admin session without the shared envelope", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    let requestCache: RequestCache | undefined;

    mockFetch(async (input, init) => {
      requestCache = init?.cache;
      request = new Request(input, init);
      return jsonResponse({
        session: {
          id: "session-1",
          userId: "admin-1",
          expiresAt: "2026-09-03T00:00:00Z",
          createdAt: "2026-09-02T00:00:00Z",
          updatedAt: "2026-09-02T00:00:00Z",
        },
        user: {
          id: "admin-1",
          email: "admin@ku.th",
          firstName: "Nicha",
          lastName: "Prasert",
          disabledAt: null,
        },
      });
    });

    const session = await adminApi.getSession();

    expect(session?.user.email).toBe("admin@ku.th");
    expect(request?.method).toBe("GET");
    expect(request?.url).toBe("https://api.example.test/api/admin/auth/get-session");
    expect(request?.credentials).toBe("include");
    expect(requestCache).toBe("no-store");
  });

  it("sends the Payout cancellation contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { id: "payout-1" } });
    });

    await adminApi.rejectPayout("payout/1", {
      idempotencyKey: "reject-payout-1",
      expectedVersion: 4,
      reasonCode: "PAYOUT_INVALID_DESTINATION",
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/payouts/payout%2F1/cancel");
    expect(request?.headers.get("idempotency-key")).toBe("reject-payout-1");
    expect(request?.headers.get("if-match")).toBe("4");
    expect(await request?.json()).toEqual({
      reasonCode: "PAYOUT_INVALID_DESTINATION",
    });
  });

  it("sends the Payout approval contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { id: "payout-1" } });
    });

    await adminApi.approvePayout("payout-1", {
      idempotencyKey: "approve-payout-1",
      expectedVersion: 4,
      reasonCode: "PAYOUT_RISK_REVIEW",
      note: "Destination and balance were verified.",
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/payouts/payout-1/approve");
    expect(request?.headers.get("idempotency-key")).toBe("approve-payout-1");
    expect(request?.headers.get("if-match")).toBe("4");
    expect(await request?.json()).toEqual({ reasonCode: "PAYOUT_RISK_REVIEW" });
  });

  it("sends the Payout reconciliation command", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { payout: { id: "payout-1" } } });
    });

    await adminApi.reconcilePayout("payout-1");

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/payouts/payout-1/reconcile");
    expect(request?.method).toBe("POST");
  });

  it("uses the Wallet API status command contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { wallet: { walletStatus: "FROZEN" } } });
    });

    await adminApi.setWalletStatus("wallet-1", {
      idempotencyKey: "wallet-status-1",
      status: "FROZEN",
      reason: "Temporary administrative hold.",
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/wallets/wallet-1/status");
    expect(request?.headers.get("idempotency-key")).toBe("wallet-status-1");
    expect(await request?.json()).toEqual({
      toStatus: "FROZEN",
      reason: "Temporary administrative hold.",
    });
  });

  it("uses the API Server Dispute Case resolution contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { id: "case-1" } });
    });

    await adminApi.resolveDispute("case-1", {
      idempotencyKey: "resolve-case-1",
      expectedVersion: 2,
      outcome: "DISPUTE_CASE_RESOLVED",
      reasonCode: "DISPUTE_EVIDENCE_REVIEW",
      workerId: "member-1",
      amountSatang: 12501,
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/disputes/case-1/resolve");
    expect(request?.headers.get("idempotency-key")).toBe("resolve-case-1");
    expect(request?.headers.get("if-match")).toBe("2");
    expect(await request?.json()).toEqual({
      outcome: "DISPUTE_CASE_RESOLVED",
      reasonCode: "DISPUTE_EVIDENCE_REVIEW",
      workerId: "member-1",
      amountSatang: 12501,
    });
  });

  it("uses the API Server Quest command contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          resourceSummary: { id: "quest-1" },
          resourceVersion: 3,
          adminActionId: "action-1",
        },
      });
    });

    await adminApi.hideQuest("quest-1", {
      idempotencyKey: "hide-quest-1",
      expectedVersion: 2,
      reason: "The Quest needs policy review.",
      reasonCode: "POLICY_REVIEW",
    });

    expect(request?.headers.get("idempotency-key")).toBe("hide-quest-1");
    expect(request?.headers.get("if-match")).toBe("2");
    expect(await request?.json()).toEqual({
      reason: "The Quest needs policy review.",
      reasonCode: "POLICY_REVIEW",
    });
  });

  it("preserves the Quest Terminate command contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          resourceSummary: { id: "quest-1" },
          resourceVersion: 3,
          adminActionId: "action-1",
        },
      });
    });

    await adminApi.terminateQuest("quest-1", {
      idempotencyKey: "terminate-quest-1",
      expectedVersion: 2,
      reason: "The Quest violates the safety policy.",
      reasonCode: "SAFETY_REVIEW",
    });

    expect(request?.headers.get("idempotency-key")).toBe("terminate-quest-1");
    expect(request?.headers.get("if-match")).toBe("2");
    expect(await request?.json()).toEqual({
      reason: "The Quest violates the safety policy.",
      reasonCode: "SAFETY_REVIEW",
    });
  });

  it("preserves the Quest Restore command contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          resourceSummary: { id: "quest-1" },
          resourceVersion: 3,
          adminActionId: "action-1",
        },
      });
    });

    await adminApi.restoreQuest("quest-1", {
      idempotencyKey: "restore-quest-1",
      expectedVersion: 2,
      reason: "The Quest is safe after review.",
      reasonCode: "POLICY_REVIEW",
    });

    expect(request?.headers.get("idempotency-key")).toBe("restore-quest-1");
    expect(request?.headers.get("if-match")).toBe("2");
    expect(await request?.json()).toEqual({
      reason: "The Quest is safe after review.",
      reasonCode: "POLICY_REVIEW",
    });
  });

  it("uses the existing Admin Report command boundary for Conduct Reports", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: { id: "CND-1", status: "CONDUCT_REPORT_UPHELD", reportedMemberId: "member-1" },
      });
    });

    await adminApi.decideReport("CND-1", {
      idempotencyKey: "conduct-report-1",
      decision: "CONDUCT_REPORT_UPHELD",
      reason: "The Quest record confirms the violation.",
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/reports/CND-1/decide");
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("idempotency-key")).toBe("conduct-report-1");
    expect(await request?.json()).toEqual({
      decision: "CONDUCT_REPORT_UPHELD",
      reason: "The Quest record confirms the violation.",
    });
  });

  it("maps an API error envelope to ApiError", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    mockFetch(async () => jsonResponse({
      success: false,
      error: {
        code: "PAYOUT_ALREADY_DECIDED",
        message: "This Payout is already decided.",
      },
    }, 409));

    await expect(adminApi.approvePayout("payout-1", {
      idempotencyKey: "approve-payout-1",
      expectedVersion: 2,
      reasonCode: "PAYOUT_POLICY_REVIEW",
    })).rejects.toMatchObject({
      status: 409,
      code: "PAYOUT_ALREADY_DECIDED",
      message: "This Payout is already decided.",
    } satisfies Partial<ApiError>);
  });

  it("rejects a successful response without the shared envelope", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    mockFetch(async () => jsonResponse({ activeDisputes: 1 }));

    await expect(apiRequest("/api/v1/admin/overview")).rejects.toMatchObject({
      status: 200,
    });
  });

  it("maps the Issue 67 resource paths", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const paths: string[] = [];

    mockFetch(async (input, init) => {
      paths.push(new URL(new Request(input, init).url).pathname);
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });

    await adminApi.listActivityLogs();
    await adminApi.listQuests();
    await adminApi.getQuest("quest-1");
    await adminApi.hideQuest("quest-1", { idempotencyKey: "hide-1", expectedVersion: 1, reason: "Policy review.", reasonCode: "POLICY_REVIEW" });
    await adminApi.restoreQuest("quest-1", { idempotencyKey: "restore-1", expectedVersion: 1, reason: "Policy review completed.", reasonCode: "POLICY_REVIEW" });
    await adminApi.terminateQuest("quest-1", { idempotencyKey: "terminate-1", expectedVersion: 1, reason: "Policy violation.", reasonCode: "SAFETY_REVIEW" });
    await adminApi.listDisputes();
    await adminApi.getDispute("case-1");
    await adminApi.openDispute("quest-1", { workerId: "worker-1" });
    await adminApi.resolveDispute("case-1", { idempotencyKey: "resolve-1", expectedVersion: 1, outcome: "DISPUTE_CASE_DISMISSED", reasonCode: "DISPUTE_POLICY_REVIEW" });
    await adminApi.listPayouts();
    await adminApi.getPayout("payout-1");
    await adminApi.getPayoutHistory("payout-1");
    await adminApi.approvePayout("payout-1", { idempotencyKey: "approve-1", expectedVersion: 1, reasonCode: "PAYOUT_POLICY_REVIEW" });
    await adminApi.rejectPayout("payout-1", { idempotencyKey: "reject-1", expectedVersion: 1, reasonCode: "PAYOUT_RISK_REVIEW" });
    await adminApi.reconcilePayout("payout-1");
    await adminApi.retryPayoutProviderEvent("event-1");
    await adminApi.listTopUps({ status: "PENDING", limit: 50, cursor: "top-up-next" });
    await adminApi.reconcileTopUp("top-up-1");
    await adminApi.retryTopUpProviderEvent("top-up-event-1");
    await adminApi.listReports();
    await adminApi.getReport("report-1");
    await adminApi.decideReport("report-1", {
      idempotencyKey: "decide-1",
      decision: "REPORT_CASE_DISMISSED",
      reason: "No confirmed violation.",
    });
    await adminApi.getEvidence("evidence-1");
    await adminApi.listMembers();
    await adminApi.getMember("member-1");
    await adminApi.listWallets();
    await adminApi.getWallet("wallet-1");
    await adminApi.getWalletStatusHistory("wallet-1");
    await adminApi.verifyWalletProjection("wallet-1");
    await adminApi.setWalletStatus("member-1", {
      idempotencyKey: "wallet-1",
      status: "FROZEN",
      reason: "Temporary administrative hold.",
    });
    await adminApi.rebuildWalletProjection("wallet-1");

    expect(paths).toEqual([
      "/api/v1/admin/activity-log",
      "/api/v1/admin/quests",
      "/api/v1/admin/quests/quest-1",
      "/api/v1/admin/quests/quest-1/hide",
      "/api/v1/admin/quests/quest-1/restore",
      "/api/v1/admin/quests/quest-1/terminate",
      "/api/v1/admin/disputes",
      "/api/v1/admin/disputes/case-1",
      "/api/v1/admin/disputes/open/quest-1",
      "/api/v1/admin/disputes/case-1/resolve",
      "/api/v1/admin/payouts",
      "/api/v1/admin/payouts/payout-1",
      "/api/v1/admin/payouts/payout-1/status-history",
      "/api/v1/admin/payouts/payout-1/approve",
      "/api/v1/admin/payouts/payout-1/cancel",
      "/api/v1/admin/payouts/payout-1/reconcile",
      "/api/v1/admin/payouts/events/event-1/retry",
      "/api/v1/admin/top-ups",
      "/api/v1/admin/top-ups/top-up-1/reconcile",
      "/api/v1/admin/top-ups/events/top-up-event-1/retry",
      "/api/v1/admin/reports",
      "/api/v1/admin/reports/report-1",
      "/api/v1/admin/reports/report-1/decide",
      "/api/v1/admin/evidence/evidence-1",
      "/api/v1/admin/members",
      "/api/v1/admin/members/member-1",
      "/api/v1/admin/wallets",
      "/api/v1/admin/wallets/wallet-1",
      "/api/v1/admin/wallets/wallet-1/status-history",
      "/api/v1/admin/wallets/wallet-1/verification",
      "/api/v1/admin/wallets/member-1/status",
      "/api/v1/admin/wallets/wallet-1/rebuild-projection",
    ]);
  });

  it("opens a Dispute Case for an assigned Worker without an idempotency header", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          id: "case-1",
          questId: "quest-1",
          filerUserId: "worker-1",
          openedByAdminId: "admin-1",
          status: "DISPUTE_CASE_PENDING",
          version: 1,
          resolvedWorkerId: null,
          resolvedAmountSatang: null,
          resolvedByAdminId: null,
          resolvedAt: null,
          createdAt: "2026-09-13T01:00:00.000Z",
          updatedAt: "2026-09-13T01:00:00.000Z",
        },
      });
    });

    const result = await adminApi.openDispute("quest-1", { workerId: "worker-1" });

    expect(result.status).toBe("DISPUTE_CASE_PENDING");
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.example.test/api/v1/admin/disputes/open/quest-1");
    expect(request?.headers.get("idempotency-key")).toBeNull();
    expect(await request?.json()).toEqual({ workerId: "worker-1" });
  });

  it("uses the API Member search query name", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });

    await adminApi.listMembers({ search: "youtube@ku.th", limit: 100 });

    expect(new URL(request?.url || "https://api.example.test").search).toBe("?search=youtube%40ku.th&limit=100");
  });

  it("forwards server request options when reading Wallets", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    let requestCache: RequestCache | undefined;
    mockFetch(async (input, init) => {
      requestCache = init?.cache;
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });

    await adminApi.listWallets(
      { status: "FROZEN", search: "member-1", limit: 100 },
      { headers: { Cookie: "kuquest-admin=session" } },
    );

    const url = new URL(request?.url || "https://api.example.test");
    expect(url.pathname).toBe("/api/v1/admin/wallets");
    expect(url.searchParams.get("status")).toBe("FROZEN");
    expect(url.searchParams.get("search")).toBe("member-1");
    expect(request?.headers.get("cookie")).toBe("kuquest-admin=session");
    expect(requestCache).toBe("no-store");
  });

  it("loads Wallet Statement rows through the Finance Ledger endpoint", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });

    await adminApi.listLedgerTransactions({
      walletId: "wallet-1",
      eventType: "TOP_UP",
      from: "2026-09-01",
      to: "2026-09-12",
      limit: 25,
    });

    const url = new URL(request?.url || "https://api.example.test");
    expect(url.pathname).toBe("/api/v1/admin/finance/ledger/transactions");
    expect(url.searchParams.get("walletId")).toBe("wallet-1");
    expect(url.searchParams.get("eventType")).toBe("TOP_UP");
    expect(url.searchParams.get("from")).toBe("2026-09-01");
    expect(url.searchParams.get("to")).toBe("2026-09-12");
    expect(url.searchParams.get("limit")).toBe("25");
  });

  it("loads Dispute Evidence through the case-scoped route", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          caseId: "case-1",
          questId: "quest-1",
          truncated: false,
          quest: {
            id: "quest-1",
            questStatus: "QUEST_FAILED",
            version: 1,
            hirerId: "hirer-1",
            failedAt: null,
          },
          assignments: [],
          proofSubmissions: [],
          adminActionId: "action-1",
        },
      });
    });

    const evidence = await adminApi.getDisputeEvidence("case-1", {
      idempotencyKey: "evidence-read-1",
    });

    expect(evidence.caseId).toBe("case-1");
    expect(request?.method).toBe("GET");
    expect(request?.url).toBe("https://api.example.test/api/v1/admin/disputes/case-1/evidence");
    expect(request?.credentials).toBe("include");
    expect(request?.headers.get("idempotency-key")).toBe("evidence-read-1");
  });

  it("opens one credentialed SSE invalidation stream and parses metadata", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/";

    class FakeEventSource {
      static instance: FakeEventSource;
      readonly listeners = new Map<string, (event: Event) => void>();

      constructor(
        readonly url: string,
        readonly init: EventSourceInit,
      ) {
        FakeEventSource.instance = this;
      }

      addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
      ): void {
        this.listeners.set(type, typeof listener === "function"
          ? listener
          : (event) => listener.handleEvent(event));
      }

      close(): void {}

      emit(type: string, data: unknown): void {
        this.listeners.get(type)?.(new MessageEvent(type, {
          data: JSON.stringify(data),
        }));
      }
    }

    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
    const received: AdminEvent[] = [];
    const subscription = subscribeToAdminEvents((event) => received.push(event));

    FakeEventSource.instance.emit("message", {
      success: true,
      data: { type: "QUEST_UPDATED", subjectId: "quest-1", version: 3 },
    });
    subscription.close();

    expect(FakeEventSource.instance.url).toBe("https://api.example.test/api/v1/admin/events");
    expect(FakeEventSource.instance.init).toEqual({ withCredentials: true });
    expect(received).toEqual([{
      type: "QUEST_UPDATED",
      subjectId: "quest-1",
      version: 3,
    }]);
  });
});
