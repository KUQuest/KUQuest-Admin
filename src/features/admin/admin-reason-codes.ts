import type {
  AdminReviewReasonCode,
  ConductReportDecisionReasonCode,
} from "./api/admin-api";

export const ADMIN_REVIEW_REASON_CODE_OPTIONS = [
  { value: "POLICY_REVIEW", label: "Policy review" },
  { value: "SAFETY_REVIEW", label: "Safety review" },
] as const satisfies readonly { value: AdminReviewReasonCode; label: string }[];

export const CONDUCT_REPORT_DISMISS_REASON_CODE_OPTIONS = [
  { value: "CONDUCT_REPORT_NO_VIOLATION", label: "No violation" },
  { value: "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE", label: "Insufficient evidence" },
] as const satisfies readonly { value: ConductReportDecisionReasonCode; label: string }[];
