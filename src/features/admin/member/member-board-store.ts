import { create } from "zustand";

import type { AdminBoardPageSize } from "../data/board-pagination";
import { toggleBoardSort, type BoardSortDirection } from "../data/board-sorting";

export type MemberTab = "all" | "Normal" | "Flag" | "Temp Ban" | "Perm Ban";
export type MemberSortKey = "id" | "member" | "studentId" | "academicProfile" | "status" | "walletStatus";

type MemberBoardState = {
  activeTab: MemberTab;
  query: string;
  pageSize: AdminBoardPageSize;
  pageNumber: number;
  sortKey: MemberSortKey | null;
  sortDirection: BoardSortDirection;
  setActiveTab: (activeTab: MemberTab) => void;
  setQuery: (query: string) => void;
  setPageSize: (pageSize: AdminBoardPageSize) => void;
  setPageNumber: (pageNumber: number) => void;
  sortBy: (sortKey: MemberSortKey) => void;
  reset: () => void;
};

const initialMemberBoardState = {
  activeTab: "all" as MemberTab,
  query: "",
  pageSize: 10 as AdminBoardPageSize,
  pageNumber: 1,
  sortKey: null as MemberSortKey | null,
  sortDirection: "ascending" as BoardSortDirection,
};

export const useMemberBoardStore = create<MemberBoardState>((set) => ({
  ...initialMemberBoardState,
  setActiveTab: (activeTab) => set({ activeTab, pageNumber: 1 }),
  setQuery: (query) => set({ query, pageNumber: 1 }),
  setPageSize: (pageSize) => set({ pageSize, pageNumber: 1 }),
  setPageNumber: (pageNumber) => set({ pageNumber: Math.max(1, pageNumber) }),
  sortBy: (sortKey) => set((state) => ({
    pageNumber: 1,
    sortKey,
    sortDirection: toggleBoardSort(state.sortKey, sortKey, state.sortDirection),
  })),
  reset: () => set(initialMemberBoardState),
}));
