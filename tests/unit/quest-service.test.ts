import { afterEach, describe, expect, it } from "bun:test";

import {
  loadQuestBoardPageData,
  loadQuestDetailPageData,
} from "../../src/features/admin/quest/quest-service";
import { DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE } from "../../src/features/admin/quest/quest-dispute";
import { mockQuestDetail, mockQuestFinance, mockQuestSummary } from "../../src/features/admin/quest/quest-mock-data";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Quest route service", () => {
  it("loads mock Quest data through the Server Component service", async () => {
    globalThis.fetch = (async () => {
      throw new Error("The mock Quest route must not fetch from the browser API.");
    }) as unknown as typeof globalThis.fetch;

    const result = await loadQuestBoardPageData("", "mock");

    expect(result.rows.some((row) => row.title === "Inspect campus signs")).toBe(true);
  });

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

  it("preserves a Dispute Case lookup failure in Quest detail data", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const apiDetail = mockQuestDetail(mockQuestSummary({
      id: "quest-1",
      questStatus: "QUEST_FAILED",
    }));
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (request.url.includes("/api/v1/admin/disputes")) {
        return new Response(JSON.stringify({
          success: false,
          error: { code: "DISPUTE_LOOKUP_UNAVAILABLE", message: "Dispute Case lookup is unavailable." },
        }), { status: 503 });
      }
      if (request.url.includes("/finance/quests/")) {
        return new Response(JSON.stringify({
          success: true,
          data: mockQuestFinance(apiDetail),
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        success: true,
        data: apiDetail,
      }), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const result = await loadQuestDetailPageData("quest-1", "kuquest-admin=session");

    expect(result?.linkedDisputeId).toBeNull();
    expect(result?.disputeLookupError).toBe(DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE);
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
