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
