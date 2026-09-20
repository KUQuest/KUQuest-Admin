import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import type { BoardSortDirection } from "../data/board-sorting";
import { DEFAULT_ACTIVITY_LOG_FILTERS, type ActivityLogFilters } from "./activity-log-model";

export type ActivityLogSortKey = "timestamp" | "actor" | "activity" | "target" | "reason";

type ActivityLogBoardState = {
  appliedFilters: ActivityLogFilters;
  draftFilters: ActivityLogFilters;
  search: string;
  pageSize: AdminBoardPageSize;
  pageNumber: number;
  sortKey: ActivityLogSortKey | null;
  sortDirection: BoardSortDirection;
  setDraftFilters: (filters: Partial<ActivityLogFilters>) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPageNumber: (pageNumber: number) => void;
  sortBy: (sortKey: ActivityLogSortKey) => void;
  reset: () => void;
};

const initialActivityLogBoardState = {
  appliedFilters: DEFAULT_ACTIVITY_LOG_FILTERS,
  draftFilters: DEFAULT_ACTIVITY_LOG_FILTERS,
  search: "",
  pageSize: 10 as AdminBoardPageSize,
  pageNumber: 1,
  sortKey: null as ActivityLogSortKey | null,
  sortDirection: "ascending" as BoardSortDirection,
};

export const useActivityLogBoardStore = create<ActivityLogBoardState>((set) => ({
  ...initialActivityLogBoardState,
  setDraftFilters: (filters) => set((state) => ({ draftFilters: { ...state.draftFilters, ...filters } })),
  applyFilters: () => set((state) => ({
    appliedFilters: {
      ...state.draftFilters,
      action: state.draftFilters.action.trim(),
      resourceType: state.draftFilters.resourceType.trim(),
      resourceId: state.draftFilters.resourceId.trim(),
      adminId: state.draftFilters.adminId.trim(),
    },
    pageNumber: 1,
  })),
  clearFilters: () => set({ appliedFilters: DEFAULT_ACTIVITY_LOG_FILTERS, draftFilters: DEFAULT_ACTIVITY_LOG_FILTERS, pageNumber: 1 }),
  setSearch: (search) => set({ search, pageNumber: 1 }),
  setPageSize: (pageSize) => set({ pageSize, pageNumber: 1 }),
  setPageNumber: (pageNumber) => set({ pageNumber: Math.max(1, pageNumber) }),
  sortBy: (sortKey) => set((state) => ({
    pageNumber: 1,
    sortKey,
    sortDirection: state.sortKey === sortKey
      ? state.sortDirection === "ascending" ? "descending" : "ascending"
      : "ascending",
  })),
  reset: () => set(initialActivityLogBoardState),
}));
