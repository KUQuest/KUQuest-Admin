import type {
  AdminLedgerTransaction,
  AdminMemberCertificate,
  AdminMemberDetail,
  AdminMemberHistoryItem,
  AdminMemberListItem,
  AdminMemberPenaltyHistoryItem,
  AdminMemberPayout,
  AdminMemberReport,
  AdminMemberReview,
  AdminMemberWorkExperience,
} from "../api/admin-api";
import { formatAdminTimestamp } from "../date-format";
import { conductReportReasonLabel } from "../conduct-report/conduct-report-model";
import { reportReasonLabel } from "../report/report-model";
import {
  memberStatusFor,
  memberStatusLabel,
  questStateLabel,
  walletStatusLabel,
  type MemberStatus,
  type WalletStatus,
} from "../domain/rulebook";
import { statusBadgeClass } from "../status-badge";
import { displayAdminId } from "../display-admin-id";
import { conductReportRoutes, memberRoutes, questRoutes, reportRoutes } from "../admin-routes";
import { transactionFromApi } from "./member-wallet-model";
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
export type MemberCollectionError = {
  kind: "request" | "contract";
  message: string;
};

export type MemberCollection<T> = {
  items: T[] | null;
  totalCount: number | null;
  complete: boolean;
  error: MemberCollectionError | null;
};
export type MemberWalletReadState =
  | { kind: "available"; source: "finance" | "member-detail"; warning: MemberCollectionError | null }
  | { kind: "absent"; source: "finance" | "member-detail"; warning: MemberCollectionError | null }
  | { kind: "unavailable" }
  | { kind: "request-error"; error: MemberCollectionError }
  | { kind: "contract-error"; error: MemberCollectionError }
  | { kind: "conflict"; error: MemberCollectionError };



export type MemberQuestHistoryEntry = AdminMemberHistoryItem & {
  href: string;
};

export function memberQuestHistoryStatusLabel(entry: MemberQuestHistoryEntry): string {
  if (entry.role === "HIRER") return questStateLabel(entry.quest.questStatus);
  switch (entry.assignmentStatus) {
    case "ASSIGNMENT_ACTIVE": return "Assignment active";
    case "ASSIGNMENT_COMPLETED": return "Assignment completed";
    case "ASSIGNMENT_INCOMPLETE": return "Assignment incomplete";
    case "ASSIGNMENT_CANCELLED": return "Assignment cancelled";
    default: return "Not provided by the Admin API";
  }
}

export function memberQuestHistoryStatusDate(entry: MemberQuestHistoryEntry): string | null {
  return entry.role === "HIRER" ? entry.quest.questStatusChangedAt : entry.assignmentStatusChangedAt;
}

export type MemberReportEntry = {
  id: string;
  displayId: string;
  category: string;
  detail: string;
  reporterId: string | null;
  reporterDisplayId: string | null;
  reporterName: string;
  reporterHref: string | null;
  reportedMemberId: string | null;
  reportedMemberDisplayId: string | null;
  reportedMemberName: string | null;
  reportedMemberHref: string | null;
  questDisplayId: string | null;
  questTitle: string | null;
  questHref: string | null;
  status: string;
  reportedAt: string;
  href: string;
  kind: "Report Case" | "Conduct Report";
};

export type MemberPenaltyHistoryEntry = AdminMemberPenaltyHistoryItem;
export function memberPenaltyHistoryItemKey(entry: MemberPenaltyHistoryEntry): string {
  return `${entry.ladder}:${entry.sequenceNumber}:${entry.result}:${entry.createdAt}`;
}


export type MemberPenaltyHistorySummary = {
  confirmedMisconductCount: number;
  effectiveActiveMisconductPenaltyCount: number;
  reviewLadderRecordCount: number;
};

export type MemberPenaltyHistoryCollection = MemberCollection<MemberPenaltyHistoryEntry> & {
  summary: MemberPenaltyHistorySummary | null;
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
  memberDisplayId: string | null;
  memberName: string;
  status: string;
  amountSatang: number;
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
  profileTags: MemberCollection<string>;
  workExperiences: MemberCollection<AdminMemberWorkExperience>;
  certificates: MemberCollection<AdminMemberCertificate>;
  createdAt: string;
  lastActiveAt: string;
  memberStatus: MemberStatus | null;
  walletReadState: MemberWalletReadState;
  walletId: string | null;
  walletStatus: WalletStatus | null;
  walletBalances: MemberWalletBalances | null;
  walletProjectionMatchesLedger: boolean | null;
  reviews: MemberCollection<AdminMemberReview>;
  stats: MemberStats;
  questHistory: MemberCollection<MemberQuestHistoryEntry>;
  payouts: MemberCollection<MemberPayoutEntry>;
  reportsReceived: MemberCollection<MemberReportEntry>;
  reportsSubmitted: MemberCollection<MemberReportEntry>;
  penaltyHistory: MemberPenaltyHistoryCollection;
  walletStatement: MemberCollection<MemberWalletTransaction>;
};

export type MemberApiCollections = {
  profileTags: MemberCollection<string>;
  workExperiences: MemberCollection<AdminMemberWorkExperience>;
  certificates: MemberCollection<AdminMemberCertificate>;
  questHistory: MemberCollection<AdminMemberHistoryItem>;
  reviews: MemberCollection<AdminMemberReview>;
  reportsReceived: MemberCollection<AdminMemberReport>;
  reportsSubmitted: MemberCollection<AdminMemberReport>;
  payouts: MemberCollection<AdminMemberPayout>;
  penaltyHistory: MemberPenaltyHistoryCollection;
};

export type MemberApiReadData = {
  walletReadState: MemberWalletReadState;
  walletId: string | null;
  walletStatus: WalletStatus | null;
  walletBalances: MemberWalletBalances | null;
  walletProjectionMatchesLedger: boolean | null;
  walletStatement: MemberCollection<AdminLedgerTransaction>;
  collections: MemberApiCollections;
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


function reportFromApi(report: AdminMemberReport, submittedByMemberId?: string): MemberReportEntry {
  const reporterEntry = report.kind === "REPORT_CASE"
    ? submittedByMemberId
      ? report.reporterEntries.find((entry) => entry.reporterMemberId === submittedByMemberId) ?? null
      : report.reporterEntries[0] ?? null
    : null;
  const reporter = report.kind === "CONDUCT_REPORT" ? report.filer : reporterEntry?.reporter ?? null;
  const reportedMember = report.reportedMember;
  const reporterId = report.kind === "CONDUCT_REPORT"
    ? report.filer.id
    : reporterEntry?.reporterMemberId ?? null;
  const reporterName = reporter
    ? [reporter.firstName, reporter.lastName].filter(Boolean).join(" ")
    : "";
  const quest = report.quest;
  const kind = report.kind === "CONDUCT_REPORT" ? "Conduct Report" : "Report Case";
  return {
    id: report.id,
    displayId: displayAdminId(report.displayId) ?? "",
    category: report.kind === "CONDUCT_REPORT"
      ? conductReportReasonLabel(report.reason)
      : reportReasonLabel(reporterEntry?.reason) ?? "Report Case",
    detail: report.kind === "CONDUCT_REPORT"
      ? report.detail ?? "No report detail was provided."
      : reporterEntry?.detail ?? "No report detail was provided.",
    reporterId,
    reporterDisplayId: displayAdminId(reporter?.displayId),
    reporterName: reporterName || (reporterId ? "Member" : "Reporter not provided"),
    reporterHref: reporterId ? memberRoutes.detail(reporterId) : null,
    reportedMemberId: reportedMember?.id ?? null,
    reportedMemberDisplayId: displayAdminId(reportedMember?.displayId),
    reportedMemberName: reportedMember
      ? [reportedMember.firstName, reportedMember.lastName].filter(Boolean).join(" ") || null
      : null,
    reportedMemberHref: reportedMember?.id ? memberRoutes.detail(reportedMember.id) : null,
    questDisplayId: displayAdminId(quest?.displayId),
    questTitle: quest?.title ?? null,
    questHref: quest?.id ? questRoutes.detail(quest.id) : null,
    status: report.status,
    reportedAt: dateLabel(report.kind === "REPORT_CASE" ? reporterEntry?.createdAt ?? report.createdAt : report.createdAt),
    href: report.kind === "CONDUCT_REPORT" ? conductReportRoutes.detail(report.id) : reportRoutes.detail(report.id),
    kind,
  };
}

function unavailableCollection<T>(): MemberCollection<T> {
  return { items: null, totalCount: null, complete: false, error: null };
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
    profileTags: unavailableCollection(),
    workExperiences: unavailableCollection(),
    certificates: unavailableCollection(),
    createdAt: dateLabel(member.createdAt),
    lastActiveAt: "Not provided by the Admin API",
    memberStatus: member.memberStatus ? memberStatusFor(member.memberStatus) : null,
    walletReadState: { kind: "unavailable" },
    walletId: wallet?.id ?? null,
    walletStatus: wallet?.walletStatus ?? null,
    walletBalances: null,
    walletProjectionMatchesLedger: null,
    reviews: unavailableCollection(),
    stats: {
      questsCreatedCount: null,
      questsCompletedAsWorkerCount: null,
      reviewsReceivedCount: null,
      averageRating: null,
      payoutsCount: null,
      totalEarnedSatang: null,
      totalPaidOutSatang: null,
    },
    questHistory: unavailableCollection(),
    payouts: unavailableCollection(),
    reportsReceived: unavailableCollection(),
    reportsSubmitted: unavailableCollection(),
    penaltyHistory: { ...unavailableCollection(), summary: null },
    walletStatement: unavailableCollection(),
  };
}

export function memberListModelFromApi(member: AdminMemberListItem): MemberModel {
  return baseModelFromListItem(member);
}

function mapMemberCollection<TSource, TTarget>(
  collection: MemberCollection<TSource>,
  map: (item: TSource) => TTarget,
): MemberCollection<TTarget> {
  return {
    ...collection,
    items: collection.items === null ? null : collection.items.map(map),
  };
}

export function memberModelFromApi(
  detail: AdminMemberDetail,
  reads: MemberApiReadData,
): MemberModel {
  const member = detail.member;
  const listItem: AdminMemberListItem = {
    ...member,
    wallet: null,
  };
  const base = baseModelFromListItem(listItem);
  return {
    ...base,
    bio: member.bio ?? "",
    profileTags: reads.collections.profileTags,
    workExperiences: reads.collections.workExperiences,
    certificates: reads.collections.certificates,
    walletReadState: reads.walletReadState,
    walletId: reads.walletId,
    walletStatus: reads.walletStatus,
    walletBalances: reads.walletBalances,
    walletProjectionMatchesLedger: reads.walletProjectionMatchesLedger,
    reviews: reads.collections.reviews,
    stats: memberStatsFromApi(detail.stats),
    questHistory: mapMemberCollection(reads.collections.questHistory, (item) => ({
      ...item,
      href: questRoutes.detail(item.quest.id),
    })),
    payouts: mapMemberCollection(reads.collections.payouts, (payout) => ({
      id: payout.id,
      displayId: displayAdminId(payout.displayId),
      memberDisplayId: displayAdminId(payout.student.displayId),
      memberName: [payout.student.firstName, payout.student.lastName].filter(Boolean).join(" ") || "Member",
      status: payout.payoutStatus,
      amountSatang: payout.principalSatang,
      createdAt: dateLabel(payout.createdAt),
      bankName: nullableText(payout.bankName),
      maskedDestinationValue: nullableText(payout.maskedDestinationValue),
    })),
    reportsReceived: mapMemberCollection(reads.collections.reportsReceived, reportFromApi),
    reportsSubmitted: mapMemberCollection(
      reads.collections.reportsSubmitted,
      (report) => reportFromApi(report, member.id),
    ),
    penaltyHistory: reads.collections.penaltyHistory,
    walletStatement: mapMemberCollection(reads.walletStatement, transactionFromApi),
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
  switch (model.walletReadState.kind) {
    case "absent": return "Member นี้ไม่มี Wallet";
    case "request-error": return "อ่านข้อมูล Wallet ไม่สำเร็จ";
    case "contract-error": return "ข้อมูล Wallet ไม่ตรงตามสัญญา API";
    case "conflict": return "ข้อมูล Wallet ขัดแย้งกัน";
    case "unavailable": return "ยังไม่ยืนยันข้อมูล Wallet";
    case "available": return "Wallet status is not provided.";
  }
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
