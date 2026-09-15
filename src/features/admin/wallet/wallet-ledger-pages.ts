import type { AdminApiRequestOptions } from "../api/admin-api";
import { adminApi } from "../api/admin-api";

// Kept free of next/headers so Client Component import chains can use it.
export async function loadAllWalletLedgerTransactions(
  walletId: string,
  options: AdminApiRequestOptions,
) {
  const transactions = [] as Awaited<ReturnType<typeof adminApi.listLedgerTransactions>>["items"];
  let cursor: string | undefined;

  do {
    const page = await adminApi.listLedgerTransactions({ walletId, limit: 50, cursor }, options);
    transactions.push(...page.items);
    const nextCursor = page.nextCursor ?? undefined;
    if (nextCursor === cursor) break;
    cursor = nextCursor;
  } while (cursor);

  return transactions;
}
