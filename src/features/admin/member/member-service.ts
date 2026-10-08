import type {
  AdminPage,
  AdminApiPayoutStatus,
  AdminLedgerTransaction,
  AdminMemberDetail,
  AdminMemberFinance,
  AdminMemberListQuery,
  AdminPayout,
  AdminReportCase,
  AdminReportPage,
  AdminReportStatusCounts,
  AdminReportListQuery,
} from "../api/admin-api";
import { ADMIN_API_PAYOUT_STATUSES, ADMIN_LEDGER_EVENT_TYPES } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { CONDUCT_REPORT_STATUSES, isWalletStatus, REPORT_CASE_STATUSES, type ModerationCaseStatus } from "../domain/rulebook";
import { displayAdminId } from "../display-admin-id";
import { isNonnegativeSafeInteger } from "./member-wallet-model";
import {
  memberListModelFromApi,
  memberModelFromApi,
  type MemberModel,
  type MemberPageData,
  type MemberWalletSource,
  type MemberWalletState,
  type MemberWalletStatementState,
} from "./member-model";

type SelectedMemberWallet = NonNullable<AdminMemberDetail["wallet"]> | NonNullable<AdminMemberFinance["wallet"]>;

type MemberWalletResolution = {
  wallet: SelectedMemberWallet | null;
  state: MemberWalletState;
  source: MemberWalletSource;
};

function validMemberWallet(wallet: unknown): wallet is NonNullable<AdminMemberFinance["wallet"]> {
  if (!wallet || typeof wallet !== "object" || Array.isArray(wallet)) return false;
  const candidate = wallet as Record<string, unknown>;
  return typeof candidate.id === "string"
    && Boolean(candidate.id.trim())
    && isWalletStatus(candidate.walletStatus)
    && typeof candidate.projectionMatchesLedger === "boolean"
    && [candidate.spendingBalanceSatang, candidate.earningsBalanceSatang, candidate.fundingReservedSatang, candidate.reservedForPayoutsSatang].every(isNonnegativeSafeInteger);
}

function validMemberDetailWallet(wallet: AdminMemberDetail["wallet"]): wallet is NonNullable<AdminMemberDetail["wallet"]> {
  if (!validMemberWallet(wallet) || !isNonnegativeSafeInteger(wallet.totalBalanceSatang)) return false;
  return wallet.totalBalanceSatang === wallet.spendingBalanceSatang
    + wallet.earningsBalanceSatang
    + wallet.fundingReservedSatang
    + wallet.reservedForPayoutsSatang;
}

function resolveMemberWallet(
  memberId: string,
  detail: AdminMemberDetail,
  financeResult: PromiseSettledResult<AdminMemberFinance>,
): MemberWalletResolution {
  if (financeResult.status === "fulfilled") {
    const finance = financeResult.value;
    if (!finance?.member || typeof finance.member.userId !== "string" || !finance.member.userId.trim()) {
      return { wallet: null, state: "invalid", source: null };
    }
    if (finance.member.userId !== memberId) {
      return { wallet: null, state: "conflict", source: null };
    }
    if (finance.wallet === null) {
      if (detail.wallet === null) return { wallet: null, state: "absent", source: "finance" };
      return detail.wallet ? { wallet: null, state: "conflict", source: null } : { wallet: null, state: "invalid", source: null };
    }
    if (!validMemberWallet(finance.wallet)) {
      return { wallet: null, state: "invalid", source: null };
    }
    if (detail.wallet && validMemberDetailWallet(detail.wallet) && detail.wallet.id !== finance.wallet.id) {
      return { wallet: null, state: "conflict", source: null };
    }
    return { wallet: finance.wallet, state: "available", source: "finance" };
  }

  if (detail.wallet && validMemberDetailWallet(detail.wallet)) {
    return { wallet: detail.wallet, state: "available", source: "member-detail" };
  }
  if (detail.wallet !== null) return { wallet: null, state: "invalid", source: null };
  return { wallet: null, state: "unavailable", source: null };
}

function validLedgerTransaction(transaction: AdminLedgerTransaction): boolean {
  if (!transaction) return false;
  const postings = transaction.postings;
  if (!Array.isArray(postings) || postings.length < 2 || transaction.isBalanced !== true) return false;
  let postingTotal = 0;
  const validPostings = postings.every((posting) => {
    if (
      typeof posting?.accountType !== "string"
      || !(posting.walletId === null || typeof posting.walletId === "string")
      || typeof posting.amountSatang !== "number"
      || !Number.isSafeInteger(posting.amountSatang)
    ) return false;
    postingTotal += posting.amountSatang;
    return Number.isSafeInteger(postingTotal);
  });
  return validPostings
    && postingTotal === 0
    && typeof transaction.id === "string"
    && Boolean(transaction.id.trim())
    && typeof transaction.businessReference === "string"
    && typeof transaction.eventType === "string"
    && ADMIN_LEDGER_EVENT_TYPES.includes(transaction.eventType as (typeof ADMIN_LEDGER_EVENT_TYPES)[number])
    && (transaction.description === null || typeof transaction.description === "string")
    && typeof transaction.createdAt === "string"
    && Number.isFinite(Date.parse(transaction.createdAt))
    && (transaction.sealedAt === null || (typeof transaction.sealedAt === "string" && Number.isFinite(Date.parse(transaction.sealedAt))));
}

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
    if (
      !page
      || !Array.isArray(page.items)
      || (page.nextCursor !== null && (typeof page.nextCursor !== "string" || page.nextCursor.length === 0))
    ) {
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
        failed: "Reports received could not be loaded.",
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
      ) ? "Payout data does not match the API contract." : null,
      (item) => typeof item?.id === "string" && item.id.trim() ? item.id : null,
      {
        invalid: "Payout data does not match the API contract.",
        duplicate: "Payout data does not match the API contract.",
        stalled: "Payout pages did not advance.",
        failed: "Payout details could not be loaded.",
      },
    );
  }));

  const merged = mergeStatusResults(statusResults, (item) => item.id, "Payout data does not match the API contract.");
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
  const walletResolution = resolveMemberWallet(memberId, detail, financeResult);
  const reportsRead = reportsResult.status === "fulfilled"
    ? reportsResult.value
    : {
        items: [] as AdminReportCase[],
        complete: false,
        totalCount: null,
        error: "Reports received could not be loaded.",
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
  const ledgerMessages = {
    invalid: "Wallet Statement data does not match the API contract.",
    duplicate: "Wallet Statement data does not match the API contract.",
    stalled: "Wallet Statement is not verified.",
    failed: "Could not read the Wallet Statement.",
  };
  const ledgerRead = walletResolution.state === "available" && walletResolution.wallet
    ? await loadCursorPages<AdminLedgerTransaction, AdminPage<AdminLedgerTransaction>>(
        (cursor) => adminApiProvider.read.listLedgerTransactions({
          walletId: walletResolution.wallet!.id,
          limit: 50,
          ...(cursor ? { cursor } : {}),
        }, options),
        (page) => page.items.some((transaction) => !validLedgerTransaction(transaction)) ? ledgerMessages.invalid : null,
        (transaction) => transaction.id,
        ledgerMessages,
      )
    : { items: [] as AdminLedgerTransaction[], complete: false, error: null };
  const walletStatementState: MemberWalletStatementState = walletResolution.state !== "available"
    ? "not-applicable"
    : ledgerRead.complete
      ? "complete"
      : ledgerRead.error === ledgerMessages.failed
        ? "failed"
        : ledgerRead.error === ledgerMessages.invalid
          ? "invalid"
          : "incomplete";
  const memberReads = {
    finance: financeResult.status === "rejected" ? "Member finance could not be loaded." : null,
    reports: reportsRead.error,
    reportsComplete: reportsRead.complete,
    reportsTotalCount: reportsRead.totalCount,
    payouts: payoutsRead.items.length || payoutsRead.complete ? payoutsRead.items : undefined,
    payoutsComplete: payoutsRead.complete,
    payoutsError: payoutsRead.error,
    reportQuestDisplayIds,
    ledger: ledgerRead.error,
    wallet: walletResolution.wallet,
    walletState: walletResolution.state,
    walletSource: walletResolution.source,
    walletStatementState,
    walletStatementComplete: ledgerRead.complete,
  };
  const model = memberModelFromApi(detail, finance, reportsRead.items, ledgerRead.items, memberReads);
  return model.id === memberId ? model : null;
}
