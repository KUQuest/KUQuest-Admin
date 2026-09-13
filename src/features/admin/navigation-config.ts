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
  { key: "overview", label: "Overview", href: overviewRoutes.list() },
  { key: "quest", label: "Quest", href: questRoutes.list() },
  { key: "dispute", label: "Dispute Cases", href: disputeRoutes.list() },
  { key: "report", label: "Report Cases", href: reportRoutes.list() },
  { key: "conduct-report", label: "Conduct Reports", href: conductReportRoutes.list() },
  { key: "payout", label: "Payouts", href: payoutRoutes.list() },
  { key: "member", label: "Members", href: memberRoutes.list() },
  { key: "wallet", label: "Wallets", href: walletRoutes.list() },
  { key: "activity", label: "Activity Log", href: activityRoutes.list() },
] as const;

export type AdminNavigationKey = (typeof adminNavigation)[number]["key"];

export function activeAdminNavigation(pathname: string): AdminNavigationKey {
  return adminNavigation.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.key ?? "overview";
}
