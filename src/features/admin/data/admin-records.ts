export type ReviewStatus = "Visible" | "Reported" | "Hidden";
export type ReviewTone = "success" | "warning" | "neutral";

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

export type AdminUser = {
  id: string;
  title: string;
  reviews?: AdminReview[];
  [key: string]: unknown;
};

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
