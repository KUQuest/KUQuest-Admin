import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import { toggleBoardSort, type BoardSortDirection } from "../data/board-sorting";

export type DisputeCaseTab = "all" | "open" | "dismissed" | "resolved";
export type DisputeCaseSortKey = "id" | "quest" | "hirer" | "worker" | "category" | "amount" | "status" | "opened";

type DisputeBoardState = {
  activeTab: DisputeCaseTab;
  query: string;
  pageSize: AdminBoardPageSize;
  pageNumber: number;
  sortKey: DisputeCaseSortKey | null;
  sortDirection: BoardSortDirection;
  setActiveTab: (activeTab: DisputeCaseTab) => void;
  setQuery: (query: string) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPageNumber: (pageNumber: number) => void;
  sortBy: (sortKey: DisputeCaseSortKey) => void;
  reset: () => void;
};

const initialDisputeBoardState = {
  activeTab: "open" as DisputeCaseTab,
  query: "",
  pageSize: 10 as AdminBoardPageSize,
  pageNumber: 1,
  sortKey: null as DisputeCaseSortKey | null,
  sortDirection: "ascending" as BoardSortDirection,
};

export const useDisputeBoardStore = create<DisputeBoardState>((set) => ({
  ...initialDisputeBoardState,
  setActiveTab: (activeTab) => set({ activeTab, pageNumber: 1 }),
  setQuery: (query) => set({ query, pageNumber: 1 }),
  setPageSize: (pageSize) => set({ pageSize, pageNumber: 1 }),
  setPageNumber: (pageNumber) => set({ pageNumber: Math.max(1, pageNumber) }),
  sortBy: (sortKey) => set((state) => ({
    pageNumber: 1,
    sortKey,
    sortDirection: toggleBoardSort(state.sortKey, sortKey, state.sortDirection),
  })),
  reset: () => set(initialDisputeBoardState),
}));
