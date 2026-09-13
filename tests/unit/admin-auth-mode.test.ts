import { afterEach, describe, expect, it } from "bun:test";

import {
  adminAuthMode,
  isAdminMockEnabled,
  requiresAdminSessionBoundary,
} from "../../src/lib/auth/admin-auth-mode";

const originalDataSource = process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE;

afterEach(() => {
  if (originalDataSource === undefined) delete process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE;
  else process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = originalDataSource;
});

describe("Admin auth mode", () => {
  it("uses the API session boundary for API mode", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "api";

    expect(adminAuthMode()).toBe("api");
    expect(isAdminMockEnabled()).toBe(false);
    expect(requiresAdminSessionBoundary()).toBe(true);
  });

  it("enables the mock adapter only when mock mode is explicit", () => {
    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "mock";

    expect(adminAuthMode()).toBe("mock");
    expect(isAdminMockEnabled()).toBe(true);
    expect(requiresAdminSessionBoundary()).toBe(false);
  });

  it("fails closed for an unset or unknown mode", () => {
    delete process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE;
    expect(adminAuthMode()).toBe("invalid");
    expect(isAdminMockEnabled()).toBe(false);
    expect(requiresAdminSessionBoundary()).toBe(true);

    process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE = "demo";
    expect(adminAuthMode()).toBe("invalid");
    expect(isAdminMockEnabled()).toBe(false);
    expect(requiresAdminSessionBoundary()).toBe(true);
  });
});
