import { afterEach, describe, expect, it } from "bun:test";

import { GET } from "../../src/app/api/[...path]/route";

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

describe("Admin API route proxy", () => {
  it("streams the Admin event stream with the Admin Session cookie and the browser abort signal", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let upstreamUrl = "";
    let upstreamInit: RequestInit | undefined;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      upstreamUrl = String(input);
      upstreamInit = init;
      return new Response(": keep-alive\n\n", {
        headers: { "content-type": "text/event-stream; charset=utf-8", "x-accel-buffering": "no" },
      });
    }) as typeof fetch;

    const browser = new AbortController();
    const request = new Request("https://admin.example.test/api/v1/admin/events", {
      headers: { cookie: "kuquest-admin.session_token=session-token" },
      signal: browser.signal,
    });

    const response = await GET(request, { params: Promise.resolve({ path: ["v1", "admin", "events"] }) });

    expect(upstreamUrl).toBe("https://api.example.test/api/v1/admin/events");
    expect(new Headers(upstreamInit?.headers).get("cookie")).toBe("kuquest-admin.session_token=session-token");
    expect(response.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(await response.text()).toBe(": keep-alive\n\n");

    browser.abort();
    expect(upstreamInit?.signal?.aborted).toBe(true);
  });
});
