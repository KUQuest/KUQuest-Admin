import { z } from "zod";
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
  status?: AdminApiPayoutStatus | "ALL";
  userId?: string;
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
  limit?: number;
  cursor?: string;
  sort?: "newest" | "oldest";
};

export type AdminReportListQuery = {
  kind?: "REPORT_CASE" | "CONDUCT_REPORT";
  status?: ReportCaseStatus | ConductReportStatus;
  statusMode?: "OPEN_QUEUE" | "FULL_HISTORY";
  memberId?: string;
  submittedByMemberId?: string;
  questId?: string;
  limit?: number;
  cursor?: string;
  sort?: "newest" | "oldest";
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

const ledgerDateTimeSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)));

export const adminLedgerPostingSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  accountType: z.string(),
  walletId: z.string().min(1).nullable(),
  amountSatang: z.number().int(),
  member: z.object({
    userId: z.string().min(1),
    firstName: z.string(),
    lastName: z.string(),
    studentId: z.string().nullable(),
  }).passthrough().nullable(),
}).passthrough();
export type AdminLedgerPosting = z.infer<typeof adminLedgerPostingSchema>;

export const adminLedgerTransactionSchema = z.object({
  id: z.string().min(1),
  displayReference: z.string().min(1),
  businessReference: z.string(),
  eventType: z.enum(ADMIN_LEDGER_EVENT_TYPES),
  description: z.string().nullable(),
  createdByUserId: z.string().min(1).nullable(),
  correctionOfTransactionId: z.string().min(1).nullable(),
  createdAt: ledgerDateTimeSchema,
  sealedAt: ledgerDateTimeSchema.nullable(),
  isBalanced: z.boolean(),
  postings: z.array(adminLedgerPostingSchema),
}).passthrough();
export type AdminLedgerTransaction = z.infer<typeof adminLedgerTransactionSchema>;

export const adminLedgerTransactionsPageSchema = z.object({
  items: z.array(adminLedgerTransactionSchema),
  nextCursor: z.string().min(1).nullable(),
}).passthrough();


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
