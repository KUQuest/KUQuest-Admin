import type { ConductReportStatus, DisputeCaseStatus, ReportCaseStatus, WalletStatus } from "../domain/rulebook";
import type { AdminApiPayoutStatus, AdminApiTopUpStatus } from "./admin-api-types-payout";
import type { AdminApiQuestStatus, AdminQuestMode, AdminQuestParticipation } from "./admin-api-types-quest";
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

