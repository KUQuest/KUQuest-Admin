import { cookies } from "next/headers";

import type { AdminApiRequestOptions } from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { isAdminApiEnabled } from "../api/admin-provider";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";
import { loadAllWalletLedgerTransactions } from "./wallet-ledger-pages";
import { mockWalletFinanceSummary, mockWallets } from "./wallet-mock-data";
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

export type WalletDataSource = "api" | "mock";
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
  dataSource: WalletDataSource;
};

export type WalletDrawerData = {
  detail: WalletDetailView;
  history: WalletHistoryView[];
  ledger: WalletLedgerView[];
};

export type WalletStatementPageData = {
  wallet: WalletStatementPageView;
  ledger: WalletLedgerView[];
  dataSource: WalletDataSource;
};

export async function loadWalletRouteContext(): Promise<{
  dataSource: WalletDataSource;
  cookieHeader?: string;
}> {
  const dataSource = isAdminApiEnabled() ? "api" : "mock";
  if (dataSource === "mock") return { dataSource };

  const cookieStore = await cookies();
  return {
    dataSource,
    cookieHeader: adminSessionCookieHeader(cookieStore.getAll()),
  };
}

export async function loadWalletDrawerData(
  walletId: string,
  cookieHeader: string | undefined,
  dataSource: WalletDataSource,
): Promise<WalletDrawerData> {
  if (dataSource === "mock") {
    const wallet = mockWallets.find((item) => item.id === walletId);
    if (!wallet) throw new Error("Wallet detail is not available.");
    return {
      detail: walletDetailFromApi({ ...wallet, projectionMatchesLedger: true }),
      history: [],
      ledger: [],
    };
  }

  const options = adminApiRequestOptions(cookieHeader);
  const [walletResult, historyResult, ledgerResult] = await Promise.all([
    adminApi.getWallet(walletId, options),
    adminApi.getWalletStatusHistory(walletId, options),
    adminApi.listLedgerTransactions({ walletId, limit: 5 }, options),
  ]);
  return {
    detail: walletDetailFromApi(walletResult.wallet),
    history: walletHistoryFromApi(historyResult.history),
    ledger: walletLedgerRowsFromApi(ledgerResult.items, walletId, walletResult.wallet.balances),
  };
}

export async function loadWalletStatementPageData(
  memberId: string,
  cookieHeader: string | undefined,
  dataSource: WalletDataSource,
): Promise<WalletStatementPageData> {
  if (dataSource === "mock") {
    const wallet = mockWallets.find((item) => item.userId === memberId);
    if (!wallet) throw new Error("Wallet Statement is not available for this Member.");
    return {
      wallet: walletStatementPageFromApi(wallet),
      ledger: [],
      dataSource,
    };
  }

  const options = adminApiRequestOptions(cookieHeader);
  const walletsResult = await adminApi.listWallets({ userId: memberId, limit: 1 }, options);
  const wallet = walletsResult.items[0];
  if (!wallet) throw new Error("Wallet Statement is not available for this Member.");
  const transactions = await loadAllWalletLedgerTransactions(wallet.id, options);

  return {
    wallet: walletStatementPageFromApi(wallet),
    ledger: walletLedgerRowsFromApi(transactions, wallet.id, wallet.balances),
    dataSource,
  };
}

export async function verifyWalletProjection(
  walletId: string,
  cookieHeader: string | undefined,
  dataSource: WalletDataSource,
): Promise<WalletVerificationView> {
  if (dataSource === "mock") {
    const wallet = mockWallets.find((item) => item.id === walletId);
    if (!wallet) throw new Error("Wallet detail is not available.");
    return {
      matches: true,
      activityCountMatches: true,
      projectedTotal: wallet.balances.totalBalanceSatang,
      ledgerTotal: wallet.balances.totalBalanceSatang,
    };
  }

  const result = await adminApi.verifyWalletProjection(walletId, adminApiRequestOptions(cookieHeader));
  return walletVerificationFromApi(result);
}

async function listRemainingWallets(
  initialCursor: string,
  options: AdminApiRequestOptions,
): Promise<RemainingWalletRows> {
  const items = [] as Awaited<ReturnType<typeof adminApi.listWallets>>["items"];
  let cursor: string | undefined = initialCursor;

  try {
    while (cursor) {
      const page = await adminApi.listWallets({ limit: 50, cursor }, options);
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
  cookieHeader: string | undefined,
  dataSource: WalletDataSource,
): Promise<WalletBoardPageData> {
  if (dataSource === "mock") {
    return {
      rows: walletRowsFromApi(mockWallets),
      remainingRows: null,
      summary: walletSummaryFromApi(mockWalletFinanceSummary),
      summaryError: null,
      boardError: null,
      dataSource,
    };
  }

  const options = adminApiRequestOptions(cookieHeader);
  const [walletsResult, summaryResult] = await Promise.allSettled([
    adminApi.listWallets({ limit: 50 }, options),
    adminApi.getFinanceOverview(options),
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
      dataSource,
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
    dataSource,
  };
}
