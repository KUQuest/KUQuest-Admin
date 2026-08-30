import type { AdminReview, PersistedAdminData } from "./admin-records";

export const ADMIN_DEMO_DATA_KEY = "kuquest-admin-demo-data";

export type BrowserStorage = Pick<Storage, "getItem" | "setItem">;

function isPersistedAdminData(value: unknown): value is PersistedAdminData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedAdminData>;
  const collections = candidate.collections;
  if (!collections) return false;
  return (
    typeof candidate.version === "string" &&
    Array.isArray(collections.users) &&
    Array.isArray(collections.quests) &&
    Array.isArray(collections.payouts) &&
    Array.isArray(collections.disputes) &&
    Array.isArray(collections.reports)
  );
}

export function readAdminData(storage: BrowserStorage): PersistedAdminData | null {
  try {
    const raw = storage.getItem(ADMIN_DEMO_DATA_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersistedAdminData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readUserReviews(
  storage: BrowserStorage,
  userId: string,
): AdminReview[] | null {
  const user = readAdminData(storage)?.collections.users.find((candidate) => candidate.id === userId);
  return user?.reviews ? [...user.reviews] : null;
}

export function saveUserReviews(
  storage: BrowserStorage,
  userId: string,
  reviews: AdminReview[],
): boolean {
  const data = readAdminData(storage);
  const user = data?.collections.users.find((candidate) => candidate.id === userId);
  if (!data || !user) return false;

  user.reviews = reviews;
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
