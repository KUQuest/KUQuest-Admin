import { afterEach, describe, expect, it } from "bun:test";

import {
  DEFAULT_ACTIVITY_LOG_FILTERS,
  loadActivityLogPageData,
} from "../../src/features/admin/activity-log/activity-log-service";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Activity Log route service", () => {
  it("loads the first API page with the legacy query order and default newest sort", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { items: [], nextCursor: "next-page" } });
    }) as typeof globalThis.fetch;

    const page = await loadActivityLogPageData("kuquest-admin=server-session");

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/activity-log?limit=50&sort=newest");
    expect(request?.headers.get("cookie")).toBe("kuquest-admin=server-session");
    expect(page).toEqual({ source: "api", items: [], nextCursor: "next-page" });
    expect(DEFAULT_ACTIVITY_LOG_FILTERS).toEqual({
      action: "",
      resourceType: "",
      resourceId: "",
      adminId: "",
      sort: "newest",
    });
  });

  it("preserves non-empty filters, oldest sorting, cursor pagination, and API mapping", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({
        success: true,
        data: {
          items: [{
            id: "action-1",
            admin: { id: "admin-1", firstName: "YouTube", lastName: "Admin" },
            action: "QUEST_HIDDEN",
            resourceType: "QUEST",
            resourceId: "quest-1",
            reasonCode: "POLICY_REVIEW",
            reasonCatalogVersion: 1,
            resultVersion: 2,
            resultTimestamp: "2026-09-08T08:00:00.000Z",
            createdAt: "2026-09-08T08:00:00.000Z",
          }],
          nextCursor: null,
        },
      });
    }) as typeof globalThis.fetch;

    const page = await loadActivityLogPageData(
      undefined,
      {
        action: "QUEST_HIDDEN",
        resourceType: "QUEST",
        resourceId: "quest-1",
        adminId: "admin-1",
        sort: "oldest",
      },
      "next-page",
    );

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/activity-log?limit=50&sort=oldest&action=QUEST_HIDDEN&resourceType=QUEST&resourceId=quest-1&adminId=admin-1&cursor=next-page");
    expect(request?.headers.get("cookie")).toBeNull();
    expect(page.items[0]).toMatchObject({
      id: "action-1",
      adminId: "admin-1",
      adminName: "YouTube Admin",
      adminInitials: "YA",
      createdAtTimestamp: Date.parse("2026-09-08T08:00:00.000Z"),
    });
  });

  it("does not send empty filter values or an absent cursor", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let request: Request | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    }) as typeof globalThis.fetch;

    await loadActivityLogPageData(undefined, {
      action: "",
      resourceType: "",
      resourceId: "",
      adminId: "",
      sort: "newest",
    });

    expect(request?.url).toBe("https://api.example.test/api/v1/admin/activity-log?limit=50&sort=newest");
  });
});
