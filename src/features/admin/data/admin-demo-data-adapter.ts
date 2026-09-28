import {
  persistedAdminDataSchema,
  type AdminReview,
  type PersistedAdminData,
} from "./admin-records";

export const ADMIN_DEMO_DATA_KEY = "kuquest-admin-demo-data";

export type BrowserStorage = Pick<Storage, "getItem" | "setItem">;

export function readAdminData(storage: BrowserStorage): PersistedAdminData | null {
  try {
    const raw = storage.getItem(ADMIN_DEMO_DATA_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const result = persistedAdminDataSchema.safeParse(parsed);
    return result.success ? result.data : null;
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
