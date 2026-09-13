import { describe, expect, it } from "bun:test";

import { activeAdminNavigation } from "../../src/features/admin/navigation-config";

describe("Admin navigation active state", () => {
  it("keeps a detail route active on its board", () => {
    expect(activeAdminNavigation("/quest/QST-1")).toBe("quest");
    expect(activeAdminNavigation("/member/member-1")).toBe("member");
    expect(activeAdminNavigation("/activity")).toBe("activity");
  });

  it("does not treat a similar path as an Admin route", () => {
    expect(activeAdminNavigation("/questing")).toBe("overview");
  });
});
