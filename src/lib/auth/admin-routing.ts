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

function routePrefixMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAdminProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return adminRoutePrefixes.some((prefix) => routePrefixMatches(pathname, prefix));
}
