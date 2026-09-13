import { ADMIN_LEDGER_EVENT_TYPES, type AdminLedgerEventType } from "../api/admin-api";
import type { LegacyRecord } from "./runtime";
import {
  filterWalletStatementTransactions,
  latestWalletStatementRows,
  walletStatementRows,
  type WalletBalances,
  type WalletStatementFilters,
  type WalletStatementRow,
  type WalletStatementTransaction,
} from "./wallet-model";

function numberOrZero(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export type WalletStatementViewState = {
  transactions: WalletStatementTransaction[];
  balanceTransactions: WalletStatementTransaction[];
  balanceNextCursor: string | null;
  nextCursor: string | null;
  visibleCount: number;
  loading: boolean;
  error: string;
  loaded: boolean;
  filters: WalletStatementFilters;
  requestId: number;
};

export type WalletStatementLoaderQuery = {
  eventType?: AdminLedgerEventType;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export type WalletStatementLoader = (
  walletId: string,
  query?: WalletStatementLoaderQuery,
) => Promise<{ items: WalletStatementTransaction[]; nextCursor: string | null }>;

export function isWalletStatementEventType(value: string): value is AdminLedgerEventType {
  return ADMIN_LEDGER_EVENT_TYPES.some((eventType) => eventType === value);
}

export function walletStatementFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function walletStatementMoney(value: number): string {
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  return `${sign}฿${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value) / 100)}`;
}

export function walletStatementBalance(value: number): string {
  return `฿${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)}`;
}

export function walletBalancesFromRecord(wallet: LegacyRecord): WalletBalances {
  return {
    spendingBalanceSatang: numberOrZero(wallet.walletSpendingBalanceSatang),
    earningsBalanceSatang: numberOrZero(wallet.walletEarningsBalanceSatang),
    fundingReservedSatang: numberOrZero(wallet.walletFundingReservedSatang),
    reservedForPayoutsSatang: numberOrZero(wallet.walletReservedForPayoutsSatang),
  };
}

export function walletStatementDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })} ICT`;
}

export function walletStatementApiDate(value: string, endOfDay: boolean): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`;
}

export function walletCompartmentLabel(accountType: string): string {
  const labels: Record<string, string> = {
    SPENDING: "Spending Balance",
    EARNINGS: "Earnings Balance",
    FUNDING_RESERVED: "Funding Reserved",
    RESERVED_FOR_PAYOUTS: "Reserved For Payouts",
  };
  return labels[accountType] || accountType;
}

export function walletStatementRowsFor(
  walletId: string,
  currentBalances: WalletBalances,
  statementState: WalletStatementViewState,
): WalletStatementRow[] {
  const visibleTransactions = filterWalletStatementTransactions(
    statementState.transactions,
    statementState.filters,
  );
  const visibleIds = new Set(visibleTransactions.map((transaction) => transaction.id));
  const rows = statementState.visibleCount === 5
    && !statementState.filters.eventType
    && !statementState.filters.from
    && !statementState.filters.to
    ? latestWalletStatementRows(statementState.balanceTransactions, walletId, currentBalances)
    : walletStatementRows(statementState.balanceTransactions, walletId, currentBalances);
  return rows.filter((row) => visibleIds.has(row.transaction.id)).slice(0, statementState.visibleCount);
}

export function walletStatementTable(
  rows: WalletStatementRow[],
  escapeActivityText: (value: unknown) => string,
): string {
  if (!rows.length) {
    return '<div class="empty"><h4>No Ledger Transactions</h4><p>No sealed Ledger Transactions match these filters.</p></div>';
  }
  return `<div class="table-wrap" role="region" aria-label="Wallet Statement table"><table class="data wallet-statement-table"><caption>Wallet Statement</caption><thead><tr><th scope="col">Date</th><th scope="col">Event type</th><th scope="col">Signed amount</th><th scope="col">Compartment movement</th><th scope="col">Resulting Wallet balance</th></tr></thead><tbody>${rows.map((row) => {
    const dateLabel = walletStatementDateTime(row.transaction.createdAt);
    const movement = row.movement.map((item) => `<span>${escapeActivityText(walletCompartmentLabel(item.accountType))}: ${escapeActivityText(walletStatementMoney(item.amountSatang))}</span>`).join("");
    return `<tr><td><time datetime="${escapeActivityText(row.transaction.createdAt)}">${escapeActivityText(dateLabel)}</time>${row.transaction.description ? `<small>${escapeActivityText(row.transaction.description)}</small>` : ""}</td><td><strong>${escapeActivityText(row.transaction.eventType)}</strong>${row.transaction.businessReference ? `<small>${escapeActivityText(row.transaction.businessReference)}</small>` : ""}</td><td class="money">${escapeActivityText(walletStatementMoney(row.signedAmountSatang))}</td><td class="wallet-statement-movement">${movement}</td><td class="money">${escapeActivityText(walletStatementBalance(row.resultingWalletBalanceSatang))}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

export function walletStatementFiltersMarkup(
  filters: WalletStatementFilters,
  eventTypes: readonly string[],
  escapeActivityText: (value: unknown) => string,
): string {
  const eventOptions = eventTypes.map((eventType) => `<option value="${escapeActivityText(eventType)}"${filters.eventType === eventType ? " selected" : ""}>${escapeActivityText(eventType)}</option>`).join("");
  return `<form class="wallet-statement-filters" data-wallet-statement-filter><label>Event type<select name="eventType"><option value="">All event types</option>${eventOptions}</select></label><label>From ICT date<input name="from" type="date" value="${escapeActivityText(filters.from)}"></label><label>To ICT date<input name="to" type="date" value="${escapeActivityText(filters.to)}"></label><button class="btn primary" type="submit">Apply filters</button><button class="btn" type="button" data-wallet-statement-action="clear">Clear</button></form>`;
}

export function walletStatementHasBalanceCoverage(
  transactions: readonly WalletStatementTransaction[],
  oldestCreatedAt: string,
): boolean {
  const cutoff = Date.parse(oldestCreatedAt);
  return !Number.isFinite(cutoff) || transactions.some((transaction) => {
    const timestamp = Date.parse(transaction.createdAt);
    return Number.isFinite(timestamp) && timestamp <= cutoff;
  });
}

export async function loadWalletStatementBalanceCoverage(
  walletId: string,
  statementState: WalletStatementViewState,
  oldestCreatedAt: string | undefined,
  requestId: number,
  loadPage: WalletStatementLoader,
): Promise<void> {
  if (!oldestCreatedAt || walletStatementHasBalanceCoverage(statementState.balanceTransactions, oldestCreatedAt)) return;
  if (!statementState.balanceNextCursor) {
    const page = await loadPage(walletId, { limit: 25 });
    if (requestId !== statementState.requestId) return;
    const unique = new Map([...statementState.balanceTransactions, ...page.items].map((transaction) => [transaction.id, transaction]));
    statementState.balanceTransactions = [...unique.values()];
    statementState.balanceNextCursor = page.nextCursor;
    if (walletStatementHasBalanceCoverage(statementState.balanceTransactions, oldestCreatedAt)) return;
  }
  while (statementState.balanceNextCursor && requestId === statementState.requestId) {
    const page = await loadPage(walletId, {
      limit: 25,
      cursor: statementState.balanceNextCursor,
    });
    if (requestId !== statementState.requestId) return;
    const unique = new Map([...statementState.balanceTransactions, ...page.items].map((transaction) => [transaction.id, transaction]));
    statementState.balanceTransactions = [...unique.values()];
    statementState.balanceNextCursor = page.nextCursor;
    if (walletStatementHasBalanceCoverage(statementState.balanceTransactions, oldestCreatedAt)) return;
  }
}
