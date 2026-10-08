import type {
  AdminApiPayoutStatus,
  AdminMemberListQuery,
  AdminPayout,
  AdminReportCase,
  AdminReportStatusCounts,
  AdminReportListQuery,
} from "../api/admin-api";
import { ADMIN_API_PAYOUT_STATUSES } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { CONDUCT_REPORT_STATUSES, REPORT_CASE_STATUSES, type ModerationCaseStatus } from "../domain/rulebook";
import { loadAllWalletLedgerTransactions } from "../wallet/wallet-ledger-pages";
import {
  memberListModelFromApi,
  memberModelFromApi,
  type MemberModel,
  type MemberPageData,
} from "./member-model";

function reportQuery(memberId: string, status: ModerationCaseStatus, cursor?: string): AdminReportListQuery {
  return { memberId, status, limit: 50, ...(cursor ? { cursor } : {}) };
}
function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

function reportMatchesMemberScope(report: AdminReportCase, memberId: string): boolean {
  const record = report as Record<string, unknown>;
  const reportedMember = record.reportedMember && typeof record.reportedMember === "object"
    ? record.reportedMember as Record<string, unknown>
    : null;
  const reportedMemberId = record.reportedMemberId ?? record.reportedUserId ?? reportedMember?.id;
  return reportedMemberId == null || reportedMemberId === memberId;
}

function reportCountsMatch(
  left: AdminReportStatusCounts,
  right: AdminReportStatusCounts,
  statuses: readonly ModerationCaseStatus[],
): boolean {
  return statuses.every((status) => left[status] === right[status]);
}

type MemberReportsRead = {
  items: AdminReportCase[];
  complete: boolean;
  totalCount: number | null;
  error: string | null;
};

type MemberPayoutsRead = {
  items: AdminPayout[];
  complete: boolean;
  error: string | null;
};

async function loadAllMemberReports(
  memberId: string,
  options: ReturnType<typeof adminApiRequestOptions>,
): Promise<MemberReportsRead> {
  const statuses: ModerationCaseStatus[] = [...REPORT_CASE_STATUSES, ...CONDUCT_REPORT_STATUSES];
  const statusResults = await Promise.all(statuses.map(async (status) => {
    const items: AdminReportCase[] = [];
    const seenCursors = new Set<string>();
    const seenReportIds = new Set<string>();
    let cursor: string | undefined;
    let totalCount: number | null = null;
    let countsByStatus: AdminReportStatusCounts | null = null;

    const result = (complete: boolean, error: string | null) => ({
      items,
      complete,
      totalCount,
      countsByStatus,
      error,
    });

    try {
      while (true) {
        const page = await adminApiProvider.read.listReports(reportQuery(memberId, status, cursor), options);
        const pageCounts = page?.countsByStatus;
        const validCounts = pageCounts && statuses.every((itemStatus) =>
          Number.isSafeInteger(pageCounts[itemStatus]) && pageCounts[itemStatus] >= 0,
        );
        if (!page || !Array.isArray(page.items) || !validCounts || !Number.isSafeInteger(page.totalCount) || page.totalCount < 0 || page.totalCount !== pageCounts[status] || (page.nextCursor != null && typeof page.nextCursor !== "string")) {
          return result(false, "Reports received response is invalid.");
        }

        if (totalCount !== null && (totalCount !== page.totalCount || !countsByStatus || !reportCountsMatch(countsByStatus, pageCounts, statuses))) {
          return result(false, "Report counts changed while loading.");
        }
        totalCount = page.totalCount;
        countsByStatus = pageCounts;

        if (page.items.some((item) => item?.status !== status || typeof item?.id !== "string" || !item.id.trim() || !reportMatchesMemberScope(item, memberId))) {
          return result(false, "Reports received response is invalid.");
        }

        let hasDuplicateReport = false;
        for (const item of page.items) {
          if (seenReportIds.has(item.id)) hasDuplicateReport = true;
          seenReportIds.add(item.id);
        }
        if (hasDuplicateReport) return result(false, "Reports received response is invalid.");

        items.push(...page.items);
        const nextCursor = page.nextCursor ?? undefined;
        if (!nextCursor) {
          if (items.length !== totalCount) return result(false, "Reports received pages do not match the API count.");
          return result(true, null);
        }
        if (seenCursors.has(nextCursor)) {
          return result(false, "Reports received pages did not advance.");
        }

        seenCursors.add(nextCursor);
        cursor = nextCursor;
      }
    } catch (error) {
      return result(false, errorMessage(error, "Reports received are not available."));
    }
  }));

  const items: AdminReportCase[] = [];
  const seenReportIds = new Set<string>();
  let hasDuplicateReport = false;
  for (const result of statusResults) {
    for (const item of result.items) {
      if (seenReportIds.has(item.id)) {
        hasDuplicateReport = true;
        continue;
      }
      seenReportIds.add(item.id);
      items.push(item);
    }
  }
  const countSnapshots = statusResults.flatMap((result) => result.countsByStatus ? [result.countsByStatus] : []);
  const firstCounts = countSnapshots[0] ?? null;
  const countsAreStable = firstCounts !== null && countSnapshots.every((counts) =>
    reportCountsMatch(counts, firstCounts, statuses),
  );
  const countError = countSnapshots.length > 0 && !countsAreStable
    ? "Report counts changed while loading."
    : null;
  const errors = statusResults.flatMap((result) => result.error ? [result.error] : []);
  if (countError) errors.push(countError);
  if (hasDuplicateReport) errors.push("Reports received response is invalid.");
  return {
    items,
    complete: statusResults.every((result) => result.complete) && countsAreStable && !hasDuplicateReport,
    totalCount: countsAreStable && firstCounts && !hasDuplicateReport
      ? statuses.reduce((total, status) => total + firstCounts[status], 0)
      : null,
    error: errors.length ? [...new Set(errors)].join(" ") : null,
  };
}

async function loadMemberPayouts(
  memberId: string,
  options: ReturnType<typeof adminApiRequestOptions>,
): Promise<MemberPayoutsRead> {
  const statusResults = await Promise.all(ADMIN_API_PAYOUT_STATUSES.map(async (status: AdminApiPayoutStatus) => {
    const items: AdminPayout[] = [];
    const seenCursors = new Set<string>();
    const seenPayoutIds = new Set<string>();
    let cursor: string | undefined;

    try {
      while (true) {
        const page = await adminApiProvider.read.listPayouts({
          userId: memberId,
          status,
          limit: 50,
          ...(cursor ? { cursor } : {}),
          sort: "newest",
        }, options);
        if (!page || !Array.isArray(page.items) || (page.nextCursor != null && typeof page.nextCursor !== "string") || page.items.some((item) =>
          item?.payoutStatus !== status
          || typeof item?.id !== "string"
          || !item.id.trim()
          || item?.student?.id !== memberId
          || !Number.isSafeInteger(item?.principalSatang)
          || item.principalSatang < 0
          || typeof item?.createdAt !== "string"
          || !Number.isFinite(Date.parse(item.createdAt))
          || typeof item?.bankName !== "string"
          || typeof item?.maskedDestinationValue !== "string"
          || (item.displayId != null && typeof item.displayId !== "string")
        )) {
          return { items, complete: false, error: "ข้อมูล Payout ไม่ตรงตามสัญญา API" };
        }

        let hasDuplicatePayout = false;
        for (const item of page.items) {
          if (seenPayoutIds.has(item.id)) hasDuplicatePayout = true;
          seenPayoutIds.add(item.id);
        }
        if (hasDuplicatePayout) return { items, complete: false, error: "ข้อมูล Payout ไม่ตรงตามสัญญา API" };

        items.push(...page.items);
        const nextCursor = page.nextCursor ?? undefined;
        if (!nextCursor) return { items, complete: true, error: null };
        if (seenCursors.has(nextCursor)) {
          return { items, complete: false, error: "Payout pages did not advance." };
        }
        seenCursors.add(nextCursor);
        cursor = nextCursor;
      }
    } catch (error) {
      return {
        items,
        complete: false,
        error: errorMessage(error, "Payout details are not available."),
      };
    }
  }));

  const items: AdminPayout[] = [];
  const seenPayoutIds = new Set<string>();
  let hasDuplicatePayout = false;
  for (const result of statusResults) {
    for (const item of result.items) {
      if (seenPayoutIds.has(item.id)) {
        hasDuplicatePayout = true;
        continue;
      }
      seenPayoutIds.add(item.id);
      items.push(item);
    }
  }
  const errors = statusResults.flatMap((result) => result.error ? [result.error] : []);
  if (hasDuplicatePayout) errors.push("ข้อมูล Payout ไม่ตรงตามสัญญา API");
  return {
    items: items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    complete: statusResults.every((result) => result.complete) && !hasDuplicatePayout,
    error: errors.length ? [...new Set(errors)].join(" ") : null,
  };
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
  const [financeResult, reportsResult, payoutsResult] = await Promise.allSettled([
    adminApiProvider.read.getMemberFinance(memberId, options),
    loadAllMemberReports(memberId, options),
    loadMemberPayouts(memberId, options),
  ]);
  const finance = financeResult.status === "fulfilled" ? financeResult.value : null;
  const reportsRead = reportsResult.status === "fulfilled"
    ? reportsResult.value
    : {
        items: [] as AdminReportCase[],
        complete: false,
        totalCount: null,
        error: errorMessage(reportsResult.reason, "Reports received are not available."),
      };
  const payoutsRead = payoutsResult.status === "fulfilled"
    ? payoutsResult.value
    : {
        items: [] as AdminPayout[],
        complete: false,
        error: errorMessage(payoutsResult.reason, "Payout details are not available."),
      };
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
    reports: reportsRead.error,
    reportsComplete: reportsRead.complete,
    reportsTotalCount: reportsRead.totalCount,
    payouts: payoutsRead.items.length || payoutsRead.complete ? payoutsRead.items : undefined,
    payoutsComplete: payoutsRead.complete,
    payoutsError: payoutsRead.error,
    ledger: ledgerError ? errorMessage(ledgerError, "Wallet Statement is not available from the Admin API.") : null,
  };
  const model = memberModelFromApi(detail, finance, reportsRead.items, ledger, errors);
  return model.id === memberId ? model : null;
}
