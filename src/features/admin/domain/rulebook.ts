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

export const WALLET_STATUSES = [
  "ACTIVE",
  "FROZEN",
  "SUSPENDED",
  "CLOSED",
] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

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

export function isWalletStatus(value: unknown): value is WalletStatus {
  return typeof value === "string" && WALLET_STATUSES.includes(value as WalletStatus);
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
    case "Assigned":
    case "Change pending":
      return "QUEST_ASSIGNED";
    case "In progress":
    case "Submitted":
      return "QUEST_IN_PROGRESS";
    case "Approved":
    case "Completed":
      return "QUEST_COMPLETED";
    case "Cancelled":
      return "QUEST_CANCELLED";
    case "Disputed":
      return "QUEST_FAILED";
    case "Hidden":
    case "Open":
    default:
      return "QUEST_OPEN";
  }
}

export function disputeCaseStatusFor(value: unknown): DisputeCaseStatus {
  if (isDisputeCaseStatus(value)) return value;
  return value === "Closed" ? "DISPUTE_CASE_RESOLVED" : "DISPUTE_CASE_PENDING";
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
