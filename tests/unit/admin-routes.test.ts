import { describe, expect, it } from "bun:test";

import {
  activityRoutes,
  conductReportRoutes,
  disputeRoutes,
  memberRoutes,
  overviewRoutes,
  payoutRoutes,
  questRoutes,
  reportRoutes,
  walletRoutes,
} from "../../src/features/admin/admin-routes";
import {
  canonicalRouteForLegacyUrl,
  isAdminProtectedPath,
} from "../../src/lib/auth/admin-routing";

function legacyUrl(path: string): URL {
  return new URL(path, "https://admin.example.test");
}

describe("Admin route helpers", () => {
  it("returns the canonical route for every approved route family", () => {
    expect(overviewRoutes.list()).toBe("/overview");
    expect(questRoutes.list()).toBe("/quest");
    expect(disputeRoutes.list()).toBe("/dispute");
    expect(reportRoutes.list()).toBe("/report");
    expect(conductReportRoutes.list()).toBe("/conduct-report");
    expect(payoutRoutes.list()).toBe("/payout");
    expect(memberRoutes.list()).toBe("/member");
    expect(walletRoutes.list()).toBe("/wallet");
    expect(activityRoutes.list()).toBe("/activity");
  });

  it("encodes dynamic identifiers as one path segment", () => {
    expect(questRoutes.detail("QST/1")).toBe("/quest/QST%2F1");
    expect(disputeRoutes.detail("case 1")).toBe("/dispute/case%201");
    expect(reportRoutes.detail("RPT-1")).toBe("/report/RPT-1");
    expect(payoutRoutes.detail("PAY-1")).toBe("/payout/PAY-1");
    expect(memberRoutes.detail("member/1")).toBe("/member/member%2F1");
  });

  it("rejects empty dynamic identifiers", () => {
    expect(() => questRoutes.detail(" ")).toThrow("identifier");
  });
});

describe("legacy Admin URL compatibility", () => {
  it("maps the allow-listed board views to singular canonical routes", () => {
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=home"))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=quests"))).toBe("/quest");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=disputes"))).toBe("/dispute");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=reports"))).toBe("/report");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=conduct-reports"))).toBe("/conduct-report");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=payouts"))).toBe("/payout");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=users"))).toBe("/member");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=wallets"))).toBe("/wallet");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=activity"))).toBe("/activity");
  });

  it("prefers user over openUser for Member detail compatibility", () => {
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=users&user=member%2F1&openUser=member-2"))).toBe("/member/member%2F1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?openUser=member-2"))).toBe("/member/member-2");
  });

  it("maps old plural detail paths and unknown views safely", () => {
    expect(canonicalRouteForLegacyUrl(legacyUrl("/quests/QST-1"))).toBe("/quest/QST-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/disputes/DSP-1"))).toBe("/dispute/DSP-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/reports/RPT-1"))).toBe("/report/RPT-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/users/member-1"))).toBe("/member/member-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=policies"))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=not-a-route"))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/login"))).toBeNull();
  });

  it("protects canonical and compatibility Admin paths only", () => {
    expect(isAdminProtectedPath("/")).toBe(true);
    expect(isAdminProtectedPath("/overview")).toBe(true);
    expect(isAdminProtectedPath("/quest/QST-1")).toBe(true);
    expect(isAdminProtectedPath("/users/member-1")).toBe(true);
    expect(isAdminProtectedPath("/questing")).toBe(false);
    expect(isAdminProtectedPath("/login")).toBe(false);
    expect(isAdminProtectedPath("/kuquest-logo.png")).toBe(false);
  });
});
