import type {
  AdminLedgerTransaction,
  AdminMemberDetail,
  AdminMemberFinance,
  AdminMemberListItem,
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
  questsCreatedCount: number;
  questsCompletedAsWorkerCount: number;
  reviewsReceivedCount: number;
  averageRating: number | null;
  payoutsCount: number;
  totalEarnedSatang: number;
  totalPaidOutSatang: number;
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
  tags: string[];
  createdAt: string;
  lastActiveAt: string;
  memberStatus: MemberStatus | null;
  walletId: string | null;
  walletStatus: WalletStatus | null;
  walletBalances: MemberWalletBalances | null;
  walletProjectionMatchesLedger: boolean | null;
  reviews: AdminReview[];
  stats: MemberStats;
  quests: MemberQuestHistoryEntry[];
  payouts: Array<{ id: string; status: string; amountSatang: number | null; createdAt: string }>;
  reports: MemberReportEntry[];
  reportsSubmitted: MemberReportEntry[];
  penaltyHistory: MemberPenaltyHistoryEntry[];
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

function dateLabel(value: unknown, fallback = "Not recorded"): string {
  const raw = text(value).trim();
  if (!raw) return fallback;
  return formatAdminTimestamp(raw, "Asia/Bangkok");
}

function reportFromApi(report: AdminReportCase): MemberReportEntry {
  const record = report as Record<string, unknown>;
  const reporterId = nullableText(record.reporterId ?? record.submittedByUserId ?? record.submittedByMemberId);
  const reportedAt = dateLabel(record.reportedAt ?? record.submittedAt ?? record.createdAt);
  const status = text(record.status ?? record.reportCaseStatus ?? record.conductReportStatus, "REPORT_CASE_PENDING");
  const kind = isConductReportStatus(status) ? "Conduct Report" : "Report Case";
  return {
    id: report.id,
    displayId: displayAdminId(record.displayId, report.id) ?? "",
    category: text(record.category ?? record.reportType ?? record.reasonCode, "Report Case"),
    detail: text(record.details ?? record.description ?? record.detail, "No report detail was provided."),
    reporterId,
    reporterName: text(record.reporterName ?? record.submittedByMemberName, reporterId ? "Member" : "Reporter not provided"),
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
    tags: [],
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
    reviews: [],
    stats: {
      questsCreatedCount: 0,
      questsCompletedAsWorkerCount: 0,
      reviewsReceivedCount: 0,
      averageRating: null,
      payoutsCount: 0,
      totalEarnedSatang: 0,
      totalPaidOutSatang: 0,
    },
    quests: [],
    payouts: [],
    reports: [],
    reportsSubmitted: [],
    penaltyHistory: [],
    walletStatement: [],
    confirmedViolationCount: null,
    apiError: null,
    reportsError: null,
    reportsSubmittedError: "Member reports submitted are not provided by the Admin API.",
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
  errors: { finance?: string | null; reports?: string | null; ledger?: string | null } = {},
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
    walletStatement: ledger.map(transactionFromApi),
    stats: detail.stats,
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
