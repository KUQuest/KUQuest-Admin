import type {
  AdminMemberListQuery,
  AdminReportListQuery,
} from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { loadAllWalletLedgerTransactions } from "../wallet/wallet-ledger-pages";
import {
  memberListModelFromApi,
  memberModelFromApi,
  type MemberModel,
  type MemberPageData,
} from "./member-model";

function reportQuery(memberId: string): AdminReportListQuery {
  return { reportedMemberId: memberId, limit: 50 };
}
function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

export async function loadMemberPageData(
  cookieHeader?: string,
  cursor?: string,
): Promise<MemberPageData> {
  const query: AdminMemberListQuery = {
    limit: 50,
    ...(cursor ? { cursor } : {}),
  };
  const page = await adminApiProvider.read.listMembers(query, adminApiRequestOptions(cookieHeader));
  return {
    source: "api",
    items: page.items.map(memberListModelFromApi),
    nextCursor: page.nextCursor,
  };
}

export async function loadMemberDetailFromApi(
  memberId: string,
  cookieHeader?: string,
): Promise<MemberModel | null> {
  const options = adminApiRequestOptions(cookieHeader);
  const detail = await adminApiProvider.read.getMember(memberId, options);
  const [financeResult, reportsResult] = await Promise.allSettled([
    adminApiProvider.read.getMemberFinance(memberId, options),
    adminApiProvider.read.listReports(reportQuery(memberId), options),
  ]);
  const finance = financeResult.status === "fulfilled" ? financeResult.value : null;
  const reports = reportsResult.status === "fulfilled" ? reportsResult.value.items : [];
  const effectiveWallet = finance?.wallet ?? detail.wallet;
  let ledger: Awaited<ReturnType<typeof loadAllWalletLedgerTransactions>> = [];
  let ledgerError: unknown = null;
  if (effectiveWallet) {
    try {
      ledger = await loadAllWalletLedgerTransactions(effectiveWallet.id, options);
    } catch (error) {
      ledgerError = error;
    }
  }
  const errors = {
    finance: financeResult.status === "rejected" ? errorMessage(financeResult.reason, "Member finance is not available from the Admin API.") : null,
    reports: reportsResult.status === "rejected" ? errorMessage(reportsResult.reason, "Member reports are not available from the Admin API.") : null,
    ledger: ledgerError ? errorMessage(ledgerError, "Wallet Statement is not available from the Admin API.") : null,
  };
  const model = memberModelFromApi(detail, finance, reports, ledger, errors);
  return model.id === memberId ? model : null;
}
