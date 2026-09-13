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

export const adminNavigation = [
  { key: "overview", label: "Overview", href: overviewRoutes.list(), icon: "home", group: "primary" },
  { key: "quest", label: "Quest", href: questRoutes.list(), icon: "quest", group: "primary" },
  { key: "dispute", label: "Dispute Cases", href: disputeRoutes.list(), icon: "dispute", group: "primary" },
  { key: "report", label: "Report Cases", href: reportRoutes.list(), icon: "report", group: "primary" },
  { key: "conduct-report", label: "Conduct Reports", href: conductReportRoutes.list(), icon: "conduct-report", group: "primary" },
  { key: "payout", label: "Payouts", href: payoutRoutes.list(), icon: "payout", group: "primary" },
  { key: "member", label: "Members", href: memberRoutes.list(), icon: "member", group: "primary" },
  { key: "wallet", label: "Wallets", href: walletRoutes.list(), icon: "wallet", group: "primary" },
  { key: "activity", label: "Activity Log", href: activityRoutes.list(), icon: "activity", group: "system" },
] as const;

export type AdminNavigationKey = (typeof adminNavigation)[number]["key"];
export type AdminNavigationIcon = (typeof adminNavigation)[number]["icon"];

export const primaryAdminNavigation = adminNavigation.filter(({ group }) => group === "primary");
export const systemAdminNavigation = adminNavigation.filter(({ group }) => group === "system");

const detailRoutePrefixes = [
  questRoutes.list(),
  disputeRoutes.list(),
  reportRoutes.list(),
  payoutRoutes.list(),
  memberRoutes.list(),
] as const;

function normalizedPathname(pathname: string): string {
  if (pathname.length <= 1) return pathname;
  return pathname.replace(/\/+$/, "");
}

export function activeAdminNavigation(pathname: string): AdminNavigationKey {
  const normalized = normalizedPathname(pathname);
  return adminNavigation.find(({ href }) => normalized === href || normalized.startsWith(`${href}/`))?.key ?? "overview";
}

export function isAdminDetailPathname(pathname: string): boolean {
  const normalized = normalizedPathname(pathname);
  return detailRoutePrefixes.some((prefix) => normalized.startsWith(`${prefix}/`));
}
