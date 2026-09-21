import type { AdminLedgerTransaction } from "../api/admin-api";
import { formatAdminTimestamp } from "../date-format";

export type MemberWalletBalances = {
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  fundingReservedSatang: number;
  reservedForPayoutsSatang: number;
};

export type MemberWalletPosting = {
  accountType: string;
  walletId: string | null;
  amountSatang: number;
};

export type MemberWalletTransaction = {
  id: string;
  businessReference?: string;
  eventType: string;
  description: string | null;
  createdAt: string;
  sealedAt: string | null;
  postings: MemberWalletPosting[];
  balanceAfter?: MemberWalletBalances;
};

export type MemberWalletStatementRow = {
  transaction: MemberWalletTransaction;
  signedAmountSatang: number;
  movement: Array<{ accountType: string; amountSatang: number }>;
  resultingBalances: MemberWalletBalances;
  resultingWalletBalanceSatang: number;
};

export type MemberWalletStatementSource = {
  walletId: string | null;
  walletBalances: MemberWalletBalances | null;
  walletStatement: MemberWalletTransaction[];
};

const WALLET_ACCOUNT_TYPES: Record<string, true> = {
  SPENDING: true,
  EARNINGS: true,
  FUNDING_RESERVED: true,
  RESERVED_FOR_PAYOUTS: true,
};

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function balancesFromWallet(wallet: {
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  fundingReservedSatang?: number;
  reservedForPayoutsSatang?: number;
} | null | undefined): MemberWalletBalances | null {
  if (!wallet) return null;
  return {
    spendingBalanceSatang: numberValue(wallet.spendingBalanceSatang),
    earningsBalanceSatang: numberValue(wallet.earningsBalanceSatang),
    fundingReservedSatang: numberValue(wallet.fundingReservedSatang),
    reservedForPayoutsSatang: numberValue(wallet.reservedForPayoutsSatang),
  };
}

export function transactionFromApi(transaction: AdminLedgerTransaction): MemberWalletTransaction {
  return {
    id: transaction.id,
    businessReference: transaction.businessReference,
    eventType: transaction.eventType,
    description: transaction.description,
    createdAt: transaction.createdAt,
    sealedAt: transaction.sealedAt,
    postings: transaction.postings.map((posting) => ({
      accountType: posting.accountType,
      walletId: posting.walletId,
      amountSatang: posting.amountSatang,
    })),
  };
}

export function walletTransactionsFromMock(walletId: string): MemberWalletTransaction[] {
  return Array.from({ length: 50 }, (_, index) => {
    const eventType = index < 11 ? "TOP_UP" : index % 3 === 0 ? "PAYOUT" : "EARNINGS_CONVERSION";
    const amountSatang = 1000 + index * 125;
    const createdAt = new Date(Date.UTC(2026, 7, 28, 8, 0, 0) - index * 86_400_000).toISOString();
    return {
      id: `LEDGER-${walletId}-${index + 1}`,
      businessReference: `${eventType}-${index + 1}`,
      eventType,
      description: `${eventType.replaceAll("_", " ")} record`,
      createdAt,
      sealedAt: createdAt,
      postings: [{ accountType: "SPENDING", walletId, amountSatang }],
    };
  });
}

export function currentWalletBalance(balances: MemberWalletBalances | null): number {
  if (!balances) return 0;
  return balances.spendingBalanceSatang
    + balances.earningsBalanceSatang
    + balances.fundingReservedSatang
    + balances.reservedForPayoutsSatang;
}

function dateBoundary(value: string, endOfDay: boolean): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}${endOfDay ? "T23:59:59.999+07:00" : "T00:00:00.000+07:00"}`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function walletStatementRows(
  model: MemberWalletStatementSource,
  filters: { eventType: string; from: string; to: string },
  visibleCount: number,
): MemberWalletStatementRow[] {
  const from = dateBoundary(filters.from, false);
  const to = dateBoundary(filters.to, true);
  if (!model.walletId || !model.walletBalances) return [];
  const ordered = model.walletStatement
    .filter((transaction) => transaction.sealedAt)
    .toSorted((first, second) => {
      const dateDifference = Date.parse(second.createdAt) - Date.parse(first.createdAt);
      return dateDifference || second.id.localeCompare(first.id);
    });
  let runningBalances = { ...model.walletBalances };
  const rows = ordered.flatMap((transaction) => {
    const movement = transaction.postings.filter((posting) => posting.walletId === model.walletId && WALLET_ACCOUNT_TYPES[posting.accountType]);
    if (!movement.length) return [];
    const resultingBalances = transaction.balanceAfter ? { ...transaction.balanceAfter } : { ...runningBalances };
    const previousBalances = { ...resultingBalances };
    for (const posting of movement) {
      if (posting.accountType === "SPENDING") previousBalances.spendingBalanceSatang -= posting.amountSatang;
      if (posting.accountType === "EARNINGS") previousBalances.earningsBalanceSatang -= posting.amountSatang;
      if (posting.accountType === "FUNDING_RESERVED") previousBalances.fundingReservedSatang -= posting.amountSatang;
      if (posting.accountType === "RESERVED_FOR_PAYOUTS") previousBalances.reservedForPayoutsSatang -= posting.amountSatang;
    }
    runningBalances = previousBalances;
    return [{
      transaction,
      signedAmountSatang: movement.reduce((sum, posting) => sum + posting.amountSatang, 0),
      movement,
      resultingBalances,
      resultingWalletBalanceSatang: currentWalletBalance(resultingBalances),
    }];
  });
  return rows
    .filter(({ transaction }) => !filters.eventType || transaction.eventType === filters.eventType)
    .filter(({ transaction }) => {
      const timestamp = Date.parse(transaction.createdAt);
      return (from === null || timestamp >= from) && (to === null || timestamp <= to);
    })
    .slice(0, visibleCount);
}

export function formatMoneySatang(value: number, signed = false): string {
  const sign = signed && value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}฿${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value) / 100)}`;
}

export function formatWalletDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "Not provided";
  const formatted = formatAdminTimestamp(raw, "Asia/Bangkok");
  return formatted === raw && !raw.match(/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/) ? "Not provided" : formatted;
}
