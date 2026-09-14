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
    let request: Request | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { items: [
        { id: "DSP-1", status: "DISPUTE_CASE_PENDING", questId: "QST-1", questState: "QUEST_FAILED", amountAtRiskSatang: 12501 },
        { id: "CND-1", status: "CONDUCT_REPORT_PENDING", questId: "QST-2" },
      ], nextCursor: "next-dispute-page" } });
    }) as unknown as typeof globalThis.fetch;

    const page = await loadDisputeCasePageData("kuquest-admin=server-session");

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/disputes?limit=50");
    expect(request?.headers.get("cookie")).toBe("kuquest-admin=server-session");
    expect(page.items.map((record) => record.id)).toEqual(["DSP-1"]);
    expect(page.items[0]).toMatchObject({ amountAtRiskSatang: 12501, status: "DISPUTE_CASE_PENDING" });
    expect(page.nextCursor).toBe("next-dispute-page");
  });

  it("loads a direct detail route and rejects a non-Dispute Case response", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.endsWith("DSP-1")
        ? { id: "DSP-1", status: "DISPUTE_CASE_RESOLVED", quest: { id: "QST-1", title: "Failed Quest", questStatus: "QUEST_FAILED" }, resolvedAmountSatang: 8000, version: 4 }
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
  });
});
