import type {
  AdminApiRequestOptions,
  AdminLedgerTransaction,
  AdminMemberListQuery,
  AdminReportListQuery,
} from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
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

async function loadAllMemberLedgerTransactions(
  walletId: string,
  options: AdminApiRequestOptions,
) {
  const transactions = [] as Awaited<ReturnType<typeof adminApi.listLedgerTransactions>>["items"];
  let cursor: string | undefined;

  do {
    // Each request needs the cursor returned by the previous page.
    // eslint-disable-next-line no-await-in-loop
    const page = await adminApi.listLedgerTransactions({ walletId, limit: 100, cursor }, options);
    transactions.push(...page.items);
    const nextCursor = page.nextCursor ?? undefined;
    if (nextCursor === cursor) break;
    cursor = nextCursor;
  } while (cursor);

  return transactions;
}

export async function loadMemberPageData(
  cookieHeader?: string,
  cursor?: string,
): Promise<MemberPageData> {
  const query: AdminMemberListQuery = {
    limit: 50,
    ...(cursor ? { cursor } : {}),
  };
  const page = await adminApi.listMembers(query, adminApiRequestOptions(cookieHeader));
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
  const detail = await adminApi.getMember(memberId, options);
  const [financeResult, reportsResult, ledgerResult] = await Promise.allSettled([
    adminApi.getMemberFinance(memberId, options),
    adminApi.listReports(reportQuery(memberId), options),
    detail.wallet
      ? loadAllMemberLedgerTransactions(detail.wallet.id, options)
      : Promise.resolve([] as AdminLedgerTransaction[]),
  ]);
  const finance = financeResult.status === "fulfilled" ? financeResult.value : null;
  const reports = reportsResult.status === "fulfilled" ? reportsResult.value.items : [];
  const ledger = ledgerResult.status === "fulfilled" ? ledgerResult.value : [];
  const errors = {
    finance: financeResult.status === "rejected" ? errorMessage(financeResult.reason, "Member finance is not available from the Admin API.") : null,
    reports: reportsResult.status === "rejected" ? errorMessage(reportsResult.reason, "Member reports are not available from the Admin API.") : null,
    ledger: ledgerResult.status === "rejected" ? errorMessage(ledgerResult.reason, "Wallet Statement is not available from the Admin API.") : null,
  };
  const model = memberModelFromApi(detail, finance, reports, ledger, errors);
  return model.id === memberId ? model : null;
}
