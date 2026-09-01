import { apiRequest, getApiUrl } from "../../../lib/api/client";
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
  authAdmin: AdminIdentity;
  session: {
    id: string;
    expiresAt: string;
  };
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

export type AdminQuest = {
  id: string;
  title: string;
  questState: QuestState;
  hiddenAt: string | null;
  hiddenByAdminId: string | null;
  fundingTotalSatang?: number;
  questRewardSatang?: number;
  platformFeeSatang?: number;
  platformFeeBps?: number;
  feeRoundingMode?: "UP";
  version?: number;
  [key: string]: unknown;
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
  payoutStatus: PayoutStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  version?: number;
};

export type AdminPayoutHistoryEntry = {
  id: string;
  fromStatus: PayoutStatus | null;
  toStatus: PayoutStatus;
  providerStatus: string | null;
  actorUserId: string | null;
  actorAdminId: string | null;
  source: string;
  reason: string | null;
  occurredAt: string;
};

export type AdminPayoutDetail = AdminPayout & {
  history: AdminPayoutHistoryEntry[];
};

export type AdminPayoutListQuery = {
  status?: PayoutStatus;
  query?: string;
  limit?: number;
  cursor?: string;
  sort?: "newest" | "oldest";
};

export type AdminQuestListQuery = {
  questState?: QuestState;
  hidden?: boolean;
  query?: string;
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

export type QuestHideCommand = AdminCommandOptions & {
  reason: string;
};
export type QuestRestoreCommand = AdminCommandOptions;
export type QuestTerminateCommand = AdminCommandOptions & {
  reason: string;
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

function commandBody<T extends AdminCommandOptions>(options: T): Omit<T, "idempotencyKey"> {
  const { idempotencyKey: _idempotencyKey, ...body } = options;
  return body;
}

export const adminApi = {
  signInEmail(email: string, password: string): Promise<AdminAuthSession> {
    return apiRequest<AdminAuthSession>("/api/auth/admin/sign-in/email", {
      method: "POST",
      body: { email, password },
    });
  },

  signOut(): Promise<null> {
    return apiRequest<null | undefined>("/api/auth/admin/sign-out", {
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

  getQuest(questId: string): Promise<AdminQuest> {
    return apiRequest<AdminQuest>(
      `/api/v1/admin/quests/${encode(questId)}`,
      { cache: "no-store" },
    );
  },

  hideQuest(questId: string, options: QuestHideCommand): Promise<AdminQuest> {
    return apiRequest<AdminQuest>(
      `/api/v1/admin/quests/${encode(questId)}/hide`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
      },
    );
  },

  restoreQuest(questId: string, options: QuestRestoreCommand): Promise<AdminQuest> {
    return apiRequest<AdminQuest>(
      `/api/v1/admin/quests/${encode(questId)}/restore`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
      },
    );
  },

  terminateQuest(questId: string, options: QuestTerminateCommand): Promise<AdminQuest> {
    return apiRequest<AdminQuest>(
      `/api/v1/admin/quests/${encode(questId)}/terminate`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
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

  resolveDispute(questId: string, options: DisputeResolution): Promise<AdminDisputeCase> {
    return apiRequest<AdminDisputeCase>(
      `/api/v1/admin/quests/${encode(questId)}/dispute/resolve`,
      {
        method: "POST",
        headers: commandHeaders(options),
        body: commandBody(options),
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
