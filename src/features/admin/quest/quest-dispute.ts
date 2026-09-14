import type { AdminApiRequestOptions } from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import { DISPUTE_CASE_STATUSES } from "../domain/rulebook";

export const DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE =
  "Dispute Case status is unavailable. The Admin API could not check linked cases.";

export async function findDisputeForQuest(
  questId: string,
  options?: AdminApiRequestOptions,
): Promise<string | null> {
  for (const status of DISPUTE_CASE_STATUSES) {
    let cursor: string | undefined;
    do {
      const page = await adminApi.listDisputes({
        status,
        limit: 50,
        ...(cursor ? { cursor } : {}),
      }, options);
      const linkedCase = page.items.find((item) => item.questId === questId);
      if (linkedCase) return linkedCase.id;
      if (!page.nextCursor || page.nextCursor === cursor) break;
      cursor = page.nextCursor;
    } while (cursor);
  }
  return null;
}
