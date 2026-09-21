import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import { walletStatusLabel, type WalletStatus } from "../domain/rulebook";
import { loadWalletDrawerDataAction, rebuildWalletProjectionAction, verifyWalletProjectionAction } from "./wallet-actions";
import { walletStatusFixtureError, type WalletStatusFixture, type WalletStatusTarget } from "./wallet-status-command-dialog";
import type { WalletBoardPageData, WalletDataSource, WalletDrawerData } from "./wallet-service";
import { mockAllWallets } from "./wallet-mock-data";
import { walletRowsFromApi, type WalletBoardRow, type WalletHistoryView } from "./wallet-model";

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

export function useWalletProjectionVerificationMutation() {
  return useMutation({
    mutationKey: ["admin", "wallets", "verify-projection"],
    mutationFn: ({ walletId }: { walletId: string }) => verifyWalletProjectionAction(walletId),
  });
}

export function useWalletProjectionRebuildMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "wallets", "rebuild-projection"],
    mutationFn: ({ walletId }: { walletId: string }) => rebuildWalletProjectionAction(walletId),
    onSuccess: (_result, { walletId }) => {
      void queryClient.invalidateQueries({ queryKey: [...walletBoardQueryKey] });
      void queryClient.invalidateQueries({ queryKey: walletDrawerQueryKey(walletId, "api") });
    },
  });
}

export type WalletStatusMutationInput = {
  walletId: string;
  currentStatus: WalletStatus;
  targetStatus: WalletStatusTarget;
  reason: string;
  fixture: WalletStatusFixture;
  dataSource: WalletDataSource;
};

export type WalletStatusMutationResult = {
  historyEntry: WalletHistoryView;
  receipt: {
    id: string;
    fromStatus: WalletStatus;
    toStatus: WalletStatus;
    reason: string;
    createdAt: string;
  };
};

export function useWalletStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "wallets", "status"],
    mutationFn: async (input: WalletStatusMutationInput): Promise<WalletStatusMutationResult> => {
      if (input.dataSource !== "mock") throw new Error("Wallet status commands are not available from the Admin API.");
      const fixtureError = walletStatusFixtureError(input.fixture);
      if (fixtureError) throw new Error(fixtureError);

      const createdAt = new Date().toISOString();
      const suffix = `${input.walletId}-${Date.now()}`;
      return {
        historyEntry: {
          id: `mock-wallet-status-${suffix}`,
          fromStatus: input.currentStatus,
          toStatus: input.targetStatus,
          reason: input.reason,
          actorAdminId: "admin-mock",
          createdAt,
        },
        receipt: {
          id: `mock-action-${suffix}`,
          fromStatus: input.currentStatus,
          toStatus: input.targetStatus,
          reason: input.reason,
          createdAt,
        },
      };
    },
    onSuccess: ({ historyEntry }, input) => {
      queryClient.setQueryData<WalletDrawerData>(walletDrawerQueryKey(input.walletId, input.dataSource), (current) => current
        ? { ...current, history: [historyEntry, ...current.history] }
        : current);
      queryClient.setQueryData<WalletBoardQueryData>([...walletBoardQueryKey, input.dataSource], (current) => current
        ? {
            ...current,
            rows: current.rows.map((row) => row.id === input.walletId
              ? { ...row, status: input.targetStatus, statusLabel: walletStatusLabel(input.targetStatus) }
              : row),
          }
        : current);
    },
  });
}
