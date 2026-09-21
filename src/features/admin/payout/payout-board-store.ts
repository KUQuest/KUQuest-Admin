import { create } from "zustand";

import type {
  PayoutBoardPageSize,
  PayoutBoardTab,
  PayoutSortDirection,
  PayoutSortKey,
} from "./payout-model";
import { toggleBoardSort } from "../data/board-sorting";

type PayoutBoardState = {
  query: string;
  tab: PayoutBoardTab;
  pageSize: PayoutBoardPageSize;
  page: number;
  sortKey: PayoutSortKey;
  sortDirection: PayoutSortDirection;
  setQuery: (query: string) => void;
  setTab: (tab: PayoutBoardTab) => void;
  setPageSize: (pageSize: PayoutBoardPageSize) => void;
  setPage: (page: number) => void;
  sortBy: (sortKey: PayoutSortKey) => void;
  reset: () => void;
};

const initialPayoutBoardState = {
  query: "",
  tab: "PENDING_ADMIN_APPROVAL" as PayoutBoardTab,
  pageSize: 10 as PayoutBoardPageSize,
  page: 1,
  sortKey: "createdAt" as PayoutSortKey,
  sortDirection: "descending" as PayoutSortDirection,
};

export const usePayoutBoardStore = create<PayoutBoardState>((set) => ({
  ...initialPayoutBoardState,
  setQuery: (query) => set({ query, page: 1 }),
  setTab: (tab) => set({ tab, page: 1 }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  sortBy: (sortKey) => set((state) => ({
    page: 1,
    sortKey,
    sortDirection: toggleBoardSort(state.sortKey, sortKey, state.sortDirection),
  })),
  reset: () => set(initialPayoutBoardState),
}));
