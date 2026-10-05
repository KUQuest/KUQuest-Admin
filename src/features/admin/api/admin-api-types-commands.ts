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

type VersionedAdminCommand = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
};

export type ReportCaseDecision = VersionedAdminCommand & {
  outcome: "REPORT_CASE_DISMISSED" | "REPORT_CASE_HIDDEN" | "REPORT_CASE_RESTORED";
  reasonCode: AdminQuestReasonCode;
};

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

export type ConductReportDecisionReasonCode =
  | "CONDUCT_REPORT_NO_VIOLATION"
  | "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE";

export type ConductReportDecision = VersionedAdminCommand & (
  | {
      outcome: "CONDUCT_REPORT_DISMISSED";
      decisionReasonCode: ConductReportDecisionReasonCode;
    }
  | {
      outcome: "CONDUCT_REPORT_UPHELD";
    }
);

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
  reason?: string;
  reasonCode: string;
};
export type PayoutRejection = Omit<AdminCommandOptions, "expectedVersion"> & {
  expectedVersion: number;
  reason?: string;
  reasonCode: string;
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
