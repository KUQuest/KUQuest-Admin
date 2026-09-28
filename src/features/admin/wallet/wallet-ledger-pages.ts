import type { AdminApiRequestOptions } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";

// Kept free of next/headers so Client Component import chains can use it.
export async function loadAllWalletLedgerTransactions(
  walletId: string,
  options: AdminApiRequestOptions,
) {
  const transactions = [] as Awaited<ReturnType<typeof adminApiProvider.read.listLedgerTransactions>>["items"];
  let cursor: string | undefined;

  do {
    const page = await adminApiProvider.read.listLedgerTransactions({ walletId, limit: 50, cursor }, options);
    transactions.push(...page.items);
    const nextCursor = page.nextCursor ?? undefined;
    if (nextCursor === cursor) break;
    cursor = nextCursor;
  } while (cursor);

  return transactions;
}
