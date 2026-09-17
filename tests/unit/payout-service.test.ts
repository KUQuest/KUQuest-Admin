import { afterEach, describe, expect, it } from "bun:test";

import {
  mockPendingPayout,
} from "../../src/features/admin/payout/payout-mock-data";
import {
  loadPayoutBoardPageData,
  loadPayoutDetailPageData,
} from "../../src/features/admin/payout/payout-service";
import {
  applyMockPayoutDecision,
  applyMockPayoutOverride,
  payoutMockOverrideFromDetail,
  readMockPayoutOverride,
  saveMockPayoutOverride,
} from "../../src/features/admin/payout/payout-mock-state";
import { payoutDetailViewFromApi } from "../../src/features/admin/payout/payout-model";

const originalFetch = globalThis.fetch;

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    clear: () => values.clear(),
    removeItem: (key) => { values.delete(key); },
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

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

describe("Payout service boundary", () => {
  it("loads mock Payout rows without making a browser or API read", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return jsonResponse({ success: true, data: null });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadPayoutBoardPageData(undefined, "mock");

    expect(calls).toBe(0);
    expect(result.rows.map((row) => row.id)).toEqual(["PAY-9637", "PAY-9636", "PAY-9638", "PAY-9639"]);
  });

  it("reads the Payout board through the Admin API and forwards the server cookie", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    const cacheModes: (RequestCache | undefined)[] = [];
    globalThis.fetch = (async (input, init) => {
      cacheModes.push(init?.cache);
      const request = new Request(input, init);
      requests.push(request);
      const cursor = new URL(request.url).searchParams.get("cursor");
      return jsonResponse({
        success: true,
        data: cursor
          ? { items: [], nextCursor: null }
          : new URL(request.url).searchParams.get("status") === "PENDING_ADMIN_APPROVAL"
            ? { items: [mockPendingPayout], nextCursor: "next-page" }
            : { items: [], nextCursor: null },
      });
    }) as typeof globalThis.fetch;

    const result = await loadPayoutBoardPageData("kuquest-admin=session", "api");

    expect(result.rows[0]?.id).toBe("PAY-9637");
    expect(requests).toHaveLength(7);
    expect(new Set(requests.map((request) => new URL(request.url).searchParams.get("status")))).toEqual(new Set([
      "PENDING_ADMIN_APPROVAL",
      "SUBMITTED_TO_PROVIDER",
      "PROVIDER_PENDING",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
    ]));
    expect(new Set(requests.map((request) => new URL(request.url).searchParams.get("limit")))).toEqual(new Set(["50"]));
    expect(requests[0]?.headers.get("cookie")).toBe("kuquest-admin=session");
    expect(requests.find((request) => new URL(request.url).searchParams.get("cursor") === "next-page")).toBeDefined();
    expect(cacheModes.every((cache) => cache === "no-store")).toBe(true);
  });

  it("maps a live Payout detail and returns null for an API 404", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    let requestCache: RequestCache | undefined;
    globalThis.fetch = (async (input, init) => {
      requestCache = init?.cache;
      request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname.endsWith("/missing")) return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Payout not found." } }, 404);
      if (url.pathname === "/api/v1/admin/payouts") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      return jsonResponse({ success: true, data: mockPendingPayout });
    }) as typeof globalThis.fetch;

    const result = await loadPayoutDetailPageData("PAY-9637", "kuquest-admin=session", "api");
    expect(result?.detail.id).toBe("PAY-9637");
    expect(result?.detail.destination.maskedValue).toBe("•••• 9637");
    expect(request?.headers.get("cookie")).toBe("kuquest-admin=session");
    expect(requestCache).toBe("no-store");

    await expect(loadPayoutDetailPageData("missing", "kuquest-admin=session", "api")).resolves.toBeNull();
  });

  it("persists and restores a Mock Payout decision across reloads", () => {
    const detail = payoutDetailViewFromApi(mockPendingPayout, [mockPendingPayout]);
    const next = applyMockPayoutDecision(detail, "approve", null, "2026-09-17T03:25:00.000Z");
    const browserStorage = storage();

    saveMockPayoutOverride(browserStorage, { id: next.id, ...payoutMockOverrideFromDetail(next) });

    const restored = applyMockPayoutOverride(
      detail,
      readMockPayoutOverride(browserStorage, detail.id),
    );
    expect(restored.status).toBe("SUBMITTED_TO_PROVIDER");
    expect(restored.version).toBe(detail.version + 1);
    expect(restored.history.at(-1)?.toStatus).toBe("SUBMITTED_TO_PROVIDER");
    expect(restored.decisionContext.heading).toBe("Transfer submitted");
  });
});
