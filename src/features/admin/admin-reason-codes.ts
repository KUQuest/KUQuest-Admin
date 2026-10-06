import type {
  AdminDisputeDismissReasonCode,
  AdminDisputeResolveReasonCode,
  ConductReportDismissReasonCode,
  ConductReportUpholdReasonCode,
  PayoutApprovalReasonCode,
  PayoutRejectionReasonCode,
  ReportCaseDecisionReasonCode,
} from "./api/admin-api";

export const ADMIN_REVIEW_REASON_CODE_OPTIONS = [
  { value: "POLICY_REVIEW", label: "Policy review" },
  { value: "SAFETY_REVIEW", label: "Safety review" },
] as const;

export const DISPUTE_CASE_REASON_CODE_OPTIONS = {
  DISPUTE_CASE_DISMISSED: [
    { value: "DISPUTE_INSUFFICIENT_EVIDENCE", label: "Insufficient evidence" },
    { value: "DISPUTE_QUEST_RECORD_DOES_NOT_SUPPORT_CLAIM", label: "Quest record does not support the claim" },
    { value: "DISPUTE_NO_UNFAIR_SETTLEMENT_FOUND", label: "No unfair settlement found" },
    { value: "DISPUTE_WORKER_ALREADY_COMPENSATED", label: "Worker already compensated" },
  ] satisfies readonly { value: AdminDisputeDismissReasonCode; label: string }[],
  DISPUTE_CASE_RESOLVED: [
    { value: "DISPUTE_VALID_PROOF_NOT_APPROVED", label: "Valid Proof Submission was not approved" },
    { value: "DISPUTE_WORKER_MET_QUEST_CONDITION", label: "Worker met the Quest Condition" },
    { value: "DISPUTE_PARTIAL_WORK_EARNED_REWARD", label: "Partial work earned a Quest Reward" },
  ] satisfies readonly { value: AdminDisputeResolveReasonCode; label: string }[],
} as const;

export const REPORT_CASE_REASON_CODE_OPTIONS = {
  REPORT_CASE_DISMISSED: [
    { value: "REPORT_NO_POLICY_VIOLATION", label: "No policy violation" },
    { value: "REPORT_INSUFFICIENT_EVIDENCE", label: "Insufficient evidence" },
    { value: "REPORT_CONTEXT_SUPPORTS_MESSAGE", label: "Context supports the Message" },
  ] satisfies readonly { value: ReportCaseDecisionReasonCode; label: string }[],
  REPORT_CASE_HIDDEN: [
    { value: "REPORT_HARASSMENT_CONFIRMED", label: "Harassment confirmed" },
    { value: "REPORT_SPAM_CONFIRMED", label: "Spam confirmed" },
    { value: "REPORT_THREAT_CONFIRMED", label: "Threat confirmed" },
    { value: "REPORT_INAPPROPRIATE_CONTENT_CONFIRMED", label: "Inappropriate content confirmed" },
    { value: "REPORT_OTHER_POLICY_VIOLATION_CONFIRMED", label: "Other policy violation confirmed" },
  ] satisfies readonly { value: ReportCaseDecisionReasonCode; label: string }[],
  REPORT_CASE_RESTORED: [
    { value: "REPORT_MESSAGE_COMPLIES_WITH_POLICY", label: "Message complies with policy" },
    { value: "REPORT_CONTEXT_WAS_MISUNDERSTOOD", label: "Context was misunderstood" },
    { value: "REPORT_NEW_EVIDENCE_OVERTURNS_HIDE", label: "New evidence overturns the hide decision" },
  ] satisfies readonly { value: ReportCaseDecisionReasonCode; label: string }[],
} as const;

export const CONDUCT_REPORT_REASON_CODE_OPTIONS = {
  CONDUCT_REPORT_DISMISSED: [
    { value: "CONDUCT_REPORT_NO_VIOLATION", label: "No violation" },
    { value: "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE", label: "Insufficient evidence" },
    { value: "CONDUCT_REPORT_QUEST_RECORD_DISPROVES_CLAIM", label: "Quest record disproves the claim" },
    { value: "CONDUCT_REPORT_OUTSIDE_RULEBOOK_SCOPE", label: "Outside Rulebook scope" },
  ] satisfies readonly { value: ConductReportDismissReasonCode; label: string }[],
  CONDUCT_REPORT_UPHELD: [
    { value: "CONDUCT_REPORT_QUEST_RECORD_CONFIRMS_VIOLATION", label: "Quest record confirms a violation" },
    { value: "CONDUCT_REPORT_PROOF_RECORD_CONFIRMS_VIOLATION", label: "Proof Submission confirms a violation" },
    { value: "CONDUCT_REPORT_CHAT_CONTEXT_CORROBORATES_VIOLATION", label: "Chat context corroborates a violation" },
  ] satisfies readonly { value: ConductReportUpholdReasonCode; label: string }[],
} as const;

export const PAYOUT_REASON_CODE_OPTIONS = {
  approve: [
    { value: "PAYOUT_DESTINATION_VERIFIED", label: "Payout Destination verified" },
    { value: "PAYOUT_ACCOUNT_OWNER_MATCHED", label: "Account owner matched" },
    { value: "PAYOUT_POLICY_CHECK_PASSED", label: "Policy check passed" },
    { value: "PAYOUT_RISK_REVIEW_CLEARED", label: "Risk review cleared" },
  ] satisfies readonly { value: PayoutApprovalReasonCode; label: string }[],
  reject: [
    { value: "PAYOUT_INVALID_DESTINATION", label: "Invalid Payout Destination" },
    { value: "PAYOUT_ACCOUNT_OWNER_MISMATCH", label: "Account owner mismatch" },
    { value: "PAYOUT_POLICY_CHECK_FAILED", label: "Policy check failed" },
    { value: "PAYOUT_RISK_REVIEW_FAILED", label: "Risk review failed" },
    { value: "PAYOUT_REQUIRED_INFORMATION_MISSING", label: "Required information missing" },
  ] satisfies readonly { value: PayoutRejectionReasonCode; label: string }[],
} as const;
