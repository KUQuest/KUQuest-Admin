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
  reporterId: string | null;
  reporterName: string;
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

function dateLabel(value: unknown, fallback = "Not recorded"): string {
  const raw = text(value).trim();
  if (!raw) return fallback;
  return formatAdminTimestamp(raw, "Asia/Bangkok");
}

function reportReasonLabel(value: unknown): string {
  switch (value) {
    case "REPORT_ABUSIVE_OR_HARASSMENT": return "Harassment or abuse";
    case "REPORT_SPAM": return "Spam";
    case "REPORT_INAPPROPRIATE_CONTENT": return "Inappropriate content";
    case "REPORT_DANGER_OR_THREAT": return "Danger or threat";
    case "REPORT_OTHER": return "Other";
    case "CONDUCT_ABANDONED": return "Abandonment";
    case "CONDUCT_OUT_OF_SCOPE": return "Outside agreed Quest scope";
    case "CONDUCT_NO_SHOW": return "Worker did not attend";
    default: return text(value, "Report Case");
  }
}

function reportFromApi(report: AdminReportCase): MemberReportEntry {
  const record = report as Record<string, unknown>;
  const reporterEntries = Array.isArray(record.reporterEntries) ? record.reporterEntries : [];
  const reporterEntry = reporterEntries[0] && typeof reporterEntries[0] === "object"
    ? reporterEntries[0] as Record<string, unknown>
    : null;
  const reporter = record.filer && typeof record.filer === "object"
    ? record.filer as Record<string, unknown>
    : reporterEntry?.reporter && typeof reporterEntry.reporter === "object"
      ? reporterEntry.reporter as Record<string, unknown>
      : null;
  const reporterId = nullableText(record.reporterId ?? record.submittedByUserId ?? record.submittedByMemberId ?? reporterEntry?.reporterMemberId ?? reporter?.id);
  const reportedAt = dateLabel(record.reportedAt ?? record.submittedAt ?? record.createdAt);
  const status = text(record.status ?? record.reportCaseStatus ?? record.conductReportStatus, "REPORT_CASE_PENDING");
  const kind = record.kind === "CONDUCT_REPORT" || isConductReportStatus(status) ? "Conduct Report" : "Report Case";
  const reporterName = [text(reporter?.firstName), text(reporter?.lastName)].filter(Boolean).join(" ");
  return {
    id: report.id,
    displayId: displayAdminId(record.displayId, report.id) ?? "",
    category: reportReasonLabel(record.category ?? record.reportType ?? record.reasonCode ?? record.reason ?? reporterEntry?.reason),
    detail: text(record.details ?? record.description ?? record.detail ?? reporterEntry?.detail, "No report detail was provided."),
    reporterId,
    reporterName: text(record.reporterName ?? record.submittedByMemberName ?? reporterName, reporterId ? "Member" : "Reporter not provided"),
    status,
    reportedAt,
    href: kind === "Conduct Report" ? conductReportRoutes.detail(report.id) : reportRoutes.detail(report.id),
    kind,
  };
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
  return {
    ...base,
    bio: member.bio ?? "",
    walletId: wallet?.id ?? null,
    walletStatus: wallet ? walletStatusFor(wallet.walletStatus) : null,
    walletBalances: balancesFromWallet(wallet),
    walletProjectionMatchesLedger: wallet?.projectionMatchesLedger ?? null,
    reports: reports.map(reportFromApi),
    reportsComplete: errors.reportsComplete ?? false,
    reportsTotalCount: errors.reportsTotalCount ?? null,
    payouts: errors.payouts
      ? errors.payouts.map((payout) => ({
          id: payout.id,
          displayId: nullableText(payout.displayId),
          status: payout.payoutStatus,
          amountSatang: payout.principalSatang,
          createdAt: dateLabel(payout.createdAt),
          bankName: nullableText(payout.bankName),
          maskedDestinationValue: nullableText(payout.maskedDestinationValue),
        }))
      : null,
    payoutsComplete: errors.payoutsComplete ?? false,
    payoutsError: errors.payoutsError ?? null,
    walletStatement: ledger.map(transactionFromApi),
    stats: memberStatsFromApi(detail.stats),
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
