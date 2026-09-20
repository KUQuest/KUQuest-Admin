import { describe, expect, test } from "bun:test";

import { useReportBoardStore } from "../../src/features/admin/report/report-board-store";

describe("Report Case board state", () => {
  test("keeps filters, pagination, and sorting in one board state", () => {
    useReportBoardStore.getState().reset();
    useReportBoardStore.getState().setQuery("member");
    useReportBoardStore.getState().setPageNumber(3);
    useReportBoardStore.getState().sortBy("reported");
    useReportBoardStore.getState().sortBy("reported");

    expect(useReportBoardStore.getState()).toMatchObject({
      activeTab: "all",
      query: "member",
      pageNumber: 1,
      sortKey: "reported",
      sortDirection: "descending",
    });
  });
});
