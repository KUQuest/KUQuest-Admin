export const ADMIN_SESSION_COOKIE_PREFIX = "kuquest-admin";
export const ADMIN_MOCK_SESSION_COOKIE = "kuquest-admin.mock-session";

export type AdminCookie = Readonly<{
  name: string;
  value: string;
}>;

export type AdminSessionIdentityLike = Readonly<{
  disabledAt?: string | null;
}>;

export type AdminSessionDecision = "authenticated" | "missing" | "forbidden";

export function isAdminSessionCookieName(name: string): boolean {
  return name !== ADMIN_MOCK_SESSION_COOKIE
    && (name === ADMIN_SESSION_COOKIE_PREFIX
      || name.startsWith(`${ADMIN_SESSION_COOKIE_PREFIX}.`)
      || name.startsWith(`${ADMIN_SESSION_COOKIE_PREFIX}_`));
}

export function hasAdminSessionCookie(
  cookies: readonly AdminCookie[],
  options: { includeMock?: boolean } = {},
): boolean {
  return cookies.some(({ name, value }) => {
    if (!value) return false;
    if (options.includeMock && name === ADMIN_MOCK_SESSION_COOKIE) return true;
    return isAdminSessionCookieName(name);
  });
}

export function hasMockAdminSessionCookie(cookies: readonly AdminCookie[]): boolean {
  return cookies.some(({ name, value }) => name === ADMIN_MOCK_SESSION_COOKIE && Boolean(value));
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
