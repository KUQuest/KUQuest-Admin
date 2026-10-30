import type { AdminApiRequestOptions } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { loadAllWalletLedgerTransactions } from "./wallet-ledger-pages";
import {
  walletDetailFromApi,
  walletHistoryFromApi,
  walletLedgerRowsFromApi,
  walletRowsFromApi,
  walletStatementPageFromApi,
  walletSummaryFromApi,
  walletVerificationFromApi,
  type WalletBoardRow,
  type WalletFinanceSummary,
  type WalletHistoryView,
  type WalletLedgerView,
  type WalletDetailView,
  type WalletStatementPageView,
  type WalletVerificationView,
} from "./wallet-model";

export type RemainingWalletRows = {
  rows: WalletBoardRow[];
  error: string | null;
};

export type WalletBoardPageData = {
  rows: WalletBoardRow[];
  remainingRows: Promise<RemainingWalletRows> | null;
  summary: WalletFinanceSummary | null;
  summaryError: string | null;
  boardError: string | null;
};

export type WalletDrawerData = {
  detail: WalletDetailView;
  history: WalletHistoryView[];
  ledger: WalletLedgerView[];
};

export type WalletStatementPageData = {
  wallet: WalletStatementPageView;
  ledger: WalletLedgerView[];
};

export async function loadWalletDrawerData(
  walletId: string,
  cookieHeader?: string,
): Promise<WalletDrawerData> {
  const options = adminApiRequestOptions(cookieHeader);
  const [walletResult, historyResult, ledgerResult] = await Promise.all([
    adminApiProvider.read.getWallet(walletId, options),
    adminApiProvider.read.getWalletStatusHistory(walletId, options),
    adminApiProvider.read.listLedgerTransactions({ walletId, limit: 5 }, options),
  ]);
  return {
    detail: walletDetailFromApi(walletResult.wallet),
    history: walletHistoryFromApi(historyResult.history),
    ledger: walletLedgerRowsFromApi(ledgerResult.items, walletId, walletResult.wallet.balances),
  };
}

export async function loadWalletStatementPageData(
  memberId: string,
  cookieHeader?: string,
): Promise<WalletStatementPageData> {
  const options = adminApiRequestOptions(cookieHeader);
  const walletsResult = await adminApiProvider.read.listWallets({ userId: memberId, limit: 1 }, options);
  const wallet = walletsResult.items[0];
  if (!wallet) throw new Error("Wallet Statement is not available for this Member.");
  const transactions = await loadAllWalletLedgerTransactions(wallet.id, options);

  return {
    wallet: walletStatementPageFromApi(wallet),
    ledger: walletLedgerRowsFromApi(transactions, wallet.id, wallet.balances),
  };
}

export async function verifyWalletProjection(
  walletId: string,
  cookieHeader?: string,
): Promise<WalletVerificationView> {
  const result = await adminApiProvider.read.verifyWalletProjection(walletId, adminApiRequestOptions(cookieHeader));
  return walletVerificationFromApi(result);
}

async function listRemainingWallets(
  initialCursor: string,
  options: AdminApiRequestOptions,
): Promise<RemainingWalletRows> {
  const items = [] as Awaited<ReturnType<typeof adminApiProvider.read.listWallets>>["items"];
  let cursor: string | undefined = initialCursor;

  try {
    while (cursor) {
      const page = await adminApiProvider.read.listWallets({ limit: 50, cursor }, options);
      items.push(...page.items);
      const nextCursor = page.nextCursor ?? undefined;
      if (nextCursor === cursor) break;
      cursor = nextCursor;
    }
    return { rows: walletRowsFromApi(items), error: null };
  } catch {
    return { rows: [], error: "Some Wallet records could not be loaded." };
  }
}

export async function loadWalletBoardPageData(
  cookieHeader?: string,
): Promise<WalletBoardPageData> {
  const options = adminApiRequestOptions(cookieHeader);
  const [walletsResult, summaryResult] = await Promise.allSettled([
    adminApiProvider.read.listWallets({ limit: 50 }, options),
    adminApiProvider.read.getFinanceOverview(options),
  ]);
  if (walletsResult.status === "rejected") {
    return {
      rows: [],
      remainingRows: null,
      summary: summaryResult.status === "fulfilled"
        ? walletSummaryFromApi(summaryResult.value.memberBalancesSummary)
        : null,
      summaryError: summaryResult.status === "rejected"
        ? "Wallet summary is not available."
        : null,
      boardError: "Wallet records are not available.",
    };
  }
  const firstPage = walletsResult.value;

  return {
    rows: walletRowsFromApi(firstPage.items),
    remainingRows: firstPage.nextCursor
      ? listRemainingWallets(firstPage.nextCursor, options)
      : null,
    summary: summaryResult.status === "fulfilled"
      ? walletSummaryFromApi(summaryResult.value.memberBalancesSummary)
      : null,
    summaryError: summaryResult.status === "rejected"
      ? "Wallet summary is not available."
      : null,
    boardError: null,
  };
}
