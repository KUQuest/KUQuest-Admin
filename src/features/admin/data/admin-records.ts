import { z } from "zod";

export type ReviewStatus = "Visible" | "Reported" | "Hidden";
export type ReviewTone = "success" | "warning" | "neutral";

const reviewStatusSchema = z.enum(["Visible", "Reported", "Hidden"]);
const reviewToneSchema = z.enum(["success", "warning", "neutral"]);

export type AdminReview = {
  reviewer: string;
  rating: number;
  review: string;
  date: string;
  reports: number;
  status: ReviewStatus;
  tone: ReviewTone;
  statusBeforeHidden?: ReviewStatus;
  toneBeforeHidden?: ReviewTone;
};

export const adminReviewSchema: z.ZodType<AdminReview> = z.object({
  reviewer: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  review: z.string(),
  date: z.string(),
  reports: z.number().int().nonnegative(),
  status: reviewStatusSchema,
  tone: reviewToneSchema,
  statusBeforeHidden: reviewStatusSchema.optional(),
  toneBeforeHidden: reviewToneSchema.optional(),
});

export type AdminUser = {
  id: string;
  title: string;
  reviews?: AdminReview[];
  [key: string]: unknown;
};

export const adminUserSchema: z.ZodType<AdminUser> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  reviews: z.array(adminReviewSchema).optional(),
}).catchall(z.unknown());

export const adminRecordSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.string(),
  z.unknown(),
);

export type AdminCollections = {
  users: AdminUser[];
  quests: unknown[];
  payouts: unknown[];
  disputes: unknown[];
  reports: unknown[];
  [key: string]: unknown[];
};

export type PersistedAdminData = {
  version: string;
  collections: AdminCollections;
};

export const persistedAdminDataSchema: z.ZodType<PersistedAdminData> = z.object({
  version: z.string().min(1),
  collections: z.object({
    users: z.array(adminUserSchema),
    quests: z.array(adminRecordSchema),
    payouts: z.array(adminRecordSchema),
    disputes: z.array(adminRecordSchema),
    reports: z.array(adminRecordSchema),
  }).catchall(z.array(z.unknown())),
});

export const reportSubmissionSchema = z.object({
  reporterId: z.string().min(1),
  reporterName: z.string().min(1),
  reportedUserId: z.string().min(1),
  reportedUserName: z.string().min(1),
  category: z.string().trim().min(1).max(100),
  details: z.string().trim().min(20).max(500),
  evidence: z.array(z.string().min(1)).max(10),
});

export type ReportSubmission = z.infer<typeof reportSubmissionSchema>;
