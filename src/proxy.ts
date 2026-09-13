import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requiresAdminSessionBoundary } from "./lib/auth/admin-auth-mode";
import { isAdminProtectedPath } from "./lib/auth/admin-routing";
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
  ],
};

function loginRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/login", request.url));
}

export function proxy(request: NextRequest): NextResponse {
  const hasSessionCookie = hasAdminSessionCookie(request.cookies.getAll());

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  if (requiresAdminSessionBoundary() && isAdminProtectedPath(request.nextUrl.pathname) && !hasSessionCookie) {
    return loginRedirect(request);
  }

  return NextResponse.next();
}
