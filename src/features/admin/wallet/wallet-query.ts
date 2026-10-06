import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import { loadWalletDrawerDataAction, rebuildWalletProjectionAction, verifyWalletProjectionAction } from "./wallet-actions";
import type { WalletStatusTarget } from "./wallet-status-command-dialog";
import type { WalletBoardPageData, WalletDrawerData } from "./wallet-service";
import { walletRowsFromApi, type WalletBoardRow } from "./wallet-model";

export type WalletBoardQueryData = {
  rows: WalletBoardRow[];
};

export const walletBoardQueryKey = ["admin", "wallets", "board"] as const;

export function walletDrawerQueryKey(walletId: string) {
  return ["admin", "wallets", "detail", walletId] as const;
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
  const initialBoardData = useMemo<WalletBoardQueryData>(
    () => ({ rows: initialData.rows }),
    [initialData],
  );
  return useQuery({
    queryKey: walletBoardQueryKey,
    queryFn: loadAllWalletRowsFromApi,
    initialData: initialBoardData,
    enabled: !initialData.boardError,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useWalletDrawerQuery(walletId: string) {
  return useQuery<WalletDrawerData>({
    queryKey: walletDrawerQueryKey(walletId),
    queryFn: () => loadWalletDrawerDataAction(walletId),
    enabled: Boolean(walletId),
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: true,
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
      void queryClient.invalidateQueries({ queryKey: walletBoardQueryKey });
      void queryClient.invalidateQueries({ queryKey: walletDrawerQueryKey(walletId) });
    },
  });
}

export type WalletStatusMutationInput = {
  walletId: string;
  targetStatus: WalletStatusTarget;
  reason: string;
  idempotencyKey: string;
};

export function useWalletStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "wallets", "status"],
    mutationFn: (input: WalletStatusMutationInput) => adminApiProvider.commands.setWalletStatus(input.walletId, {
      idempotencyKey: input.idempotencyKey,
      toStatus: input.targetStatus,
      reason: input.reason,
    }),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: walletBoardQueryKey });
      void queryClient.invalidateQueries({ queryKey: walletDrawerQueryKey(input.walletId) });
    },
  });
}
