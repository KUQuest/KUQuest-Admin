import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { FinancePageData, TopUpPageData } from "./finance-service";

export const financePolicyQueryKey = ["admin", "finance", "money-policy"] as const;
export const financeTopUpQueryKey = ["admin", "finance", "top-ups"] as const;

export function financeTopUpStatusHistoryQueryKey(topUpId: string) {
  return [...financeTopUpQueryKey, "status-history", topUpId] as const;
}

export function useFinancePolicyQuery(initialData: FinancePageData) {
  return useQuery({
    queryKey: financePolicyQueryKey,
    queryFn: async () => {
      const [current, revisions] = await Promise.all([
        adminApiProvider.read.getCurrentMoneyPolicy(),
        adminApiProvider.read.listMoneyPolicyRevisions(),
      ]);
      return { currentPolicy: current.policy, policyRevisions: revisions.policies };
    },
    initialData: {
      currentPolicy: initialData.currentPolicy,
      policyRevisions: initialData.policyRevisions,
    },
    enabled: true,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useFinanceTopUpQuery(initialData: TopUpPageData) {
  return useInfiniteQuery({
    queryKey: financeTopUpQueryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminApiProvider.read.listTopUps({
      limit: 25,
      ...(pageParam ? { cursor: pageParam } : {}),
    }),
    initialData: initialData.topUpPage
      ? { pages: [initialData.topUpPage], pageParams: [null] }
      : undefined,
    enabled: true,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useFinanceTopUpStatusHistoryQuery(topUpId: string) {
  return useQuery({
    queryKey: financeTopUpStatusHistoryQueryKey(topUpId),
    queryFn: () => adminApiProvider.read.getTopUpStatusHistory(topUpId),
    enabled: Boolean(topUpId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useFinanceTopUpReconcileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "finance", "top-ups", "reconcile"],
    mutationFn: (topUpId: string) => adminApiProvider.commands.reconcileTopUp(topUpId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeTopUpQueryKey });
    },
  });
}

export function useProviderEventRetryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "finance", "provider-event", "retry"],
    mutationFn: ({ kind, eventId }: { kind: "payout" | "top-up"; eventId: string }) => (
      kind === "payout"
        ? adminApiProvider.commands.retryPayoutProviderEvent(eventId)
        : adminApiProvider.commands.retryTopUpProviderEvent(eventId)
    ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeTopUpQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
    },
  });
}
