import { apiRequest } from "../../../lib/api/client";
import {
  commandHeaders,
  encode,
  queryString,
} from "./admin-api-transport";
import type {
  AdminApiRequestOptions,
  AdminLedgerTransaction,
  AdminLedgerTransactionsQuery,
  AdminMemberDetail,
  AdminMemberFinance,
  AdminMemberListItem,
  AdminMemberListQuery,
  AdminPage,
  AdminWallet,
  AdminWalletDetail,
  AdminWalletListQuery,
  AdminWalletStatusHistoryEntry,
  AdminWalletStatusResult,
  AdminWalletVerification,
  WalletStatusCommand,
} from "./admin-api";

export function createAdminMemberWalletApi() {
  return {
    listMembers(
      query: AdminMemberListQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminMemberListItem>> {
      return apiRequest<AdminPage<AdminMemberListItem>>(
        `/api/v1/admin/members${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    getMember(
      memberId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberDetail> {
      return apiRequest<AdminMemberDetail>(
        `/api/v1/admin/members/${encode(memberId)}`,
        { cache: "no-store", ...options },
      );
    },

    getMemberFinance(
      memberId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberFinance> {
      return apiRequest<AdminMemberFinance>(
        `/api/v1/admin/finance/members/${encode(memberId)}`,
        { cache: "no-store", ...options },
      );
    },

    listWallets(
      query: AdminWalletListQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminWallet>> {
      return apiRequest<AdminPage<AdminWallet>>(
        `/api/v1/admin/wallets${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    listLedgerTransactions(
      query: AdminLedgerTransactionsQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminLedgerTransaction>> {
      return apiRequest<AdminPage<AdminLedgerTransaction>>(
        `/api/v1/admin/finance/ledger/transactions${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    getWallet(
      walletId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<{ wallet: AdminWalletDetail }> {
      return apiRequest<{ wallet: AdminWalletDetail }>(
        `/api/v1/admin/wallets/${encode(walletId)}`,
        { cache: "no-store", ...options },
      );
    },

    getWalletStatusHistory(
      walletId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<{ history: AdminWalletStatusHistoryEntry[] }> {
      return apiRequest<{ history: AdminWalletStatusHistoryEntry[] }>(
        `/api/v1/admin/wallets/${encode(walletId)}/status-history`,
        { cache: "no-store", ...options },
      );
    },

    verifyWalletProjection(
      walletId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminWalletVerification> {
      return apiRequest<AdminWalletVerification>(
        `/api/v1/admin/wallets/${encode(walletId)}/verification`,
        { cache: "no-store", ...options },
      );
    },

    setWalletStatus(walletId: string, options: WalletStatusCommand): Promise<AdminWalletStatusResult> {
      const toStatus = options.toStatus ?? options.status;
      if (!toStatus) throw new Error("Wallet status command requires a target status.");
      return apiRequest<AdminWalletStatusResult>(
        `/api/v1/admin/wallets/${encode(walletId)}/status`,
        {
          method: "POST",
          headers: commandHeaders(options),
          body: { toStatus, reason: options.reason },
        },
      );
    },

    rebuildWalletProjection(walletId: string): Promise<AdminWalletStatusResult> {
      return apiRequest<AdminWalletStatusResult>(
        `/api/v1/admin/wallets/${encode(walletId)}/rebuild-projection`,
        { method: "POST" },
      );
    },
  };
}
