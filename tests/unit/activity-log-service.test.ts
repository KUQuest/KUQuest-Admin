import { afterEach, describe, expect, it } from "bun:test";

import {
  canOpenActivityTarget,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  loadActivityLogPageData,
  resolveActivityTargetHref,
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
  it("resolves a missing resource UUID from the exact Admin Display ID", async () => {
    let searchQuery: { q: string; kind: string } | undefined;
    const searchRecords = async (query: { q: string; kind: string }) => {
      searchQuery = query;
      return {
      items: [{
        kind: "report" as const,
        id: "resource-uuid",
        resourceId: "resource-uuid",
        displayId: "RPT-000042",
        title: "Reported Message",
        status: "OPEN",
        newestAt: null,
      }],
      };
    };
    const entry = { resourceType: "REPORT_CASE", resourceDisplayId: "RPT-000042", resourceId: undefined };

    expect(canOpenActivityTarget(entry)).toBe(true);
    await expect(resolveActivityTargetHref(entry, searchRecords)).resolves.toBe("/report/resource-uuid");
    expect(searchQuery).toEqual({ q: "RPT-000042", kind: "report" });
  });

  it("does not link to a different record when Display ID search has no exact match", async () => {
    const searchRecords = async () => ({
      items: [{
        kind: "report" as const,
        id: "other-resource-uuid",
        resourceId: "other-resource-uuid",
        displayId: "RPT-000043",
        title: "Other report",
        status: "OPEN",
        newestAt: null,
      }],
    });

    await expect(resolveActivityTargetHref({
      resourceType: "REPORT_CASE",
      resourceDisplayId: "RPT-000042",
      resourceId: undefined,
    }, searchRecords)).resolves.toBeNull();
  });

  it("uses a resource UUID directly without searching", async () => {
    const searchRecords = async () => {
      throw new Error("Search must not run when the UUID is present.");
    };

    await expect(resolveActivityTargetHref({
      resourceType: "REPORT_CASE",
      resourceDisplayId: "RPT-000042",
      resourceId: "resource-uuid",
    }, searchRecords)).resolves.toBe("/report/resource-uuid");
  });

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
    expect(page).toEqual({ items: [], nextCursor: "next-page" });
    expect(DEFAULT_ACTIVITY_LOG_FILTERS).toEqual({
      action: "",
      resourceType: "",
      resourceId: "",
      adminId: "",
      fromDate: "",
      toDate: "",
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
