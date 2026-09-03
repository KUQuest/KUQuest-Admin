import { describe, expect, it } from "bun:test";
import {
  matchingRows,
  paginateRows,
  resourceColumns,
  resetResourceState,
  resourceTabValue,
  resultCount,
  type ResourceState,
} from "../../src/features/admin/legacy/resource-controls-model";
import type { LegacyRecord, LegacyRuntimeData } from "../../src/features/admin/legacy/runtime";

type ResourceCollections = LegacyRuntimeData;

function createState(): ResourceState {
  return {
    tab: "all",
    query: "",
    questFilters: { mode: "all", status: "all" },
    filters: {},
    orderBy: Object.fromEntries(
      Object.keys(resourceColumns).map((view) => [view, null]),
    ),
    pagination: Object.fromEntries(
      Object.keys(resourceColumns).map((view) => [view, { page: 1, size: 10 }]),
    ),
  };
}

function createCollections(
  overrides: Partial<ResourceCollections> = {},
): ResourceCollections {
  return {
    disputes: [],
    quests: [],
    users: [],
    payouts: [],
    reports: [],
    ...overrides,
  };
}

function record(
  id: string,
  overrides: Partial<LegacyRecord> = {},
): LegacyRecord {
  return {
    id,
    title: id,
    person: "",
    other: "",
    status: "Open",
    tone: "neutral",
    amount: null,
    age: "",
    ...overrides,
  };
}

describe("active resource controls model", () => {
  it("uses Created At instead of Tag for Quest rows", () => {
    expect(resourceColumns.quests).toContainEqual(["createdAt", "Created At"]);
    expect(resourceColumns.quests).not.toContainEqual(["other", "Tag"]);
  });

  it("keeps canonical status values when visible tab labels are human-readable", () => {
    expect(resourceTabValue("quest_open")).toBe("QUEST_OPEN");
    expect(resourceTabValue("all")).toBe("All");
    expect(resourceTabValue("team")).toBe("Team");
  });

  it("keeps the original order until a column is selected", () => {
    const state = createState();
    const collections = createCollections({
      quests: [record("QST-3", { amount: 30 }), record("QST-1", { amount: 10 }), record("QST-2", { amount: 20 })],
    });

    expect(state.orderBy.quests).toBeNull();
    expect(matchingRows(collections, state, "quests").map((item) => item.id)).toEqual([
      "QST-3",
      "QST-1",
      "QST-2",
    ]);
  });

  it("sorts amounts numerically and keeps empty values at the bottom", () => {
    const state = createState();
    const collections = createCollections({
      quests: [
        record("QST-empty"),
        record("QST-20", { amount: 20 }),
        record("QST-10", { amount: 10 }),
      ],
    });
    state.orderBy.quests = "amount-asc";

    expect(matchingRows(collections, state, "quests").map((item) => item.id)).toEqual([
      "QST-10",
      "QST-20",
      "QST-empty",
    ]);

    state.orderBy.quests = "amount-desc";
    expect(matchingRows(collections, state, "quests").map((item) => item.id)).toEqual([
      "QST-20",
      "QST-10",
      "QST-empty",
    ]);
  });

  it("sorts dates chronologically and preserves equal-value order", () => {
    const state = createState();
    const collections = createCollections({
      disputes: [
        record("DSP-1", { status: "Active", disputeDate: "27 Aug 2026" }),
        record("DSP-2", { status: "Active", disputeDate: "25 Aug 2026" }),
        record("DSP-3", { status: "Active", disputeDate: "27 Aug 2026" }),
      ],
    });
    state.orderBy.disputes = "disputeDate-asc";

    expect(matchingRows(collections, state, "disputes").map((item) => item.id)).toEqual([
      "DSP-2",
      "DSP-1",
      "DSP-3",
    ]);
  });

  it("sorts Quest rows by creation time", () => {
    const state = createState();
    const collections = createCollections({
      quests: [
        record("QST-2", { createdAt: "2026-09-02T08:00:00Z" }),
        record("QST-1", { createdAt: "2026-09-01T08:00:00Z" }),
      ],
    });
    state.orderBy.quests = "createdAt-asc";

    expect(matchingRows(collections, state, "quests").map((item) => item.id)).toEqual([
      "QST-1",
      "QST-2",
    ]);
  });

  it("paginates rows and reports the selected page size", () => {
    const state = createState();
    const collections = createCollections({
      quests: Array.from({ length: 23 }, (_, index) =>
        record(`QST-${index + 1}`, { amount: index + 1 }),
      ),
    });
    const rows = matchingRows(collections, state, "quests");

    let page = paginateRows(state, "quests", rows);
    expect(resultCount(state, "quests", page)).toBe("Showing 1–10 of 23 results");
    expect(page.page).toBe(1);
    expect(page.pageCount).toBe(3);
    expect(page.rows).toHaveLength(10);

    state.pagination.quests.page = 2;
    page = paginateRows(state, "quests", rows);
    expect(resultCount(state, "quests", page)).toBe("Showing 11–20 of 23 results");

    state.pagination.quests = { page: 1, size: 25 };
    page = paginateRows(state, "quests", rows);
    expect(resultCount(state, "quests", page)).toBe("Showing 1–23 of 23 results");
    expect(page.rows).toHaveLength(23);

    state.pagination.quests = { page: 2, size: "all" };
    page = paginateRows(state, "quests", rows);
    expect(resultCount(state, "quests", page)).toBe("Showing all 23 results");
    expect(page.page).toBe(1);
  });

  it("returns an empty page when no rows match", () => {
    const state = createState();
    state.query = "missing";
    const rows = matchingRows(
      createCollections({ quests: [record("QST-1")] }),
      state,
      "quests",
    );
    const page = paginateRows(state, "quests", rows);

    expect(page.rows).toHaveLength(0);
    expect(resultCount(state, "quests", page)).toBe("Showing 0 of 0 results");
  });

  it("combines quest status and team or solo filters", () => {
    const state = createState();
    const collections = createCollections({
      quests: [
        record("QST-team-approved", { status: "Approved", teamQuest: true }),
        record("QST-solo-approved", { status: "Approved", teamQuest: false }),
        record("QST-team-open", { teamQuest: true }),
        record("QST-solo-open", { teamQuest: false }),
      ],
    });
    state.questFilters = { mode: "team", status: "Approved" };

    expect(matchingRows(collections, state, "quests").map((item) => item.id)).toEqual([
      "QST-team-approved",
    ]);

    state.questFilters = { mode: "solo", status: "Approved" };
    expect(matchingRows(collections, state, "quests").map((item) => item.id)).toEqual([
      "QST-solo-approved",
    ]);
  });

  it("applies resource-specific status filters", () => {
    const state = createState();
    state.tab = "active";
    const collections = createCollections({
      disputes: [
        record("DSP-active", { status: "Active" }),
        record("DSP-closed", { status: "Closed" }),
      ],
    });

    expect(matchingRows(collections, state, "disputes").map((item) => item.id)).toEqual([
      "DSP-active",
    ]);
  });

  it("resets filters, sorting, and pagination to their defaults", () => {
    const state = createState();
    state.tab = "flag";
    state.query = "search term";
    state.questFilters = { mode: "team", status: "Approved" };
    state.filters.users = ["Red Flag"];
    state.orderBy.users = "status-desc";
    state.pagination.users = { page: 4, size: "all" };

    resetResourceState(state);

    expect(state.tab).toBe("all");
    expect(state.query).toBe("");
    expect(state.questFilters).toEqual({ mode: "all", status: "all" });
    expect(state.filters).toEqual({});
    expect(state.orderBy.users).toBeNull();
    expect(state.pagination.users).toEqual({ page: 1, size: 10 });
  });
});
