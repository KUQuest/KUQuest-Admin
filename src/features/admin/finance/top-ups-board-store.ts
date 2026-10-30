import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import { toggleBoardSort, type BoardSortDirection } from "../data/board-sorting";
import type { TopUpBoardTab, TopUpSortKey } from "./top-ups-board-model";

type TopUpBoardState = {
  query: string;
  tab: TopUpBoardTab;
  pageSize: AdminBoardPageSize;
  page: number;
  sortKey: TopUpSortKey | null;
  sortDirection: BoardSortDirection;
  setQuery: (query: string) => void;
  setTab: (tab: TopUpBoardTab) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPage: (page: number) => void;
  sortBy: (sortKey: TopUpSortKey) => void;
  reset: () => void;
};

const initialTopUpBoardState = {
  query: "",
  tab: "all" as TopUpBoardTab,
  pageSize: 10 as AdminBoardPageSize,
  page: 1,
  sortKey: "createdAt" as TopUpSortKey,
  sortDirection: "descending" as BoardSortDirection,
};

export const useTopUpBoardStore = create<TopUpBoardState>((set) => ({
  ...initialTopUpBoardState,
  setQuery: (query) => set({ query, page: 1 }),
  setTab: (tab) => set({ tab, page: 1 }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  sortBy: (sortKey) => set((state) => ({
    page: 1,
    sortKey,
    sortDirection: toggleBoardSort(state.sortKey, sortKey, state.sortDirection),
  })),
  reset: () => set(initialTopUpBoardState),
}));
