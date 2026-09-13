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
import { isAdminProtectedPath } from "../../src/lib/auth/admin-routing";

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

describe("Admin route protection", () => {
  it("protects canonical Admin paths only", () => {
    expect(isAdminProtectedPath("/")).toBe(true);
    expect(isAdminProtectedPath("/overview")).toBe(true);
    expect(isAdminProtectedPath("/quest/QST-1")).toBe(true);
    expect(isAdminProtectedPath("/users/member-1")).toBe(false);
    expect(isAdminProtectedPath("/questing")).toBe(false);
    expect(isAdminProtectedPath("/login")).toBe(false);
    expect(isAdminProtectedPath("/kuquest-logo.png")).toBe(false);
  });
});
