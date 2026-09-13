import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { canonicalRouteForLegacyUrl, isAdminProtectedPath } from "./lib/auth/admin-routing";
import { hasAdminSessionCookie } from "./lib/auth/admin-session-policy";

export const config = {
  matcher: [
    "/",
    "/overview/:path*",
    "/quest/:path*",
    "/dispute/:path*",
    "/report/:path*",
    "/conduct-report/:path*",
    "/payout/:path*",
    "/member/:path*",
    "/wallet/:path*",
    "/activity/:path*",
    "/quests/:path*",
    "/disputes/:path*",
    "/reports/:path*",
    "/users/:path*",
  ],
};

export function isAdminApiAuthenticationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE === "api";
}

function loginRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/login", request.url));
}

export function proxy(request: NextRequest): NextResponse {
  const legacyTarget = canonicalRouteForLegacyUrl(request.nextUrl);
  const hasSessionCookie = hasAdminSessionCookie(request.cookies.getAll());

  if (legacyTarget && legacyTarget !== request.nextUrl.pathname) {
    return NextResponse.redirect(new URL(legacyTarget, request.url));
  }

  if (isAdminApiAuthenticationEnabled() && isAdminProtectedPath(request.nextUrl.pathname) && !hasSessionCookie) {
    return loginRedirect(request);
  }

  return NextResponse.next();
}
