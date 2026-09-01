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
          activeDisputes: 1,
          payoutsNeedingReview: 2,
          openReports: 3,
          totalWorkLeft: 6,
          questStateCounts: {},
        },
      });
    });

    const overview = await adminApi.getOverview();

    expect(overview.totalWorkLeft).toBe(6);
    expect(request?.url).toBe("https://api.example.test/api/v1/admin/overview");
    expect(request?.credentials).toBe("include");
    expect(request?.headers.get("accept")).toBe("application/json");
    expect(request?.headers.get("content-type")).toBeNull();
  });

  it("uses the Issue 67 Admin sign-in route", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          authAdmin: {
            id: "admin-1",
            email: "admin@ku.th",
            firstName: "Nicha",
            lastName: "Prasert",
            disabledAt: null,
          },
          session: { id: "session-1", expiresAt: "2026-09-02T00:00:00Z" },
        },
      });
    });

    const session = await adminApi.signInEmail("admin@ku.th", "password123");

    expect(session.authAdmin.id).toBe("admin-1");
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.example.test/api/auth/admin/sign-in/email");
    expect(await request?.json()).toEqual({
      email: "admin@ku.th",
      password: "password123",
    });
  });

  it("sends command identity in the header and leaves the reason in the body", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { id: "payout-1" } });
    });

    await adminApi.rejectPayout("payout/1", {
      idempotencyKey: "reject-payout-1",
      expectedVersion: 4,
      reason: "The destination details could not be verified.",
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/payouts/payout%2F1/reject");
    expect(request?.headers.get("idempotency-key")).toBe("reject-payout-1");
    expect(await request?.json()).toEqual({
      expectedVersion: 4,
      reason: "The destination details could not be verified.",
    });
  });

  it("uses Satang allocations for Dispute resolution", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    mockFetch(async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { id: "case-1" } });
    });

    await adminApi.resolveDispute("quest-1", {
      idempotencyKey: "resolve-case-1",
      expectedVersion: 2,
      outcome: "RELEASE_TO_WORKER",
      reason: "The accepted evidence supports the worker.",
      allocations: [{ workerId: "member-1", amountSatang: 12501 }],
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/quests/quest-1/dispute/resolve");
    expect(request?.headers.get("idempotency-key")).toBe("resolve-case-1");
    expect(await request?.json()).toEqual({
      expectedVersion: 2,
      outcome: "RELEASE_TO_WORKER",
      reason: "The accepted evidence supports the worker.",
      allocations: [{ workerId: "member-1", amountSatang: 12501 }],
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
    await adminApi.hideQuest("quest-1", { idempotencyKey: "hide-1", reason: "Policy review." });
    await adminApi.restoreQuest("quest-1", { idempotencyKey: "restore-1" });
    await adminApi.terminateQuest("quest-1", { idempotencyKey: "terminate-1", reason: "Policy violation." });
    await adminApi.listDisputes();
    await adminApi.getDispute("case-1");
    await adminApi.resolveDispute("quest-1", { idempotencyKey: "resolve-1", outcome: "REFUND_HIRER", reason: "The evidence supports a refund." });
    await adminApi.listPayouts();
    await adminApi.getPayout("payout-1");
    await adminApi.getPayoutHistory("payout-1");
    await adminApi.approvePayout("payout-1", { idempotencyKey: "approve-1" });
    await adminApi.rejectPayout("payout-1", { idempotencyKey: "reject-1", reason: "Not valid." });
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
    await adminApi.setWalletStatus("member-1", {
      idempotencyKey: "wallet-1",
      status: "FROZEN",
      reason: "Temporary administrative hold.",
    });

    expect(paths).toEqual([
      "/api/v1/admin/activity-logs",
      "/api/v1/admin/quests",
      "/api/v1/admin/quests/quest-1",
      "/api/v1/admin/quests/quest-1/hide",
      "/api/v1/admin/quests/quest-1/restore",
      "/api/v1/admin/quests/quest-1/terminate",
      "/api/v1/admin/disputes",
      "/api/v1/admin/disputes/case-1",
      "/api/v1/admin/quests/quest-1/dispute/resolve",
      "/api/v1/admin/payouts",
      "/api/v1/admin/payouts/payout-1",
      "/api/v1/admin/payouts/payout-1/status-history",
      "/api/v1/admin/payouts/payout-1/approve",
      "/api/v1/admin/payouts/payout-1/reject",
      "/api/v1/admin/reports",
      "/api/v1/admin/reports/report-1",
      "/api/v1/admin/reports/report-1/decide",
      "/api/v1/admin/evidence/evidence-1",
      "/api/v1/admin/members",
      "/api/v1/admin/members/member-1",
      "/api/v1/admin/wallets/member-1/status",
    ]);
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
