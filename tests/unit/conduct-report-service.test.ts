import { afterEach, describe, expect, it } from "bun:test";

import { loadConductReportPageData } from "../../src/features/admin/conduct-report/conduct-report-service";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Conduct Report service", () => {
  it("filters Report Cases from the Admin API list before the board renders", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          items: [
            { id: "RPT-1", status: "REPORT_CASE_PENDING", reportedMemberId: "member-1" },
            {
              id: "CND-1",
              status: "CONDUCT_REPORT_PENDING",
              reportedMemberId: "member-2",
              questId: "quest-1",
            },
          ],
          nextCursor: "next-conduct-page",
        },
      });
    }) as unknown as typeof globalThis.fetch;

    const page = await loadConductReportPageData("kuquest-admin=server-session");

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/reports?limit=50");
    expect(request?.headers.get("cookie")).toBe("kuquest-admin=server-session");
    expect(page.items.map((record) => record.id)).toEqual(["CND-1"]);
    expect(page.items[0]).toMatchObject({
      status: "CONDUCT_REPORT_PENDING",
      questId: "quest-1",
      reportedMemberHref: "/member/member-2",
    });
    expect(page.nextCursor).toBe("next-conduct-page");
  });

  it("requests the next Conduct Report page with the cursor", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          items: [{ id: "CND-2", status: "CONDUCT_REPORT_DISMISSED", questId: "quest-2" }],
          nextCursor: null,
        },
      });
    }) as unknown as typeof globalThis.fetch;

    const page = await loadConductReportPageData(undefined, "next-conduct-page");

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/reports?limit=50&cursor=next-conduct-page");
    expect(page.items[0]?.status).toBe("CONDUCT_REPORT_DISMISSED");
  });
});
