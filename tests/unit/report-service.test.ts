import { afterEach, describe, expect, it } from "bun:test";

import {
  loadReportCaseDetailFromApi,
  loadReportCasePageData,
} from "../../src/features/admin/report/report-service";

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

describe("Report Case service", () => {
  it("filters Conduct Reports from the Admin API list before the page renders", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          items: [
            { id: "RPT-1", status: "REPORT_CASE_PENDING", reportedMemberId: "member-1" },
            { id: "CND-1", status: "CONDUCT_REPORT_PENDING", reportedMemberId: "member-2", questId: "quest-1" },
          ],
          nextCursor: "next-report-page",
        },
      });
    }) as unknown as typeof globalThis.fetch;

    const page = await loadReportCasePageData("kuquest-admin=server-session");

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/reports?limit=50");
    expect(request?.headers.get("cookie")).toBe("kuquest-admin=server-session");
    expect(page.items.map((record) => record.id)).toEqual(["RPT-1"]);
    expect(page.items[0]).toMatchObject({
      status: "REPORT_CASE_PENDING",
      reportedMemberHref: "/member/member-1",
    });
    expect(page.nextCursor).toBe("next-report-page");
  });

  it("requests the next Report Case page with the server cursor", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          items: [{ id: "RPT-2", status: "REPORT_CASE_DISMISSED", reportedMemberId: "member-2" }],
          nextCursor: null,
        },
      });
    }) as unknown as typeof globalThis.fetch;

    const page = await loadReportCasePageData(undefined, "next-report-page");

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/reports?limit=50&cursor=next-report-page");
    expect(page.items.map((record) => record.id)).toEqual(["RPT-2"]);
    expect(page.items[0]?.status).toBe("REPORT_CASE_DISMISSED");
  });

  it("does not render a Conduct Report through the Report Case detail route", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({
      success: true,
      data: { id: "CND-1", status: "CONDUCT_REPORT_PENDING", reportedMemberId: "member-2" },
    })) as unknown as typeof globalThis.fetch;

    await expect(loadReportCaseDetailFromApi("CND-1")).resolves.toBeNull();
  });
});
