import type { DisputeCaseStatus, WalletStatus } from "../domain/rulebook";
import type { AdminDisputeCase } from "./admin-api-types-dispute";
import type { AdminQuest } from "./admin-api-types-quest";
export type AdminCommandOptions = {
  idempotencyKey: string;
  expectedVersion?: number;
};

export type AdminQuestReasonCode = "POLICY_REVIEW" | "SAFETY_REVIEW";

export type QuestHideCommand = AdminCommandOptions & {
  reason: string;
  reasonCode: AdminQuestReasonCode;
};
export type QuestRestoreCommand = AdminCommandOptions & {
  reason: string;
  reasonCode: AdminQuestReasonCode;
};
export type QuestTerminateCommand = AdminCommandOptions & {
  reason: string;
  reasonCode: AdminQuestReasonCode;
};

export type DisputeAllocation = {
  workerId: string;
  amountSatang: number;
};

export type AdminDisputeReasonCode = "DISPUTE_POLICY_REVIEW" | "DISPUTE_EVIDENCE_REVIEW";

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

export type ReportDecision = AdminCommandOptions & {
  decision:
    | "REPORT_CASE_DISMISSED"
    | "REPORT_CASE_HIDDEN"
    | "REPORT_CASE_RESTORED"
    | "CONDUCT_REPORT_DISMISSED"
    | "CONDUCT_REPORT_UPHELD";
  reason: string;
};

export type WalletStatusCommand = AdminCommandOptions & {
  status?: WalletStatus;
  toStatus?: WalletStatus;
  reason: string;
};

export type PayoutApproval = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
  reasonCode?: "PAYOUT_POLICY_REVIEW" | "PAYOUT_RISK_REVIEW";
  note?: string;
};
export type PayoutRejection = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
  reasonCode: "PAYOUT_POLICY_REVIEW" | "PAYOUT_RISK_REVIEW" | "PAYOUT_INVALID_DESTINATION";
  reason?: string;
};

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
