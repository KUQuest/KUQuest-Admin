export const QUEST_STATES = [
  "QUEST_DRAFT",
  "QUEST_OPEN",
  "QUEST_ASSIGNED",
  "QUEST_IN_PROGRESS",
  "QUEST_COMPLETED",
  "QUEST_CANCELLED",
  "QUEST_FAILED",
] as const;
export type QuestState = (typeof QUEST_STATES)[number];

export const DISPUTE_CASE_STATUSES = [
  "DISPUTE_CASE_PENDING",
  "DISPUTE_CASE_DISMISSED",
  "DISPUTE_CASE_RESOLVED",
] as const;
export type DisputeCaseStatus = (typeof DISPUTE_CASE_STATUSES)[number];

export const REPORT_CASE_STATUSES = [
  "REPORT_CASE_PENDING",
  "REPORT_CASE_DISMISSED",
  "REPORT_CASE_HIDDEN",
  "REPORT_CASE_RESTORED",
] as const;
export type ReportCaseStatus = (typeof REPORT_CASE_STATUSES)[number];

export const CONDUCT_REPORT_STATUSES = [
  "CONDUCT_REPORT_PENDING",
  "CONDUCT_REPORT_UPHELD",
  "CONDUCT_REPORT_DISMISSED",
] as const;
export type ConductReportStatus = (typeof CONDUCT_REPORT_STATUSES)[number];
export type ModerationCaseStatus = ReportCaseStatus | ConductReportStatus;

export const PAYOUT_STATUSES = [
  "PENDING_ADMIN_APPROVAL",
  "SUBMITTED_TO_PROVIDER",
  "PROVIDER_PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const TOP_UP_STATUSES = ["PENDING", "PAID", "EXPIRED", "FAILED"] as const;
export type TopUpStatus = (typeof TOP_UP_STATUSES)[number];

export const WALLET_STATUSES = [
  "ACTIVE",
  "FROZEN",
  "SUSPENDED",
  "CLOSED",
] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

export const MEMBER_STATUSES = ["Normal", "Flag", "Temp Ban", "Perm Ban"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const TERMINAL_QUEST_STATES: readonly QuestState[] = [
  "QUEST_COMPLETED",
  "QUEST_CANCELLED",
  "QUEST_FAILED",
];

export function isQuestState(value: unknown): value is QuestState {
  return typeof value === "string" && QUEST_STATES.includes(value as QuestState);
}

export function isDisputeCaseStatus(value: unknown): value is DisputeCaseStatus {
  return typeof value === "string"
    && DISPUTE_CASE_STATUSES.includes(value as DisputeCaseStatus);
}

export function isReportCaseStatus(value: unknown): value is ReportCaseStatus {
  return typeof value === "string"
    && REPORT_CASE_STATUSES.includes(value as ReportCaseStatus);
}

export function isConductReportStatus(value: unknown): value is ConductReportStatus {
  return typeof value === "string"
    && CONDUCT_REPORT_STATUSES.includes(value as ConductReportStatus);
}

export function isPayoutStatus(value: unknown): value is PayoutStatus {
  return typeof value === "string" && PAYOUT_STATUSES.includes(value as PayoutStatus);
}

export function isTopUpStatus(value: unknown): value is TopUpStatus {
  return typeof value === "string" && TOP_UP_STATUSES.includes(value as TopUpStatus);
}

export function isWalletStatus(value: unknown): value is WalletStatus {
  return typeof value === "string" && WALLET_STATUSES.includes(value as WalletStatus);
}

export function memberStatusFor(value: unknown): MemberStatus {
  switch (value) {
    case "Flag":
    case "Red Flag":
      return "Flag";
    case "Temp Ban":
    case "Temp ban":
      return "Temp Ban";
    case "Perm Ban":
    case "Perm ban":
      return "Perm Ban";
    case "Normal":
    default:
      return "Normal";
  }
}

export function memberStatusLabel(value: unknown): MemberStatus {
  return memberStatusFor(value);
}

export function isQuestTerminal(state: QuestState): boolean {
  return TERMINAL_QUEST_STATES.includes(state);
}

export function canHideQuest(state: QuestState): boolean {
  return state === "QUEST_OPEN"
    || state === "QUEST_ASSIGNED"
    || state === "QUEST_IN_PROGRESS";
}

export function canResolveDispute(
  questState: QuestState,
  caseStatus: DisputeCaseStatus,
): boolean {
  return questState === "QUEST_FAILED" && caseStatus === "DISPUTE_CASE_PENDING";
}

export function questStateFor(value: unknown): QuestState {
  if (isQuestState(value)) return value;
  switch (value) {
    case "Draft":
      return "QUEST_DRAFT";
    case "QUEST_AWAITING_CONSENT":
    case "Assigned":
    case "Change pending":
      return "QUEST_ASSIGNED";
    case "QUEST_SUBMITTED":
    case "QUEST_REWORK":
    case "In progress":
    case "Submitted":
      return "QUEST_IN_PROGRESS";
    case "QUEST_APPROVED":
    case "Approved":
    case "Completed":
      return "QUEST_COMPLETED";
    case "Cancelled":
      return "QUEST_CANCELLED";
    case "QUEST_DISPUTED":
    case "Disputed":
      return "QUEST_FAILED";
    case "Hidden":
    case "Open":
    default:
      return "QUEST_OPEN";
  }
}

export function questStateLabel(value: unknown): string {
  switch (questStateFor(value)) {
    case "QUEST_DRAFT":
      return "Draft";
    case "QUEST_OPEN":
      return "Open";
    case "QUEST_ASSIGNED":
      return "Assigned";
    case "QUEST_IN_PROGRESS":
      return "In progress";
    case "QUEST_COMPLETED":
      return "Completed";
    case "QUEST_CANCELLED":
      return "Cancelled";
    case "QUEST_FAILED":
      return "Failed";
  }
}

export function disputeCaseStatusFor(value: unknown): DisputeCaseStatus {
  if (isDisputeCaseStatus(value)) return value;
  return value === "Closed" ? "DISPUTE_CASE_RESOLVED" : "DISPUTE_CASE_PENDING";
}

export function disputeCaseStatusLabel(value: unknown): string {
  switch (disputeCaseStatusFor(value)) {
    case "DISPUTE_CASE_PENDING":
      return "Open";
    case "DISPUTE_CASE_DISMISSED":
      return "Dismissed";
    case "DISPUTE_CASE_RESOLVED":
      return "Resolved";
  }
}

export function reportCaseStatusFor(value: unknown, decision?: unknown): ModerationCaseStatus {
  if (isReportCaseStatus(value) || isConductReportStatus(value)) return value;
  if (value === "Closed") {
    return decision === "confirmed-violation"
      ? "REPORT_CASE_HIDDEN"
      : "REPORT_CASE_DISMISSED";
  }
  return "REPORT_CASE_PENDING";
}

export function reportCaseStatusLabel(value: unknown, decision?: unknown): string {
  switch (reportCaseStatusFor(value, decision)) {
    case "REPORT_CASE_PENDING":
    case "CONDUCT_REPORT_PENDING":
      return "Open";
    case "REPORT_CASE_DISMISSED":
    case "CONDUCT_REPORT_DISMISSED":
      return "Dismissed";
    case "REPORT_CASE_HIDDEN":
      return "Confirmed";
    case "REPORT_CASE_RESTORED":
      return "Restored";
    case "CONDUCT_REPORT_UPHELD":
      return "Confirmed";
  }
}

export function payoutStatusFor(value: unknown): PayoutStatus {
  if (isPayoutStatus(value)) return value;
  switch (value) {
    case "Needs approval":
      return "PENDING_ADMIN_APPROVAL";
    case "Approved":
      return "SUBMITTED_TO_PROVIDER";
    case "Processing":
      return "PROVIDER_PENDING";
    case "Completed":
      return "SUCCEEDED";
    case "Failed":
      return "FAILED";
    case "Rejected":
      return "CANCELLED";
    default:
      return "PENDING_ADMIN_APPROVAL";
  }
}

export function payoutStatusLabel(value: unknown): string {
  switch (payoutStatusFor(value)) {
    case "PENDING_ADMIN_APPROVAL":
      return "Needs review";
    case "SUBMITTED_TO_PROVIDER":
      return "Sent";
    case "PROVIDER_PENDING":
      return "Processing";
    case "SUCCEEDED":
      return "Paid";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
  }
}

export function topUpStatusFor(value: unknown): TopUpStatus {
  return isTopUpStatus(value) ? value : "PENDING";
}

export function topUpStatusLabel(value: unknown): string {
  switch (topUpStatusFor(value)) {
    case "PENDING":
      return "Pending";
    case "PAID":
      return "Paid";
    case "EXPIRED":
      return "Expired";
    case "FAILED":
      return "Failed";
  }
}

export function walletStatusFor(value: unknown): WalletStatus {
  if (isWalletStatus(value)) return value;
  switch (value) {
    case "Temp ban":
    case "Perm ban":
      return "FROZEN";
    case "Suspended":
      return "SUSPENDED";
    case "Closed":
      return "CLOSED";
    case "Frozen":
      return "FROZEN";
    case "Normal":
    case "Red Flag":
    case "Active":
    default:
      return "ACTIVE";
  }
}

export function walletStatusLabel(value: unknown): string {
  switch (walletStatusFor(value)) {
    case "ACTIVE":
      return "Active";
    case "FROZEN":
      return "Frozen";
    case "SUSPENDED":
      return "Suspended";
    case "CLOSED":
      return "Closed";
  }
}

export function hasHiddenQuestOverlay(record: { hiddenAt?: unknown; status?: unknown; questState?: unknown }): boolean {
  return Boolean(record.hiddenAt) || record.status === "Hidden";
}

export function isDisputeCasePending(value: unknown): boolean {
  return disputeCaseStatusFor(value) === "DISPUTE_CASE_PENDING";
}

export function isReportCasePending(value: unknown, decision?: unknown): boolean {
  const status = reportCaseStatusFor(value, decision);
  return status === "REPORT_CASE_PENDING" || status === "CONDUCT_REPORT_PENDING";
}

export function isPayoutPendingApproval(value: unknown): boolean {
  return payoutStatusFor(value) === "PENDING_ADMIN_APPROVAL";
}
