import { describe, expect, it } from "bun:test";

import { activeAdminNavigation, adminNavigation } from "../../src/features/admin/navigation-config";

describe("Admin navigation active state", () => {
  it("uses canonical links for every Admin route", () => {
    expect(adminNavigation.map(({ href }) => href)).toEqual([
      "/overview",
      "/quest",
      "/dispute",
      "/report",
      "/conduct-report",
      "/payout",
      "/member",
      "/wallet",
      "/activity",
    ]);
    expect(adminNavigation.every(({ href }) => !href.includes("?view="))).toBe(true);
  });

  it("keeps a detail route active on its board", () => {
    expect(activeAdminNavigation("/quest/QST-1")).toBe("quest");
    expect(activeAdminNavigation("/member/member-1")).toBe("member");
    expect(activeAdminNavigation("/activity")).toBe("activity");
  });

  it("does not treat a similar path as an Admin route", () => {
    expect(activeAdminNavigation("/questing")).toBe("overview");
  });

  it("accepts a trailing slash without changing the active board", () => {
    expect(activeAdminNavigation("/dispute/")).toBe("dispute");
  });
});
