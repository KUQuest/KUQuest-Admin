import {
  adminApi,
  ADMIN_API_PAYOUT_STATUSES,
  type AdminQuest,
  type AdminQuestCommandResult,
  type AdminQuestDetail,
  type AdminApiQuestStatus,
  type AdminDisputeCase,
  type AdminDisputeCaseDetail,
  type AdminMemberDetail,
  type AdminMemberListItem,
  type AdminPayout,
  type AdminPayoutDetail,
  type AdminPayoutReconcileResult,
  type AdminApiPayoutStatus,
  type AdminWallet,
  type AdminWalletDetail,
  type AdminWalletStatusResult,
  type AdminWalletVerification,
  type AdminWalletStatusHistoryEntry,
  type AdminLedgerTransaction,
  type AdminLedgerTransactionsQuery,
} from "../api/admin-api";
import { ApiError } from "../../../lib/api/client";
import { isPayoutStatus, walletStatusLabel } from "../domain/rulebook";
import type { PayoutStatus, QuestState } from "../domain/rulebook";
import type { LegacyDisputeMockData, LegacyHistoryEntry, LegacyRecord, LegacyWalletBalanceSnapshot } from "./runtime";
import type { WalletStatementTransaction } from "./wallet-model";
import { data } from "./runtime-data";
import { newAdminIdempotencyKey } from "./admin-command-port";

type LiveResourceState = {
  loading: boolean;
  error: string | null;
  backgroundLoading: boolean;
};

export type LiveResourceView = "payouts" | "disputes" | "quests" | "users" | "wallets";
export const LIVE_RESOURCE_UPDATED_EVENT = "kuquest-live-resource-updated";

export const liveResourceState: Record<LiveResourceView, LiveResourceState> = {
  payouts: { loading: false, error: null, backgroundLoading: false },
  disputes: { loading: false, error: null, backgroundLoading: false },
  quests: { loading: false, error: null, backgroundLoading: false },
  users: { loading: false, error: null, backgroundLoading: false },
  wallets: { loading: false, error: null, backgroundLoading: false },
};

function apiErrorMessage(error: unknown, resource: string): string {
  if (error instanceof ApiError) {
    return `${resource} API unavailable (HTTP ${error.status}). ${error.message}`;
  }
  return `${resource} API unavailable. ${error instanceof Error ? error.message : "Request failed."}`;
}

function replaceCollection(view: "disputes" | "quests" | "payouts" | "users" | "wallets", records: LegacyRecord[]): void {
  data[view].splice(0, data[view].length, ...records);
}

function notifyLiveResourceUpdated(view: LiveResourceView): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LIVE_RESOURCE_UPDATED_EVENT, { detail: { view } }));
}

function toneForPayout(status: PayoutStatus): string {
  if (status === "PENDING_ADMIN_APPROVAL") return "warning";
  if (status === "SUCCEEDED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "CANCELLED") return "cancelled";
  return "info";
}

function toneForWallet(status: string): string {
  if (status === "ACTIVE") return "success";
  if (status === "FROZEN") return "warning";
  if (status === "CLOSED") return "cancelled";
  return "danger";
}

const disputeMockScenarios: LegacyDisputeMockData[] = [
  {
    amountBaht: 1224,
    category: "Evidence",
    openedBy: "Kamonwan Lertwiroj",
    respondent: "Payout Tester",
    summary: "The submitted proof does not fully match the accepted Quest conditions.",
    claim: "The delivery record is missing a required part of the accepted Quest brief.",
    response: "The Worker states that the requested work was completed and the missing part was not clear.",
    policy: [
      "Published Quest conditions control the review scope",
      "Evidence timestamps are authoritative",
      "An Admin reason is required before resolution",
    ],
    recommended: "Compare the proof with the failed Quest record before resolving the held funds.",
  },
  {
    amountBaht: 3250,
    category: "Quality",
    openedBy: "Aphinya Sukjai",
    respondent: "Nalin Maneewan",
    summary: "The delivered work quality is disputed against the accepted Quest conditions.",
    claim: "The submitted result does not meet the quality requirement recorded for the Quest.",
    response: "The Worker states that the result follows the visible instructions and requests payment.",
    policy: [
      "The accepted Quest condition is the primary review record",
      "The Admin reviews retained proof before deciding",
      "The final decision must use a controlled reason code",
    ],
    recommended: "Review the retained proof and Quest failure timing before recording the outcome.",
  },
  {
    amountBaht: 875,
    category: "Scope",
    openedBy: "Mek Phanich",
    respondent: "Chayut Ariyawat",
    summary: "The parties disagree about whether the submitted work stayed within Quest scope.",
    claim: "The submitted work changed the requested scope and cannot be accepted as submitted.",
    response: "The Worker states that the change was necessary to complete the requested result.",
    policy: [
      "Scope is checked against the published Quest condition",
      "Proof and recorded times support the Admin decision",
      "A Dispute Case remains tied to the failed Quest",
    ],
    recommended: "Check the Quest condition, proof, and assignment record before resolving the case.",
  },
];

function disputeMockDataFor(disputeId: string): LegacyDisputeMockData {
  const seed = [...disputeId].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 1), 0);
  const scenario = disputeMockScenarios[seed % disputeMockScenarios.length];
  return {
    ...scenario,
    policy: [...scenario.policy],
  };
}

export function canonicalPayoutStatusForApi(status: unknown): PayoutStatus {
  if (status === "CREATING") return "SUBMITTED_TO_PROVIDER";
  if (status === "PENDING" || status === "AWAITING_RECONCILIATION") return "PROVIDER_PENDING";
  if (status === "COMPLETED") return "SUCCEEDED";
  return isPayoutStatus(status) ? status : "PENDING_ADMIN_APPROVAL";
}

function apiPayoutStatusesForCanonical(status: PayoutStatus): AdminApiPayoutStatus[] {
  return [status];
}

function dateTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

function satangToBaht(value: number): number {
  return value / 100;
}

function memberName(member: { firstName: string; lastName: string; email: string }): string {
  return `${member.firstName} ${member.lastName}`.trim() || member.email;
}

function memberProfileLabel(member: AdminMemberListItem): string {
  const academicYear = member.academicYear === null ? "" : `Year ${member.academicYear}`;
  return [member.faculty, member.department, member.occupation, academicYear]
    .filter((value): value is string => Boolean(value))
    .join(" · ") || "Academic profile not provided by the Admin API";
}

export function memberRecordFromApi(member: AdminMemberListItem): LegacyRecord {
  const wallet = member.wallet;
  const name = memberName(member);
  return {
    id: member.studentId || member.id,
    title: name,
    person: member.email,
    other: memberProfileLabel(member),
    status: wallet?.walletStatus || "NOT_PROVIDED",
    tone: wallet ? toneForWallet(wallet.walletStatus) : "neutral",
    amount: wallet ? satangToBaht(wallet.totalBalanceSatang) : null,
    age: dateTimeLabel(member.createdAt),
    createdAt: member.createdAt,
    accountCreatedAt: dateTimeLabel(member.createdAt),
    apiBacked: true,
    memberId: member.id,
    studentId: member.studentId || undefined,
    walletId: wallet?.id,
    walletStatus: wallet?.walletStatus,
    walletBalanceSatang: wallet?.totalBalanceSatang,
    walletSpendingBalanceSatang: wallet?.spendingBalanceSatang,
    walletEarningsBalanceSatang: wallet?.earningsBalanceSatang,
    memberStatusSource: "NOT_PROVIDED_BY_API",
  };
}

export function memberRecordFromApiDetail(detail: AdminMemberDetail): LegacyRecord {
  const member = detail.member;
  const summary: AdminMemberListItem = {
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
  const record = memberRecordFromApi(summary);
  return Object.assign(record, {
    about: member.bio || undefined,
    walletFundingReservedSatang: detail.wallet?.fundingReservedSatang,
    walletReservedForPayoutsSatang: detail.wallet?.reservedForPayoutsSatang,
    walletProjectionMatchesLedger: detail.wallet?.projectionMatchesLedger,
    memberStats: detail.stats,
    memberDetailLoaded: true,
  });
}

export function walletRecordFromApi(wallet: AdminWallet): LegacyRecord {
  const name = memberName(wallet.member);
  return {
    id: wallet.id,
    title: name,
    person: wallet.member.email,
    other: wallet.member.studentId || "Student ID not provided by the Admin API",
    status: wallet.walletStatus,
    walletStatus: wallet.walletStatus,
    tone: toneForWallet(wallet.walletStatus),
    amount: satangToBaht(wallet.balances.totalBalanceSatang),
    age: dateTimeLabel(wallet.updatedAt),
    accountCreatedAt: dateTimeLabel(wallet.createdAt),
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
    apiBacked: true,
    memberId: wallet.userId,
    walletId: wallet.id,
    studentId: wallet.member.studentId || undefined,
    walletTotalBalanceSatang: wallet.balances.totalBalanceSatang,
    walletSpendingBalanceSatang: wallet.balances.spendingBalanceSatang,
    walletEarningsBalanceSatang: wallet.balances.earningsBalanceSatang,
    walletFundingReservedSatang: wallet.balances.fundingReservedSatang,
    walletReservedForPayoutsSatang: wallet.balances.reservedForPayoutsSatang,
    walletLatestTransactionAt: wallet.latestTransactionAt ?? null,
  };
}

function walletStatementTransactionFromApi(
  transaction: AdminLedgerTransaction,
): WalletStatementTransaction {
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

export async function loadLiveWalletStatement(
  walletId: string,
  query: Omit<AdminLedgerTransactionsQuery, "walletId"> = {},
): Promise<{ items: WalletStatementTransaction[]; nextCursor: string | null }> {
  const page = await adminApi.listLedgerTransactions({ ...query, walletId });
  return {
    items: page.items.map(walletStatementTransactionFromApi),
    nextCursor: page.nextCursor,
  };
}

export function walletRecordFromApiDetail(detail: AdminWalletDetail): LegacyRecord {
  return Object.assign(walletRecordFromApi(detail), {
    walletProjectionMatchesLedger: detail.projectionMatchesLedger,
    walletDetailLoaded: true,
  });
}

function walletBalanceSnapshotFromApi(
  balance: AdminWalletVerification["projected"],
): LegacyWalletBalanceSnapshot {
  return {
    spendingBalanceSatang: balance.spendingBalanceSatang,
    earningsBalanceSatang: balance.earningsBalanceSatang,
    fundingReservedSatang: balance.fundingReservedSatang,
    reservedForPayoutsSatang: balance.reservedForPayoutsSatang,
  };
}

export async function verifyLiveWallet(record: LegacyRecord): Promise<void> {
  const walletId = typeof record.walletId === "string" ? record.walletId : record.id;
  const verification = await adminApi.verifyWalletProjection(walletId);
  record.walletVerification = {
    matches: verification.matches,
    projected: walletBalanceSnapshotFromApi(verification.projected),
    ledger: walletBalanceSnapshotFromApi(verification.ledger),
    activityCountMatches: verification.activityCountMatches,
  };
  record.walletProjectionMatchesLedger = verification.matches;
  record.walletVerificationLoaded = true;
  delete record.walletVerificationError;
}

function mergeWalletProjection(record: LegacyRecord, result: AdminWalletStatusResult): void {
  const wallet = result.wallet;
  const totalBalanceSatang = wallet.spendingBalanceSatang
    + wallet.earningsBalanceSatang
    + wallet.fundingReservedSatang
    + wallet.reservedForPayoutsSatang;
  Object.assign(record, {
    status: wallet.walletStatus,
    walletStatus: wallet.walletStatus,
    tone: toneForWallet(wallet.walletStatus),
    amount: satangToBaht(totalBalanceSatang),
    walletTotalBalanceSatang: totalBalanceSatang,
    walletSpendingBalanceSatang: wallet.spendingBalanceSatang,
    walletEarningsBalanceSatang: wallet.earningsBalanceSatang,
    walletFundingReservedSatang: wallet.fundingReservedSatang,
    walletReservedForPayoutsSatang: wallet.reservedForPayoutsSatang,
    walletProjectionMatchesLedger: undefined,
    walletVerification: undefined,
    walletVerificationLoaded: false,
  });
}

export function mergeLiveWalletProjection(walletId: string, result: AdminWalletStatusResult): void {
  [
    data.wallets.find((record) => record.walletId === walletId || record.id === walletId),
    data.users.find((record) => record.walletId === walletId),
  ].forEach((record) => {
    if (record) mergeWalletProjection(record, result);
  });
}

function walletHistoryEntryFromApi(entry: AdminWalletStatusHistoryEntry): LegacyHistoryEntry {
  return {
    event: walletStatusLabel(entry.toStatus),
    at: dateTimeLabel(entry.createdAt),
    by: entry.actorAdminId || entry.actorUserId || "System",
    reason: entry.reason,
    previousStatus: entry.fromStatus ? walletStatusLabel(entry.fromStatus) : undefined,
    newStatus: walletStatusLabel(entry.toStatus),
  };
}

function questTone(status: QuestState): string {
  if (status === "QUEST_FAILED") return "danger";
  if (status === "QUEST_CANCELLED") return "cancelled";
  if (status === "QUEST_COMPLETED") return "success";
  if (status === "QUEST_IN_PROGRESS") return "info";
  if (status === "QUEST_ASSIGNED") return "assigned";
  if (status === "QUEST_DRAFT") return "neutral";
  return "success";
}

export function canonicalQuestStateForApi(status: AdminApiQuestStatus): QuestState {
  switch (status) {
    case "QUEST_AWAITING_CONSENT":
      return "QUEST_ASSIGNED";
    case "QUEST_SUBMITTED":
    case "QUEST_REWORK":
      return "QUEST_IN_PROGRESS";
    case "QUEST_APPROVED":
      return "QUEST_COMPLETED";
    case "QUEST_DISPUTED":
      return "QUEST_FAILED";
    default:
      return status as QuestState;
  }
}

function questActivityFromSummary(quest: AdminQuest): string[] {
  const status = canonicalQuestStateForApi(quest.questStatus);
  return [`${status} · ${dateTimeLabel(quest.updatedAt)} · Current Quest State recorded by the Admin API.`];
}

function questRecordFromApi(quest: AdminQuest, detail?: AdminQuestDetail): LegacyRecord {
  const status = canonicalQuestStateForApi(quest.questStatus);
  const fundingTotalSatang = detail?.questFundingTotalSatang ?? quest.questFundingTotalSatang;
  const rewardSatang = detail?.rewardSatang ?? quest.rewardSatang;
  const hirer = memberName(quest.hirer);
  const applications = detail?.candidates.applications.map((application) => [
    memberName(application.worker),
    application.applicationStatus,
    "Worker",
  ] as [string, string, string]) ?? [];
  const assignedParticipants = detail?.assignments.map((assignment) => [
    memberName(assignment.worker),
    assignment.assignmentStatus,
    "Worker",
  ] as [string, string, string]) ?? [];
  const selectedParticipant = detail?.assignments[0]
    ? memberName(detail.assignments[0].worker)
    : applications.find((application) => application[1] === "APPLICATION_SELECTED")?.[0];
  const activity = detail?.adminActions.length
    ? detail.adminActions.map((action) => `${action.action} · ${dateTimeLabel(action.createdAt)} · ${action.reasonCode ?? "No reason code"}`)
    : questActivityFromSummary(quest);
  const proof = detail?.proofSubmissions.flatMap((submission) => {
    const submitted = dateTimeLabel(submission.submittedAt);
    if (submission.files.length) {
      return submission.files.map((file) => `${file.fileId} · ${file.contentType} · ${file.sizeBytes} bytes · submitted ${submitted}`);
    }
    return [`${submission.content || "Proof submission"} · ${submission.submissionStatus} · submitted ${submitted}`];
  });
  const latestEditRequest = detail?.editHistory.findLast((entry) => entry.kind === "EDIT_REQUEST");
  const editHistory = detail?.editHistory.map((entry) => entry.kind === "EDIT_REQUEST"
    ? `${entry.requestStatus ?? "EDIT_REQUEST"} · ${dateTimeLabel(entry.createdAt ?? quest.updatedAt)}`
    : `${entry.fieldName ?? "Quest field"} edited · ${dateTimeLabel(entry.editedAt ?? quest.updatedAt)}`);
  const locationLabels = detail?.locations
    .map(({ label }) => label?.trim())
    .filter((label): label is string => Boolean(label)) ?? [];

  return {
    id: quest.id,
    title: quest.title,
    person: hirer,
    other: detail?.tagId ? `Tag ${detail.tagId}` : "Tag not provided by the Admin API",
    status,
    questState: status,
    tone: questTone(status),
    amount: fundingTotalSatang === null ? 0 : satangToBaht(fundingTotalSatang),
    age: dateTimeLabel(quest.updatedAt),
    version: detail?.version ?? quest.version,
    hiddenAt: detail?.hiddenAt ?? quest.hiddenAt,
    hiddenByAdminId: detail?.hiddenByAdminId ?? quest.hiddenByAdminId,
    fundingTotalSatang: fundingTotalSatang ?? undefined,
    questRewardSatang: rewardSatang ?? undefined,
    platformFeeSatang: detail?.platformFeePerWorkerSatang ?? undefined,
    platformFeeBps: detail?.platformFeeBps ?? undefined,
    createdAt: quest.createdAt,
    dueAt: quest.dueAt ?? undefined,
    requestedAt: dateTimeLabel(quest.createdAt),
    apiBacked: true,
    description: detail?.description ?? "No Quest description recorded by the Admin API.",
    giver: [hirer, quest.hirer.email, `Member ID · ${quest.hirer.id}`],
    location: locationLabels.length
      ? [locationLabels.join(" · "), "Loaded from the Admin API."]
      : ["Location not provided by the Admin API", "Review the Quest record for available location data."],
    schedule: [
      dateTimeLabel(quest.startTime),
      quest.dueAt ? dateTimeLabel(quest.dueAt) : "Due date not provided by the Admin API",
    ],
    activity,
    editHistory,
    applications: applications.length ? applications : assignedParticipants,
    selectedParticipant,
    teamQuest: quest.participation === "GROUP",
    teamSize: detail?.candidates.teams[0]?.members.length ?? quest.headcount,
    teamParticipants: detail?.candidates.teams[0]?.members.map(({ member }) => [memberName(member), "Member"] as [string, string]),
    candidateMode: quest.mode,
    giverAttachments: [],
    proof: proof ?? [],
    editRequestStatus: latestEditRequest?.kind === "EDIT_REQUEST" ? latestEditRequest.requestStatus : undefined,
    tagId: detail?.tagId ?? undefined,
    condition: detail?.condition.text,
    proofRequired: detail?.proofRequired,
    fundingReservationId: detail?.fundingReservationId ?? undefined,
    policyRevisionId: detail?.policyRevisionId ?? undefined,
    questEscrowSatang: detail?.questEscrowSatang ?? undefined,
    cancelledAt: detail?.cancelledAt ?? undefined,
    cancelledByUserId: detail?.cancelledByUserId ?? undefined,
    cancelledByAdminId: detail?.cancelledByAdminId ?? undefined,
  };
}

export function questRecordFromApiSummary(quest: AdminQuest): LegacyRecord {
  return questRecordFromApi(quest);
}

export function mergeLiveQuestCommand(id: string, result: AdminQuestCommandResult): void {
  const record = data.quests.find((candidate) => candidate.id === id);
  if (!record) return;
  const detailFields = {
    description: record.description,
    giver: record.giver,
    location: record.location,
    schedule: record.schedule,
    activity: record.activity,
    editHistory: record.editHistory,
    applications: record.applications,
    selectedParticipant: record.selectedParticipant,
    teamQuest: record.teamQuest,
    teamParticipants: record.teamParticipants,
    teamSize: record.teamSize,
    candidateMode: record.candidateMode,
    giverAttachments: record.giverAttachments,
    proof: record.proof,
    condition: record.condition,
    proofRequired: record.proofRequired,
    fundingReservationId: record.fundingReservationId,
    policyRevisionId: record.policyRevisionId,
    questEscrowSatang: record.questEscrowSatang,
    cancelledAt: record.cancelledAt,
    cancelledByUserId: record.cancelledByUserId,
    cancelledByAdminId: record.cancelledByAdminId,
    tagId: record.tagId,
  };
  Object.assign(record, questRecordFromApi(result.resourceSummary), detailFields, {
    version: result.resourceVersion,
  });
}

export function payoutRecordFromApi(payout: AdminPayout): LegacyRecord {
  const status = canonicalPayoutStatusForApi(payout.payoutStatus);
  const recipient = `${payout.student.firstName} ${payout.student.lastName}`.trim() || payout.student.email;
  const requestedAt = dateTimeLabel(payout.createdAt);
  return {
    id: payout.id,
    title: recipient,
    person: `${payout.bankName} · ${payout.maskedDestinationValue}`,
    other: `${payout.destinationType} · ${payout.student.email}`,
    status,
    payoutStatus: status,
    tone: toneForPayout(status),
    amount: satangToBaht(payout.principalSatang),
    amountSatang: payout.principalSatang,
    age: requestedAt,
    requestedAt,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
    version: payout.version,
    apiBacked: true,
    studentId: payout.student.id,
    principalSatang: payout.principalSatang,
    receiptSatang: payout.receiptSatang,
    maximumFeeSatang: payout.maximumFeeSatang,
    maximumTaxSatang: payout.maximumTaxSatang,
    maximumDebitSatang: payout.maximumDebitSatang,
    actualFeeSatang: payout.actualFeeSatang,
    actualTaxSatang: payout.actualTaxSatang,
    actualDebitSatang: payout.actualDebitSatang,
    bankCode: payout.bankCode,
    bankName: payout.bankName,
    destinationType: payout.destinationType,
    maskedDestinationValue: payout.maskedDestinationValue,
    maskedRoutingValue: payout.maskedRoutingValue,
    providerReference: payout.providerReference,
    providerStatus: payout.providerStatus,
    rejectionReason: payout.cancellationReasonCode,
  };
}

function mergeReconciledPayout(record: LegacyRecord, payout: AdminPayoutReconcileResult["payout"]): void {
  const status = canonicalPayoutStatusForApi(payout.payoutStatus);
  Object.assign(record, {
    status,
    payoutStatus: status,
    tone: toneForPayout(status),
    amount: satangToBaht(payout.principalSatang),
    amountSatang: payout.principalSatang,
    principalSatang: payout.principalSatang,
    receiptSatang: payout.receiptSatang,
    maximumFeeSatang: payout.maximumFeeSatang,
    maximumTaxSatang: payout.maximumTaxSatang,
    maximumDebitSatang: payout.maximumDebitSatang,
    actualFeeSatang: payout.actualFeeSatang,
    actualTaxSatang: payout.actualTaxSatang,
    actualDebitSatang: payout.actualDebitSatang,
    providerReference: payout.providerReference,
    providerStatus: payout.providerStatus,
    version: payout.version,
    updatedAt: payout.updatedAt,
    age: dateTimeLabel(payout.updatedAt),
  });
}

export async function reconcileLivePayout(record: LegacyRecord): Promise<void> {
  const result = await adminApi.reconcilePayout(record.id);
  mergeReconciledPayout(record, result.payout);
}

function disputeRecordFromApi(dispute: AdminDisputeCase | AdminDisputeCaseDetail): LegacyRecord {
  const detail = "quest" in dispute ? dispute as AdminDisputeCaseDetail : null;
  const mockDisputeData = disputeMockDataFor(dispute.id);
  const evidence = (dispute.evidenceRefs || []).map((reference) => `Evidence Reference · ${reference}`);
  const status = dispute.status;
  const createdAt = typeof dispute.createdAt === "string" ? dispute.createdAt : undefined;
  const resolvedAmountSatang = typeof dispute.resolvedAmountSatang === "number" ? dispute.resolvedAmountSatang : undefined;
  const filerUserId = typeof dispute.filerUserId === "string" ? dispute.filerUserId : undefined;
  const questId = detail?.quest.id || dispute.questId;
  return {
    id: dispute.id,
    title: detail?.quest.title || `Quest ${questId}`,
    person: detail?.quest.hirerId ? `Hirer ${detail.quest.hirerId}` : "Hirer not provided by API",
    other: filerUserId ? `Filer ${filerUserId}` : "Filer not provided by API",
    status,
    disputeCaseStatus: status,
    questState: detail?.quest.questStatus === "QUEST_FAILED" ? "QUEST_FAILED" : dispute.questState,
    questId,
    workerId: dispute.workerId || detail?.resolvedWorkerId || undefined,
    filerUserId,
    amount: typeof dispute.amountSatang === "number"
      ? satangToBaht(dispute.amountSatang)
      : resolvedAmountSatang === undefined ? null : satangToBaht(resolvedAmountSatang),
    amountSatang: dispute.amountSatang ?? resolvedAmountSatang,
    resolvedAmountSatang,
    age: createdAt ? dateTimeLabel(createdAt) : "Date not provided by API",
    disputeDate: createdAt ? dateTimeLabel(createdAt) : "Date not provided by API",
    createdAt,
    updatedAt: typeof dispute.updatedAt === "string" ? dispute.updatedAt : undefined,
    detail: mockDisputeData.summary,
    evidence,
    evidenceRefs: dispute.evidenceRefs,
    disputeType: mockDisputeData.category,
    mockDisputeData,
    apiMissingFields: [
      ...(typeof dispute.amountSatang !== "number" && resolvedAmountSatang === undefined ? ["Pending resolution amount"] : []),
      "Hirer and Worker display names",
      "Dispute category",
      "Participant claim and response",
      "Applicable policy guidance",
      "Admin review recommendation",
    ],
    resolution: status === "DISPUTE_CASE_DISMISSED"
      ? "Dispute Case dismissed by Admin."
      : status === "DISPUTE_CASE_RESOLVED" ? "Dispute Case resolved by Admin." : undefined,
    decisionReason: typeof dispute.resolvedByAdminId === "string" ? `Resolved by Admin ${dispute.resolvedByAdminId}.` : undefined,
    resolutionAt: detail?.resolvedAt || undefined,
    questFailedAt: detail?.quest.failedAt || undefined,
    tone: status === "DISPUTE_CASE_PENDING" ? "warning" : "neutral",
    version: dispute.version,
    apiBacked: true,
  };
}

async function hydrateLiveDisputeEvidence(record: LegacyRecord): Promise<void> {
  if (!record.apiBacked || record.disputeEvidenceLoaded) return;
  record.disputeEvidenceLoaded = true;
  try {
    const evidence = await adminApi.getDisputeEvidence(record.id, {
      idempotencyKey: newAdminIdempotencyKey("read-dispute-evidence", record.id),
    });
    const references = evidence.proofSubmissions.flatMap((submission) => [
      { label: `Proof Submission · ${submission.id}`, reference: submission.id },
      ...submission.files.map((file) => ({
        label: `Attachment · ${file.fileId}`,
        reference: file.fileId,
      })),
    ]);
    const workers = new Set([
      ...evidence.assignments.map((assignment) => assignment.workerId),
      ...evidence.proofSubmissions.flatMap((submission) => submission.workerId ? [submission.workerId] : []),
    ]);
    Object.assign(record, {
      evidence: references.map(({ label }) => label),
      evidenceRefs: references.map(({ reference }) => reference),
      workerId: record.workerId || (workers.size === 1 ? [...workers][0] : undefined),
      questState: evidence.quest.questStatus === "QUEST_FAILED" ? "QUEST_FAILED" : record.questState,
      questFailedAt: evidence.quest.failedAt || record.questFailedAt,
    });
  } catch (error) {
    record.disputeEvidenceError = apiErrorMessage(error, "Dispute Case evidence");
  }
}

function mergePayouts(items: AdminPayout[]): LegacyRecord[] {
  const uniquePayouts = new Map<string, AdminPayout>();
  items.forEach((payout) => uniquePayouts.set(payout.id, payout));
  return [...uniquePayouts.values()]
    .toSorted((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    .map(payoutRecordFromApi);
}

let payoutsRefreshId = 0;
let payoutsRefreshInFlight: Promise<void> | null = null;

export function refreshLivePayouts(status?: PayoutStatus): Promise<void> {
  if (payoutsRefreshInFlight || liveResourceState.payouts.backgroundLoading) {
    return payoutsRefreshInFlight || Promise.resolve();
  }
  const refresh = refreshLivePayoutsInternal(status);
  const sharedRefresh = refresh.finally(() => {
    if (payoutsRefreshInFlight === sharedRefresh) payoutsRefreshInFlight = null;
  });
  payoutsRefreshInFlight = sharedRefresh;
  return sharedRefresh;
}

async function refreshLivePayoutsInternal(status?: PayoutStatus): Promise<void> {
  const refreshId = ++payoutsRefreshId;
  const state = liveResourceState.payouts;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("payouts", []);
  try {
    const statuses = status
      ? apiPayoutStatusesForCanonical(status)
      : ADMIN_API_PAYOUT_STATUSES;
    const firstPages = await Promise.all(statuses.map(async (payoutStatus) => ({
      payoutStatus,
      page: await adminApi.listPayouts({ status: payoutStatus, limit: 50, sort: "newest" }),
    })));
    if (refreshId !== payoutsRefreshId) return;
    const firstItems = firstPages.flatMap(({ page }) => page.items);
    replaceCollection("payouts", mergePayouts(firstItems));
    state.loading = false;

    if (firstPages.some(({ page }) => page.nextCursor)) {
      state.backgroundLoading = true;
      void (async () => {
        const laterPages = await Promise.all(firstPages.map(async ({ payoutStatus, page }) => {
          const items: AdminPayout[] = [];
          let cursor = page.nextCursor || undefined;
          while (cursor) {
            const nextPage = await adminApi.listPayouts({ status: payoutStatus, limit: 50, cursor, sort: "newest" });
            items.push(...nextPage.items);
            if (!nextPage.nextCursor || nextPage.nextCursor === cursor) break;
            cursor = nextPage.nextCursor;
          }
          return items;
        }));
        if (refreshId !== payoutsRefreshId) return;
        replaceCollection("payouts", mergePayouts([...firstItems, ...laterPages.flat()]));
        state.backgroundLoading = false;
        notifyLiveResourceUpdated("payouts");
      })().catch(() => {
        if (refreshId === payoutsRefreshId) state.backgroundLoading = false;
      });
    }
  } catch (error) {
    if (refreshId !== payoutsRefreshId) return;
    state.error = apiErrorMessage(error, "Payout");
    state.loading = false;
  }
}

let questsRefreshId = 0;
let questsRefreshInFlight: Promise<void> | null = null;

export function refreshLiveQuests(): Promise<void> {
  if (questsRefreshInFlight || liveResourceState.quests.backgroundLoading) {
    return questsRefreshInFlight || Promise.resolve();
  }
  const refresh = refreshLiveQuestsInternal();
  const sharedRefresh = refresh.finally(() => {
    if (questsRefreshInFlight === sharedRefresh) questsRefreshInFlight = null;
  });
  questsRefreshInFlight = sharedRefresh;
  return sharedRefresh;
}

async function refreshLiveQuestsInternal(): Promise<void> {
  const refreshId = ++questsRefreshId;
  const state = liveResourceState.quests;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("quests", []);
  try {
    const firstPage = await adminApi.listQuests({ limit: 50, sort: "newest" });
    if (refreshId !== questsRefreshId) return;
    replaceCollection("quests", firstPage.items.map(questRecordFromApiSummary));
    state.loading = false;

    if (firstPage.nextCursor) {
      state.backgroundLoading = true;
      void (async () => {
        const items: AdminQuest[] = [];
        let cursor = firstPage.nextCursor || undefined;
        while (cursor) {
          const page = await adminApi.listQuests({ limit: 50, cursor, sort: "newest" });
          items.push(...page.items);
          if (!page.nextCursor || page.nextCursor === cursor) break;
          cursor = page.nextCursor;
        }
        if (refreshId !== questsRefreshId) return;
        replaceCollection("quests", [
          ...data.quests,
          ...items.map(questRecordFromApiSummary),
        ]);
        state.backgroundLoading = false;
        notifyLiveResourceUpdated("quests");
      })().catch(() => {
        if (refreshId === questsRefreshId) state.backgroundLoading = false;
      });
    }
  } catch (error) {
    if (refreshId !== questsRefreshId) return;
    state.error = apiErrorMessage(error, "Quest");
    state.loading = false;
  }
}

export async function loadLiveQuest(questId: string): Promise<void> {
  const state = liveResourceState.quests;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("quests", []);
  try {
    const detail = await adminApi.getQuest(questId);
    replaceCollection("quests", [questRecordFromApi(detail, detail)]);
  } catch (error) {
    state.error = apiErrorMessage(error, "Quest detail");
  } finally {
    state.loading = false;
  }
}

export async function hydrateLiveQuest(record: LegacyRecord): Promise<void> {
  if (!record.apiBacked || record.questDetailLoaded) return;
  record.questDetailLoaded = true;
  try {
    const detail = await adminApi.getQuest(record.id);
    Object.assign(record, questRecordFromApi(detail, detail));
  } catch (error) {
    record.questDetailError = apiErrorMessage(error, "Quest detail");
  }
}

let membersRefreshId = 0;
let membersRefreshInFlight: Promise<void> | null = null;

export function refreshLiveMembers(): Promise<void> {
  if (membersRefreshInFlight || liveResourceState.users.backgroundLoading) {
    return membersRefreshInFlight || Promise.resolve();
  }
  const refresh = refreshLiveMembersInternal();
  const sharedRefresh = refresh.finally(() => {
    if (membersRefreshInFlight === sharedRefresh) membersRefreshInFlight = null;
  });
  membersRefreshInFlight = sharedRefresh;
  return sharedRefresh;
}

async function refreshLiveMembersInternal(): Promise<void> {
  const refreshId = ++membersRefreshId;
  const state = liveResourceState.users;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("users", []);
  try {
    const firstPage = await adminApi.listMembers({ limit: 100 });
    if (refreshId !== membersRefreshId) return;
    replaceCollection("users", firstPage.items.map(memberRecordFromApi));
    state.loading = false;

    if (firstPage.nextCursor) {
      state.backgroundLoading = true;
      void (async () => {
        const items: AdminMemberListItem[] = [];
        let cursor = firstPage.nextCursor || undefined;
        while (cursor) {
          const page = await adminApi.listMembers({ limit: 100, cursor });
          items.push(...page.items);
          if (!page.nextCursor || page.nextCursor === cursor) break;
          cursor = page.nextCursor;
        }
        if (refreshId !== membersRefreshId) return;
        replaceCollection("users", [
          ...firstPage.items,
          ...items,
        ].map(memberRecordFromApi));
        state.backgroundLoading = false;
        notifyLiveResourceUpdated("users");
      })().catch((error: unknown) => {
        if (refreshId !== membersRefreshId) return;
        state.backgroundLoading = false;
        state.error = apiErrorMessage(error, "Member");
      });
    }
  } catch (error) {
    if (refreshId !== membersRefreshId) return;
    state.error = apiErrorMessage(error, "Member");
    state.loading = false;
  }
}

export async function loadLiveMember(memberId: string): Promise<void> {
  const state = liveResourceState.users;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("users", []);
  try {
    const detail = await adminApi.getMember(memberId);
    replaceCollection("users", [memberRecordFromApiDetail(detail)]);
  } catch (error) {
    state.error = apiErrorMessage(error, "Member detail");
  } finally {
    state.loading = false;
  }
}

export async function hydrateLiveMember(record: LegacyRecord): Promise<void> {
  const memberId = typeof record.memberId === "string" ? record.memberId : "";
  if (!record.apiBacked || record.memberDetailLoaded || !memberId) return;
  record.memberDetailLoaded = true;
  try {
    const detail = await adminApi.getMember(memberId);
    Object.assign(record, memberRecordFromApiDetail(detail));
  } catch (error) {
    record.memberDetailError = apiErrorMessage(error, "Member detail");
  }
}

let walletsRefreshId = 0;
let walletsRefreshInFlight: Promise<void> | null = null;

export function refreshLiveWallets(): Promise<void> {
  if (walletsRefreshInFlight || liveResourceState.wallets.backgroundLoading) {
    return walletsRefreshInFlight || Promise.resolve();
  }
  const refresh = refreshLiveWalletsInternal();
  const sharedRefresh = refresh.finally(() => {
    if (walletsRefreshInFlight === sharedRefresh) walletsRefreshInFlight = null;
  });
  walletsRefreshInFlight = sharedRefresh;
  return sharedRefresh;
}

async function refreshLiveWalletsInternal(): Promise<void> {
  const refreshId = ++walletsRefreshId;
  const state = liveResourceState.wallets;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("wallets", []);
  try {
    const firstPage = await adminApi.listWallets({ limit: 100 });
    if (refreshId !== walletsRefreshId) return;
    replaceCollection("wallets", firstPage.items.map(walletRecordFromApi));
    state.loading = false;

    if (firstPage.nextCursor) {
      state.backgroundLoading = true;
      void (async () => {
        const items: AdminWallet[] = [];
        let cursor = firstPage.nextCursor || undefined;
        while (cursor) {
          const page = await adminApi.listWallets({ limit: 100, cursor });
          items.push(...page.items);
          if (!page.nextCursor || page.nextCursor === cursor) break;
          cursor = page.nextCursor;
        }
        if (refreshId !== walletsRefreshId) return;
        replaceCollection("wallets", [
          ...firstPage.items,
          ...items,
        ].map(walletRecordFromApi));
        state.backgroundLoading = false;
        notifyLiveResourceUpdated("wallets");
      })().catch((error: unknown) => {
        if (refreshId !== walletsRefreshId) return;
        state.backgroundLoading = false;
        state.error = apiErrorMessage(error, "Wallet");
      });
    }
  } catch (error) {
    if (refreshId !== walletsRefreshId) return;
    state.error = apiErrorMessage(error, "Wallet");
    state.loading = false;
  }
}

export async function hydrateLiveWallet(record: LegacyRecord): Promise<void> {
  const walletId = typeof record.walletId === "string" ? record.walletId : "";
  if (!record.apiBacked || record.walletDetailLoaded || !walletId) return;
  record.walletDetailLoaded = true;
  try {
    const [detail, history] = await Promise.all([
      adminApi.getWallet(walletId),
      adminApi.getWalletStatusHistory(walletId),
    ]);
    Object.assign(record, walletRecordFromApiDetail(detail.wallet), {
      walletStatusHistory: history.history.map(walletHistoryEntryFromApi),
    });
  } catch (error) {
    record.walletDetailError = apiErrorMessage(error, "Wallet detail");
  }
}

const disputeCaseStatuses = [
  "DISPUTE_CASE_PENDING",
  "DISPUTE_CASE_DISMISSED",
  "DISPUTE_CASE_RESOLVED",
] as const;

export async function refreshLiveDisputes(): Promise<void> {
  const state = liveResourceState.disputes;
  state.loading = true;
  state.error = null;
  try {
    const pages = await Promise.all(
      disputeCaseStatuses.map((status) => adminApi.listDisputes({ status, limit: 50 })),
    );
    const records = pages
      .flatMap((page) => page.items)
      .toSorted((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")) || right.id.localeCompare(left.id));
    replaceCollection("disputes", records.map(disputeRecordFromApi));
  } catch (error) {
    state.error = apiErrorMessage(error, "Dispute Case");
    replaceCollection("disputes", []);
  } finally {
    state.loading = false;
  }
}

export async function loadLiveDispute(disputeCaseId: string): Promise<void> {
  const state = liveResourceState.disputes;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("disputes", []);
  try {
    const detail = await adminApi.getDispute(disputeCaseId);
    const record = disputeRecordFromApi(detail);
    replaceCollection("disputes", [record]);
    await hydrateLiveDisputeEvidence(record);
  } catch (error) {
    state.error = apiErrorMessage(error, "Dispute Case detail");
  } finally {
    state.loading = false;
  }
}

export async function hydrateLiveDispute(record: LegacyRecord): Promise<void> {
  if (!record.apiBacked || record.disputeDetailLoaded) return;
  record.disputeDetailLoaded = true;
  try {
    const detail = await adminApi.getDispute(record.id);
    Object.assign(record, disputeRecordFromApi(detail));
  } catch (error) {
    record.disputeDetailError = apiErrorMessage(error, "Dispute Case detail");
  }
  await hydrateLiveDisputeEvidence(record);
}

export function mergeLiveDisputeSummary(record: LegacyRecord, summary: AdminDisputeCase): void {
  Object.assign(record, {
    status: summary.status,
    disputeCaseStatus: summary.status,
    version: summary.version,
    resolvedAmountSatang: summary.resolvedAmountSatang,
    resolution: summary.status === "DISPUTE_CASE_DISMISSED"
      ? "Dispute Case dismissed by Admin."
      : summary.status === "DISPUTE_CASE_RESOLVED" ? "Dispute Case resolved by Admin." : undefined,
    tone: summary.status === "DISPUTE_CASE_PENDING" ? "warning" : "neutral",
  });
}

function historyEntryFromApi(entry: AdminPayoutDetail["history"][number]): LegacyHistoryEntry {
  const newStatus = canonicalPayoutStatusForApi(entry.toStatus);
  return {
    event: newStatus,
    at: dateTimeLabel(entry.occurredAt),
    by: entry.actorAdminId || entry.actorUserId || entry.source,
    reason: entry.reason || undefined,
    previousStatus: entry.fromStatus ? canonicalPayoutStatusForApi(entry.fromStatus) : undefined,
    newStatus,
  };
}

export async function hydrateLivePayout(record: LegacyRecord): Promise<void> {
  if (!record.apiBacked || record.payoutHistoryLoaded) return;
  record.payoutHistoryLoaded = true;
  try {
    const detail = await adminApi.getPayout(record.id);
    Object.assign(record, payoutRecordFromApi(detail), {
      payoutHistory: detail.history.map(historyEntryFromApi),
    });
  } catch (error) {
    record.payoutHistoryError = apiErrorMessage(error, "Payout detail");
  }
}

export function payoutServerValue(record: LegacyRecord, field: "principalSatang" | "receiptSatang" | "maximumFeeSatang" | "maximumTaxSatang" | "maximumDebitSatang"): number | null {
  const value = record[field];
  return typeof value === "number" ? satangToBaht(value) : null;
}

export function liveResourceError(view: LiveResourceView): string | null {
  return liveResourceState[view].error;
}
