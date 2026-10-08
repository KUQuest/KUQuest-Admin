import { z } from "zod";

import { CONDUCT_REPORT_STATUSES, REPORT_CASE_STATUSES } from "../domain/rulebook";
import { ADMIN_API_PAYOUT_STATUSES } from "./admin-api-types-payout";
import { ADMIN_API_QUEST_STATUSES } from "./admin-api-types-quest";

const dateTime = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
});
const memberDisplayId = z.string().regex(/^MEM-[0-9]{6,}$/);
const questDisplayId = z.string().regex(/^QST-[0-9]{6,}$/);
const totalCount = z.number().int().nonnegative();
const cursor = z.string().min(1).nullable();
const memberIdentity = z.object({ displayId: memberDisplayId }).passthrough();

export type AdminMemberProfileCollectionQuery = {
  limit?: number;
  cursor?: string;
};

export const adminMemberHistoryRoleSchema = z.enum(["HIRER", "WORKER"]);
export type AdminMemberHistoryRole = z.infer<typeof adminMemberHistoryRoleSchema>;
export const adminMemberAssignmentStatusSchema = z.enum([
  "ASSIGNMENT_ACTIVE",
  "ASSIGNMENT_COMPLETED",
  "ASSIGNMENT_INCOMPLETE",
  "ASSIGNMENT_CANCELLED",
]);
export type AdminMemberAssignmentStatus = z.infer<typeof adminMemberAssignmentStatusSchema>;

export type AdminMemberHistoryQuery = {
  role?: AdminMemberHistoryRole;
  questStatus?: (typeof ADMIN_API_QUEST_STATUSES)[number];
  assignmentStatus?: AdminMemberAssignmentStatus;
  limit?: number;
  cursor?: string;
};

export const adminMemberProfileTagsSchema = z.object({
  member: memberIdentity,
  tags: z.array(z.object({ name: z.string().min(1) }).passthrough()).max(3),
}).passthrough();
export type AdminMemberProfileTags = z.infer<typeof adminMemberProfileTagsSchema>;

export const adminMemberWorkExperienceSchema = z.object({
  title: z.string(),
  employmentType: z.string(),
  organization: z.string().nullable(),
  description: z.string().nullable(),
  startedAt: dateOnly,
  endedAt: dateOnly.nullable(),
}).passthrough();
export type AdminMemberWorkExperience = z.infer<typeof adminMemberWorkExperienceSchema>;

export const adminMemberWorkExperiencesSchema = z.object({
  member: memberIdentity,
  items: z.array(adminMemberWorkExperienceSchema),
  totalCount,
  nextCursor: cursor,
}).passthrough();
export type AdminMemberWorkExperiences = z.infer<typeof adminMemberWorkExperiencesSchema>;

export const adminMemberCertificateSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  issuedAt: dateOnly,
  image: z.object({
    contentType: z.string(),
    sizeBytes: z.number().int().nonnegative(),
  }).passthrough().nullable(),
}).passthrough();
export type AdminMemberCertificate = z.infer<typeof adminMemberCertificateSchema>;

export const adminMemberCertificatesSchema = z.object({
  member: memberIdentity,
  items: z.array(adminMemberCertificateSchema),
  totalCount,
  nextCursor: cursor,
}).passthrough();
export type AdminMemberCertificates = z.infer<typeof adminMemberCertificatesSchema>;

const historyRelatedMemberSchema = z.object({
  role: adminMemberHistoryRoleSchema,
  member: z.object({
    id: z.string().min(1),
    displayId: memberDisplayId,
    firstName: z.string(),
    lastName: z.string(),
  }).passthrough(),
  assignmentStatus: adminMemberAssignmentStatusSchema.nullable(),
  assignmentCreatedAt: dateTime.nullable(),
  startedAt: dateTime.nullable(),
  assignmentStatusChangedAt: dateTime.nullable(),
}).passthrough();

export const adminMemberHistoryItemSchema = z.object({
  role: adminMemberHistoryRoleSchema,
  createdAt: dateTime,
  assignmentStatus: adminMemberAssignmentStatusSchema.nullable(),
  startedAt: dateTime.nullable(),
  assignmentStatusChangedAt: dateTime.nullable(),
  quest: z.object({
    id: z.string().min(1),
    displayId: questDisplayId,
    title: z.string(),
    questStatus: z.enum(ADMIN_API_QUEST_STATUSES),
    createdAt: dateTime,
    questStatusChangedAt: dateTime.nullable(),
  }).passthrough(),
  relatedMembers: z.array(historyRelatedMemberSchema),
}).passthrough();
export type AdminMemberHistoryItem = z.infer<typeof adminMemberHistoryItemSchema>;

export const adminMemberHistorySchema = z.object({
  member: memberIdentity,
  items: z.array(adminMemberHistoryItemSchema),
  totalCount,
  nextCursor: cursor,
}).passthrough();
export type AdminMemberHistory = z.infer<typeof adminMemberHistorySchema>;

export const adminMemberReviewSchema = z.object({
  id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  reviewer: z.object({ displayId: memberDisplayId, name: z.string() }).passthrough(),
  quest: z.object({ displayId: questDisplayId, title: z.string(), questStatus: z.string() }).passthrough(),
}).passthrough();
export type AdminMemberReview = z.infer<typeof adminMemberReviewSchema>;

export const adminMemberReviewsSchema = z.object({
  items: z.array(adminMemberReviewSchema),
  nextCursor: cursor,
  totalCount,
}).passthrough();
export type AdminMemberReviews = z.infer<typeof adminMemberReviewsSchema>;

export const adminMemberPenaltyResultSchema = z.enum([
  "PENALTY_EXEMPT",
  "PENALTY_RED_FLAG",
  "PENALTY_TEMPORARY_BAN_7_DAYS",
  "PENALTY_TEMPORARY_BAN_1_MONTH",
  "PENALTY_PERMANENT_BAN",
  "PENALTY_REVERSAL",
]);
export type AdminMemberPenaltyResult = z.infer<typeof adminMemberPenaltyResultSchema>;

export const adminMemberPenaltyHistoryItemSchema = z.object({
  recordId: z.string().uuid(),
  ladder: z.enum(["MISCONDUCT", "REVIEW"]),
  source: z.enum(["REPORT_CASE", "CONDUCT_REPORT", "REVIEW_AVERAGE", "ADMIN"]),
  sourceDisplayId: z.string().regex(/^(RPT|CND|QST)-[0-9]{6,}$/).nullable(),
  sequenceNumber: z.number().int().positive(),
  result: adminMemberPenaltyResultSchema,
  actor: z.object({ type: z.enum(["ADMIN", "SYSTEM"]), displayName: z.string() }).passthrough(),
  reasonCode: z.string(),
  adminNote: z.string().nullable(),
  createdAt: dateTime,
  reviewRating: z.number().int().min(1).max(5).nullable(),
  isEffective: z.boolean(),
  isEffectiveActiveMisconductPenalty: z.boolean(),
  reversal: z.object({
    relation: z.enum(["REVERSAL_OF", "REVERSED_BY"]),
    sequenceNumber: z.number().int().positive(),
    result: adminMemberPenaltyResultSchema,
    createdAt: dateTime,
  }).passthrough().nullable(),
  recalculatedFrom: z.object({
    sequenceNumber: z.number().int().positive(),
    result: adminMemberPenaltyResultSchema,
    createdAt: dateTime,
  }).passthrough().nullable(),
  replacedBy: z.object({
    sequenceNumber: z.number().int().positive(),
    result: adminMemberPenaltyResultSchema,
    createdAt: dateTime,
  }).passthrough().nullable(),
}).passthrough();
export type AdminMemberPenaltyHistoryItem = z.infer<typeof adminMemberPenaltyHistoryItemSchema>;

export const adminMemberPenaltyHistorySchema = z.object({
  member: memberIdentity,
  confirmedMisconductCount: totalCount,
  effectiveActiveMisconductPenaltyCount: totalCount,
  reviewLadderRecordCount: totalCount,
  versionToken: totalCount,
  items: z.array(adminMemberPenaltyHistoryItemSchema),
  totalCount,
  nextCursor: cursor,
}).passthrough();
export type AdminMemberPenaltyHistory = z.infer<typeof adminMemberPenaltyHistorySchema>;

const reportCaseStatusSchema = z.enum(REPORT_CASE_STATUSES);
const conductReportStatusSchema = z.enum(CONDUCT_REPORT_STATUSES);
const memberSummarySchema = z.object({
  id: z.string().min(1),
  displayId: memberDisplayId,
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  studentId: z.string().nullable(),
}).passthrough();
const reportMemberSchema = memberSummarySchema;
const reportQuestSchema = z.object({
  id: z.string().min(1),
  displayId: questDisplayId,
  title: z.string(),
  questStatus: z.string(),
  mode: z.string(),
  participation: z.string(),
}).passthrough();
const reportEntrySchema = z.object({
  id: z.string().min(1),
  reporterMemberId: z.string().min(1),
  reporter: reportMemberSchema,
  reason: z.string(),
  detail: z.string().nullable(),
  createdAt: dateTime,
}).passthrough();

const memberReportCaseSchema = z.object({
  kind: z.literal("REPORT_CASE"),
  id: z.string().min(1),
  displayId: z.string().regex(/^RPT-[0-9]{6,}$/),
  status: reportCaseStatusSchema,
  reportedMember: reportMemberSchema.nullable(),
  quest: reportQuestSchema.nullable(),
  reporterEntries: z.array(reportEntrySchema),
  createdAt: dateTime,
}).passthrough();
const memberConductReportSchema = z.object({
  kind: z.literal("CONDUCT_REPORT"),
  id: z.string().min(1),
  displayId: z.string().regex(/^CND-[0-9]{6,}$/),
  filer: reportMemberSchema,
  reportedMember: reportMemberSchema,
  quest: reportQuestSchema,
  reason: z.string(),
  detail: z.string().nullable(),
  status: conductReportStatusSchema,
  createdAt: dateTime,
}).passthrough();

export const adminMemberReportSchema = z.discriminatedUnion("kind", [
  memberReportCaseSchema,
  memberConductReportSchema,
]);
export type AdminMemberReport = z.infer<typeof adminMemberReportSchema>;

const adminMemberReportCountsSchema = z.object({
  REPORT_CASE_PENDING: totalCount,
  REPORT_CASE_DISMISSED: totalCount,
  REPORT_CASE_HIDDEN: totalCount,
  REPORT_CASE_RESTORED: totalCount,
  CONDUCT_REPORT_PENDING: totalCount,
  CONDUCT_REPORT_UPHELD: totalCount,
  CONDUCT_REPORT_DISMISSED: totalCount,
}).passthrough();

export const adminMemberReportsSchema = z.object({
  items: z.array(adminMemberReportSchema),
  nextCursor: cursor,
  totalCount,
  countsByStatus: adminMemberReportCountsSchema,
}).passthrough();
export type AdminMemberReportCounts = z.infer<typeof adminMemberReportCountsSchema>;
export type AdminMemberReports = z.infer<typeof adminMemberReportsSchema>;

const memberPayoutStudentSchema = memberSummarySchema;
const memberPayoutSchema = z.object({
  id: z.string().min(1),
  displayId: z.string().min(1),
  student: memberPayoutStudentSchema,
  quoteId: z.string().min(1),
  receiptSatang: z.number().int().positive(),
  principalSatang: z.number().int().positive(),
  maximumFeeSatang: z.number().int().nonnegative(),
  maximumTaxSatang: z.number().int().nonnegative(),
  maximumDebitSatang: z.number().int().positive(),
  actualFeeSatang: z.number().int().nonnegative().nullable(),
  actualTaxSatang: z.number().int().nonnegative().nullable(),
  actualDebitSatang: z.number().int().positive().nullable(),
  bankCode: z.string(),
  bankName: z.string(),
  destinationType: z.string(),
  maskedDestinationValue: z.string(),
  maskedRoutingValue: z.string(),
  providerReference: z.string().nullable(),
  providerStatus: z.string().nullable(),
  payoutStatus: z.enum(ADMIN_API_PAYOUT_STATUSES),
  cancellationReasonCode: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: dateTime,
  updatedAt: dateTime,
}).passthrough();
export type AdminMemberPayout = z.infer<typeof memberPayoutSchema>;

export const adminMemberPayoutsSchema = z.object({
  items: z.array(memberPayoutSchema),
  nextCursor: cursor,
  totalCount,
}).passthrough();
export type AdminMemberPayouts = z.infer<typeof adminMemberPayoutsSchema>;
