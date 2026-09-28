import { describe, expect, test } from "bun:test";

import { useConductReportBoardStore } from "../../src/features/admin/conduct-report/conduct-report-board-store";

describe("Conduct Report board state", () => {
  test("opens on the Open Conduct Reports filter", () => {
    useConductReportBoardStore.getState().reset();
    expect(useConductReportBoardStore.getState().activeTab).toBe("open");
  });

  test("keeps filters, pagination, and sorting in one board state", () => {
    useConductReportBoardStore.getState().reset();
    useConductReportBoardStore.getState().setActiveTab("open");
    useConductReportBoardStore.getState().setPageNumber(4);
    useConductReportBoardStore.getState().sortBy("reported");

    expect(useConductReportBoardStore.getState()).toMatchObject({
      activeTab: "open",
      pageNumber: 1,
      sortKey: "reported",
      sortDirection: "ascending",
    });
  });
});
