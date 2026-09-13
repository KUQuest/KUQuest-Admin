import { describe, expect, it } from "bun:test";

import {
  userPageTabFromSearch,
  userPageUrlForTab,
} from "../../src/features/admin/legacy/user-page";

describe("Member Profile navigation", () => {
  it("opens the Wallet Statement tab from the URL", () => {
    expect(userPageTabFromSearch("?tab=wallet-statement")).toBe("wallet-statement");
    expect(userPageTabFromSearch("?tab=unknown")).toBe("overview");
  });

  it("builds a Member Profile URL for a selected tab", () => {
    expect(userPageUrlForTab("member/1", "wallet-statement"))
      .toBe("/users/member%2F1?tab=wallet-statement");
    expect(userPageUrlForTab("member/1", "overview"))
      .toBe("/users/member%2F1");
    expect(userPageUrlForTab(undefined, "wallet-statement")).toBeNull();
  });
});
