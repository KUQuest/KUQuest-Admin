import { describe, expect, test } from "bun:test";

import { useWalletBoardStore } from "../../src/features/admin/wallet/wallet-board-store";

describe("wallet board store", () => {
  test("resets filters, pagination, and sort together", () => {
    const store = useWalletBoardStore.getState();
    store.setSearch("WAL-1001");
    store.setTab("FROZEN");
    store.setPageSize(25);
    store.setPageNumber(3);
    store.sortBy("balance");

    expect(useWalletBoardStore.getState()).toMatchObject({
      search: "WAL-1001",
      tab: "FROZEN",
      pageSize: 25,
      pageNumber: 1,
      sortKey: "balance",
      sortDirection: "ascending",
    });

    store.reset();
    expect(useWalletBoardStore.getState()).toMatchObject({
      search: "",
      tab: "all",
      pageSize: 10,
      pageNumber: 1,
      sortKey: null,
      sortDirection: "ascending",
    });
  });
});
