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
  it("loads every Conduct Report status and filters Report Cases from the Admin API list", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const status = new URL(request.url).searchParams.get("status");
      const items = status === "CONDUCT_REPORT_PENDING"
        ? [
            { id: "RPT-1", status: "REPORT_CASE_PENDING", reportedMemberId: "member-1" },
            {
              id: "CND-1",
              status: "CONDUCT_REPORT_PENDING",
              reportedMemberId: "member-2",
              questId: "quest-1",
            },
          ]
        : [];
      return jsonResponse({
        success: true,
        data: {
          items,
          nextCursor: status === "CONDUCT_REPORT_PENDING" ? "next-pending-page" : null,
        },
      });
    }) as unknown as typeof globalThis.fetch;

    const page = await loadConductReportPageData("kuquest-admin=server-session");
    const listRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/reports"));

    expect(listRequests.map((request) => new URL(request.url).searchParams.get("status")).toSorted()).toEqual([
      "CONDUCT_REPORT_DISMISSED",
      "CONDUCT_REPORT_PENDING",
      "CONDUCT_REPORT_UPHELD",
    ]);
    expect(listRequests.every((request) => {
      const url = new URL(request.url);
      return url.searchParams.get("kind") === "CONDUCT_REPORT"
        && request.headers.get("cookie") === "kuquest-admin=server-session";
    })).toBe(true);
    expect(page.items.map((record) => record.id)).toEqual(["CND-1"]);
    expect(page.items[0]).toMatchObject({
      status: "CONDUCT_REPORT_PENDING",
      questId: "quest-1",
      reportedMemberHref: "/member/member-2",
    });
    expect(page.nextCursor).toBe(JSON.stringify({ CONDUCT_REPORT_PENDING: "next-pending-page" }));
  });

  it("requests the next status page with its cursor", async () => {
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

    const page = await loadConductReportPageData(
      undefined,
      JSON.stringify({ CONDUCT_REPORT_DISMISSED: "next-conduct-page" }),
    );
    const url = new URL(request!.url);

    expect(url.searchParams.get("kind")).toBe("CONDUCT_REPORT");
    expect(url.searchParams.get("status")).toBe("CONDUCT_REPORT_DISMISSED");
    expect(url.searchParams.get("cursor")).toBe("next-conduct-page");
    expect(page.items[0]?.status).toBe("CONDUCT_REPORT_DISMISSED");
    expect(page.nextCursor).toBeNull();
  });
});
