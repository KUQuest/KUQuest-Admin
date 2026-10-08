import type { AdminApiRequestOptions } from "../api/admin-api";
import { adminLedgerTransactionsPageSchema } from "../api/admin-api-types-queries";
import { adminApiProvider } from "../api/admin-provider";
import { isWalletCompartmentAccountType } from "./wallet-model";

// Kept free of next/headers so Client Component import chains can use it.
export class WalletLedgerContractError extends Error {
  constructor() {
    super("Wallet Statement data does not match the Admin API contract.");
    this.name = "WalletLedgerContractError";
  }
}

function hasBalancedPostings(postings: Array<{ amountSatang: number }>): boolean {
  if (postings.length < 2) return false;
  let totalSatang = 0;
  for (const posting of postings) {
    if (!Number.isSafeInteger(posting.amountSatang)) return false;
    totalSatang += posting.amountSatang;
    if (!Number.isSafeInteger(totalSatang)) return false;
  }
  return totalSatang === 0;
}

export async function loadAllWalletLedgerTransactions(
  walletId: string,
  options: AdminApiRequestOptions,
) {
  const transactions = [] as Awaited<ReturnType<typeof adminApiProvider.read.listLedgerTransactions>>["items"];
  const seenCursors = new Set<string>();
  const seenTransactions = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const rawPage = await adminApiProvider.read.listLedgerTransactions({ walletId, limit: 50, cursor }, options);
    const result = adminLedgerTransactionsPageSchema.safeParse(rawPage);
    if (!result.success) throw new WalletLedgerContractError();
    const page = result.data;

    for (const transaction of page.items) {
      if (seenTransactions.has(transaction.id)
        || !transaction.postings.some((posting) => posting.walletId === walletId && isWalletCompartmentAccountType(posting.accountType))
        || !transaction.isBalanced
        || !hasBalancedPostings(transaction.postings)) {
        throw new WalletLedgerContractError();
      }
      seenTransactions.add(transaction.id);
      transactions.push(transaction);
    }

    const nextCursor = page.nextCursor ?? undefined;
    if (nextCursor === undefined) return transactions;
    if (!nextCursor || page.items.length === 0 || seenCursors.has(nextCursor)) {
      throw new WalletLedgerContractError();
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
}
