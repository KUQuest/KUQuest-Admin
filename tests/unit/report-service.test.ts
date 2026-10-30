import { afterEach, describe, expect, it } from "bun:test";

import {
  loadReportCaseDetailFromApi,
  loadReportCasePageData,
  loadReportEvidence,
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

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/reports?kind=REPORT_CASE&limit=50&sort=newest");
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

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/reports?kind=REPORT_CASE&limit=50&sort=newest&cursor=next-report-page");
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

  it("loads every Report Case Evidence page in chronological order", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    const messages = [
      { id: "message-1", sequence: 1 },
      { id: "message-2", sequence: 2 },
      { id: "message-3", sequence: 3 },
    ];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const hasCursor = new URL(request.url).searchParams.has("cursor");
      const pageMessages = hasCursor ? messages.slice(2) : messages.slice(0, 2);
      return jsonResponse({
        success: true,
        data: {
          caseId: "case-1",
          evidenceRefId: "evidence-1",
          reportedMessageId: "message-2",
          nextCursor: hasCursor ? null : "next-page",
          truncated: !hasCursor,
          messages: pageMessages,
          adminActionId: hasCursor ? "action-2" : "action-1",
        },
      });
    }) as unknown as typeof globalThis.fetch;

    const controller = new AbortController();
    const evidence = await loadReportEvidence("evidence-1", controller.signal);

    expect("messages" in evidence).toBe(true);
    if (!("messages" in evidence)) throw new Error("Report Case Evidence was not returned.");
    expect(evidence.messages.map(({ id }) => id)).toEqual([
      "message-1",
      "message-2",
      "message-3",
    ]);
    expect(evidence.reportedMessageId).toBe("message-2");
    expect(evidence.nextCursor).toBeNull();
    expect(evidence.truncated).toBe(false);
    expect(requests.map((request) => new URL(request.url).searchParams.get("cursor"))).toEqual([
      null,
      "next-page",
    ]);
    expect(requests.every((request) => new URL(request.url).searchParams.get("limit") === "50")).toBe(true);
    expect(requests[0]?.headers.get("idempotency-key")).not.toBe(
      requests[1]?.headers.get("idempotency-key"),
    );
  });
});
