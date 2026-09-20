import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import type { BoardSortDirection } from "../data/board-sorting";

export type ConductReportTab = "all" | "open" | "confirmed" | "dismissed";
export type ConductReportSortKey = "id" | "quest" | "reportedMember" | "reporter" | "reason" | "status" | "reported";

type ConductReportBoardState = {
  activeTab: ConductReportTab;
  query: string;
  pageSize: AdminBoardPageSize;
  pageNumber: number;
  sortKey: ConductReportSortKey | null;
  sortDirection: BoardSortDirection;
  setActiveTab: (activeTab: ConductReportTab) => void;
  setQuery: (query: string) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPageNumber: (pageNumber: number) => void;
  sortBy: (sortKey: ConductReportSortKey) => void;
  reset: () => void;
};

const initialConductReportBoardState = {
  activeTab: "all" as ConductReportTab,
  query: "",
  pageSize: 10 as AdminBoardPageSize,
  pageNumber: 1,
  sortKey: null as ConductReportSortKey | null,
  sortDirection: "ascending" as BoardSortDirection,
};

export const useConductReportBoardStore = create<ConductReportBoardState>((set) => ({
  ...initialConductReportBoardState,
  setActiveTab: (activeTab) => set({ activeTab, pageNumber: 1 }),
  setQuery: (query) => set({ query, pageNumber: 1 }),
  setPageSize: (pageSize) => set({ pageSize, pageNumber: 1 }),
  setPageNumber: (pageNumber) => set({ pageNumber: Math.max(1, pageNumber) }),
  sortBy: (sortKey) => set((state) => ({
    pageNumber: 1,
    sortKey,
    sortDirection: state.sortKey === sortKey
      ? state.sortDirection === "ascending" ? "descending" : "ascending"
      : "ascending",
  })),
  reset: () => set(initialConductReportBoardState),
}));
