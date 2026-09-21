export const ADMIN_API_QUEST_STATUSES = [
  "QUEST_DRAFT",
  "QUEST_OPEN",
  "QUEST_AWAITING_CONSENT",
  "QUEST_ASSIGNED",
  "QUEST_IN_PROGRESS",
  "QUEST_SUBMITTED",
  "QUEST_APPROVED",
  "QUEST_REWORK",
  "QUEST_COMPLETED",
  "QUEST_CANCELLED",
  "QUEST_DISPUTED",
  "QUEST_FAILED",
] as const;
export type AdminApiQuestStatus = (typeof ADMIN_API_QUEST_STATUSES)[number];
export type AdminQuestMode = "FIRST_COME_FIRST_SERVED" | "CANDIDATE";
export type AdminQuestParticipation = "SINGLE" | "GROUP";

export type AdminQuestMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
export type AdminQuest = {
  id: string;
  displayId?: string;
  apiVersion: "v1" | "v2";
  version: number;
  title: string;
  questStatus: AdminApiQuestStatus;
  mode: AdminQuestMode;
  participation: AdminQuestParticipation;
  headcount: number;
  rewardSatang: number | null;
  questFundingTotalSatang: number | null;
  startTime: string;
  dueAt: string | null;
  hiddenAt: string | null;
  hiddenByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
  hirer: AdminQuestMember;
};

export type AdminQuestTimelineEntry = {
  event: string;
  status: AdminApiQuestStatus | null;
  occurredAt: string;
  actorId: string | null;
  reasonCode: string | null;
};

export type AdminQuestDetail = AdminQuest & {
  description: string | null;
  condition: { text: string; items: Array<{ position: number; text: string }> };
  locations: Array<{ label: string | null }>;
  proofRequired: boolean;
  tagId: string | null;
  fundingReservationId: string | null;
  policyRevisionId: string | null;
  platformFeeBps: number | null;
  platformFeePerWorkerSatang: number | null;
  questEscrowSatang: number | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancelledByAdminId: string | null;
  candidates: {
    applications: Array<{
      id: string;
      worker: AdminQuestMember;
      applicationStatus: string;
      reworkLimit: number;
      appliedAt: string;
    }>;
    teams: Array<{
      id: string;
      name: string;
      teamStatus: string;
      reworkLimit: number;
      leaderId: string;
      createdAt: string;
      members: Array<{ member: AdminQuestMember; joinedAt: string }>;
    }>;
  };
  assignments: Array<{
    id: string;
    worker: AdminQuestMember;
    assignmentStatus: string;
    startedAt: string | null;
    createdAt: string;
  }>;
  images?: Array<{
    imageId: string;
    fileId: string;
    position: number;
    url: string;
    urlExpiresAt: string;
  }>;
  proofSubmissions: Array<{
    id: string;
    worker: AdminQuestMember | null;
    team: { id: string; name: string } | null;
    submittedBy: AdminQuestMember;
    content: string;
    submissionStatus: string;
    reviewNote: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    files: Array<{ fileId: string; contentType: string; sizeBytes: number; position: number }>;
  }>;
  editHistory: Array<
    | {
        kind: "FIELD_EDIT";
        id: string;
        fieldName: string;
        oldValue: unknown;
        newValue: unknown;
        editedAt: string;
        editedByUserId: string | null;
        editedByAdminId: string | null;
      }
    | {
        kind: "EDIT_REQUEST";
        id: string;
        apiVersion: "v1" | "v2";
        requestStatus: string;
        failureCode: string | null;
        requestedByUserId: string | null;
        proposedChanges: unknown;
        createdAt: string;
        expiresAt: string | null;
        resolvedAt: string | null;
        responses: Array<{
          workerId: string;
          decision: string | null;
          reason: string | null;
          respondedAt: string | null;
        }>;
      }
  >;
  /** The complete Quest lifecycle, when the Admin API provides it. */
  timeline?: AdminQuestTimelineEntry[];
  adminActions: Array<{
    id: string;
    admin: { id: string; firstName: string; lastName: string };
    action: string;
    reasonCode: string | null;
    createdAt: string;
  }>;
};

export type AdminQuestFinance = {
  quest: {
    id: string;
    title: string;
    questStatus: string;
    headcount: number;
    rewardSatang: number | null;
    platformFeePerWorkerSatang: number | null;
    questFundingTotalSatang: number | null;
    hirer: {
      id: string;
      firstName: string;
      lastName: string;
      studentId: string | null;
    };
  };
  reservation: {
    id: string;
    status: string;
    totalReservedSatang: number;
    remainingSatang: number;
    createdAt: string;
  } | null;
  transfers: Array<{
    id: string;
    occurredAt: string;
    type: "RESERVE" | "SETTLEMENT" | "RELEASE" | "DISPUTE_SETTLEMENT";
    from: { type: string; id: string; displayName: string };
    to: { type: string; id: string; displayName: string };
    amountSatang: number;
    platformFeeSatang: number;
    description: string;
    ledgerTransactionId: string;
    businessReference: string;
  }>;
  ledgerTransactions: Array<{
    id: string;
    businessReference: string;
    eventType: string;
    description: string | null;
    createdAt: string;
    sealedAt: string | null;
    postings: Array<{
      id: string;
      accountId: string;
      accountType: string;
      walletId: string | null;
      ownerUserId: string | null;
      amountSatang: number;
    }>;
  }>;
};
