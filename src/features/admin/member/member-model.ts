import type {
  AdminLedgerTransaction,
  AdminMemberDetail,
  AdminMemberFinance,
  AdminMemberListItem,
  AdminPayout,
  AdminReportCase,
} from "../api/admin-api";
import { formatAdminTimestamp } from "../date-format";
import type { AdminReview } from "../data/admin-records";
import {
  isConductReportStatus,
  memberStatusFor,
  memberStatusLabel,
  walletStatusFor,
  walletStatusLabel,
  type MemberStatus,
  type WalletStatus,
} from "../domain/rulebook";
import { statusBadgeClass } from "../status-badge";
import { displayAdminId } from "../display-admin-id";
import { conductReportRoutes, memberRoutes, reportRoutes } from "../admin-routes";
import { balancesFromWallet, transactionFromApi } from "./member-wallet-model";
import type {
  MemberWalletBalances,
  MemberWalletTransaction,
} from "./member-wallet-model";

export {
  currentWalletBalance,
  formatMoneySatang,
  formatWalletDate,
  walletStatementRows,
} from "./member-wallet-model";
export type {
  MemberWalletBalances,
  MemberWalletPosting,
  MemberWalletStatementRow,
  MemberWalletTransaction,
} from "./member-wallet-model";

export const MEMBER_TABS = [
  "overview",
  "activity",
  "payouts",
  "top-ups",
  "wallet-statement",
  "reviews",
  "reports",
  "penalty-history",
] as const;

export type MemberTab = (typeof MEMBER_TABS)[number];

export type MemberQuestHistoryEntry = {
  id: string;
  displayId: string;
  title: string;
  status: string;
  role: "Hirer" | "Worker";
  amountSatang: number | null;
  createdAt: string;
  href: string;
};

export type MemberReportEntry = {
  id: string;
  displayId: string;
  category: string;
  detail: string;
  reporterName: string;
  questDisplayId: string | null;
  status: string;
  reportedAt: string;
  href: string;
  kind: "Report Case" | "Conduct Report";
};

export type MemberPenaltyHistoryEntry = {
  event: string;
  at: string;
  by: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  outcome?: string;
  durationDays?: number;
  expiresAt?: string;
  caseId?: string;
  caseType?: "Report Case" | "Conduct Report";
  caseHref?: string;
};

export type MemberStats = {
  questsCreatedCount: number | null;
  questsCompletedAsWorkerCount: number | null;
  reviewsReceivedCount: number | null;
  averageRating: number | null;
  payoutsCount: number | null;
  totalEarnedSatang: number | null;
  totalPaidOutSatang: number | null;
};

export type MemberPayoutEntry = {
  id: string;
  displayId: string | null;
  status: string;
  amountSatang: number | null;
  createdAt: string;
  bankName: string | null;
  maskedDestinationValue: string | null;
};

export type MemberModel = {
  id: string;
  displayId: string | null;
  studentId: string | null;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  telephone: string | null;
  academicYear: number | null;
  faculty: string | null;
  department: string | null;
  occupation: string | null;
  bio: string;
  tags: string[] | null;
  createdAt: string;
  lastActiveAt: string;
  memberStatus: MemberStatus | null;
  walletId: string | null;
  walletStatus: WalletStatus | null;
  walletBalances: MemberWalletBalances | null;
  walletProjectionMatchesLedger: boolean | null;
  reviews: AdminReview[] | null;
  stats: MemberStats;
  quests: MemberQuestHistoryEntry[] | null;
  payouts: MemberPayoutEntry[] | null;
  payoutsComplete: boolean;
  payoutsError: string | null;
  payoutSuccessfulCountMatchesHistory: boolean | null;
  reports: MemberReportEntry[];
  reportsComplete: boolean;
  reportsTotalCount: number | null;
  reportsSubmitted: MemberReportEntry[] | null;
  penaltyHistory: MemberPenaltyHistoryEntry[] | null;
  walletStatement: MemberWalletTransaction[];
  confirmedViolationCount: number | null;
  apiError: string | null;
  reportsError: string | null;
  reportsSubmittedError: string | null;
  walletStatementError: string | null;
};

export type MemberPageData = {
  items: MemberModel[];
  nextCursor: string | null;
};

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function nullableText(value: unknown): string | null {
  const valueText = text(value).trim();
  return valueText || null;
}

function nonnegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function averageRatingValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5
    ? value
    : null;
}

function memberStatsFromApi(value: unknown): MemberStats {
  const stats = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    questsCreatedCount: nonnegativeInteger(stats.questsCreatedCount),
    questsCompletedAsWorkerCount: nonnegativeInteger(stats.questsCompletedAsWorkerCount),
    reviewsReceivedCount: nonnegativeInteger(stats.reviewsReceivedCount),
    averageRating: averageRatingValue(stats.averageRating),
    payoutsCount: nonnegativeInteger(stats.payoutsCount),
    totalEarnedSatang: nonnegativeInteger(stats.totalEarnedSatang),
    totalPaidOutSatang: nonnegativeInteger(stats.totalPaidOutSatang),
  };
}

function payoutSuccessfulCountMatchesHistory(
  stats: MemberStats,
  payouts: readonly MemberPayoutEntry[] | null,
  complete: boolean,
): boolean | null {
  if (!complete || payouts === null || stats.payoutsCount === null) return null;
  return payouts.filter((payout) => payout.status === "SUCCEEDED").length === stats.payoutsCount;
}

function dateLabel(value: unknown, fallback = "Not recorded"): string {
  const raw = text(value).trim();
  if (!raw) return fallback;
  return formatAdminTimestamp(raw, "Asia/Bangkok");
}

function reportFromApi(
  report: AdminReportCase,
  questDisplayIds: ReadonlyMap<string, string>,
): MemberReportEntry {
  const isConductReport = isConductReportStatus(report.status);
  const kind = isConductReport ? "Conduct Report" : "Report Case";
  const reporterNames = isConductReport
    ? [personName(report.filer)]
    : (report.reporterEntries ?? []).map((entry) => personName(entry.reporter));
  const reasonCodes = isConductReport
    ? [report.reason]
    : (report.reporterEntries ?? []).map((entry) => entry.reason);
  const details = isConductReport
    ? [report.detail]
    : (report.reporterEntries ?? []).map((entry) => entry.detail);
  const reporterName = reporterNames.filter((name): name is string => Boolean(name)).join(", ");
  const category = [...new Set(reasonCodes.filter((reason): reason is string => Boolean(reason?.trim())))].join(", ");
  const detail = details.filter((value): value is string => Boolean(value?.trim())).join("; ");
  return {
    id: report.id,
    displayId: displayAdminId(report.displayId, report.id) ?? "",
    category: category || kind,
    detail: detail || "No report detail was provided.",
    reporterName: reporterName || "Reporter not provided",
    questDisplayId: report.questId ? questDisplayIds.get(report.questId) ?? null : null,
    status: report.status,
    reportedAt: dateLabel(report.createdAt),
    href: kind === "Conduct Report" ? conductReportRoutes.detail(report.id) : reportRoutes.detail(report.id),
    kind,
  };
}

function personName(person: { firstName?: string; lastName?: string } | undefined): string | null {
  if (!person) return null;
  const name = [person.firstName, person.lastName].filter((part): part is string => Boolean(part?.trim())).join(" ");
  return name || null;
}

function baseModelFromListItem(
  member: Omit<AdminMemberListItem, "memberStatus"> & { memberStatus?: AdminMemberListItem["memberStatus"] },
): MemberModel {
  const displayId = displayAdminId(member.displayId);
  const title = `${member.firstName} ${member.lastName}`.trim() || displayId || "Member";
  const wallet = member.wallet;
  return {
    id: member.id,
    displayId,
    studentId: nullableText(member.studentId) ?? "Not provided by the Admin API",
    firstName: member.firstName,
    lastName: member.lastName,
    title,
    email: member.email,
    telephone: nullableText(member.telephone),
    academicYear: member.academicYear,
    faculty: nullableText(member.faculty),
    department: nullableText(member.department),
    occupation: nullableText(member.occupation),
    bio: "",
    tags: null,
    createdAt: dateLabel(member.createdAt),
    lastActiveAt: "Not provided by the Admin API",
    memberStatus: member.memberStatus ? memberStatusFor(member.memberStatus) : null,
    walletId: wallet?.id ?? null,
    walletStatus: wallet?.walletStatus ?? null,
    walletBalances: wallet ? {
      spendingBalanceSatang: wallet.spendingBalanceSatang,
      earningsBalanceSatang: wallet.earningsBalanceSatang,
      fundingReservedSatang: 0,
      reservedForPayoutsSatang: 0,
    } : null,
    walletProjectionMatchesLedger: null,
    reviews: null,
    stats: {
      questsCreatedCount: null,
      questsCompletedAsWorkerCount: null,
      reviewsReceivedCount: null,
      averageRating: null,
      payoutsCount: null,
      totalEarnedSatang: null,
      totalPaidOutSatang: null,
    },
    quests: null,
    payouts: null,
    payoutsComplete: false,
    payoutsError: null,
    payoutSuccessfulCountMatchesHistory: null,
    reports: [],
    reportsComplete: false,
    reportsTotalCount: null,
    reportsSubmitted: null,
    penaltyHistory: null,
    walletStatement: [],
    confirmedViolationCount: null,
    apiError: null,
    reportsError: null,
    reportsSubmittedError: "Reports submitted are not available.",
    walletStatementError: null,
  };
}

export function memberListModelFromApi(member: AdminMemberListItem): MemberModel {
  return baseModelFromListItem(member);
}

export function memberModelFromApi(
  detail: AdminMemberDetail,
  finance: AdminMemberFinance | null = null,
  reports: readonly AdminReportCase[] = [],
  ledger: readonly AdminLedgerTransaction[] = [],
  errors: {
    finance?: string | null;
    reports?: string | null;
    reportsComplete?: boolean;
    reportsTotalCount?: number | null;
    ledger?: string | null;
    payouts?: readonly AdminPayout[];
    payoutsComplete?: boolean;
    payoutsError?: string | null;
    reportQuestDisplayIds?: ReadonlyMap<string, string>;
  } = {},
): MemberModel {
  const member = detail.member;
  const listItem: AdminMemberListItem = {
    ...member,
    wallet: detail.wallet ? {
      id: detail.wallet.id,
      walletStatus: detail.wallet.walletStatus,
      spendingBalanceSatang: detail.wallet.spendingBalanceSatang,
      earningsBalanceSatang: detail.wallet.earningsBalanceSatang,
      totalBalanceSatang: detail.wallet.totalBalanceSatang,
    } : null,
  };
  const base = baseModelFromListItem(listItem);
  const wallet = finance?.wallet ?? detail.wallet;
  const stats = memberStatsFromApi(detail.stats);
  const payouts = errors.payouts
    ? errors.payouts.map((payout) => ({
        id: payout.id,
        displayId: nullableText(payout.displayId),
        status: payout.payoutStatus,
        amountSatang: payout.principalSatang,
        createdAt: dateLabel(payout.createdAt),
        bankName: nullableText(payout.bankName),
        maskedDestinationValue: nullableText(payout.maskedDestinationValue),
      }))
    : null;
  const payoutsComplete = errors.payoutsComplete ?? false;
  const reportQuestDisplayIds = errors.reportQuestDisplayIds ?? new Map<string, string>();
  return {
    ...base,
    bio: member.bio ?? "",
    walletId: wallet?.id ?? null,
    walletStatus: wallet ? walletStatusFor(wallet.walletStatus) : null,
    walletBalances: balancesFromWallet(wallet),
    walletProjectionMatchesLedger: wallet?.projectionMatchesLedger ?? null,
    reports: reports.map((report) => reportFromApi(report, reportQuestDisplayIds)),
    reportsComplete: errors.reportsComplete ?? false,
    reportsTotalCount: errors.reportsTotalCount ?? null,
    payouts,
    payoutsComplete,
    payoutsError: errors.payoutsError ?? null,
    payoutSuccessfulCountMatchesHistory: payoutSuccessfulCountMatchesHistory(stats, payouts, payoutsComplete),
    walletStatement: ledger.map(transactionFromApi),
    stats,
    apiError: errors.finance ?? (finance ? null : "Member finance is not available from the Admin API."),
    reportsError: errors.reports ?? null,
    walletStatementError: errors.ledger ?? null,
  };
}

export function memberStatusText(model: MemberModel): string {
  return model.memberStatus ? memberStatusLabel(model.memberStatus) : "Not provided by the Admin API";
}

export function memberStatusClass(model: MemberModel): string {
  return model.memberStatus ? statusBadgeClass(model.memberStatus) : "";
}

export function walletStatusText(model: MemberModel): string {
  return model.walletStatus ? walletStatusLabel(model.walletStatus) : "No Wallet";
}

export function walletStatusClass(model: MemberModel): string {
  return model.walletStatus ? statusBadgeClass(model.walletStatus) : "";
}

export function memberTabFrom(value: string | null | undefined): MemberTab {
  return value && (MEMBER_TABS as readonly string[]).includes(value) ? value as MemberTab : "overview";
}

export function memberTabHref(memberId: string, tab: MemberTab): string {
  const path = memberRoutes.detail(memberId);
  return tab === "overview" ? path : `${path}?tab=${encodeURIComponent(tab)}`;
}

export function reportRouteForMember(memberId: string): string {
  return reportRoutes.list() + `?reportedMemberId=${encodeURIComponent(memberId)}`;
}
