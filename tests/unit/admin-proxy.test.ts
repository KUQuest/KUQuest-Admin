import { afterEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";

import { config, proxy } from "../../src/proxy";

const originalDataSource = process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE;

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://admin.example.test${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

afterEach(() => {
  if (originalDataSource === undefined) delete process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE;
  else process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = originalDataSource;
});

describe("Admin Proxy", () => {
  it("redirects an API-mode request without an Admin session cookie to login", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    const response = proxy(request("/payout"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.example.test/login");
  });

  it("redirects the root URL to Overview for an Admin with a session cookie", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    const response = proxy(request("/", "kuquest-admin.session_token=session-token"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.example.test/overview");
  });

  it("redirects a missing session once to login before any legacy normalization", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    for (const path of ["/", "/?view=quests", "/quests/QST-1", "/disputes/DSP-1", "/reports/RPT-1", "/users/member-1", "/member/member-1/wallet-statement"]) {
      const response = proxy(request(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://admin.example.test/login");
    }
  });

  it("redirects legacy root queries to their canonical route", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    const response = proxy(request("/?view=quests", "kuquest-admin.session_token=session-token"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.example.test/quest");
  });

  it("redirects legacy plural detail paths to canonical detail routes", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    expect(proxy(request("/quests/QST-1", "kuquest-admin.session_token=session-token")).headers.get("location"))
      .toBe("https://admin.example.test/quest/QST-1");
    expect(proxy(request("/disputes/DSP-1", "kuquest-admin.session_token=session-token")).headers.get("location"))
      .toBe("https://admin.example.test/dispute/DSP-1");
    expect(proxy(request("/reports/RPT-1", "kuquest-admin.session_token=session-token")).headers.get("location"))
      .toBe("https://admin.example.test/report/RPT-1");
    expect(proxy(request("/users/member-1?tab=wallet-statement", "kuquest-admin.session_token=session-token")).headers.get("location"))
      .toBe("https://admin.example.test/member/member-1?tab=wallet-statement");
  });

  it("passes a request with an Admin session cookie to the route", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    const response = proxy(request("/member/member-1", "kuquest-admin.session_token=session-token"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows the explicit mock adapter without a production session cookie", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "mock";

    const response = proxy(request("/overview"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("fails closed when the auth mode is unset or unknown", () => {
    delete process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE;
    expect(proxy(request("/overview")).headers.get("location")).toBe("https://admin.example.test/login");

    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "demo";
    expect(proxy(request("/overview")).headers.get("location")).toBe("https://admin.example.test/login");
  });

  it("keeps login and public assets available without a session", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    expect(proxy(request("/login")).headers.get("location")).toBeNull();
    expect(proxy(request("/kuquest-logo.png")).headers.get("location")).toBeNull();
    expect(proxy(request("/_next/image?url=%2Fkuquest-logo.png&w=256&q=75")).headers.get("location")).toBeNull();
  });

  it("uses a narrow matcher for canonical Admin routes", () => {
    expect(config.matcher).toContain("/overview/:path*");
    expect(config.matcher).toContain("/quest/:path*");
    expect(config.matcher).toContain("/quests/:path*");
    expect(config.matcher).toContain("/disputes/:path*");
    expect(config.matcher).toContain("/reports/:path*");
    expect(config.matcher).toContain("/users/:path*");
    expect(config.matcher).not.toContain("/login");
    expect(config.matcher).not.toContain("/_next/:path*");
    expect(config.matcher).not.toContain("/public/:path*");
  });
});
