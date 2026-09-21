import type { ConductReportStatus, DisputeCaseStatus, ReportCaseStatus, WalletStatus } from "../domain/rulebook";

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

export type AdminOverviewQueue = {
  count: number;
  state: "OPEN" | "CLEAR";
  oldest: {
    id: string;
    title: string;
    createdAt: string;
  } | null;
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
    byStatus?: Record<string, number>;
  };
  reports?: {
    open: number;
  };
  conductReports?: {
    open: number;
  };
  wallets?: {
    byStatus: Record<string, number>;
  };
  queues?: {
    payouts?: AdminOverviewQueue;
    disputes?: AdminOverviewQueue;
    reports?: AdminOverviewQueue;
    conductReports?: AdminOverviewQueue;
  };
};

export type AdminApiRequestOptions = Pick<RequestInit, "headers">;

export type AdminFinanceOverview = {
  platformBalances: {
    revenueSatang: number;
    suspenseSatang: number;
  };
  memberBalancesSummary: {
    totalSpendingSatang: number;
    totalEarningsSatang: number;
    totalFundingReservedSatang: number;
    totalPayoutReservedSatang: number;
    totalCirculatingSatang: number;
  };
  volumeLifetime: {
    totalTopUpDepositedSatang: number;
    totalPayoutCompletedSatang: number;
    totalPlatformFeesEarnedSatang: number;
  };
  integrity: {
    subledgerBalanced: boolean;
    totalPostingsDiscrepancySatang: number;
    lastAuditedAt: string;
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

export type AdminMemberFinance = {
  member: {
    userId: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    email: string;
  };
  wallet: {
    id: string;
    walletStatus: string;
    spendingBalanceSatang: number;
    earningsBalanceSatang: number;
    fundingReservedSatang: number;
    reservedForPayoutsSatang: number;
    projectionMatchesLedger: boolean;
  } | null;
  lifetimeStats: {
    totalToppedUpSatang: number;
    totalEarnedFromQuestsSatang: number;
    totalSpentOnQuestsSatang: number;
    totalPaidOutSatang: number;
    totalEarningsConvertedSatang: number;
  };
  activeFundingReservations: Array<{
    id: string;
    callerReference: string;
    totalReservedSatang: number;
    remainingSatang: number;
    createdAt: string;
  }>;
};

export type AdminWallet = {
  id: string;
  userId: string;
  /**
   * The Wallet API normally embeds its Member. Keep this nullable at the
   * Admin client boundary so one Wallet with a missing Member association
   * cannot break the whole board.
   */
  member?: {
    firstName: string;
    lastName: string;
    studentId: string | null;
    email: string;
    telephone: string | null;
  } | null;
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

export const ADMIN_API_TOP_UP_STATUSES = ["PENDING", "PAID", "EXPIRED", "FAILED"] as const;
export type AdminApiTopUpStatus = (typeof ADMIN_API_TOP_UP_STATUSES)[number];

export type AdminTopUpListItem = {
  id: string;
  userId: string;
  member: {
    firstName: string;
    lastName: string;
    studentId: string | null;
  };
  topUpStatus: AdminApiTopUpStatus;
  creditAmountSatang: number;
  providerFeeSatang: number;
  providerTaxSatang: number;
  paymentTotalSatang: number;
  paymentMethod: string;
  providerReference: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
};

export type AdminTopUpDetail = {
  id: string;
  internalReference: string;
  principalUserId: string;
  quoteId: string;
  provider: string;
  providerReference: string | null;
  providerApiVersion: string | null;
  providerStatus: string | null;
  providerAmountSatang: number | null;
  providerChannelCode: string | null;
  creditSatang: number;
  chargedFeeSatang: number;
  chargedTaxSatang: number;
  paymentTotalSatang: number;
  providerFeeSatang: number;
  providerTaxSatang: number;
  providerTotalSatang: number;
  qrPayload: string | null;
  qrDataUrl: string | null;
  qrExpiresAt: string | null;
  topUpStatus: AdminApiTopUpStatus;
  creditedLedgerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  simulated?: boolean;
  callbackReceived?: boolean;
  reconciliationUsed?: boolean;
};

export type AdminTopUpReconcileResult = {
  topUp: AdminTopUpDetail;
};

export type AdminTopUpProviderEvent = {
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

export type AdminTopUpProviderEventResult = {
  event: AdminTopUpProviderEvent;
};

export type AdminTopUpListQuery = {
  status?: AdminApiTopUpStatus;
  userId?: string;
  limit?: number;
  cursor?: string;
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

