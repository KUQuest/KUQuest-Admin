import { describe, expect, it } from "bun:test";

import {
  changeReviewVisibility,
  filterReviews,
  hasValidRemovalReason,
  removeReview,
} from "../../src/features/admin/user-reviews/review-model";
import {
  ADMIN_DEMO_DATA_KEY,
  readUserReviews,
  saveUserReviews,
  type BrowserStorage,
} from "../../src/features/admin/data/legacy-admin-data-adapter";
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

function storageWith(value: unknown): BrowserStorage & { values: Record<string, string> } {
  const values: Record<string, string> = { [ADMIN_DEMO_DATA_KEY]: JSON.stringify(value) };
  return {
    values,
    getItem(key) {
      return values[key] || null;
    },
    setItem(key, nextValue) {
      values[key] = nextValue;
    },
  };
}

describe("user review model", () => {
  it("filters reviews by query, status, and rating", () => {
    expect(filterReviews(reviews, { query: "gunn", filter: "all", rating: null })).toEqual([
      reviews[1],
    ]);
    expect(filterReviews(reviews, { query: "", filter: "reported", rating: 3 })).toEqual([
      reviews[1],
    ]);
  });

  it("restores a review's original status after hiding it", () => {
    const hidden = changeReviewVisibility(reviews, 1);
    expect(hidden[1]).toMatchObject({
      status: "Hidden",
      tone: "neutral",
      statusBeforeHidden: "Reported",
      toneBeforeHidden: "warning",
    });

    const restored = changeReviewVisibility(hidden, 1);
    expect(restored[1]).toEqual(reviews[1]);
  });

  it("requires an audit reason before removing a review", () => {
    expect(hasValidRemovalReason("short")).toBe(false);
    expect(hasValidRemovalReason("Review contains inaccurate claims.")).toBe(true);
    expect(removeReview(reviews, 0)).toEqual({
      removed: reviews[0],
      reviews: [reviews[1]],
    });
  });
});

describe("legacy admin data adapter", () => {
  it("persists changed reviews without changing other stored collections", () => {
    const storage = storageWith({
      version: "demo",
      collections: {
        users: [{ id: "68000000", title: "Akarin Ariyawat", reviews }],
        quests: [{ id: "QST-12001" }],
        payouts: [],
        disputes: [],
        reports: [],
      },
    });

    expect(readUserReviews(storage, "68000000")).toEqual(reviews);
    expect(saveUserReviews(storage, "68000000", [reviews[1]])).toBe(true);
    expect(readUserReviews(storage, "68000000")).toEqual([reviews[1]]);
    expect(JSON.parse(storage.values[ADMIN_DEMO_DATA_KEY]).collections.quests).toEqual([
      { id: "QST-12001" },
    ]);
  });
});
