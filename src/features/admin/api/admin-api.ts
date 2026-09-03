import { apiClient, apiRequest, getApiUrl } from "../../../lib/api/client";
import type {
  ConductReportStatus,
  DisputeCaseStatus,
  PayoutStatus,
  QuestState,
  ReportCaseStatus,
  WalletStatus,
} from "../domain/rulebook";

export type AdminIdentity = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  disabledAt: string | null;
};

export type AdminAuthSession = {
  redirect: boolean;
  token: string;
  url?: string | null;
  user: AdminIdentity;
};

export type AdminAuthSessionDetails = {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: AdminIdentity;
};

export type AdminPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type AdminOverview = {
  activeDisputes: number;
  payoutsNeedingReview: number;
  openReports: number;
  totalWorkLeft: number;
  questStateCounts: Partial<Record<QuestState, number>>;
  recentDecisions?: AdminOverviewDecision[];
  recentPayouts?: AdminOverviewPayout[];
  recentMemberPenalties?: AdminOverviewMemberPenalty[];
};

export type AdminOverviewDecision = {
  id: string;
  kind: "DISPUTE_CASE" | "REPORT_CASE" | "CONDUCT_REPORT";
  title: string;
  detail: string;
  amountSatang?: number;
  occurredAt: string;
};

export type AdminOverviewPayout = {
  id: string;
  memberName: string;
  amountSatang: number;
  payoutStatus: PayoutStatus;
};

export type AdminOverviewMemberPenalty = {
  memberId: string;
  memberName: string;
  status: WalletStatus;
  occurredAt: string;
};

export type AdminActivityLog = {
  id: string;
  action: string;
  actorAdminId: string;
  occurredAt: string;
  subjectType: string;
  subjectId: string;
  detail?: string;
};

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
  editHistory: Array<{
    kind: "FIELD_EDIT" | "EDIT_REQUEST";
    id: string;
    fieldName?: string;
    requestStatus?: string;
    failureCode?: string | null;
    createdAt?: string;
    editedAt?: string;
    resolvedAt?: string | null;
  }>;
  adminActions: Array<{
    id: string;
    admin: { id: string; firstName: string; lastName: string };
    action: string;
    reasonCode: string | null;
    createdAt: string;
  }>;
};

export type AdminDisputeCase = {
  id: string;
  questId: string;
  status: DisputeCaseStatus;
  workerId?: string;
  amountSatang?: number;
  evidenceRefs?: EvidenceReference[];
  questState?: "QUEST_FAILED";
  version?: number;
  [key: string]: unknown;
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

export type AdminMember = {
  id: string;
  displayName: string;
  email?: string;
  walletStatus?: WalletStatus;
  penaltyRecord?: unknown[];
  version?: number;
  [key: string]: unknown;
};

export type AdminPayout = {
  id: string;
  student: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  quoteId: string;
  principalSatang: number;
  receiptSatang: number;
  maximumFeeSatang: number;
  maximumTaxSatang: number;
  maximumDebitSatang: number;
  actualFeeSatang: number | null;
  actualTaxSatang: number | null;
  actualDebitSatang: number | null;
  bankCode: string;
  bankName: string;
  destinationType: string;
  maskedDestinationValue: string;
  maskedRoutingValue: string;
  providerReference: string | null;
  providerStatus: string | null;
  payoutStatus: AdminApiPayoutStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  version?: number;
};

export type AdminPayoutHistoryEntry = {
  id: string;
  fromStatus: AdminApiPayoutStatus | null;
  toStatus: AdminApiPayoutStatus;
  providerStatus: string | null;
  actorUserId: string | null;
  actorAdminId: string | null;
  source: string;
  reason: string | null;
  occurredAt: string;
};

export const ADMIN_API_PAYOUT_STATUSES = [
  "PENDING_ADMIN_APPROVAL",
  "CREATING",
  "PENDING",
  "AWAITING_RECONCILIATION",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type AdminApiPayoutStatus = (typeof ADMIN_API_PAYOUT_STATUSES)[number];

export type AdminPayoutDetail = AdminPayout & {
  history: AdminPayoutHistoryEntry[];
};

export type AdminPayoutListQuery = {
  status?: AdminApiPayoutStatus;
  limit?: number;
  cursor?: string;
  sort?: "newest" | "oldest";
};

export type AdminQuestListQuery = {
  status?: AdminApiQuestStatus;
  mode?: AdminQuestMode;
  participation?: AdminQuestParticipation;
  hidden?: boolean;
  limit?: number;
  cursor?: string;
  sort?: "newest" | "oldest";
};

export type AdminDisputeListQuery = {
  status?: DisputeCaseStatus;
  questId?: string;
  query?: string;
  limit?: number;
  cursor?: string;
};

export type AdminReportListQuery = {
  status?: ReportCaseStatus | ConductReportStatus;
  reportedMemberId?: string;
  query?: string;
  limit?: number;
  cursor?: string;
};

export type AdminMemberListQuery = {
  query?: string;
  walletStatus?: WalletStatus;
  limit?: number;
  cursor?: string;
};

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
  reasonCode?: AdminQuestReasonCode;
};
export type QuestTerminateCommand = AdminCommandOptions & {
  reason: string;
  reasonCode: AdminQuestReasonCode;
};

export type DisputeAllocation = {
  workerId: string;
  amountSatang: number;
};

export type DisputeResolution = AdminCommandOptions & {
  outcome: "REFUND_HIRER" | "RELEASE_TO_WORKER";
  reason: string;
  allocations?: DisputeAllocation[];
};

export type AdminDisputeResolutionResult = {
  questStatus: AdminApiQuestStatus;
  outcome: "REFUNDED" | "RELEASED_TO_WORKER";
  paidSatang: number;
  refundedSatang: number;
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
  status: WalletStatus;
  reason: string;
};

export type PayoutApproval = AdminCommandOptions & {
  note?: string;
};
export type PayoutRejection = AdminCommandOptions & {
  reason: string;
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

function encode(value: string): string {
  return encodeURIComponent(value);
}

function queryString(query: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });

  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function commandHeaders(options: AdminCommandOptions): HeadersInit {
  return { "Idempotency-Key": options.idempotencyKey };
}

function questCommandHeaders(options: AdminCommandOptions): HeadersInit {
  if (typeof options.expectedVersion !== "number") {
    throw new Error("Quest command requires the current resource version.");
  }
  return {
    ...commandHeaders(options),
    "If-Match": String(options.expectedVersion),
  };
}

function commandBody<T extends AdminCommandOptions>(options: T): Omit<T, "idempotencyKey" | "expectedVersion"> {
  const { idempotencyKey: _idempotencyKey, expectedVersion: _expectedVersion, ...body } = options;
  return body;
}

function disputeCommandBody(options: DisputeResolution): Pick<DisputeResolution, "outcome" | "allocations"> {
  return {
    outcome: options.outcome,
    ...(options.allocations ? { allocations: options.allocations } : {}),
  };
}

export const adminApi = {
  signInEmail(email: string, password: string): Promise<AdminAuthSession> {
    return apiClient<AdminAuthSession>("/api/admin/auth/sign-in/email", {
      method: "POST",
      body: { email, password },
    });
  },

  getSession(): Promise<AdminAuthSessionDetails | null> {
    return apiClient<AdminAuthSessionDetails | null>("/api/admin/auth/get-session", {
      cache: "no-store",
    });
  },

  signOut(): Promise<null> {
    return apiRequest<null | undefined>("/api/admin/auth/sign-out", {
      method: "POST",
    }).then(() => null);
  },

  getOverview(): Promise<AdminOverview> {
    return apiRequest<AdminOverview>("/api/v1/admin/overview", {
      cache: "no-store",
    });
  },

  listActivityLogs(
    query: { limit?: number; cursor?: string } = {},
  ): Promise<AdminPage<AdminActivityLog>> {
    return apiRequest<AdminPage<AdminActivityLog>>(
      `/api/v1/admin/activity-logs${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  listQuests(query: AdminQuestListQuery = {}): Promise<AdminPage<AdminQuest>> {
    return apiRequest<AdminPage<AdminQuest>>(
      `/api/v1/admin/quests${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  getQuest(questId: string): Promise<AdminQuestDetail> {
    return apiRequest<AdminQuestDetail>(
      `/api/v1/admin/quests/${encode(questId)}`,
      { cache: "no-store" },
    );
  },

  hideQuest(questId: string, options: QuestHideCommand): Promise<AdminQuestCommandResult> {
    return apiRequest<AdminQuestCommandResult>(
      `/api/v1/admin/quests/${encode(questId)}/hide`,
      {
        method: "POST",
        headers: questCommandHeaders(options),
        body: { reasonCode: options.reasonCode },
      },
    );
  },

  restoreQuest(questId: string, options: QuestRestoreCommand): Promise<AdminQuestCommandResult> {
    return apiRequest<AdminQuestCommandResult>(
      `/api/v1/admin/quests/${encode(questId)}/restore`,
      {
        method: "POST",
        headers: questCommandHeaders(options),
        body: options.reasonCode ? { reasonCode: options.reasonCode } : {},
      },
    );
  },

  terminateQuest(questId: string, options: QuestTerminateCommand): Promise<AdminQuestCommandResult> {
    return apiRequest<AdminQuestCommandResult>(
      `/api/v1/admin/quests/${encode(questId)}/terminate`,
      {
        method: "POST",
        headers: questCommandHeaders(options),
        body: { reasonCode: options.reasonCode },
      },
    );
  },

  listDisputes(query: AdminDisputeListQuery = {}): Promise<AdminPage<AdminDisputeCase>> {
    return apiRequest<AdminPage<AdminDisputeCase>>(
      `/api/v1/admin/disputes${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  getDispute(disputeId: string): Promise<AdminDisputeCase> {
    return apiRequest<AdminDisputeCase>(
      `/api/v1/admin/disputes/${encode(disputeId)}`,
      { cache: "no-store" },
    );
  },

  resolveDispute(questId: string, options: DisputeResolution): Promise<AdminDisputeResolutionResult> {
    return apiRequest<AdminDisputeResolutionResult>(
      `/api/v1/admin/quests/${encode(questId)}/dispute/resolve`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: disputeCommandBody(options),
      },
    );
  },

  listPayouts(query: AdminPayoutListQuery = {}): Promise<AdminPage<AdminPayout>> {
    return apiRequest<AdminPage<AdminPayout>>(
      `/api/v1/admin/payouts${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  getPayout(payoutId: string): Promise<AdminPayoutDetail> {
    return apiRequest<AdminPayoutDetail>(
      `/api/v1/admin/payouts/${encode(payoutId)}`,
      { cache: "no-store" },
    );
  },

  getPayoutHistory(payoutId: string): Promise<AdminPayoutHistoryEntry[]> {
    return apiRequest<AdminPayoutHistoryEntry[]>(
      `/api/v1/admin/payouts/${encode(payoutId)}/status-history`,
      { cache: "no-store" },
    );
  },

  approvePayout(payoutId: string, options: PayoutApproval): Promise<AdminPayout> {
    return apiRequest<AdminPayout>(
      `/api/v1/admin/payouts/${encode(payoutId)}/approve`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
      },
    );
  },

  rejectPayout(payoutId: string, options: PayoutRejection): Promise<AdminPayout> {
    return apiRequest<AdminPayout>(
      `/api/v1/admin/payouts/${encode(payoutId)}/reject`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
      },
    );
  },

  listReports(query: AdminReportListQuery = {}): Promise<AdminPage<AdminReportCase>> {
    return apiRequest<AdminPage<AdminReportCase>>(
      `/api/v1/admin/reports${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  getReport(reportId: string): Promise<AdminReportCase> {
    return apiRequest<AdminReportCase>(
      `/api/v1/admin/reports/${encode(reportId)}`,
      { cache: "no-store" },
    );
  },

  decideReport(reportId: string, options: ReportDecision): Promise<AdminReportCase> {
    return apiRequest<AdminReportCase>(
      `/api/v1/admin/reports/${encode(reportId)}/decide`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
      },
    );
  },

  getEvidence(evidenceRef: string): Promise<AdminEvidence> {
    return apiRequest<AdminEvidence>(
      `/api/v1/admin/evidence/${encode(evidenceRef)}`,
      { cache: "no-store" },
    );
  },

  listMembers(query: AdminMemberListQuery = {}): Promise<AdminPage<AdminMember>> {
    return apiRequest<AdminPage<AdminMember>>(
      `/api/v1/admin/members${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  getMember(memberId: string): Promise<AdminMember> {
    return apiRequest<AdminMember>(
      `/api/v1/admin/members/${encode(memberId)}`,
      { cache: "no-store" },
    );
  },

  setWalletStatus(memberId: string, options: WalletStatusCommand): Promise<AdminMember> {
    return apiRequest<AdminMember>(
      `/api/v1/admin/wallets/${encode(memberId)}/status`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
      },
    );
  },
};

export type AdminReadPort = Pick<
  typeof adminApi,
  | "getOverview"
  | "listActivityLogs"
  | "listQuests"
  | "getQuest"
  | "listDisputes"
  | "getDispute"
  | "listPayouts"
  | "getPayout"
  | "getPayoutHistory"
  | "listReports"
  | "getReport"
  | "getEvidence"
  | "listMembers"
  | "getMember"
>;

export type AdminCommandPort = Pick<
  typeof adminApi,
  | "hideQuest"
  | "restoreQuest"
  | "terminateQuest"
  | "resolveDispute"
  | "approvePayout"
  | "rejectPayout"
  | "decideReport"
  | "setWalletStatus"
>;

// These typed ports are the only application boundary required when the live
// Admin API is enabled. They do not make a request until a screen calls them.
export const adminApiReadPort: AdminReadPort = adminApi;
export const adminApiCommandPort: AdminCommandPort = adminApi;

export type AdminEventSubscription = {
  close: () => void;
};

export function subscribeToAdminEvents(
  onEvent: (event: AdminEvent) => void,
  onError?: (error: Event) => void,
): AdminEventSubscription {
  const source = new EventSource(
    `${getApiUrl().replace(/\/$/, "")}/api/v1/admin/events`,
    { withCredentials: true },
  );

  const handleMessage = (event: MessageEvent<string>): void => {
    try {
      const parsed: unknown = JSON.parse(event.data);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;

      const record = parsed as Record<string, unknown>;
      const payload = record.success === true
        && record.data
        && typeof record.data === "object"
        && !Array.isArray(record.data)
        ? record.data as Record<string, unknown>
        : record;

      if (typeof payload.type === "string") onEvent(payload as AdminEvent);
    } catch {
      // Ignore malformed invalidation metadata. REST remains authoritative.
    }
  };

  source.addEventListener("message", (event) => {
    handleMessage(event as MessageEvent<string>);
  });
  source.addEventListener("error", (event) => {
    onError?.(event);
  });

  return {
    close: () => source.close(),
  };
}
