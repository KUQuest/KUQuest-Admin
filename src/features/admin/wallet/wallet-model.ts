import type {
  AdminFinanceOverview,
  AdminLedgerEventType,
  AdminLedgerTransaction,
  AdminWallet,
  AdminWalletDetail,
  AdminWalletStatusHistoryEntry,
  AdminWalletVerification,
} from "../api/admin-api";
import { pageCount, pageRows, type BoardPageSize } from "@/lib/board-pagination";
import { formatAdminTimestamp } from "../date-format";
import {
  walletStatusFor,
  walletStatusLabel,
  type WalletStatus,
} from "../domain/rulebook";

export const WALLET_BOARD_TABS = [
  { id: "all", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "FROZEN", label: "Frozen" },
  { id: "SUSPENDED", label: "Suspended" },
  { id: "CLOSED", label: "Closed" },
] as const;

export type WalletBoardTab = (typeof WALLET_BOARD_TABS)[number]["id"];
export type WalletBoardPageSize = BoardPageSize;
export type WalletSortKey = "id" | "member" | "balance" | "latestTransactionAt" | "status" | "createdAt";
export type WalletSortSelection = WalletSortKey | null;
export type WalletSortDirection = "ascending" | "descending";

export type WalletBoardRow = {
  id: string;
  memberId: string;
  memberAvailable: boolean;
  memberName: string;
  studentId: string | null;
  email: string;
  status: WalletStatus;
  statusLabel: string;
  currentBalanceSatang: number;
  latestTransactionAt: string | null;
  createdAt: string;
};

export type WalletFinanceSummary = {
  totalSpendingSatang: number;
  totalEarningsSatang: number;
  totalFundingReservedSatang: number;
  totalPayoutReservedSatang: number;
  totalCirculatingSatang: number;
};

export type WalletDetailView = WalletBoardRow & {
  projectionMatchesLedger: boolean;
  balances: {
    spendingBalanceSatang: number;
    earningsBalanceSatang: number;
    fundingReservedSatang: number;
    reservedForPayoutsSatang: number;
  };
};

export type WalletStatementPageView = WalletBoardRow & {
  balances: WalletDetailView["balances"];
};

export type WalletHistoryView = {
  id: string;
  fromStatus: WalletStatus | null;
  toStatus: WalletStatus;
  reason: string;
  actorAdminId: string | null;
  createdAt: string;
};

export type WalletLedgerView = {
  id: string;
  businessReference: string;
  eventType: string;
  description: string | null;
  createdAt: string;
  amountSatang: number;
  movement: Array<{ accountType: WalletCompartmentAccountType; amountSatang: number }>;
  resultingBalanceSatang: number;
};

const walletEventTypeLabels: Record<AdminLedgerEventType, string> = {
  TOP_UP: "Top-up",
  PAYOUT: "Payout",
  FUNDING_RESERVE: "Funding Reserve",
  FUNDING_RELEASE: "Funding Release",
  FUNDING_SETTLEMENT: "Funding Settlement",
  ADJUSTMENT: "Adjustment",
  EARNINGS_CONVERSION: "Earnings Conversion",
};

export function walletEventTypeLabel(eventType: string): string {
  const label = walletEventTypeLabels[eventType as AdminLedgerEventType];
  if (label) return label;
  return eventType.replaceAll("_", " ").toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function walletBusinessReferenceLabel(businessReference: string | undefined): string {
  return businessReference?.replaceAll("_", " ") ?? "";
}

export const WALLET_COMPARTMENT_ACCOUNT_TYPES = [
  "SPENDING",
  "EARNINGS",
  "FUNDING_RESERVED",
  "RESERVED_FOR_PAYOUTS",
] as const;

export type WalletCompartmentAccountType = (typeof WALLET_COMPARTMENT_ACCOUNT_TYPES)[number];

const walletCompartmentLabels: Record<WalletCompartmentAccountType, string> = {
  SPENDING: "Spending Balance",
  EARNINGS: "Earnings Balance",
  FUNDING_RESERVED: "Funding Reserved",
  RESERVED_FOR_PAYOUTS: "Reserved For Payouts",
};

export function walletCompartmentLabel(accountType: string): string {
  if (Object.hasOwn(walletCompartmentLabels, accountType)) {
    return walletCompartmentLabels[accountType as WalletCompartmentAccountType];
  }
  return accountType.toLowerCase().replaceAll("_", " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

const walletCompartmentAccountTypes = new Set<string>(WALLET_COMPARTMENT_ACCOUNT_TYPES);

function walletBalancesFromApi(balances: AdminWallet["balances"]): WalletDetailView["balances"] {
  return {
    spendingBalanceSatang: balances.spendingBalanceSatang,
    earningsBalanceSatang: balances.earningsBalanceSatang,
    fundingReservedSatang: balances.fundingReservedSatang,
    reservedForPayoutsSatang: balances.reservedForPayoutsSatang,
  };
}

const MEMBER_NOT_PROVIDED = "Member not provided";
const EMAIL_NOT_PROVIDED = "Email not provided";

function memberName(member: AdminWallet["member"]): string {
  if (!member) return MEMBER_NOT_PROVIDED;
  return `${member.firstName} ${member.lastName}`.trim() || member.email || MEMBER_NOT_PROVIDED;
}

export function walletRowFromApi(wallet: AdminWallet): WalletBoardRow {
  const status = walletStatusFor(wallet.walletStatus);
  const member = wallet.member;
  return {
    id: wallet.id,
    memberId: wallet.userId,
    memberAvailable: Boolean(member),
    memberName: memberName(member),
    studentId: member?.studentId ?? null,
    email: member?.email || EMAIL_NOT_PROVIDED,
    status,
    statusLabel: walletStatusLabel(status),
    currentBalanceSatang: wallet.balances.totalBalanceSatang,
    latestTransactionAt: wallet.latestTransactionAt ?? null,
    createdAt: wallet.createdAt,
  };
}

export function walletRowsFromApi(wallets: AdminWallet[]): WalletBoardRow[] {
  return wallets.map(walletRowFromApi);
}

export function walletDetailFromApi(wallet: AdminWalletDetail): WalletDetailView {
  return {
    ...walletRowFromApi(wallet),
    projectionMatchesLedger: wallet.projectionMatchesLedger,
    balances: walletBalancesFromApi(wallet.balances),
  };
}

export function walletStatementPageFromApi(wallet: AdminWallet): WalletStatementPageView {
  return {
    ...walletRowFromApi(wallet),
    balances: walletBalancesFromApi(wallet.balances),
  };
}

export function walletHistoryFromApi(
  history: AdminWalletStatusHistoryEntry[],
): WalletHistoryView[] {
  return history.map((entry) => ({
    id: entry.id,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    reason: entry.reason,
    actorAdminId: entry.actorAdminId,
    createdAt: entry.createdAt,
  }));
}

export type WalletVerificationView = {
  matches: boolean;
  activityCountMatches: boolean;
  projectedTotal: number;
  ledgerTotal: number;
};

function walletBalanceTotal(balances: {
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  fundingReservedSatang: number;
  reservedForPayoutsSatang: number;
}): number {
  return balances.spendingBalanceSatang
    + balances.earningsBalanceSatang
    + balances.fundingReservedSatang
    + balances.reservedForPayoutsSatang;
}

export function walletVerificationFromApi(
  verification: AdminWalletVerification,
): WalletVerificationView {
  return {
    matches: verification.matches,
    activityCountMatches: verification.activityCountMatches,
    projectedTotal: walletBalanceTotal(verification.projected),
    ledgerTotal: walletBalanceTotal(verification.ledger),
  };
}

export function walletLedgerRowsFromApi(
  transactions: AdminLedgerTransaction[],
  walletId: string,
  currentBalances: WalletDetailView["balances"],
): WalletLedgerView[] {
  let runningBalances = { ...currentBalances };
  return transactions
    .filter((transaction) => transaction.sealedAt !== null)
    .toSorted((left, right) => {
      const dateDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return dateDifference || right.id.localeCompare(left.id);
    })
    .flatMap((transaction) => {
      const movement = transaction.postings.flatMap((posting) => {
        if (posting.walletId !== walletId || !walletCompartmentAccountTypes.has(posting.accountType)) return [];
        return [{
          accountType: posting.accountType as WalletCompartmentAccountType,
          amountSatang: posting.amountSatang,
        }];
      });
      if (!movement.length) return [];
      const resultingBalanceSatang = walletBalanceTotal(runningBalances);
      for (const item of movement) {
        if (item.accountType === "SPENDING") runningBalances.spendingBalanceSatang -= item.amountSatang;
        if (item.accountType === "EARNINGS") runningBalances.earningsBalanceSatang -= item.amountSatang;
        if (item.accountType === "FUNDING_RESERVED") runningBalances.fundingReservedSatang -= item.amountSatang;
        if (item.accountType === "RESERVED_FOR_PAYOUTS") runningBalances.reservedForPayoutsSatang -= item.amountSatang;
      }
      return {
        id: transaction.id,
        businessReference: transaction.businessReference,
        eventType: transaction.eventType,
        description: transaction.description,
        createdAt: transaction.createdAt,
        amountSatang: movement.reduce((total, item) => total + item.amountSatang, 0),
        movement,
        resultingBalanceSatang,
      };
    });
}

export function walletSummaryFromApi(
  summary: AdminFinanceOverview["memberBalancesSummary"],
): WalletFinanceSummary {
  return {
    totalSpendingSatang: summary.totalSpendingSatang,
    totalEarningsSatang: summary.totalEarningsSatang,
    totalFundingReservedSatang: summary.totalFundingReservedSatang,
    totalPayoutReservedSatang: summary.totalPayoutReservedSatang,
    totalCirculatingSatang: summary.totalCirculatingSatang,
  };
}

export function walletMatchesTab(row: WalletBoardRow, tab: WalletBoardTab): boolean {
  return tab === "all" || row.status === tab;
}

export function searchWalletRows(rows: WalletBoardRow[], query: string): WalletBoardRow[] {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return rows;
  return rows.filter((row) => [
    row.id,
    row.memberId,
    row.memberName,
    row.studentId ?? "",
    row.email,
    row.statusLabel,
  ].some((field) => field.toLocaleLowerCase().includes(value)));
}

function walletSortValue(row: WalletBoardRow, key: WalletSortKey): string | number {
  if (key === "balance") return row.currentBalanceSatang;
  if (key === "latestTransactionAt") return Date.parse(row.latestTransactionAt ?? "") || 0;
  if (key === "createdAt") return Date.parse(row.createdAt) || 0;
  if (key === "id") return row.id;
  if (key === "member") return row.memberName;
  return row.statusLabel;
}

function compareWalletRows(left: WalletBoardRow, right: WalletBoardRow, key: WalletSortKey): number {
  const leftValue = walletSortValue(left, key);
  const rightValue = walletSortValue(right, key);
  if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue;
  return String(leftValue).localeCompare(String(rightValue), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortWalletRows(
  rows: WalletBoardRow[],
  key: WalletSortSelection,
  direction: WalletSortDirection,
): WalletBoardRow[] {
  if (key === null) return rows;
  const multiplier = direction === "ascending" ? 1 : -1;
  return rows.toSorted((left, right) => compareWalletRows(left, right, key) * multiplier);
}

export function pageWalletRows(
  rows: WalletBoardRow[],
  page: number,
  pageSize: WalletBoardPageSize,
): WalletBoardRow[] {
  return pageRows(rows, page, pageSize);
}

export function walletPageCount(rowCount: number, pageSize: WalletBoardPageSize): number {
  return pageCount(rowCount, pageSize);
}

export function formatWalletDate(value: string | null | undefined): string {
  const formatted = formatAdminTimestamp(value, "Asia/Bangkok");
  return formatted === (value?.trim() || "") && !value?.trim().match(/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/)
    ? "Not provided"
    : formatted;
}

export function formatWalletMoney(satang: number | null | undefined): string {
  if (satang === null || satang === undefined) return "Not provided";
  return `฿${(satang / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatWalletMovementAmount(satang: number): string {
  return `${satang < 0 ? "-" : "+"}${formatWalletMoney(Math.abs(satang))}`;
}

export function walletStatusClass(status: WalletStatus): string {
  return `status-wallet-${status.toLocaleLowerCase().replaceAll("_", "-")}`;
}
