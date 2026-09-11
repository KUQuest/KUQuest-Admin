export const WALLET_COMPARTMENT_ACCOUNT_TYPES = [
  "SPENDING",
  "EARNINGS",
  "FUNDING_RESERVED",
  "RESERVED_FOR_PAYOUTS",
] as const;

export type WalletCompartmentAccountType = (typeof WALLET_COMPARTMENT_ACCOUNT_TYPES)[number];

export type WalletBalances = {
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  fundingReservedSatang: number;
  reservedForPayoutsSatang: number;
};

export type WalletStatementPosting = {
  accountType: string;
  walletId: string | null;
  amountSatang: number;
};

export type WalletStatementTransaction = {
  id: string;
  businessReference?: string;
  eventType: string;
  description: string | null;
  createdAt: string;
  sealedAt: string | null;
  postings: WalletStatementPosting[];
  balanceAfter?: WalletBalances;
};

export type WalletStatementFilters = {
  eventType: string;
  from: string;
  to: string;
};

export type WalletStatementMovement = {
  accountType: WalletCompartmentAccountType;
  amountSatang: number;
};

export type WalletStatementRow = {
  transaction: WalletStatementTransaction;
  signedAmountSatang: number;
  movement: WalletStatementMovement[];
  resultingBalances: WalletBalances;
  resultingWalletBalanceSatang: number;
};

export function currentWalletBalance(balances: WalletBalances): number {
  return balances.spendingBalanceSatang
    + balances.earningsBalanceSatang
    + balances.fundingReservedSatang
    + balances.reservedForPayoutsSatang;
}

export function totalWalletFunds(wallets: readonly WalletBalances[]): number {
  return wallets.reduce((total, wallet) => total + currentWalletBalance(wallet), 0);
}

function timestampFor(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function dateBoundary(value: string, endOfDay: boolean): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const suffix = endOfDay ? "T23:59:59.999+07:00" : "T00:00:00.000+07:00";
  const timestamp = Date.parse(`${value}${suffix}`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function filterWalletStatementTransactions(
  transactions: readonly WalletStatementTransaction[],
  filters: WalletStatementFilters,
): WalletStatementTransaction[] {
  const from = dateBoundary(filters.from, false);
  const to = dateBoundary(filters.to, true);

  return transactions.filter((transaction) => {
    if (!transaction.sealedAt) return false;
    if (filters.eventType && transaction.eventType !== filters.eventType) return false;
    const createdAt = timestampFor(transaction.createdAt);
    return (from === null || createdAt >= from) && (to === null || createdAt <= to);
  });
}

function walletMovementFor(
  transaction: WalletStatementTransaction,
  walletId: string,
): WalletStatementMovement[] {
  return transaction.postings.flatMap((posting) => {
    if (posting.walletId !== walletId) return [];
    if (!(WALLET_COMPARTMENT_ACCOUNT_TYPES as readonly string[]).includes(posting.accountType)) return [];
    return [{
      accountType: posting.accountType as WalletCompartmentAccountType,
      amountSatang: posting.amountSatang,
    }];
  });
}

function applyReverseMovement(
  balances: WalletBalances,
  movement: readonly WalletStatementMovement[],
): WalletBalances {
  const next = { ...balances };
  for (const item of movement) {
    if (item.accountType === "SPENDING") next.spendingBalanceSatang -= item.amountSatang;
    if (item.accountType === "EARNINGS") next.earningsBalanceSatang -= item.amountSatang;
    if (item.accountType === "FUNDING_RESERVED") next.fundingReservedSatang -= item.amountSatang;
    if (item.accountType === "RESERVED_FOR_PAYOUTS") next.reservedForPayoutsSatang -= item.amountSatang;
  }
  return next;
}

export function walletStatementRows(
  transactions: readonly WalletStatementTransaction[],
  walletId: string,
  currentBalances: WalletBalances,
): WalletStatementRow[] {
  let runningBalances = { ...currentBalances };
  const ordered = transactions
    .filter((transaction) => Boolean(transaction.sealedAt))
    .toSorted((first, second) => {
      const dateDifference = timestampFor(second.createdAt) - timestampFor(first.createdAt);
      return dateDifference || second.id.localeCompare(first.id);
    });

  return ordered.flatMap((transaction) => {
    const movement = walletMovementFor(transaction, walletId);
    if (!movement.length) return [];
    const resultingBalances = transaction.balanceAfter
      ? { ...transaction.balanceAfter }
      : { ...runningBalances };
    runningBalances = applyReverseMovement(resultingBalances, movement);
    return [{
      transaction,
      signedAmountSatang: movement.reduce((total, item) => total + item.amountSatang, 0),
      movement,
      resultingBalances,
      resultingWalletBalanceSatang: currentWalletBalance(resultingBalances),
    }];
  });
}

export function latestWalletTransactionDate(
  transactions: readonly WalletStatementTransaction[],
): string | null {
  return transactions
    .filter((transaction) => Boolean(transaction.sealedAt))
    .toSorted((first, second) => timestampFor(second.createdAt) - timestampFor(first.createdAt))
    .at(0)?.createdAt || null;
}
