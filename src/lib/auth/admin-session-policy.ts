export const ADMIN_SESSION_COOKIE_PREFIX = "kuquest-admin";

export type AdminCookie = Readonly<{
  name: string;
  value: string;
}>;

export type AdminSessionIdentityLike = Readonly<{
  disabledAt?: string | null;
}>;

export type AdminSessionDecision = "authenticated" | "missing" | "forbidden";

export function isAdminSessionCookieName(name: string): boolean {
  return name !== "kuquest-admin.mock-session"
    && (name === ADMIN_SESSION_COOKIE_PREFIX
      || name.startsWith(`${ADMIN_SESSION_COOKIE_PREFIX}.`)
      || name.startsWith(`${ADMIN_SESSION_COOKIE_PREFIX}_`));
}

export function hasAdminSessionCookie(
  cookies: readonly AdminCookie[],
): boolean {
  return cookies.some(({ name, value }) => Boolean(value) && isAdminSessionCookieName(name));
}

export function adminSessionCookieHeader(cookies: readonly AdminCookie[]): string {
  return cookies
    .filter(({ name, value }) => isAdminSessionCookieName(name) && Boolean(value))
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export function adminSessionDecision(
  identity: AdminSessionIdentityLike | null | undefined,
): AdminSessionDecision {
  if (!identity) return "missing";
  return identity.disabledAt ? "forbidden" : "authenticated";
}
