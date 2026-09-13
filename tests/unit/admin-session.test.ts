import { afterEach, describe, expect, it } from "bun:test";

import {
  ADMIN_MOCK_SESSION_COOKIE,
  adminSessionCookieHeader,
  adminSessionDecision,
  hasAdminSessionCookie,
  hasMockAdminSessionCookie,
} from "../../src/lib/auth/admin-session-policy";
import { getAdminSessionFromApi } from "../../src/lib/auth/admin-session";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Admin session policy", () => {
  it("recognizes the configured Admin cookie family and forwards only those cookies", () => {
    const cookies = [
      { name: "kuquest-admin.session_token", value: "session-token" },
      { name: "unrelated", value: "do-not-forward" },
      { name: "kuquest-admin.session_token.0", value: "chunk" },
    ];

    expect(hasAdminSessionCookie(cookies)).toBe(true);
    expect(adminSessionCookieHeader(cookies)).toBe(
      "kuquest-admin.session_token=session-token; kuquest-admin.session_token.0=chunk",
    );
  });

  it("does not treat the mock adapter cookie as a production Admin session", () => {
    const cookies = [{ name: ADMIN_MOCK_SESSION_COOKIE, value: "1" }];

    expect(hasAdminSessionCookie(cookies)).toBe(false);
    expect(hasAdminSessionCookie(cookies, { includeMock: true })).toBe(true);
    expect(hasMockAdminSessionCookie(cookies)).toBe(true);
    expect(adminSessionCookieHeader(cookies)).toBe("");
  });

  it("maps missing, enabled, and disabled identities to session results", () => {
    expect(adminSessionDecision(null)).toBe("missing");
    expect(adminSessionDecision({ disabledAt: null })).toBe("authenticated");
    expect(adminSessionDecision({ disabledAt: "2026-09-13T00:00:00.000Z" })).toBe("forbidden");
  });

  it("forwards only the Admin session cookie to the server session endpoint", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/";
    let request: Request | undefined;

    const session = await getAdminSessionFromApi("kuquest-admin.session_token=session-token", async (input, init) => {
      request = new Request(input, init);
      return jsonResponse({
        session: { id: "session-1" },
        user: {
          id: "admin-1",
          email: "admin@ku.th",
          firstName: "Nicha",
          lastName: "Prasert",
          disabledAt: null,
        },
      });
    });

    expect(session).toMatchObject({ kind: "authenticated", identity: { id: "admin-1" } });
    expect(request?.url).toBe("https://api.example.test/api/admin/auth/get-session");
    expect(request?.headers.get("cookie")).toBe("kuquest-admin.session_token=session-token");
  });

  it("maps a disabled Admin response to Forbidden", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";

    const session = await getAdminSessionFromApi("kuquest-admin.session_token=session-token", async () => jsonResponse({
      session: { id: "session-1" },
      user: {
        id: "admin-1",
        email: "admin@ku.th",
        firstName: "Nicha",
        lastName: "Prasert",
        disabledAt: "2026-09-13T00:00:00.000Z",
      },
    }));

    expect(session).toEqual({ kind: "forbidden" });
  });
});
