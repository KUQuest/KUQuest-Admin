import type {
  AdminPage,
  AdminApiPayoutStatus,
  AdminMemberListQuery,
  AdminPayout,
  AdminReportCase,
  AdminReportPage,
  AdminReportStatusCounts,
  AdminReportListQuery,
} from "../api/admin-api";
import { ADMIN_API_PAYOUT_STATUSES } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { CONDUCT_REPORT_STATUSES, REPORT_CASE_STATUSES, type ModerationCaseStatus } from "../domain/rulebook";
import { displayAdminId } from "../display-admin-id";
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
function reportMatchesMemberScope(report: AdminReportCase, memberId: string): boolean {
  const reportedMemberId = report.reportedMemberId ?? report.reportedMember?.id;
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

type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

type CursorRead<T> = {
  items: T[];
  complete: boolean;
  error: string | null;
};

async function loadCursorPages<T, Page extends CursorPage<T>>(
  readPage: (cursor?: string) => Promise<Page>,
  validatePage: (page: Page) => string | null,
  recordId: (item: T) => string | null,
  messages: { invalid: string; duplicate: string; stalled: string; failed: string },
): Promise<CursorRead<T>> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  const seenRecordIds = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    let page: Page;
    try {
      page = await readPage(cursor);
    } catch {
      return { items, complete: false, error: messages.failed };
    }
    if (!page || !Array.isArray(page.items) || (page.nextCursor != null && typeof page.nextCursor !== "string")) {
      return { items, complete: false, error: messages.invalid };
    }
    const pageError = validatePage(page);
    if (pageError) return { items, complete: false, error: pageError };

    for (const item of page.items) {
      const id = recordId(item);
      if (!id) return { items, complete: false, error: messages.invalid };
      if (seenRecordIds.has(id)) return { items, complete: false, error: messages.duplicate };
      seenRecordIds.add(id);
    }
    items.push(...page.items);

    const nextCursor = page.nextCursor ?? undefined;
    if (!nextCursor) return { items, complete: true, error: null };
    if (seenCursors.has(nextCursor)) return { items, complete: false, error: messages.stalled };
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
}

function mergeStatusResults<T>(
  results: readonly CursorRead<T>[],
  recordId: (item: T) => string,
  duplicateError: string,
): { items: T[]; hasDuplicates: boolean; errors: string[] } {
  const items: T[] = [];
  const seenIds = new Set<string>();
  let hasDuplicates = false;
  for (const result of results) {
    for (const item of result.items) {
      const id = recordId(item);
      if (seenIds.has(id)) {
        hasDuplicates = true;
        continue;
      }
      seenIds.add(id);
      items.push(item);
    }
  }
  const errors = results.flatMap((result) => result.error ? [result.error] : []);
  if (hasDuplicates) errors.push(duplicateError);
  return { items, hasDuplicates, errors: [...new Set(errors)] };
}

async function loadAllMemberReports(
  memberId: string,
  options: ReturnType<typeof adminApiRequestOptions>,
): Promise<MemberReportsRead> {
  const statuses: ModerationCaseStatus[] = [...REPORT_CASE_STATUSES, ...CONDUCT_REPORT_STATUSES];
  const statusResults = await Promise.all(statuses.map(async (status) => {
    let totalCount: number | null = null;
    let countsByStatus: AdminReportStatusCounts | null = null;
    const read = await loadCursorPages<AdminReportCase, AdminReportPage>(
      (cursor) => adminApiProvider.read.listReports(reportQuery(memberId, status, cursor), options),
      (page) => {
        const pageCounts = page.countsByStatus;
        const validCounts = pageCounts && statuses.every((itemStatus) =>
          Number.isSafeInteger(pageCounts[itemStatus]) && pageCounts[itemStatus] >= 0,
        );
        if (!validCounts || !Number.isSafeInteger(page.totalCount) || page.totalCount < 0 || page.totalCount !== pageCounts[status]) {
          return "Reports received response is invalid.";
        }
        if (totalCount !== null && (totalCount !== page.totalCount || !countsByStatus || !reportCountsMatch(countsByStatus, pageCounts, statuses))) {
          return "Report counts changed while loading.";
        }
        totalCount = page.totalCount;
        countsByStatus = pageCounts;
        if (page.items.some((item) =>
          item?.status !== status
          || (item.questId != null && typeof item.questId !== "string")
          || !reportMatchesMemberScope(item, memberId)
        )) {
          return "Reports received response is invalid.";
        }
        return null;
      },
      (item) => typeof item?.id === "string" && item.id.trim() ? item.id : null,
      {
        invalid: "Reports received response is invalid.",
        duplicate: "Reports received response is invalid.",
        stalled: "Reports received pages did not advance.",
        failed: "Reports received are not available.",
      },
    );
    if (read.complete && read.items.length !== totalCount) {
      return { ...read, complete: false, totalCount, countsByStatus, error: "Reports received pages do not match the API count." };
    }
    return { ...read, totalCount, countsByStatus };
  }));

  const merged = mergeStatusResults(statusResults, (item) => item.id, "Reports received response is invalid.");
  const countSnapshots = statusResults.flatMap((result) => result.countsByStatus ? [result.countsByStatus] : []);
  const firstCounts = countSnapshots[0] ?? null;
  const countsAreStable = firstCounts !== null && countSnapshots.every((counts) =>
    reportCountsMatch(counts, firstCounts, statuses),
  );
  const countError = countSnapshots.length > 0 && !countsAreStable
    ? "Report counts changed while loading."
    : null;
  const errors = [...merged.errors];
  if (countError) errors.push(countError);
  return {
    items: merged.items,
    complete: statusResults.every((result) => result.complete) && countsAreStable && !merged.hasDuplicates,
    totalCount: countsAreStable && firstCounts && !merged.hasDuplicates
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
    return loadCursorPages<AdminPayout, AdminPage<AdminPayout>>(
      (cursor) => adminApiProvider.read.listPayouts({
        userId: memberId,
        status,
        limit: 50,
        ...(cursor ? { cursor } : {}),
        sort: "newest",
      }, options),
      (page) => page.items.some((item) =>
        item?.payoutStatus !== status
        || item?.student?.id !== memberId
        || !Number.isSafeInteger(item?.principalSatang)
        || item.principalSatang < 0
        || typeof item?.createdAt !== "string"
        || !Number.isFinite(Date.parse(item.createdAt))
        || typeof item?.bankName !== "string"
        || typeof item?.maskedDestinationValue !== "string"
        || (item.displayId != null && typeof item.displayId !== "string")
      ) ? "ข้อมูล Payout ไม่ตรงตามสัญญา API" : null,
      (item) => typeof item?.id === "string" && item.id.trim() ? item.id : null,
      {
        invalid: "ข้อมูล Payout ไม่ตรงตามสัญญา API",
        duplicate: "ข้อมูล Payout ไม่ตรงตามสัญญา API",
        stalled: "Payout pages did not advance.",
        failed: "Payout details could not be loaded.",
      },
    );
  }));

  const merged = mergeStatusResults(statusResults, (item) => item.id, "ข้อมูล Payout ไม่ตรงตามสัญญา API");
  return {
    items: merged.items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    complete: statusResults.every((result) => result.complete) && !merged.hasDuplicates,
    error: merged.errors.length ? merged.errors.join(" ") : null,
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
        error: "Reports received are not available.",
      };
  const payoutsRead = payoutsResult.status === "fulfilled"
    ? payoutsResult.value
    : {
        items: [] as AdminPayout[],
        complete: false,
        error: "Payout details could not be loaded.",
      };
  const questIds = [...new Set(reportsRead.items.flatMap((report) => report.questId ? [report.questId] : []))];
  const questResults = await Promise.all(questIds.map(async (questId) => {
    try {
      const quest = await adminApiProvider.read.getQuest(questId, options);
      const displayId = displayAdminId(quest.displayId);
      return displayId ? [questId, displayId] as const : null;
    } catch {
      return null;
    }
  }));
  const reportQuestDisplayIds = new Map(questResults.flatMap((result) => result ? [result] : []));
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
    finance: financeResult.status === "rejected" ? "Member finance is not available from the Admin API." : null,
    reports: reportsRead.error,
    reportsComplete: reportsRead.complete,
    reportsTotalCount: reportsRead.totalCount,
    payouts: payoutsRead.items.length || payoutsRead.complete ? payoutsRead.items : undefined,
    payoutsComplete: payoutsRead.complete,
    payoutsError: payoutsRead.error,
    reportQuestDisplayIds,
    ledger: ledgerError ? "Wallet Statement is not available from the Admin API." : null,
  };
  const model = memberModelFromApi(detail, finance, reportsRead.items, ledger, errors);
  return model.id === memberId ? model : null;
}
