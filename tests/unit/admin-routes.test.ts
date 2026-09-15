import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

const appDirectory = join(dirname(fileURLToPath(import.meta.url)), "../../src/app");

function canonicalRouteSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return canonicalRouteSources(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
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
    expect(() => memberRoutes.detail(".")).toThrow("dot path segment");
    expect(() => memberRoutes.detail("..")).toThrow("dot path segment");
  });
});

describe("Admin route protection", () => {
  it("protects canonical Admin paths and legacy aliases only", () => {
    expect(isAdminProtectedPath("/")).toBe(true);
    expect(isAdminProtectedPath("/overview")).toBe(true);
    expect(isAdminProtectedPath("/quest/QST-1")).toBe(true);
    expect(isAdminProtectedPath("/quests/QST-1")).toBe(true);
    expect(isAdminProtectedPath("/disputes/DSP-1")).toBe(true);
    expect(isAdminProtectedPath("/reports/RPT-1")).toBe(true);
    expect(isAdminProtectedPath("/users/member-1")).toBe(true);
    expect(isAdminProtectedPath("/questing")).toBe(false);
    expect(isAdminProtectedPath("/usersettings")).toBe(false);
    expect(isAdminProtectedPath("/login")).toBe(false);
    expect(isAdminProtectedPath("/kuquest-logo.png")).toBe(false);
  });
});

describe("legacy Admin URL compatibility", () => {
  it("maps the allow-listed views to canonical routes", () => {
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=home"))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=quests"))).toBe("/quest");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=disputes"))).toBe("/dispute");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=reports"))).toBe("/report");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=conduct-reports"))).toBe("/conduct-report");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=payouts"))).toBe("/payout");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=users"))).toBe("/member");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=wallets"))).toBe("/wallet");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=topups"))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=activity"))).toBe("/activity");
  });

  it("prefers user over openUser and safely maps unknown views", () => {
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=users&user=member%2F1&openUser=member-2"))).toBe("/member/member%2F1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?openUser=member-2&tab=wallet-statement"))).toBe("/member/member-2?tab=wallet-statement");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=policies"))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=not-a-route"))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?user=..&openUser=member-2"))).toBe("/member/member-2");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?user=."))).toBe("/overview");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/login"))).toBeNull();
  });

  it("maps the legacy openDispute deep link after the Member keys", () => {
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=disputes&openDispute=DSP-1"))).toBe("/dispute/DSP-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?openDispute=DSP%2F1"))).toBe("/dispute/DSP%2F1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?openUser=member-2&openDispute=DSP-1"))).toBe("/member/member-2");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/?view=disputes&openDispute=.."))).toBe("/dispute");
  });

  it("rejects encoded dot segments in legacy paths", () => {
    const searchParams = new URLSearchParams();
    expect(canonicalRouteForLegacyUrl({ pathname: "/users/%2E%2E", searchParams })).toBeNull();
    expect(canonicalRouteForLegacyUrl({ pathname: "/quests/%2E", searchParams })).toBeNull();
    expect(canonicalRouteForLegacyUrl({ pathname: "/member/%2E%2E/wallet-statement", searchParams })).toBeNull();
  });

  it("maps old plural detail paths and the old Wallet Statement page", () => {
    expect(canonicalRouteForLegacyUrl(legacyUrl("/quests/QST-1"))).toBe("/quest/QST-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/disputes/DSP-1"))).toBe("/dispute/DSP-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/reports/RPT-1"))).toBe("/report/RPT-1");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/users/member-1?tab=wallet-statement"))).toBe("/member/member-1?tab=wallet-statement");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/member/member-1/wallet-statement"))).toBe("/member/member-1?tab=wallet-statement");
    expect(canonicalRouteForLegacyUrl(legacyUrl("/member/member-1/wallet-statement?unexpected=value"))).toBe("/member/member-1?tab=wallet-statement");
  });

});

describe("canonical App Router source boundary", () => {
  it("does not import or call the legacy runtime", () => {
    const sources = [
      join(appDirectory, "page.tsx"),
      ...canonicalRouteSources(join(appDirectory, "(admin)")),
    ];
    const legacyReference = /LegacyAdminPage|legacy-admin-page|features\/admin\/legacy/;
    const violations = sources.filter((source) => legacyReference.test(readFileSync(source, "utf8")));

    expect(violations).toEqual([]);
  });
});
