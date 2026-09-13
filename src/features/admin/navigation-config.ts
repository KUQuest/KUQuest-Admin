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
} from "./admin-routes";
import type { AdminNavigationCountKey } from "./admin-navigation";

type AdminNavigationItem = {
  key: string;
  label: string;
  href: string;
  icon: "home" | "quest" | "dispute" | "report" | "conduct-report" | "payout" | "member" | "wallet" | "activity";
  group: "primary" | "system";
  count: AdminNavigationCountKey | null;
};

export const adminNavigation = [
  { key: "overview", label: "Overview", href: overviewRoutes.list(), icon: "home", group: "primary", count: null },
  { key: "quest", label: "Quest", href: questRoutes.list(), icon: "quest", group: "primary", count: null },
  { key: "dispute", label: "Dispute Cases", href: disputeRoutes.list(), icon: "dispute", group: "primary", count: "disputes" },
  { key: "report", label: "Report Cases", href: reportRoutes.list(), icon: "report", group: "primary", count: "reports" },
  { key: "conduct-report", label: "Conduct Reports", href: conductReportRoutes.list(), icon: "conduct-report", group: "primary", count: "conductReports" },
  { key: "payout", label: "Payouts", href: payoutRoutes.list(), icon: "payout", group: "primary", count: "payouts" },
  { key: "member", label: "Members", href: memberRoutes.list(), icon: "member", group: "primary", count: null },
  { key: "wallet", label: "Wallets", href: walletRoutes.list(), icon: "wallet", group: "primary", count: null },
  { key: "activity", label: "Activity Log", href: activityRoutes.list(), icon: "activity", group: "system", count: null },
] as const satisfies readonly AdminNavigationItem[];

export type AdminNavigationKey = (typeof adminNavigation)[number]["key"];
export type AdminNavigationIcon = (typeof adminNavigation)[number]["icon"];

export const primaryAdminNavigation = adminNavigation.filter(({ group }) => group === "primary");
export const systemAdminNavigation = adminNavigation.filter(({ group }) => group === "system");

function normalizedPathname(pathname: string): string {
  if (pathname.length <= 1) return pathname;
  return pathname.replace(/\/+$/, "");
}

export function activeAdminNavigation(pathname: string): AdminNavigationKey {
  const normalized = normalizedPathname(pathname);
  return adminNavigation.find(({ href }) => normalized === href || normalized.startsWith(`${href}/`))?.key ?? "overview";
}
