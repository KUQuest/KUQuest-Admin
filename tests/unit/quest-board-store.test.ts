import { describe, expect, test } from "bun:test";

import { useQuestBoardStore } from "../../src/features/admin/quest/quest-board-store";

describe("quest board store", () => {
  test("resets search, tab, pagination, and sort together", () => {
    const store = useQuestBoardStore.getState();
    store.setSearch("failed");
    store.setTab("QUEST_FAILED");
    store.setPageSize(25);
    store.setPageNumber(3);
    store.sortBy("title");

    expect(useQuestBoardStore.getState()).toMatchObject({
      search: "failed",
      tab: "QUEST_FAILED",
      pageSize: 25,
      pageNumber: 1,
      sortKey: "title",
      sortDirection: "ascending",
    });

    store.reset();
    expect(useQuestBoardStore.getState()).toMatchObject({
      search: "",
      tab: "all",
      pageSize: 10,
      pageNumber: 1,
      sortKey: "createdAt",
      sortDirection: "descending",
    });
  });
});
