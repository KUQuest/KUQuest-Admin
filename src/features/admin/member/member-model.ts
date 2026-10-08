import type {
  AdminApiPayoutStatus,
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
import { balancesFromWallet, isNonnegativeSafeInteger, transactionFromApi } from "./member-wallet-model";
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
  status: AdminApiPayoutStatus;
  amountSatang: number | null;
  createdAt: string;
  bankName: string | null;
  maskedDestinationValue: string | null;
};

export type MemberWalletState = "available" | "absent" | "unavailable" | "conflict" | "invalid" | "unverified";
export type MemberWalletSource = "finance" | "member-detail" | "member-list" | null;
export type MemberWalletStatementState = "complete" | "failed" | "invalid" | "incomplete" | "not-applicable";
export type MemberWalletReadSurface = "wallet" | "latest-date" | "statement";

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
  walletState: MemberWalletState;
  walletSource: MemberWalletSource;
  walletStatementState: MemberWalletStatementState;
  walletStatementComplete: boolean;
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
  return isNonnegativeSafeInteger(value) ? value : null;
}

export function memberWalletReadStateMessage(
  model: Pick<MemberModel, "walletState" | "walletStatementState">,
  surface: MemberWalletReadSurface,
): string | null {
  switch (model.walletState) {
    case "absent": return "This Member has no Wallet.";
    case "conflict": return "Wallet data conflicts.";
    case "invalid": return "Wallet data conflicts with the API contract.";
    case "unavailable": return "Wallet data is not available.";
    case "unverified": return "Wallet data is not verified.";
    case "available": break;
  }
  if (surface === "wallet") return null;
  switch (model.walletStatementState) {
    case "complete": return null;
    case "failed": return surface === "latest-date"
      ? "Could not read the latest Ledger Transaction date."
      : "Could not read the Wallet Statement.";
    case "invalid": return surface === "statement"
      ? "Wallet Statement data does not match the API contract."
      : "Wallet data conflicts with the API contract.";
    case "incomplete":
    case "not-applicable": return surface === "latest-date"
      ? "Latest Wallet Transaction date is not verified."
      : "Wallet Statement is not verified.";
  }
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
  return {
    id: report.id,
    displayId: displayAdminId(report.displayId, report.id) ?? "",
    questDisplayId: report.questId ? questDisplayIds.get(report.questId) ?? null : null,
    status: report.status,
    reportedAt: dateLabel(report.createdAt),
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
    walletBalances: null,
    walletProjectionMatchesLedger: null,
    walletState: "unverified",
    walletSource: wallet ? "member-list" : null,
    walletStatementState: "not-applicable",
    walletStatementComplete: false,
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
  memberReads: {
    finance?: string | null;
    wallet?: NonNullable<AdminMemberDetail["wallet"]> | NonNullable<AdminMemberFinance["wallet"]> | null;
    walletState?: MemberWalletState;
    walletSource?: MemberWalletSource;
    walletStatementState?: MemberWalletStatementState;
    walletStatementComplete?: boolean;
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
  const wallet = Object.hasOwn(memberReads, "wallet")
    ? memberReads.wallet ?? null
    : finance ? finance.wallet ?? null : detail.wallet;
  const stats = memberStatsFromApi(detail.stats);
  const payouts = memberReads.payouts
    ? memberReads.payouts.map((payout) => ({
        id: payout.id,
        displayId: nullableText(payout.displayId),
        status: payout.payoutStatus,
        amountSatang: payout.principalSatang,
        createdAt: dateLabel(payout.createdAt),
        bankName: nullableText(payout.bankName),
        maskedDestinationValue: nullableText(payout.maskedDestinationValue),
      }))
    : null;
  const payoutsComplete = memberReads.payoutsComplete ?? false;
  const reportQuestDisplayIds = memberReads.reportQuestDisplayIds ?? new Map<string, string>();
  return {
    ...base,
    bio: member.bio ?? "",
    walletId: wallet?.id ?? null,
    walletStatus: wallet ? walletStatusFor(wallet.walletStatus) : null,
    walletBalances: balancesFromWallet(wallet),
    walletProjectionMatchesLedger: wallet?.projectionMatchesLedger ?? null,
    walletState: memberReads.walletState ?? (wallet ? "available" : "unverified"),
    walletSource: memberReads.walletSource ?? (wallet ? (finance?.wallet ? "finance" : "member-detail") : null),
    walletStatementState: memberReads.walletStatementState ?? "not-applicable",
    walletStatementComplete: memberReads.walletStatementComplete ?? false,
    reports: reports.map((report) => reportFromApi(report, reportQuestDisplayIds)),
    reportsComplete: memberReads.reportsComplete ?? false,
    reportsTotalCount: memberReads.reportsTotalCount ?? null,
    payouts,
    payoutsComplete,
    payoutsError: memberReads.payoutsError ?? null,
    payoutSuccessfulCountMatchesHistory: payoutSuccessfulCountMatchesHistory(stats, payouts, payoutsComplete),
    walletStatement: ledger.map(transactionFromApi),
    stats,
    apiError: memberReads.finance ?? (finance ? null : "Member finance could not be loaded."),
    reportsError: memberReads.reports ?? null,
    walletStatementError: memberReads.ledger ?? null,
  };
}

export function memberStatusText(model: MemberModel): string {
  return model.memberStatus ? memberStatusLabel(model.memberStatus) : "Not provided by the Admin API";
}

export function memberStatusClass(model: MemberModel): string {
  return model.memberStatus ? statusBadgeClass(model.memberStatus) : "";
}

export function walletStatusText(model: MemberModel): string {
  if (model.walletStatus) return walletStatusLabel(model.walletStatus);
  return memberWalletReadStateMessage(model, "wallet") ?? "Wallet data is not verified.";
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
