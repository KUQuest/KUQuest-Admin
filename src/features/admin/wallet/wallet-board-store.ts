import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import { toggleBoardSort, type BoardSortDirection } from "../data/board-sorting";
import type { WalletBoardTab, WalletSortKey, WalletSortSelection } from "./wallet-model";

type WalletBoardState = {
  search: string;
  tab: WalletBoardTab;
  pageSize: AdminBoardPageSize;
  pageNumber: number;
  sortKey: WalletSortSelection;
  sortDirection: BoardSortDirection;
  setSearch: (search: string) => void;
  setTab: (tab: WalletBoardTab) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPageNumber: (pageNumber: number) => void;
  sortBy: (sortKey: WalletSortKey) => void;
  reset: () => void;
};

const initialWalletBoardState = {
  search: "",
  tab: "all" as WalletBoardTab,
  pageSize: 10 as AdminBoardPageSize,
  pageNumber: 1,
  sortKey: null as WalletSortSelection,
  sortDirection: "ascending" as BoardSortDirection,
};

export const useWalletBoardStore = create<WalletBoardState>((set) => ({
  ...initialWalletBoardState,
  setSearch: (search) => set({ search, pageNumber: 1 }),
  setTab: (tab) => set({ tab, pageNumber: 1 }),
  setPageSize: (pageSize) => set({ pageSize, pageNumber: 1 }),
  setPageNumber: (pageNumber) => set({ pageNumber: Math.max(1, pageNumber) }),
  sortBy: (sortKey) => set((state) => ({
    pageNumber: 1,
    sortKey,
    sortDirection: toggleBoardSort(state.sortKey, sortKey, state.sortDirection),
  })),
  reset: () => set(initialWalletBoardState),
}));
