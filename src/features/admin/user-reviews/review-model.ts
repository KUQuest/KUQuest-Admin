import type { AdminReview, ReviewStatus } from "../data/admin-records";

export type ReviewFilter = "all" | Lowercase<ReviewStatus>;

export type ReviewQuery = {
  query: string;
  filter: ReviewFilter;
  rating: number | null;
};

export function filterReviews(reviews: AdminReview[], criteria: ReviewQuery): AdminReview[] {
  const query = criteria.query.trim().toLowerCase();
  return reviews.filter((review) => {
    const matchesFilter = criteria.filter === "all" || review.status.toLowerCase() === criteria.filter;
    const matchesRating = criteria.rating === null || review.rating === criteria.rating;
    const searchable = `${review.reviewer} ${review.review} ${review.status}`.toLowerCase();
    return matchesFilter && matchesRating && (!query || searchable.includes(query));
  });
}

export function changeReviewVisibility(
  reviews: AdminReview[],
  reviewIndex: number,
): AdminReview[] {
  return reviews.map((review, index) => {
    if (index !== reviewIndex) return review;
    if (review.status === "Hidden") {
      const { statusBeforeHidden, toneBeforeHidden, ...restored } = review;
      return {
        ...restored,
        status: statusBeforeHidden || "Visible",
        tone: toneBeforeHidden || "success",
      };
    }
    return {
      ...review,
      statusBeforeHidden: review.status,
      toneBeforeHidden: review.tone,
      status: "Hidden",
      tone: "neutral",
    };
  });
}

export function hasValidRemovalReason(reason: string): boolean {
  return reason.trim().length >= 8;
}

export function removeReview(
  reviews: AdminReview[],
  reviewIndex: number,
): { reviews: AdminReview[]; removed: AdminReview | undefined } {
  if (reviewIndex < 0 || reviewIndex >= reviews.length)
    return { reviews, removed: undefined };
  return {
    reviews: reviews.filter((_, index) => index !== reviewIndex),
    removed: reviews[reviewIndex],
  };
}
