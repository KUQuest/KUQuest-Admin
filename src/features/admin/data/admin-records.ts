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
};
