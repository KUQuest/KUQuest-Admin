import { describe, expect, it } from "bun:test";

import { filterReviews } from "../../src/features/admin/user-reviews/review-model";
import type { AdminReview } from "../../src/features/admin/data/admin-records";

const reviews: AdminReview[] = [
  {
    reviewer: "Fah Lertwiroj",
    rating: 5,
    review: "Reliable evidence submission.",
    date: "1 week ago",
    reports: 0,
    status: "Visible",
    tone: "success",
  },
  {
    reviewer: "Gunn Maneewan",
    rating: 3,
    review: "Delivery needs follow-up.",
    date: "2 weeks ago",
    reports: 1,
    status: "Reported",
    tone: "warning",
  },
];

describe("Member Review model", () => {
  it("filters Reviews by search text, status, and rating", () => {
    expect(filterReviews(reviews, { query: "gunn", filter: "all", rating: null })).toEqual([
      reviews[1],
    ]);
    expect(filterReviews(reviews, { query: "", filter: "reported", rating: 3 })).toEqual([
      reviews[1],
    ]);
  });
});
