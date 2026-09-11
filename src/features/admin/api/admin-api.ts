import { apiClient, apiRequest, getApiUrl } from "../../../lib/api/client";
import type {
  ConductReportStatus,
  DisputeCaseStatus,
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
  quests: {
    total: number;
    hidden: number;
    byState: Record<string, number>;
  };
  disputes: {
    total: number;
    awaitingResolution: number;
  };
  payouts: {
    pendingAdminApproval: number;
    inFlight: number;
  };
  members: {
    frozenWallets: number;
    suspendedWallets: number;
  };
};

export type AdminActivityLog = {
  id: string;
  admin: {
    id: string;
    firstName: string;
    lastName: string;
  };
  action: string;
  resourceType: string;
  resourceId: string;
  reasonCode: string | null;
  reasonCatalogVersion: number;
  resultVersion: number | null;
  resultTimestamp: string | null;
  createdAt: string;
};

export type AdminActivityListQuery = {
  action?: string;
  resourceType?: string;
  resourceId?: string;
  adminId?: string;
  limit?: number;
  cursor?: string;
  sort?: "newest" | "oldest";
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

export type AdminMemberWalletSummary = {
  id: string;
  walletStatus: WalletStatus;
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  totalBalanceSatang: number;
};

export type AdminMemberListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  telephone: string | null;
  academicYear: number | null;
  faculty: string | null;
  department: string | null;
  occupation: string | null;
  wallet: AdminMemberWalletSummary | null;
  createdAt: string;
};

export type AdminMemberDetail = {
  member: Omit<AdminMemberListItem, "wallet" | "createdAt"> & {
    bio: string | null;
    createdAt: string;
  };
  wallet: {
    id: string;
    walletStatus: WalletStatus;
    spendingBalanceSatang: number;
    earningsBalanceSatang: number;
    fundingReservedSatang: number;
    reservedForPayoutsSatang: number;
    totalBalanceSatang: number;
    projectionMatchesLedger: boolean;
  } | null;
  stats: {
    questsCreatedCount: number;
    questsCompletedAsWorkerCount: number;
    reviewsReceivedCount: number;
    averageRating: number | null;
    payoutsCount: number;
    totalEarnedSatang: number;
    totalPaidOutSatang: number;
  };
};

export type AdminWallet = {
  id: string;
  userId: string;
  member: {
    firstName: string;
    lastName: string;
    studentId: string | null;
    email: string;
    telephone: string | null;
  };
  walletStatus: WalletStatus;
  balances: {
    spendingBalanceSatang: number;
    earningsBalanceSatang: number;
    fundingReservedSatang: number;
    reservedForPayoutsSatang: number;
    totalBalanceSatang: number;
  };
  createdAt: string;
  updatedAt: string;
  latestTransactionAt?: string | null;
};

export type AdminWalletDetail = AdminWallet & {
  projectionMatchesLedger: boolean;
};

export type AdminWalletStatusHistoryEntry = {
  id: string;
  walletId: string;
  fromStatus: WalletStatus | null;
  toStatus: WalletStatus;
  reason: string;
  actorUserId: string | null;
  actorAdminId: string | null;
  createdAt: string;
};

export type AdminWalletStatusResult = {
  wallet: {
    spendingBalanceSatang: number;
    earningsBalanceSatang: number;
    fundingReservedSatang: number;
    reservedForPayoutsSatang: number;
    walletStatus: WalletStatus;
  };
};

export type AdminWalletBalanceSnapshot = {
  spendingBalanceSatang: number;
  earningsBalanceSatang: number;
  fundingReservedSatang: number;
  reservedForPayoutsSatang: number;
};

export type AdminWalletVerification = {
  matches: boolean;
  projected: AdminWalletBalanceSnapshot;
  ledger: AdminWalletBalanceSnapshot;
  activityCountMatches: boolean;
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
  cancellationReasonCode: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
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
  "SUBMITTED_TO_PROVIDER",
  "PROVIDER_PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type AdminApiPayoutStatus = (typeof ADMIN_API_PAYOUT_STATUSES)[number];

export type AdminPayoutDetail = AdminPayout & {
  history: AdminPayoutHistoryEntry[];
};

export type AdminPayoutCommandResult = {
  resourceSummary: AdminPayout;
  resourceVersion: number;
  adminActionId: string;
};

export type AdminPayoutReconciliation = {
  id: string;
  internalReference: string;
  principalUserId: string;
  quoteId: string;
  payoutDestinationId: string;
  destinationRecipientType: string;
  destinationGivenName: string;
  destinationSurname: string;
  destinationRelationship: string;
  destinationAccountCountry: string;
  destinationAccountCurrency: string;
  destinationBankCode: string;
  destinationAccountHolderName: string;
  destinationRoutingType: string;
  destinationMaskedLastFour: string;
  destinationMaskedRoutingValue: string;
  provider: string;
  providerReference: string | null;
  providerApiVersion: string | null;
  providerStatus: string | null;
  providerAmountSatang: number | null;
  principalSatang: number;
  receiptSatang: number;
  maximumFeeSatang: number;
  maximumTaxSatang: number;
  maximumDebitSatang: number;
  actualFeeSatang: number | null;
  actualTaxSatang: number | null;
  actualDebitSatang: number | null;
  payoutStatus: AdminApiPayoutStatus;
  version: number;
  reserveLedgerTransactionId: string;
  finalLedgerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPayoutReconcileResult = {
  payout: AdminPayoutReconciliation;
};

export type AdminPayoutProviderEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  resourceType: string;
  internalReference: string | null;
  providerReference: string | null;
  providerApiVersion: string | null;
  providerStatus: string;
  normalizedStatus: string;
  providerAmountSatang: number | null;
  actualFeeSatang: number | null;
  actualTaxSatang: number | null;
  actualDebitSatang: number | null;
  providerChannelCode: string | null;
  providerOccurredAt: string;
  payloadHash: string;
  rawPayloadAvailable: boolean;
  rawPayloadExpiresAt: string;
  processingStatus: string;
  attemptCount: number;
  claimedAt: string | null;
  processedAt: string | null;
  lastError: string | null;
  receivedAt: string;
  createdAt: string;
};

export type AdminPayoutProviderEventResult = {
  event: AdminPayoutProviderEvent;
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
  search?: string;
  walletStatus?: WalletStatus;
  limit?: number;
  cursor?: string;
};

export type AdminWalletListQuery = {
  status?: WalletStatus;
  userId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
};

export const ADMIN_LEDGER_EVENT_TYPES = [
  "TOP_UP",
  "PAYOUT",
  "FUNDING_RESERVE",
  "FUNDING_RELEASE",
  "FUNDING_SETTLEMENT",
  "ADJUSTMENT",
  "EARNINGS_CONVERSION",
] as const;
export type AdminLedgerEventType = (typeof ADMIN_LEDGER_EVENT_TYPES)[number];

export type AdminLedgerPosting = {
  id: string;
  accountId: string;
  accountType: string;
  walletId: string | null;
  amountSatang: number;
  member: {
    userId: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
  } | null;
};

export type AdminLedgerTransaction = {
  id: string;
  businessReference: string;
  eventType: AdminLedgerEventType;
  description: string | null;
  createdByUserId: string | null;
  correctionOfTransactionId: string | null;
  createdAt: string;
  sealedAt: string | null;
  isBalanced: boolean;
  postings: AdminLedgerPosting[];
};

export type AdminLedgerTransactionsQuery = {
  eventType?: AdminLedgerEventType;
  userId?: string;
  walletId?: string;
  businessReference?: string;
  from?: string;
  to?: string;
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

export type AdminDisputeReasonCode = "DISPUTE_POLICY_REVIEW" | "DISPUTE_EVIDENCE_REVIEW";

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
  reasonCode: "PAYOUT_POLICY_REVIEW" | "PAYOUT_RISK_REVIEW";
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

let overviewInFlight: Promise<AdminOverview> | null = null;
let overviewCache: { value: AdminOverview; expiresAt: number } | null = null;

function getOverview(): Promise<AdminOverview> {
  if (typeof window !== "undefined" && overviewCache && overviewCache.expiresAt > Date.now()) {
    return Promise.resolve(overviewCache.value);
  }
  if (overviewInFlight) return overviewInFlight;
  const request = apiRequest<AdminOverview>("/api/v1/admin/overview", {
    cache: "no-store",
  });
  const sharedRequest = request.then((value) => {
    if (typeof window !== "undefined") overviewCache = { value, expiresAt: Date.now() + 1000 };
    return value;
  }).finally(() => {
    if (overviewInFlight === sharedRequest) overviewInFlight = null;
  });
  overviewInFlight = sharedRequest;
  return sharedRequest;
}

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

function payoutCommandHeaders(options: PayoutApproval | PayoutRejection): HeadersInit {
  return {
    ...commandHeaders(options),
    "If-Match": String(options.expectedVersion),
  };
}

function commandBody<T extends AdminCommandOptions>(options: T): Omit<T, "idempotencyKey" | "expectedVersion"> {
  const { idempotencyKey: _idempotencyKey, expectedVersion: _expectedVersion, ...body } = options;
  return body;
}

function disputeCommandHeaders(options: DisputeResolution): HeadersInit {
  return {
    ...commandHeaders(options),
    "If-Match": String(options.expectedVersion),
  };
}

function disputeCommandBody(options: DisputeResolution): Pick<DisputeResolution, "outcome" | "reasonCode" | "workerId" | "amountSatang"> {
  return {
    outcome: options.outcome,
    reasonCode: options.reasonCode,
    ...(options.workerId ? { workerId: options.workerId } : {}),
    ...(options.amountSatang !== undefined ? { amountSatang: options.amountSatang } : {}),
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
    return getOverview();
  },

  listActivityLogs(
    query: AdminActivityListQuery = {},
  ): Promise<AdminPage<AdminActivityLog>> {
    return apiRequest<AdminPage<AdminActivityLog>>(
      `/api/v1/admin/activity-log${queryString(query)}`,
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

  getDispute(disputeId: string): Promise<AdminDisputeCaseDetail> {
    return apiRequest<AdminDisputeCaseDetail>(
      `/api/v1/admin/disputes/${encode(disputeId)}`,
      { cache: "no-store" },
    );
  },

  resolveDispute(disputeCaseId: string, options: DisputeResolution): Promise<AdminDisputeResolutionResult> {
    return apiRequest<AdminDisputeResolutionResult>(
      `/api/v1/admin/disputes/${encode(disputeCaseId)}/resolve`,
      {
        method: "POST",
        headers: disputeCommandHeaders(options),
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

  approvePayout(payoutId: string, options: PayoutApproval): Promise<AdminPayoutCommandResult> {
    return apiRequest<AdminPayoutCommandResult>(
      `/api/v1/admin/payouts/${encode(payoutId)}/approve`,
      {
        method: "POST",
        headers: payoutCommandHeaders(options),
        body: { reasonCode: options.reasonCode },
      },
    );
  },

  rejectPayout(payoutId: string, options: PayoutRejection): Promise<AdminPayoutCommandResult> {
    return apiRequest<AdminPayoutCommandResult>(
      `/api/v1/admin/payouts/${encode(payoutId)}/cancel`,
      {
        method: "POST",
        headers: payoutCommandHeaders(options),
        body: { reasonCode: options.reasonCode },
      },
    );
  },

  reconcilePayout(payoutId: string): Promise<AdminPayoutReconcileResult> {
    return apiRequest<AdminPayoutReconcileResult>(
      `/api/v1/admin/payouts/${encode(payoutId)}/reconcile`,
      { method: "POST" },
    );
  },

  retryPayoutProviderEvent(eventId: string): Promise<AdminPayoutProviderEventResult> {
    return apiRequest<AdminPayoutProviderEventResult>(
      `/api/v1/admin/payouts/events/${encode(eventId)}/retry`,
      { method: "POST" },
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

  getDisputeEvidence(
    disputeCaseId: string,
    options: AdminDisputeEvidenceRequest,
  ): Promise<AdminDisputeEvidence> {
    return apiRequest<AdminDisputeEvidence>(
      `/api/v1/admin/disputes/${encode(disputeCaseId)}/evidence`,
      {
        cache: "no-store",
        headers: commandHeaders(options),
      },
    );
  },

  listMembers(query: AdminMemberListQuery = {}): Promise<AdminPage<AdminMemberListItem>> {
    return apiRequest<AdminPage<AdminMemberListItem>>(
      `/api/v1/admin/members${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  getMember(memberId: string): Promise<AdminMemberDetail> {
    return apiRequest<AdminMemberDetail>(
      `/api/v1/admin/members/${encode(memberId)}`,
      { cache: "no-store" },
    );
  },

  listWallets(query: AdminWalletListQuery = {}): Promise<AdminPage<AdminWallet>> {
    return apiRequest<AdminPage<AdminWallet>>(
      `/api/v1/admin/wallets${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  listLedgerTransactions(
    query: AdminLedgerTransactionsQuery = {},
  ): Promise<AdminPage<AdminLedgerTransaction>> {
    return apiRequest<AdminPage<AdminLedgerTransaction>>(
      `/api/v1/admin/finance/ledger/transactions${queryString(query)}`,
      { cache: "no-store" },
    );
  },

  getWallet(walletId: string): Promise<{ wallet: AdminWalletDetail }> {
    return apiRequest<{ wallet: AdminWalletDetail }>(
      `/api/v1/admin/wallets/${encode(walletId)}`,
      { cache: "no-store" },
    );
  },

  getWalletStatusHistory(walletId: string): Promise<{ history: AdminWalletStatusHistoryEntry[] }> {
    return apiRequest<{ history: AdminWalletStatusHistoryEntry[] }>(
      `/api/v1/admin/wallets/${encode(walletId)}/status-history`,
      { cache: "no-store" },
    );
  },

  verifyWalletProjection(walletId: string): Promise<AdminWalletVerification> {
    return apiRequest<AdminWalletVerification>(
      `/api/v1/admin/wallets/${encode(walletId)}/verification`,
      { cache: "no-store" },
    );
  },

  setWalletStatus(walletId: string, options: WalletStatusCommand): Promise<AdminWalletStatusResult> {
    const toStatus = options.toStatus ?? options.status;
    if (!toStatus) throw new Error("Wallet status command requires a target status.");
    return apiRequest<AdminWalletStatusResult>(
      `/api/v1/admin/wallets/${encode(walletId)}/status`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: { toStatus, reason: options.reason },
      },
    );
  },

  rebuildWalletProjection(walletId: string): Promise<AdminWalletStatusResult> {
    return apiRequest<AdminWalletStatusResult>(
      `/api/v1/admin/wallets/${encode(walletId)}/rebuild-projection`,
      { method: "POST" },
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
  | "reconcilePayout"
  | "retryPayoutProviderEvent"
  | "listReports"
  | "getReport"
  | "getEvidence"
  | "getDisputeEvidence"
  | "listMembers"
  | "getMember"
  | "listWallets"
  | "getWallet"
  | "getWalletStatusHistory"
  | "verifyWalletProjection"
>;

export type AdminCommandPort = Pick<
  typeof adminApi,
  | "hideQuest"
  | "restoreQuest"
  | "terminateQuest"
  | "resolveDispute"
  | "approvePayout"
  | "rejectPayout"
  | "reconcilePayout"
  | "retryPayoutProviderEvent"
  | "decideReport"
  | "setWalletStatus"
  | "rebuildWalletProjection"
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
