import type { WalletStatus } from "../domain/rulebook";
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
