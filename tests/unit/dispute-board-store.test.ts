import { beforeEach, describe, expect, it } from "bun:test";

import { useDisputeBoardStore } from "../../src/features/admin/dispute/dispute-board-store";

describe("Dispute Case board state", () => {
  beforeEach(() => {
    useDisputeBoardStore.getState().reset();
  });

  it("opens on the Open Dispute Cases filter", () => {
    expect(useDisputeBoardStore.getState().activeTab).toBe("open");
  });

  it("keeps filters, pagination, and sorting in one board state", () => {
    const store = useDisputeBoardStore.getState();

    store.setActiveTab("resolved");
    store.setQuery("DSP-5201");
    store.setPageSize(25);
    store.setPageNumber(2);
    store.sortBy("amount");

    expect(useDisputeBoardStore.getState()).toMatchObject({
      activeTab: "resolved",
      query: "DSP-5201",
      pageSize: 25,
      pageNumber: 1,
      sortKey: "amount",
      sortDirection: "ascending",
    });
  });
});
