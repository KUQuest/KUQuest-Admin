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
import { memberTabFrom, memberTabHref } from "../../features/admin/member/member-model";

type LegacyUrl = Readonly<{
  pathname: string;
  searchParams: URLSearchParams;
}>;

const legacyRootQueryKeys = ["view", "user", "openUser"] as const;

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

function safeLegacyIdentifier(value: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized || normalized === "." || normalized === "..") return null;
  return normalized;
}

function routePrefixMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function legacyPathSegment(pathname: string, prefix: string, suffix = ""): string | null {
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  const end = suffix ? pathname.length - suffix.length : pathname.length;
  const encodedId = pathname.slice(prefix.length, end);
  if (!encodedId || encodedId.includes("/")) return null;

  try {
    const id = decodeURIComponent(encodedId);
    return safeLegacyIdentifier(id);
  } catch {
    return null;
  }
}

function legacyDetailId(pathname: string, prefix: string): string | null {
  return legacyPathSegment(pathname, `${prefix}/`);
}

function memberIdFromLegacyUrl(url: LegacyUrl): string | null {
  return safeLegacyIdentifier(url.searchParams.get("user"))
    ?? safeLegacyIdentifier(url.searchParams.get("openUser"));
}

function memberDetailRouteFromLegacyUrl(url: LegacyUrl, memberId: string): string {
  return memberTabHref(memberId, memberTabFrom(url.searchParams.get("tab")));
}

function memberWalletStatementId(pathname: string): string | null {
  return legacyPathSegment(pathname, "/member/", "/wallet-statement");
}

export function canonicalRouteForLegacyUrl(url: LegacyUrl): string | null {
  if (url.pathname === "/") {
    const memberId = memberIdFromLegacyUrl(url);
    if (memberId) return memberDetailRouteFromLegacyUrl(url, memberId);

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
      case "topups":
        // Issue #68 has no canonical Top-up route. Keep this legacy link safe.
        return overviewRoutes.list();
      case "activity":
        return activityRoutes.list();
      case "home":
      case "policies":
      default:
        return overviewRoutes.list();
    }
  }

  const walletStatementMemberId = memberWalletStatementId(url.pathname);
  if (walletStatementMemberId) return `${memberRoutes.detail(walletStatementMemberId)}?tab=wallet-statement`;

  const questId = legacyDetailId(url.pathname, "/quests");
  if (questId) return questRoutes.detail(questId);

  const disputeId = legacyDetailId(url.pathname, "/disputes");
  if (disputeId) return disputeRoutes.detail(disputeId);

  const reportId = legacyDetailId(url.pathname, "/reports");
  if (reportId) return reportRoutes.detail(reportId);

  const memberId = legacyDetailId(url.pathname, "/users");
  if (memberId) return memberDetailRouteFromLegacyUrl(url, memberId);

  return null;
}

export function isLegacyAdminUrl(url: LegacyUrl): boolean {
  return url.pathname === "/" && legacyRootQueryKeys.some((key) => url.searchParams.has(key));
}

export function isAdminProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return adminRoutePrefixes.some((prefix) => routePrefixMatches(pathname, prefix));
}
