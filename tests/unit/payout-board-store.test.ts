import { beforeEach, describe, expect, it } from "bun:test";

import { usePayoutBoardStore } from "../../src/features/admin/payout/payout-board-store";

describe("Payout board state", () => {
  beforeEach(() => {
    usePayoutBoardStore.getState().reset();
  });

  it("keeps filters, page size, and sorting in one board state", () => {
    const store = usePayoutBoardStore.getState();

    store.setQuery("PAY-9700");
    store.setTab("all");
    store.setPageSize(25);
    store.setPage(2);
    store.sortBy("amount");

    expect(usePayoutBoardStore.getState()).toMatchObject({
      query: "PAY-9700",
      tab: "all",
      pageSize: 25,
      page: 1,
      sortKey: "amount",
      sortDirection: "ascending",
    });
  });

  it("resets pagination when a filter or sort changes", () => {
    const store = usePayoutBoardStore.getState();
    store.setPage(4);

    store.setQuery("student@ku.th");
    expect(usePayoutBoardStore.getState().page).toBe(1);

    store.setPage(3);
    store.setTab("FAILED");
    expect(usePayoutBoardStore.getState().page).toBe(1);

    store.setPage(2);
    store.sortBy("status");
    expect(usePayoutBoardStore.getState().page).toBe(1);
  });
});
