import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import { toggleBoardSort, type BoardSortDirection } from "../data/board-sorting";

export type ReportCaseTab = "all" | "open" | "dismissed" | "confirmed" | "restored";
export type ReportCaseSortKey = "id" | "source" | "reportedMember" | "reporter" | "type" | "status" | "reported";

type ReportBoardState = {
  activeTab: ReportCaseTab;
  query: string;
  pageSize: AdminBoardPageSize;
  pageNumber: number;
  sortKey: ReportCaseSortKey | null;
  sortDirection: BoardSortDirection;
  setActiveTab: (activeTab: ReportCaseTab) => void;
  setQuery: (query: string) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPageNumber: (pageNumber: number) => void;
  sortBy: (sortKey: ReportCaseSortKey) => void;
  reset: () => void;
};

const initialReportBoardState = {
  activeTab: "all" as ReportCaseTab,
  query: "",
  pageSize: 10 as AdminBoardPageSize,
  pageNumber: 1,
  sortKey: null as ReportCaseSortKey | null,
  sortDirection: "ascending" as BoardSortDirection,
};

export const useReportBoardStore = create<ReportBoardState>((set) => ({
  ...initialReportBoardState,
  setActiveTab: (activeTab) => set({ activeTab, pageNumber: 1 }),
  setQuery: (query) => set({ query, pageNumber: 1 }),
  setPageSize: (pageSize) => set({ pageSize, pageNumber: 1 }),
  setPageNumber: (pageNumber) => set({ pageNumber: Math.max(1, pageNumber) }),
  sortBy: (sortKey) => set((state) => ({
    pageNumber: 1,
    sortKey,
    sortDirection: toggleBoardSort(state.sortKey, sortKey, state.sortDirection),
  })),
  reset: () => set(initialReportBoardState),
}));
