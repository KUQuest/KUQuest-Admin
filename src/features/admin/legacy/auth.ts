export const ADMIN_SESSION_KEY = "kuquest-admin-session";

export type SessionStorage = Pick<Storage, "getItem">;

export type BrowserLocation = Pick<Location, "replace">;

export function hasAdminSession(storage: SessionStorage): boolean {
  return Boolean(storage.getItem(ADMIN_SESSION_KEY));
}

export function requireAdminSession(
  storage: SessionStorage,
  browserLocation: BrowserLocation,
): boolean {
  if (hasAdminSession(storage)) return true;
  browserLocation.replace("/login");
  return false;
}
