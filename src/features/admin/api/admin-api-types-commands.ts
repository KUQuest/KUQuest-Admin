import type {
  ConductReportStatus,
  DisputeCaseStatus,
  ReportCaseStatus,
  WalletStatus,
} from "../domain/rulebook";
import type { AdminApiRequestOptions } from "./admin-api-types-core";
import type { AdminDisputeCase } from "./admin-api-types-dispute";
import type { AdminQuest } from "./admin-api-types-quest";
export type AdminCommandOptions = {
  idempotencyKey: string;
  expectedVersion?: number;
};

export type AdminMemberPenaltyAddReasonCode =
  | "MEMBER_PENALTY_VIOLATION_CONFIRMED"
  | "MEMBER_PENALTY_REPEATED_VIOLATION_CONFIRMED"
  | "MEMBER_PENALTY_SAFETY_RISK_CONFIRMED"
  | "MEMBER_PENALTY_OTHER_VIOLATION_CONFIRMED";

export type AdminMemberPenaltyRemoveReasonCode =
  | "MEMBER_PENALTY_ADMIN_ERROR"
  | "MEMBER_PENALTY_NEW_EVIDENCE"
  | "MEMBER_PENALTY_POLICY_REVIEW"
  | "MEMBER_PENALTY_OTHER_CORRECTION";

export type AdminMemberPenaltyAddResult =
  | "PENALTY_RED_FLAG"
  | "PENALTY_TEMPORARY_BAN_7_DAYS"
  | "PENALTY_PERMANENT_BAN";

export type AdminMemberPenaltyAddCommand = {
  idempotencyKey: string;
  expectedVersionToken: number;
  result?: AdminMemberPenaltyAddResult;
  reasonCode: AdminMemberPenaltyAddReasonCode;
  adminNote?: string;
};

export type AdminMemberPenaltyRemoveCommand = {
  idempotencyKey: string;
  expectedVersionToken: number;
  recordId: string;
  reasonCode: AdminMemberPenaltyRemoveReasonCode;
  adminNote?: string;
};

export type AdminMemberPenaltyCommandResult = {
  command: {
    kind: "ADD" | "REMOVE";
    outcome: "ADDED" | "EXEMPTED" | "REMOVED";
    recordId: string;
    commandRecordId: string;
    result:
      | "PENALTY_EXEMPT"
      | AdminMemberPenaltyAddResult
      | "PENALTY_TEMPORARY_BAN_1_MONTH"
      | "PENALTY_REVERSAL";
    versionToken: number;
  };
};

export type AdminReviewReasonCode = "POLICY_REVIEW" | "SAFETY_REVIEW";

export type QuestHideCommand = AdminCommandOptions & {
  reason: string;
  reasonCode: AdminReviewReasonCode;
};
export type QuestRestoreCommand = AdminCommandOptions & {
  reason: string;
  reasonCode: AdminReviewReasonCode;
};
export type QuestTerminateCommand = AdminCommandOptions & {
  reason: string;
  reasonCode: AdminReviewReasonCode;
};

export type DisputeAllocation = {
  workerId: string;
  amountSatang: number;
};

export type AdminDisputeDismissReasonCode =
  | "DISPUTE_INSUFFICIENT_EVIDENCE"
  | "DISPUTE_QUEST_RECORD_DOES_NOT_SUPPORT_CLAIM"
  | "DISPUTE_NO_UNFAIR_SETTLEMENT_FOUND"
  | "DISPUTE_WORKER_ALREADY_COMPENSATED";

export type AdminDisputeResolveReasonCode =
  | "DISPUTE_VALID_PROOF_NOT_APPROVED"
  | "DISPUTE_WORKER_MET_QUEST_CONDITION"
  | "DISPUTE_PARTIAL_WORK_EARNED_REWARD";

export type AdminDisputeReasonCode =
  | AdminDisputeDismissReasonCode
  | AdminDisputeResolveReasonCode;

export type AdminDisputeOpenCommand = {
  workerId: string;
};

export type AdminDisputeOpenResult = {
  id: string;
  questId: string;
  filerUserId: string;
  openedByAdminId: string | null;
  status: DisputeCaseStatus;
  version: number;
  resolvedWorkerId: string | null;
  resolvedAmountSatang: number | null;
  resolvedByAdminId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DisputeResolution = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
  outcome: "DISPUTE_CASE_DISMISSED" | "DISPUTE_CASE_RESOLVED";
  reasonCode: AdminDisputeReasonCode;
  decisionReasonText?: string;
  workerId?: string;
  amountSatang?: number;
};

export type AdminDisputeResolutionResult = {
  resourceSummary: AdminDisputeCase;
  resourceVersion: number;
  adminActionId: string;
};

export type AdminQuestCommandResult = {
  resourceSummary: AdminQuest;
  resourceVersion: number;
  adminActionId: string;
};

type VersionedAdminCommand = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
  decisionReasonText?: string;
};

export type ReportCaseDecision = VersionedAdminCommand & {
  outcome: "REPORT_CASE_DISMISSED" | "REPORT_CASE_HIDDEN" | "REPORT_CASE_RESTORED";
  reasonCode: ReportCaseDecisionReasonCode;
};

export type ReportCaseDecisionReasonCode =
  | "REPORT_NO_POLICY_VIOLATION"
  | "REPORT_INSUFFICIENT_EVIDENCE"
  | "REPORT_CONTEXT_SUPPORTS_MESSAGE"
  | "REPORT_HARASSMENT_CONFIRMED"
  | "REPORT_SPAM_CONFIRMED"
  | "REPORT_THREAT_CONFIRMED"
  | "REPORT_INAPPROPRIATE_CONTENT_CONFIRMED"
  | "REPORT_OTHER_POLICY_VIOLATION_CONFIRMED"
  | "REPORT_MESSAGE_COMPLIES_WITH_POLICY"
  | "REPORT_CONTEXT_WAS_MISUNDERSTOOD"
  | "REPORT_NEW_EVIDENCE_OVERTURNS_HIDE";

export type AdminReportCommandResult = {
  resourceSummary: {
    kind: "REPORT_CASE";
    id: string;
    displayId: string;
    status: ReportCaseStatus;
    version: number;
    reporterEntryCount: number;
    referenceCount: number;
    caseClosedAt: string | null;
    updatedAt: string;
  };
  resourceVersion: number;
  adminActionId: string;
};

export type ConductReportDismissReasonCode =
  | "CONDUCT_REPORT_NO_VIOLATION"
  | "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE"
  | "CONDUCT_REPORT_QUEST_RECORD_DISPROVES_CLAIM"
  | "CONDUCT_REPORT_OUTSIDE_RULEBOOK_SCOPE";

export type ConductReportUpholdReasonCode =
  | "CONDUCT_REPORT_QUEST_RECORD_CONFIRMS_VIOLATION"
  | "CONDUCT_REPORT_PROOF_RECORD_CONFIRMS_VIOLATION"
  | "CONDUCT_REPORT_CHAT_CONTEXT_CORROBORATES_VIOLATION";

export type ConductReportDecisionReasonCode =
  | ConductReportDismissReasonCode
  | ConductReportUpholdReasonCode;

export type ConductReportDecision = VersionedAdminCommand & {
  outcome: "CONDUCT_REPORT_DISMISSED" | "CONDUCT_REPORT_UPHELD";
  decisionReasonCode: ConductReportDecisionReasonCode;
};

export type AdminConductReportCommandResult = {
  resourceSummary: {
    kind: "CONDUCT_REPORT";
    id: string;
    displayId: string;
    status: ConductReportStatus;
    version: number;
    updatedAt: string;
    resolvedAt: string | null;
  };
  resourceVersion: number;
  adminActionId: string;
};

export type AdminReportDecisionResult =
  | AdminReportCommandResult
  | AdminConductReportCommandResult;

export type AdminReportEvidenceRequestOptions = AdminApiRequestOptions & {
  idempotencyKey: string;
  limit?: number;
  cursor?: string;
};

export type WalletStatusCommand = AdminCommandOptions & {
  status?: WalletStatus;
  toStatus?: WalletStatus;
  reason: string;
};

export type PayoutApproval = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
  decisionReasonText?: string;
  reasonCode: PayoutApprovalReasonCode;
};
export type PayoutRejection = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
  decisionReasonText?: string;
  reasonCode: PayoutRejectionReasonCode;
};

export type PayoutApprovalReasonCode =
  | "PAYOUT_DESTINATION_VERIFIED"
  | "PAYOUT_ACCOUNT_OWNER_MATCHED"
  | "PAYOUT_POLICY_CHECK_PASSED"
  | "PAYOUT_RISK_REVIEW_CLEARED";

export type PayoutRejectionReasonCode =
  | "PAYOUT_INVALID_DESTINATION"
  | "PAYOUT_ACCOUNT_OWNER_MISMATCH"
  | "PAYOUT_POLICY_CHECK_FAILED"
  | "PAYOUT_RISK_REVIEW_FAILED"
  | "PAYOUT_REQUIRED_INFORMATION_MISSING";

export type PayoutDecisionReasonCode = PayoutApprovalReasonCode | PayoutRejectionReasonCode;

export type AdminEvent = {
  id?: string;
  type: string;
  subjectType?: string;
  subjectId?: string;
  state?: string;
  version?: number;
  queueImpact?: string[];
  occurredAt?: string;
};
