import { describe, expect, test } from "bun:test";

import { hasAdminSession, requireAdminSession } from "../../src/features/admin/legacy/auth";

function storageWith(value: string | null): Pick<Storage, "getItem"> {
  return { getItem: () => value };
}

describe("admin session guard", () => {
  test("accepts a stored admin session", () => {
    expect(hasAdminSession(storageWith("active-session"))).toBe(true);
  });

  test("redirects unauthenticated visitors to login", () => {
    let destination = "";

    expect(requireAdminSession(storageWith(null), {
      replace: (url) => {
        destination = String(url);
      },
    })).toBe(false);
    expect(destination).toBe("/login");
  });
});
