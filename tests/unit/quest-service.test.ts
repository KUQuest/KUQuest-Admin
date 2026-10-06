import { afterEach, describe, expect, it } from "bun:test";

import {
  loadQuestBoardPageData,
  loadQuestDetailPageData,
} from "../../src/features/admin/quest/quest-service";
import { mockQuestDetail, mockQuestFinance, mockQuestSummary } from "../fixtures/admin-quest-api-fixtures";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Quest route service", () => {
  it("loads Quest detail data through the Admin API with the incoming Admin cookie", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const apiDetail = mockQuestDetail(mockQuestSummary({
        id: "quest-1",
        title: "Campus survey",
      }));
      const data = request.url.includes("/finance/quests/")
        ? mockQuestFinance(apiDetail)
        : apiDetail;
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadQuestDetailPageData("quest-1", "kuquest-admin=session");

    expect(result?.detail.id).toBe("quest-1");
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
  });

  it("resolves a Quest display ID before reading API detail data", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/quests") {
        return new Response(JSON.stringify({
          success: true,
          data: {
            items: [mockQuestSummary({ id: "quest-1", displayId: "QST-1", title: "Campus survey" })],
            nextCursor: null,
          },
        }), { status: 200 });
      }
      const apiDetail = mockQuestDetail(mockQuestSummary({ id: "quest-1", displayId: "QST-1", title: "Campus survey" }));
      const data = url.pathname.includes("/finance/quests/") ? mockQuestFinance(apiDetail) : apiDetail;
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadQuestDetailPageData("QST-1", "kuquest-admin=session");

    expect(result?.detail.id).toBe("quest-1");
    expect(requests.some((request) => request.url.endsWith("/api/v1/admin/quests/QST-1"))).toBe(false);
    expect(requests.some((request) => request.url.endsWith("/api/v1/admin/quests/quest-1"))).toBe(true);
    expect(requests.some((request) => request.url.endsWith("/api/v1/admin/finance/quests/quest-1"))).toBe(true);
  });

  it("keeps the readable Quest ID when the detail response omits it", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/quests") {
        return new Response(JSON.stringify({
          success: true,
          data: {
            items: [mockQuestSummary({ id: "quest-1", displayId: "QST-1" })],
            nextCursor: null,
          },
        }), { status: 200 });
      }

      const apiDetail = mockQuestDetail(mockQuestSummary({ id: "quest-1", displayId: "QST-1" }));
      const data = url.pathname.includes("/finance/quests/")
        ? mockQuestFinance(apiDetail)
        : { ...apiDetail, displayId: undefined };
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadQuestDetailPageData("QST-1", "kuquest-admin=session");

    expect(result?.detail.displayId).toBe("QST-1");
  });
  it("loads and maps all Quest board pages through the Admin API", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];

    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const cursor = new URL(request.url).searchParams.get("cursor");
      const item = cursor
        ? {
          id: "quest-2",
          displayId: "QST-2",
          apiVersion: "v1",
          version: 2,
          title: "Library map",
          questStatus: "QUEST_ASSIGNED",
          mode: "CANDIDATE",
          participation: "GROUP",
          headcount: 2,
          rewardSatang: 20000,
          questFundingTotalSatang: 20400,
          startTime: "2026-09-03T01:00:00.000Z",
          dueAt: null,
          hiddenAt: null,
          createdAt: "2026-09-02T01:00:00.000Z",
          updatedAt: "2026-09-02T01:00:00.000Z",
          hirer: { id: "member-2", firstName: "Benja", lastName: "Ariyawat", email: "benja@ku.th" },
        }
        : {
          id: "quest-1",
          displayId: "QST-1",
          apiVersion: "v1",
          version: 1,
          title: "Campus survey",
          questStatus: "QUEST_OPEN",
          mode: "FIRST_COME_FIRST_SERVED",
          participation: "SINGLE",
          headcount: 1,
          rewardSatang: 12000,
          questFundingTotalSatang: 12240,
          startTime: "2026-09-01T01:00:00.000Z",
          dueAt: null,
          hiddenAt: null,
          createdAt: "2026-09-01T01:00:00.000Z",
          updatedAt: "2026-09-01T01:00:00.000Z",
          hirer: { id: "member-1", firstName: "Ari", lastName: "Wattanakul", email: "ari@ku.th" },
        };
      return new Response(JSON.stringify({
        success: true,
        data: { items: [item], nextCursor: cursor ? null : "next" },
      }), { status: 200 });
    }) as typeof globalThis.fetch;

    const result = await loadQuestBoardPageData("kuquest-admin=session");

    expect(result.rows.map((row) => row.id)).toEqual(["quest-1", "quest-2"]);
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
  });

  it("loads linked Dispute Cases for failed Quests from the Admin API", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const apiDetail = mockQuestDetail(mockQuestSummary({
      id: "quest-1",
      questStatus: "QUEST_FAILED",
    }));
    const requests: Request[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);
      if (url.pathname.includes("/finance/quests/")) {
        return new Response(JSON.stringify({
          success: true,
          data: mockQuestFinance(apiDetail),
        }), { status: 200 });
      }
      if (url.pathname.endsWith("/quests/quest-1")) {
        return new Response(JSON.stringify({
          success: true,
          data: apiDetail,
        }), { status: 200 });
      }
      const items = url.searchParams.get("status") === "DISPUTE_CASE_PENDING"
        ? [{
            id: "dispute-uuid-1",
            displayId: "DSP-1",
            questId: "quest-1",
            status: "DISPUTE_CASE_PENDING",
            createdAt: "2026-09-14T09:00:00.000Z",
            updatedAt: "2026-09-14T09:00:00.000Z",
          }]
        : [];
      return new Response(JSON.stringify({
        success: true,
        data: { items, nextCursor: null },
      }), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadQuestDetailPageData("quest-1", "kuquest-admin=session");
    const disputeRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/disputes"));

    expect(result?.linkedDisputeId).toBe("dispute-uuid-1");
    expect(result?.detail.disputeCases[0]).toMatchObject({ displayId: "DSP-1", status: "DISPUTE_CASE_PENDING" });
    expect(disputeRequests).toHaveLength(3);
    expect(disputeRequests.map((request) => new URL(request.url).searchParams.get("status")).toSorted()).toEqual([
      "DISPUTE_CASE_DISMISSED",
      "DISPUTE_CASE_PENDING",
      "DISPUTE_CASE_RESOLVED",
    ]);
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
  });

  it("returns no detail for a Quest that the Admin API does not find", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async () => new Response(JSON.stringify({
      success: false,
      error: { code: "QUEST_NOT_FOUND", message: "Quest was not found." },
    }), { status: 404 })) as unknown as typeof globalThis.fetch;

    expect(await loadQuestDetailPageData("missing-quest", "kuquest-admin=session")).toBeNull();
  });
});
