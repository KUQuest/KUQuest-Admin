import type {
  AdminLedgerTransaction,
  AdminMemberDetail,
  AdminMemberFinance,
  AdminMemberListItem,
  AdminReportCase,
} from "../api/admin-api";
import type { AdminReview, PersistedAdminData } from "../data/admin-records";
import {
  memberStatusFor,
  memberStatusLabel,
  walletStatusFor,
  walletStatusLabel,
  type MemberStatus,
  type WalletStatus,
} from "../domain/rulebook";
import { statusBadgeClass } from "../status-badge";
import { memberRoutes, reportRoutes, questRoutes } from "../admin-routes";

export const MEMBER_TABS = [
  "overview",
  "activity",
  "payouts",
  "wallet-statement",
  "reviews",
  "reports",
  "penalty-history",
] as const;

export type MemberTab = (typeof MEMBER_TABS)[number];

export type MemberWalletBalances = {
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  fundingReservedSatang: number;
  reservedForPayoutsSatang: number;
};

export type MemberWalletPosting = {
  accountType: string;
  walletId: string | null;
  amountSatang: number;
};

export type MemberWalletTransaction = {
  id: string;
  businessReference?: string;
  eventType: string;
  description: string | null;
  createdAt: string;
  sealedAt: string | null;
  postings: MemberWalletPosting[];
  balanceAfter?: MemberWalletBalances;
};

export type MemberWalletStatementRow = {
  transaction: MemberWalletTransaction;
  signedAmountSatang: number;
  movement: Array<{ accountType: string; amountSatang: number }>;
  resultingBalances: MemberWalletBalances;
  resultingWalletBalanceSatang: number;
};

export type MemberQuestHistoryEntry = {
  id: string;
  title: string;
  status: string;
  role: "Hirer" | "Worker";
  amountSatang: number | null;
  createdAt: string;
  href: string;
};

export type MemberReportEntry = {
  id: string;
  category: string;
  detail: string;
  reporterId: string | null;
  reporterName: string;
  status: string;
  reportedAt: string;
  href: string;
};

export type MemberPenaltyHistoryEntry = {
  event: string;
  at: string;
  by: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  outcome?: string;
};

export type MemberAdminNote = {
  at: string;
  by: string;
  note: string;
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
  memberStatusSource: "mock" | "NOT_PROVIDED_BY_API";
  walletId: string | null;
  walletStatus: WalletStatus | null;
  walletBalances: MemberWalletBalances | null;
  walletProjectionMatchesLedger: boolean | null;
  reviews: AdminReview[];
  stats: MemberStats;
  quests: MemberQuestHistoryEntry[];
  payouts: Array<{ id: string; status: string; amountSatang: number | null; createdAt: string }>;
  reports: MemberReportEntry[];
  penaltyHistory: MemberPenaltyHistoryEntry[];
  adminNotes: MemberAdminNote[];
  walletStatement: MemberWalletTransaction[];
  confirmedViolationCount: number | null;
  newUserExemptionRemaining: number;
  postBanExemptionRemaining: number;
  statusReason: string | null;
  statusAppliedAt: string | null;
  statusAppliedBy: string | null;
  redFlagExpiresAt: string | null;
  banExpiresAt: string | null;
  source: "api" | "mock";
  apiError?: string | null;
  reportsError: string | null;
  walletStatementError: string | null;
};

export type MemberPageData = {
  source: "api" | "mock";
  items: MemberModel[];
  nextCursor: string | null;
};

export type MemberActionOutcome = {
  label: string;
  walletStatus: WalletStatus;
  memberStatus: MemberStatus;
  durationDays: number | null;
  expiresAt: string | null;
  exempted: boolean;
};

const WALLET_ACCOUNT_TYPES: Record<string, true> = {
  SPENDING: true,
  EARNINGS: true,
  FUNDING_RESERVED: true,
  RESERVED_FOR_PAYOUTS: true,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function nullableText(value: unknown): string | null {
  const valueText = text(value).trim();
  return valueText ? valueText : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateLabel(value: unknown, fallback = "Not recorded"): string {
  const raw = text(value).trim();
  if (!raw) return fallback;
  const date = new Date(raw.replace(" · ", " "));
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })} ICT`;
}

function balancesFromWallet(wallet: {
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  fundingReservedSatang?: number;
  reservedForPayoutsSatang?: number;
  totalBalanceSatang?: number;
} | null | undefined): MemberWalletBalances | null {
  if (!wallet) return null;
  return {
    spendingBalanceSatang: numberValue(wallet.spendingBalanceSatang),
    earningsBalanceSatang: numberValue(wallet.earningsBalanceSatang),
    fundingReservedSatang: numberValue(wallet.fundingReservedSatang),
    reservedForPayoutsSatang: numberValue(wallet.reservedForPayoutsSatang),
  };
}

function transactionFromApi(transaction: AdminLedgerTransaction): MemberWalletTransaction {
  return {
    id: transaction.id,
    businessReference: transaction.businessReference,
    eventType: transaction.eventType,
    description: transaction.description,
    createdAt: transaction.createdAt,
    sealedAt: transaction.sealedAt,
    postings: transaction.postings.map((posting) => ({
      accountType: posting.accountType,
      walletId: posting.walletId,
      amountSatang: posting.amountSatang,
    })),
  };
}

function reportFromApi(report: AdminReportCase): MemberReportEntry {
  const record = report as Record<string, unknown>;
  const reporterId = nullableText(record.reporterId ?? record.submittedByUserId ?? record.submittedByMemberId);
  const reportedAt = dateLabel(record.reportedAt ?? record.submittedAt ?? record.createdAt);
  return {
    id: report.id,
    category: text(record.category ?? record.reportType ?? record.reasonCode, "Report Case"),
    detail: text(record.details ?? record.description ?? record.detail, "No report detail was provided by the Admin API."),
    reporterId,
    reporterName: text(record.reporterName ?? record.submittedByMemberName ?? reporterId, "Reporter not provided"),
    status: text(record.status, "REPORT_CASE_PENDING"),
    reportedAt,
    href: reportRoutes.detail(report.id),
  };
}

function reportFromMock(value: unknown): MemberReportEntry | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = nullableText(record.id);
  const memberId = nullableText(record.reportedMemberId ?? record.reportedUserId);
  if (!id || !memberId) return null;
  return {
    id,
    category: text(record.category ?? record.reportType ?? record.reasonCode, "Report Case"),
    detail: text(record.details ?? record.description ?? record.detail, "No report detail was provided."),
    reporterId: nullableText(record.reporterId),
    reporterName: text(record.reporterName, "Reporter not provided"),
    status: text(record.status ?? record.reportCaseStatus ?? record.conductReportStatus, "REPORT_CASE_PENDING"),
    reportedAt: dateLabel(record.reportedAt ?? record.createdAt),
    href: reportRoutes.detail(id),
  };
}

function questFromMock(value: unknown, memberTitle: string): MemberQuestHistoryEntry | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = nullableText(record.id);
  const title = nullableText(record.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    status: text(record.questState ?? record.status, "QUEST_OPEN"),
    role: text(record.person) === memberTitle ? "Hirer" : "Worker",
    amountSatang: nullableNumber(record.amountSatang) ?? (typeof record.amount === "number" ? Math.round(record.amount * 100) : null),
    createdAt: dateLabel(record.createdAt ?? record.activityAt ?? record.age),
    href: questRoutes.detail(id),
  };
}

function reviewFromMock(value: unknown): AdminReview | null {
  const record = asRecord(value);
  if (!record) return null;
  const reviewer = nullableText(record.reviewer);
  if (!reviewer) return null;
  const status = record.status === "Hidden" || record.status === "Reported" ? record.status : "Visible";
  const tone = record.tone === "warning" || record.tone === "neutral" ? record.tone : "success";
  return {
    reviewer,
    rating: Math.max(1, Math.min(5, Math.round(numberValue(record.rating, 5)))),
    review: text(record.review),
    date: text(record.date, "Date not recorded"),
    reports: Math.max(0, Math.round(numberValue(record.reports))),
    status,
    tone,
    ...(record.statusBeforeHidden === "Visible" || record.statusBeforeHidden === "Reported" ? { statusBeforeHidden: record.statusBeforeHidden } : {}),
    ...(record.toneBeforeHidden === "success" || record.toneBeforeHidden === "warning" || record.toneBeforeHidden === "neutral" ? { toneBeforeHidden: record.toneBeforeHidden } : {}),
  };
}

function generatedReviews(index: number): AdminReview[] {
  const reviewers = ["Amara Ariyawat", "Benja Ariyawat", "Chayut Boonprasert", "Darin Intharawong", "Fah Lertwiroj", "Gunn Maneewan"];
  const comments = [
    "Clear updates and dependable delivery throughout the Quest.",
    "The final work was accurate and easy for the team to use.",
    "Thoughtful questions helped clarify the project early.",
    "Well prepared, responsive, and professional from start to finish.",
  ];
  return Array.from({ length: 9 }, (_, reviewIndex) => {
    const reported = reviewIndex === 4 && index % 2 === 0;
    return {
      reviewer: reviewers[(index + reviewIndex) % reviewers.length],
      rating: 3 + ((index + reviewIndex) % 3),
      review: comments[reviewIndex % comments.length],
      date: `${reviewIndex + 1} ${reviewIndex === 0 ? "week" : "month"}${reviewIndex === 0 ? "" : "s"} ago`,
      reports: reported ? 1 : 0,
      status: reported ? "Reported" : "Visible",
      tone: reported ? "warning" : "success",
    };
  });
}

function historyFromMock(record: Record<string, unknown>, createdAt: string): MemberPenaltyHistoryEntry[] {
  const value = record.moderationHistory;
  if (!Array.isArray(value)) return [{ event: "Account created", at: createdAt, by: "System", reason: "Account created." }];
  const history = value.flatMap((entry): MemberPenaltyHistoryEntry[] => {
    const item = asRecord(entry);
    if (!item) return [];
    return [{
      event: text(item.event, "Moderation event"),
      at: text(item.at, "Date not recorded"),
      by: text(item.by, "System"),
      ...(nullableText(item.reason) ? { reason: nullableText(item.reason) as string } : {}),
      ...(nullableText(item.previousStatus) ? { previousStatus: nullableText(item.previousStatus) as string } : {}),
      ...(nullableText(item.newStatus) ? { newStatus: nullableText(item.newStatus) as string } : {}),
      ...(nullableText(item.outcome) ? { outcome: nullableText(item.outcome) as string } : {}),
    }];
  });
  return history.length ? history : [{ event: "Account created", at: createdAt, by: "System", reason: "Account created." }];
}

function notesFromMock(record: Record<string, unknown>): MemberAdminNote[] {
  if (!Array.isArray(record.adminNotes)) return [];
  return record.adminNotes.flatMap((entry): MemberAdminNote[] => {
    const item = asRecord(entry);
    const note = item ? nullableText(item.note) : null;
    return note ? [{ at: text(item?.at, "Date not recorded"), by: text(item?.by, "Admin"), note }] : [];
  });
}

function walletTransactionsFromMock(walletId: string): MemberWalletTransaction[] {
  return Array.from({ length: 50 }, (_, index) => {
    const eventType = index < 11 ? "TOP_UP" : index % 3 === 0 ? "PAYOUT" : "EARNINGS_CONVERSION";
    const amountSatang = 1000 + index * 125;
    const createdAt = new Date(Date.UTC(2026, 7, 28, 8, 0, 0) - index * 86_400_000).toISOString();
    return {
      id: `LEDGER-${walletId}-${index + 1}`,
      businessReference: `${eventType}-${index + 1}`,
      eventType,
      description: `${eventType.replaceAll("_", " ")} record`,
      createdAt,
      sealedAt: createdAt,
      postings: [{ accountType: "SPENDING", walletId, amountSatang }],
    };
  });
}

function baseModelFromListItem(member: AdminMemberListItem, source: "api" | "mock"): MemberModel {
  const title = `${member.firstName} ${member.lastName}`.trim() || member.id;
  const wallet = member.wallet;
  const walletBalances = wallet
    ? {
      spendingBalanceSatang: wallet.spendingBalanceSatang,
      earningsBalanceSatang: wallet.earningsBalanceSatang,
      fundingReservedSatang: 0,
      reservedForPayoutsSatang: 0,
    }
    : null;
  return {
    id: member.id,
    studentId: nullableText(member.studentId) ?? (source === "api" ? "Not provided by the Admin API" : null),
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
    lastActiveAt: "Not recorded",
    memberStatus: null,
    memberStatusSource: source === "mock" ? "mock" : "NOT_PROVIDED_BY_API",
    walletId: wallet?.id ?? null,
    walletStatus: wallet?.walletStatus ?? null,
    walletBalances,
    walletProjectionMatchesLedger: null,
    reviews: [],
    quests: [],
    stats: {
      questsCreatedCount: 0,
      questsCompletedAsWorkerCount: 0,
      reviewsReceivedCount: 0,
      averageRating: null,
      payoutsCount: 0,
      totalEarnedSatang: 0,
      totalPaidOutSatang: 0,
    },
    payouts: [],
    reports: [],
    penaltyHistory: source === "api" ? [] : [{ event: "Account created", at: dateLabel(member.createdAt), by: "System", reason: "Account created." }],
    adminNotes: [],
    walletStatement: [],
    reportsError: null,
    walletStatementError: null,
    confirmedViolationCount: source === "api" ? null : 0,
    newUserExemptionRemaining: 0,
    postBanExemptionRemaining: 0,
    statusReason: null,
    statusAppliedAt: null,
    statusAppliedBy: null,
    redFlagExpiresAt: null,
    banExpiresAt: null,
    source,
  };
}

export function memberListModelFromApi(member: AdminMemberListItem): MemberModel {
  return baseModelFromListItem(member, "api");
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
    wallet: detail.wallet
      ? {
        id: detail.wallet.id,
        walletStatus: detail.wallet.walletStatus,
        spendingBalanceSatang: detail.wallet.spendingBalanceSatang,
        earningsBalanceSatang: detail.wallet.earningsBalanceSatang,
        totalBalanceSatang: detail.wallet.totalBalanceSatang,
      }
      : null,
  };
  const base = baseModelFromListItem(listItem, "api");
  const wallet = finance?.wallet ?? detail.wallet;
  const walletId = wallet?.id ?? null;
  const reviews: AdminReview[] = [];
  const reportEntries = reports.map(reportFromApi);
  return {
    ...base,
    bio: member.bio ?? "",
    walletId,
    walletStatus: wallet ? walletStatusFor(wallet.walletStatus) : null,
    walletBalances: balancesFromWallet(wallet),
    walletProjectionMatchesLedger: wallet?.projectionMatchesLedger ?? null,
    reports: reportEntries,
    walletStatement: ledger.map(transactionFromApi),
    reviews,
    quests: [],
    stats: detail.stats,
    confirmedViolationCount: null,
    newUserExemptionRemaining: 0,
    postBanExemptionRemaining: 0,
    apiError: errors.finance ?? (finance ? null : "Member finance is not available from the Admin API."),
    reportsError: errors.reports ?? null,
    walletStatementError: errors.ledger ?? null,
  };
}

export function memberModelFromMockRecord(
  value: unknown,
  data: PersistedAdminData,
): MemberModel | null {
  const record = asRecord(value);
  const id = nullableText(record?.id);
  if (!record || !id) return null;
  const title = text(record.title, id);
  const [firstName = title, ...lastNameParts] = title.split(/\s+/);
  const lastName = lastNameParts.join(" ");
  const index = Math.max(0, data.collections.users.findIndex((candidate) => candidate.id === id));
  const parity = {
    "68000000": { memberStatus: "Normal" as const, walletStatus: "ACTIVE" as const },
    "68000020": { memberStatus: "Flag" as const, walletStatus: "ACTIVE" as const },
    "68000040": { memberStatus: "Temp Ban" as const, walletStatus: "FROZEN" as const },
  }[id];
  const hasStoredModerationState = typeof record.memberStatus === "string"
    || record.penalty !== undefined
    || typeof record.confirmedViolationCount === "number";
  const memberStatus = typeof record.memberStatus === "string"
    ? memberStatusFor(record.memberStatus)
    : parity?.memberStatus ?? memberStatusFor(record.memberStatus);
  const walletStatus = hasStoredModerationState
    ? walletStatusFor(record.walletStatus ?? record.status)
    : parity?.walletStatus ?? walletStatusFor(record.walletStatus ?? record.status);
  const studentId = nullableText(record.studentId) ?? id;
  const createdAt = text(record.accountCreatedAt ?? record.createdAt, "Not recorded");
  const walletId = nullableText(record.walletId) ?? `WAL-${id}`;
  const rawReviews = Array.isArray(record.reviews)
    ? record.reviews.flatMap((review) => {
      const model = reviewFromMock(review);
      return model ? [model] : [];
    })
    : [];
  const reviews = rawReviews.length ? rawReviews : generatedReviews(index);
  const userCount = Math.max(1, data.collections.users.length);
  const linkedQuests = data.collections.quests.filter((quest) => {
    const questRecord = asRecord(quest);
    return [questRecord?.memberId, questRecord?.userId, questRecord?.hirerId, questRecord?.workerId].some((value) => value === id);
  });
  const questValues = linkedQuests.length
    ? linkedQuests
    : data.collections.quests.filter((_, questIndex) => questIndex % userCount === index % userCount);
  const quests = questValues.flatMap((quest) => {
    const model = questFromMock(quest, title);
    return model ? [model] : [];
  });
  const reports = data.collections.reports.flatMap((report) => {
    const model = reportFromMock(report);
    return model && (asRecord(report)?.reportedMemberId ?? asRecord(report)?.reportedUserId) === id ? [model] : [];
  });
  const balances: MemberWalletBalances = {
    spendingBalanceSatang: numberValue(record.walletSpendingBalanceSatang, 120000 + index * 10000),
    earningsBalanceSatang: numberValue(record.walletEarningsBalanceSatang, 80000 + index * 5000),
    fundingReservedSatang: numberValue(record.walletFundingReservedSatang, 25000 + index * 1000),
    reservedForPayoutsSatang: numberValue(record.walletReservedForPayoutsSatang, 10000 + index * 500),
  };
  const rawHistory = historyFromMock(record, createdAt);
  const confirmedViolationCount = Math.max(
    0,
    Math.round(numberValue(record.confirmedViolationCount,
      memberStatus === "Flag" ? 1 : memberStatus === "Temp Ban" ? 2 : memberStatus === "Perm Ban" ? 3 : 0,
    )),
  );
  const newUserExemptionRemaining = Math.max(0, Math.round(numberValue(record.newUserExemptionRemaining, id === "68000020" ? 10 : 0)));
  const postBanExemptionRemaining = Math.max(0, Math.round(numberValue(record.postBanExemptionRemaining)));
  const payouts = data.collections.payouts.flatMap((payout) => {
    const payoutRecord = asRecord(payout);
    if (!payoutRecord || text(payoutRecord.title) !== title) return [];
    return [{
      id: text(payoutRecord.id, `PAY-${id}`),
      status: text(payoutRecord.payoutStatus ?? payoutRecord.status, "PENDING_ADMIN_APPROVAL"),
      amountSatang: nullableNumber(payoutRecord.amountSatang) ?? (typeof payoutRecord.amount === "number" ? Math.round(payoutRecord.amount * 100) : null),
      createdAt: dateLabel(payoutRecord.createdAt ?? payoutRecord.requestedAt),
    }];
  });
  const stats: MemberStats = {
    questsCreatedCount: quests.filter((quest) => quest.role === "Hirer").length,
    questsCompletedAsWorkerCount: quests.filter((quest) => quest.role === "Worker" && quest.status === "QUEST_COMPLETED").length,
    reviewsReceivedCount: reviews.length,
    averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
    payoutsCount: payouts.length,
    totalEarnedSatang: quests.filter((quest) => quest.role === "Worker").reduce((sum, quest) => sum + (quest.amountSatang || 0), 0),
    totalPaidOutSatang: payouts.reduce((sum, payout) => sum + (payout.amountSatang || 0), 0),
  };
  const penalty = asRecord(record.penalty);
  const statusReason = nullableText(record.statusReason ?? penalty?.reason);
  const statusAppliedAt = nullableText(record.statusAppliedAt ?? penalty?.recordedAt);
  const statusAppliedBy = nullableText(record.statusAppliedBy ?? penalty?.appliedBy);
  const walletStatement = Array.isArray(record.walletStatement)
    ? record.walletStatement.flatMap((transaction) => {
      const item = asRecord(transaction);
      if (!item || !item.id) return [];
      return [{
        id: text(item.id),
        businessReference: nullableText(item.businessReference) ?? undefined,
        eventType: text(item.eventType, "ADJUSTMENT"),
        description: nullableText(item.description),
        createdAt: text(item.createdAt, new Date().toISOString()),
        sealedAt: nullableText(item.sealedAt),
        postings: Array.isArray(item.postings) ? item.postings.flatMap((posting) => {
          const entry = asRecord(posting);
          if (!entry) return [];
          return [{ accountType: text(entry.accountType), walletId: nullableText(entry.walletId), amountSatang: numberValue(entry.amountSatang) }];
        }) : [],
      }];
    })
    : walletTransactionsFromMock(walletId);
  return {
    id,
    studentId,
    firstName,
    lastName,
    title,
    email: text(record.person, `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ku.th`),
    telephone: nullableText(record.telephone),
    academicYear: nullableNumber(record.academicYear),
    faculty: nullableText(record.faculty) ?? nullableText(record.other)?.split(" · ")[0] ?? null,
    department: nullableText(record.department),
    occupation: nullableText(record.occupation) ?? "Student",
    bio: text(record.about, "KuQuest participant contributing to university marketplace projects."),
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : ["University", "Marketplace"],
    createdAt,
    lastActiveAt: text(record.lastActiveAt, "Not recorded"),
    memberStatus,
    memberStatusSource: "mock",
    walletId,
    walletStatus,
    walletBalances: balances,
    walletProjectionMatchesLedger: true,
    reviews,
    stats,
    quests,
    payouts,
    reports,
    penaltyHistory: rawHistory,
    adminNotes: notesFromMock(record),
    walletStatement,
    reportsError: null,
    walletStatementError: null,
    confirmedViolationCount,
    newUserExemptionRemaining,
    postBanExemptionRemaining,
    statusReason,
    statusAppliedAt,
    statusAppliedBy,
    redFlagExpiresAt: nullableText(record.redFlagExpiresAt),
    banExpiresAt: nullableText(record.banExpiresAt),
    source: "mock",
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

export function currentWalletBalance(balances: MemberWalletBalances | null): number {
  if (!balances) return 0;
  return balances.spendingBalanceSatang
    + balances.earningsBalanceSatang
    + balances.fundingReservedSatang
    + balances.reservedForPayoutsSatang;
}

function dateBoundary(value: string, endOfDay: boolean): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}${endOfDay ? "T23:59:59.999+07:00" : "T00:00:00.000+07:00"}`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function walletStatementRows(
  model: MemberModel,
  filters: { eventType: string; from: string; to: string },
  visibleCount: number,
): MemberWalletStatementRow[] {
  const from = dateBoundary(filters.from, false);
  const to = dateBoundary(filters.to, true);
  const walletId = model.walletId;
  if (!walletId || !model.walletBalances) return [];
  const ordered = model.walletStatement
    .filter((transaction) => transaction.sealedAt)
    .toSorted((first, second) => {
      const dateDifference = Date.parse(second.createdAt) - Date.parse(first.createdAt);
      return dateDifference || second.id.localeCompare(first.id);
    });
  let runningBalances = { ...model.walletBalances };
  const rows = ordered.flatMap((transaction) => {
    const movement = transaction.postings.filter((posting) => posting.walletId === walletId && WALLET_ACCOUNT_TYPES[posting.accountType]);
    if (!movement.length) return [];
    const resultingBalances = transaction.balanceAfter ? { ...transaction.balanceAfter } : { ...runningBalances };
    const previousBalances = { ...resultingBalances };
    for (const posting of movement) {
      if (posting.accountType === "SPENDING") previousBalances.spendingBalanceSatang -= posting.amountSatang;
      if (posting.accountType === "EARNINGS") previousBalances.earningsBalanceSatang -= posting.amountSatang;
      if (posting.accountType === "FUNDING_RESERVED") previousBalances.fundingReservedSatang -= posting.amountSatang;
      if (posting.accountType === "RESERVED_FOR_PAYOUTS") previousBalances.reservedForPayoutsSatang -= posting.amountSatang;
    }
    runningBalances = previousBalances;
    return [{
      transaction,
      signedAmountSatang: movement.reduce((sum, posting) => sum + posting.amountSatang, 0),
      movement,
      resultingBalances,
      resultingWalletBalanceSatang: currentWalletBalance(resultingBalances),
    }];
  });
  return rows
    .filter(({ transaction }) => !filters.eventType || transaction.eventType === filters.eventType)
    .filter(({ transaction }) => {
      const timestamp = Date.parse(transaction.createdAt);
      return (from === null || timestamp >= from) && (to === null || timestamp <= to);
    })
    .slice(0, visibleCount);
}

export function formatMoneySatang(value: number, signed = false): string {
  const sign = signed && value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}฿${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value) / 100)}`;
}

export function formatWalletDate(value: string): string {
  return dateLabel(value);
}

export function nextPenaltyFor(model: MemberModel): MemberActionOutcome {
  const violationNumber = (model.confirmedViolationCount ?? 0) + 1;
  const hasExemption = model.newUserExemptionRemaining > 0 || model.postBanExemptionRemaining > 0;
  if (hasExemption) {
    return {
      label: "Red Flag exempted",
      walletStatus: model.walletStatus === "FROZEN" ? "ACTIVE" : model.walletStatus ?? "ACTIVE",
      memberStatus: "Normal",
      durationDays: null,
      expiresAt: null,
      exempted: true,
    };
  }
  if (violationNumber === 1) return { label: "Red Flag", walletStatus: "ACTIVE", memberStatus: "Flag", durationDays: 7, expiresAt: null, exempted: false };
  if (violationNumber === 2) return { label: "Temporary ban", walletStatus: "FROZEN", memberStatus: "Temp Ban", durationDays: 7, expiresAt: null, exempted: false };
  return { label: "Permanent ban", walletStatus: "FROZEN", memberStatus: "Perm Ban", durationDays: null, expiresAt: null, exempted: false };
}

export function reportRouteForMember(memberId: string): string {
  return reportRoutes.list() + `?reportedMemberId=${encodeURIComponent(memberId)}`;
}
