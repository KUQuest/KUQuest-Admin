import { describe, expect, test } from "bun:test";

import { useActivityLogBoardStore } from "../../src/features/admin/activity-log/activity-log-board-store";

describe("Activity Log board state", () => {
  test("keeps applied filters, pagination, and sorting in one board state", () => {
    useActivityLogBoardStore.getState().reset();
    useActivityLogBoardStore.getState().setDraftFilters({ action: "  QUEST_HIDDEN  " });
    useActivityLogBoardStore.getState().applyFilters();
    useActivityLogBoardStore.getState().setPageNumber(3);
    useActivityLogBoardStore.getState().sortBy("actor");

    expect(useActivityLogBoardStore.getState()).toMatchObject({
      appliedFilters: { action: "QUEST_HIDDEN" },
      pageNumber: 1,
      sortKey: "actor",
      sortDirection: "ascending",
    });
  });
});
