import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { adminApi } from "../api/admin-api";
import type { WalletBoardPageData } from "./wallet-service";
import { mockAllWallets } from "./wallet-mock-data";
import { walletRowsFromApi, type WalletBoardRow } from "./wallet-model";

export type WalletBoardQueryData = {
  rows: WalletBoardRow[];
};

export const walletBoardQueryKey = ["admin", "wallets", "board"] as const;

async function loadAllWalletRowsFromApi(): Promise<WalletBoardQueryData> {
  const wallets = [] as Awaited<ReturnType<typeof adminApi.listWallets>>["items"];
  let cursor: string | undefined;
  do {
    const page = await adminApi.listWallets({ limit: 50, ...(cursor ? { cursor } : {}) });
    wallets.push(...page.items);
    if (!page.nextCursor || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  } while (cursor);
  return { rows: walletRowsFromApi(wallets) };
}

export function useWalletBoardQuery(initialData: WalletBoardPageData) {
  const dataSource = initialData.dataSource;
  const initialBoardData = useMemo<WalletBoardQueryData>(
    () => ({ rows: dataSource === "mock" && initialData.allRows ? initialData.allRows : initialData.rows }),
    [dataSource, initialData],
  );
  return useQuery({
    queryKey: [...walletBoardQueryKey, dataSource],
    queryFn: async () => dataSource === "mock"
      ? { rows: walletRowsFromApi(mockAllWallets) }
      : loadAllWalletRowsFromApi(),
    initialData: initialBoardData,
    enabled: !initialData.boardError,
    staleTime: dataSource === "mock" ? Infinity : 0,
    gcTime: Infinity,
    refetchOnMount: dataSource === "api",
    refetchOnWindowFocus: false,
  });
}
