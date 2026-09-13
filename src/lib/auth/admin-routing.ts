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
} from "../../features/admin/admin-routes";

type LegacyUrl = Readonly<{
  pathname: string;
  searchParams: URLSearchParams;
}>;

const adminRoutePrefixes = [
  "/overview",
  "/quest",
  "/dispute",
  "/report",
  "/conduct-report",
  "/payout",
  "/member",
  "/wallet",
  "/activity",
] as const;

const legacyAdminRoutePrefixes = [
  "/quests",
  "/disputes",
  "/reports",
  "/users",
] as const;

function routePrefixMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function legacyDetailId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(`${prefix}/`)) return null;
  const encodedId = pathname.slice(prefix.length + 1);
  if (!encodedId || encodedId.includes("/")) return null;

  try {
    const id = decodeURIComponent(encodedId);
    return id.trim() ? id : null;
  } catch {
    return null;
  }
}

function memberIdFromLegacyUrl(url: LegacyUrl): string | null {
  const user = url.searchParams.get("user");
  const openUser = url.searchParams.get("openUser");
  const id = user?.trim() ? user : openUser;
  return id?.trim() ? id : null;
}

export function canonicalRouteForLegacyUrl(url: LegacyUrl): string | null {
  if (url.pathname === "/") {
    const memberId = memberIdFromLegacyUrl(url);
    if (memberId) return memberRoutes.detail(memberId);

    switch (url.searchParams.get("view")) {
      case "quests":
        return questRoutes.list();
      case "disputes":
        return disputeRoutes.list();
      case "reports":
        return reportRoutes.list();
      case "conduct-reports":
        return conductReportRoutes.list();
      case "payouts":
        return payoutRoutes.list();
      case "users":
        return memberRoutes.list();
      case "wallets":
        return walletRoutes.list();
      case "activity":
        return activityRoutes.list();
      case "home":
      case "policies":
      default:
        return overviewRoutes.list();
    }
  }

  const questId = legacyDetailId(url.pathname, "/quests");
  if (questId) return questRoutes.detail(questId);

  const disputeId = legacyDetailId(url.pathname, "/disputes");
  if (disputeId) return disputeRoutes.detail(disputeId);

  const reportId = legacyDetailId(url.pathname, "/reports");
  if (reportId) return reportRoutes.detail(reportId);

  const memberId = legacyDetailId(url.pathname, "/users");
  if (memberId) return memberRoutes.detail(memberId);

  return null;
}

export function isAdminProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return [...adminRoutePrefixes, ...legacyAdminRoutePrefixes].some((prefix) => routePrefixMatches(pathname, prefix));
}
