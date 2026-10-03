import type { AdminApiRequestOptions, AdminDisputeCase } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { DISPUTE_CASE_STATUSES } from "../domain/rulebook";

export const DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE =
  "Dispute Case status is unavailable. The Admin API could not check linked cases.";

export async function listDisputeCasesForQuest(
  questId: string,
  options?: AdminApiRequestOptions,
): Promise<AdminDisputeCase[]> {
  const cases: AdminDisputeCase[] = [];
  for (const status of DISPUTE_CASE_STATUSES) {
    let cursor: string | undefined;
    do {
      const page = await adminApiProvider.read.listDisputes({
        status,
        limit: 50,
        ...(cursor ? { cursor } : {}),
      }, options);
      cases.push(...page.items.filter((item) => item.questId === questId));
      if (!page.nextCursor || page.nextCursor === cursor) break;
      cursor = page.nextCursor;
    } while (cursor);
  }
  return cases;
}
