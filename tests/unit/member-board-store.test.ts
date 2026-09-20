import { describe, expect, test } from "bun:test";

import { useMemberBoardStore } from "../../src/features/admin/member/member-board-store";

describe("Member board state", () => {
  test("keeps filters, pagination, and sorting in one board state", () => {
    useMemberBoardStore.getState().reset();
    useMemberBoardStore.getState().setActiveTab("Flag");
    useMemberBoardStore.getState().setPageNumber(2);
    useMemberBoardStore.getState().sortBy("member");

    expect(useMemberBoardStore.getState()).toMatchObject({
      activeTab: "Flag",
      pageNumber: 1,
      sortKey: "member",
      sortDirection: "ascending",
    });
  });
});
