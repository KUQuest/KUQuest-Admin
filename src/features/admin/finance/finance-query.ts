import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { AdminApiTopUpStatus } from "../api/admin-api";
import type { FinancePageData, FinanceTopUpFilter, TopUpPageData } from "./finance-service";

export const financePolicyQueryKey = ["admin", "finance", "money-policy"] as const;
export const financeTopUpQueryKey = ["admin", "finance", "top-ups"] as const;

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
    enabled: initialData.dataSource === "api",
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useFinanceTopUpQuery(status: FinanceTopUpFilter, initialData: TopUpPageData) {
  return useInfiniteQuery({
    queryKey: [...financeTopUpQueryKey, status],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminApiProvider.read.listTopUps({
      limit: 25,
      ...(status === "ALL" ? {} : { status: status as AdminApiTopUpStatus }),
      ...(pageParam ? { cursor: pageParam } : {}),
    }),
    initialData: status === "ALL" && initialData.topUpPage
      ? { pages: [initialData.topUpPage], pageParams: [null] }
      : undefined,
    enabled: initialData.dataSource === "api",
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
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
