import { afterEach, describe, expect, it } from "bun:test";

import {
  loadDisputeCaseDetailFromApi,
  loadDisputeCasePageData,
} from "../../src/features/admin/dispute/dispute-service";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Dispute Case service", () => {
  it("loads API Dispute Cases with the server cookie and filters other case families", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    const quest = {
      id: "QST-1",
      displayId: "QST-1",
      title: "Failed Quest",
      questStatus: "QUEST_FAILED",
      hirer: { id: "hirer-1", firstName: "Hirer", lastName: "One" },
      assignments: [{ worker: { id: "worker-1", firstName: "Worker", lastName: "One" } }],
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);
      if (url.pathname.endsWith("/admin/quests/QST-1")) {
        return jsonResponse({ success: true, data: quest });
      }
      if (url.pathname.includes("/finance/quests/")) {
        return jsonResponse({ success: true, data: { reservation: { remainingSatang: 9000 } } });
      }
      if (url.pathname.endsWith("/disputes")) {
        const items = url.searchParams.get("status") === "DISPUTE_CASE_PENDING"
          ? [
              {
                id: "DSP-1",
                displayId: "DSP-1",
                status: "DISPUTE_CASE_PENDING",
                questId: "QST-1",
                filerUserId: "hirer-1",
                amountAtRiskSatang: 12501,
                createdAt: "2026-09-16T09:00:00.000Z",
              },
              { id: "CND-1", status: "CONDUCT_REPORT_PENDING", questId: "QST-2" },
            ]
          : [];
        return jsonResponse({ success: true, data: { items, nextCursor: null } });
      }
      return jsonResponse({ success: true, data: { reservation: null } });
    }) as unknown as typeof globalThis.fetch;

    const page = await loadDisputeCasePageData("kuquest-admin=server-session");

    expect(requests.filter((request) => new URL(request.url).pathname.endsWith("/disputes"))).toHaveLength(3);
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=server-session")).toBe(true);
    expect(page.items.map((record) => record.id)).toEqual(["DSP-1"]);
    expect(page.items[0]).toMatchObject({
      amountAtRiskSatang: 12501,
      sharedCapSatang: 9000,
      status: "DISPUTE_CASE_PENDING",
      filerName: "Hirer One",
      respondentName: "Worker One",
      workerId: "worker-1",
      questDisplayId: "QST-1",
    });
    expect(page.nextCursor).toBeNull();
  });

  it("loads a direct detail route and rejects a non-Dispute Case response", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: string[] = [];
    const quest = {
      id: "QST-1",
      displayId: "QST-1",
      title: "Failed Quest",
      questStatus: "QUEST_FAILED",
      hirer: { id: "hirer-1", firstName: "Hirer", lastName: "One" },
      assignments: [],
    };
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/admin/quests/QST-1")) return jsonResponse({ success: true, data: quest });
      if (url.includes("/finance/quests/")) {
        return jsonResponse({ success: true, data: { reservation: null } });
      }
      const data = url.endsWith("/disputes/DSP-1")
        ? {
            id: "DSP-1",
            status: "DISPUTE_CASE_RESOLVED",
            questId: "QST-1",
            quest: { id: "QST-1", title: "Failed Quest", questStatus: "QUEST_FAILED" },
            resolvedAmountSatang: 8000,
            version: 4,
          }
        : { id: "RPT-1", status: "REPORT_CASE_PENDING" };
      return jsonResponse({ success: true, data });
    }) as unknown as typeof globalThis.fetch;

    await expect(loadDisputeCaseDetailFromApi("DSP-1")).resolves.toMatchObject({
      id: "DSP-1",
      status: "DISPUTE_CASE_RESOLVED",
      resolvedAmountSatang: 8000,
      questHref: "/quest/QST-1",
    });
    await expect(loadDisputeCaseDetailFromApi("RPT-1")).resolves.toBeNull();
    expect(requests.filter((url) => new URL(url).pathname.endsWith("/admin/quests/QST-1"))).toHaveLength(1);
  });
});
