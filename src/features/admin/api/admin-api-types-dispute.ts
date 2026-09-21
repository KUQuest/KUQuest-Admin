import type { ConductReportStatus, DisputeCaseStatus, ReportCaseStatus } from "../domain/rulebook";
export type AdminDisputeCase = {
  id: string;
  displayId: string;
  questId: string;
  status: DisputeCaseStatus;
  workerId?: string;
  amountAtRiskSatang?: number;
  amountSatang?: number;
  evidenceRefs?: EvidenceReference[];
  questState?: "QUEST_FAILED";
  version?: number;
  [key: string]: unknown;
};

export type AdminDisputeCaseDetail = AdminDisputeCase & {
  filerUserId: string;
  openedByAdminId: string | null;
  resolvedWorkerId: string | null;
  resolvedAmountSatang: number | null;
  resolvedByAdminId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  quest: {
    id: string;
    title: string;
    hirerId: string;
    questStatus: string;
    version: number;
    failedAt: string | null;
    fundingReservationId: string | null;
  };
};

export type AdminReportCase = {
  id: string;
  status: ReportCaseStatus | ConductReportStatus;
  reportedMemberId: string;
  evidenceRefs?: EvidenceReference[];
  questId?: string;
  version?: number;
  [key: string]: unknown;
};

export type AdminEvidence = {
  evidenceRef: string;
  context?: unknown;
  expiresAt?: string;
};

export type EvidenceReference = string;

export type AdminDisputeEvidence = {
  caseId: string;
  questId: string;
  truncated: boolean;
  quest: {
    id: string;
    questStatus: string;
    version: number;
    hirerId: string;
    failedAt: string | null;
  };
  assignments: Array<{
    id: string;
    workerId: string;
    assignmentStatus: string;
    startedAt: string | null;
    createdAt: string;
  }>;
  proofSubmissions: Array<{
    id: string;
    workerId: string | null;
    teamId: string | null;
    submittedByUserId: string;
    submissionStatus: string;
    submittedAt: string | null;
    files: Array<{
      fileId: string;
      contentType: string;
      sizeBytes: number;
      position: number;
    }>;
  }>;
  adminActionId: string;
};

export type AdminDisputeEvidenceRequest = {
  idempotencyKey: string;
};
