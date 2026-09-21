import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import { loadWalletDrawerDataAction } from "./wallet-actions";
import type { WalletBoardPageData, WalletDataSource, WalletDrawerData } from "./wallet-service";
import { mockAllWallets } from "./wallet-mock-data";
import { walletRowsFromApi, type WalletBoardRow } from "./wallet-model";

export type WalletBoardQueryData = {
  rows: WalletBoardRow[];
};

export const walletBoardQueryKey = ["admin", "wallets", "board"] as const;

export function walletDrawerQueryKey(walletId: string, dataSource: WalletDataSource) {
  return ["admin", "wallets", "detail", walletId, dataSource] as const;
}

async function loadAllWalletRowsFromApi(): Promise<WalletBoardQueryData> {
  try {
    const wallets = [] as Awaited<ReturnType<typeof adminApiProvider.read.listWallets>>["items"];
    let cursor: string | undefined;
    do {
      const page = await adminApiProvider.read.listWallets({ limit: 50, ...(cursor ? { cursor } : {}) });
      wallets.push(...page.items);
      if (!page.nextCursor || page.nextCursor === cursor) break;
      cursor = page.nextCursor;
    } while (cursor);
    return { rows: walletRowsFromApi(wallets) };
  } catch {
    throw new Error("Some Wallet records could not be loaded.");
  }
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
    retry: false,
  });
}

export function useWalletDrawerQuery(walletId: string, dataSource: WalletDataSource) {
  return useQuery<WalletDrawerData>({
    queryKey: walletDrawerQueryKey(walletId, dataSource),
    queryFn: () => loadWalletDrawerDataAction(walletId),
    enabled: Boolean(walletId),
    staleTime: dataSource === "mock" ? Infinity : 0,
    gcTime: Infinity,
    refetchOnMount: dataSource === "api",
    refetchOnWindowFocus: false,
  });
}
