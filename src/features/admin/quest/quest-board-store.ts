import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import type { BoardSortDirection } from "../data/board-sorting";
import type { QuestBoardTab, QuestSortKey } from "./quest-model";

type QuestBoardState = {
  search: string;
  tab: QuestBoardTab;
  pageSize: AdminBoardPageSize;
  pageNumber: number;
  sortKey: QuestSortKey;
  sortDirection: BoardSortDirection;
  setSearch: (search: string) => void;
  setTab: (tab: QuestBoardTab) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPageNumber: (pageNumber: number) => void;
  sortBy: (sortKey: QuestSortKey) => void;
  reset: () => void;
};

const initialQuestBoardState = {
  search: "",
  tab: "all" as QuestBoardTab,
  pageSize: 10 as AdminBoardPageSize,
  pageNumber: 1,
  sortKey: "createdAt" as QuestSortKey,
  sortDirection: "descending" as BoardSortDirection,
};

export const useQuestBoardStore = create<QuestBoardState>((set) => ({
  ...initialQuestBoardState,
  setSearch: (search) => set({ search, pageNumber: 1 }),
  setTab: (tab) => set({ tab, pageNumber: 1 }),
  setPageSize: (pageSize) => set({ pageSize, pageNumber: 1 }),
  setPageNumber: (pageNumber) => set({ pageNumber: Math.max(1, pageNumber) }),
  sortBy: (sortKey) => set((state) => ({
    pageNumber: 1,
    sortKey,
    sortDirection: state.sortKey === sortKey
      ? state.sortDirection === "ascending" ? "descending" : "ascending"
      : "ascending",
  })),
  reset: () => set(initialQuestBoardState),
}));
