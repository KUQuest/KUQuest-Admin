import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { AdminDisputeEvidence, DisputeResolution } from "../api/admin-api";
import { replaceInfiniteItem } from "../data/query-data";
import { loadDisputeCaseDetailFromApi, loadDisputeCasePageData, type DisputeCasePageData } from "./dispute-service";
import { DISPUTE_CASE_UPDATED_EVENT, disputeCaseModelFromRecord, type DisputeCaseCommand, type DisputeCaseModel } from "./dispute-model";

export const disputeBoardQueryKey = ["admin", "dispute-cases", "board"] as const;

export function disputeDetailQueryKey(disputeId: string) {
  return ["admin", "dispute-cases", "detail", disputeId] as const;
}

export function disputeEvidenceQueryKey(disputeId: string, reference: string | null) {
  return ["admin", "dispute-cases", "evidence", disputeId, reference] as const;
}

export type DisputeDecisionMutationInput = {
  model: DisputeCaseModel;
  command: DisputeCaseCommand;
  options: DisputeResolution;
};

export function useDisputeDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "dispute-cases", "decision"],
    mutationFn: async ({ model, command, options }: DisputeDecisionMutationInput) => {
      const result = await adminApiProvider.commands.resolveDispute(model.id, options);
      const updatedModel = disputeCaseModelFromRecord({
        ...model,
        ...result.resourceSummary,
        status: command,
        disputeCaseStatus: command,
        decisionReason: options.decisionReasonText ?? options.reasonCode,
        ...(command === "DISPUTE_CASE_RESOLVED"
          ? { resolvedWorkerId: model.workerId, resolvedAmountSatang: options.amountSatang }
          : { resolvedWorkerId: null, resolvedAmountSatang: null }),
        ...(result.resourceVersion !== undefined && { version: result.resourceVersion }),
      });
      if (!updatedModel || updatedModel.id !== model.id) {
        throw new Error("The Admin API returned an invalid Dispute Case.");
      }
      return updatedModel;
    },
    onSuccess: (model) => {
      queryClient.setQueryData(disputeDetailQueryKey(model.id), model);
      queryClient.setQueryData<InfiniteData<DisputeCasePageData, string | null>>(disputeBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    },
  });
}

function pageFromQueryData(pages: DisputeCasePageData[]): DisputeCasePageData {
  const firstPage = pages[0];
  const lastPage = pages.at(-1);
  return {
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
    ...(firstPage?.countsByStatus ? { countsByStatus: firstPage.countsByStatus } : {}),
  };
}

export function useDisputeBoardQuery(initialData?: DisputeCasePageData) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: disputeBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => loadDisputeCasePageData(undefined, pageParam ?? undefined),
    initialData: initialData
      ? { pages: [initialData], pageParams: [null] }
      : undefined,
    staleTime: initialData ? Infinity : 0,
    refetchOnMount: !initialData,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const data = useMemo(() => pageFromQueryData(query.data?.pages ?? []), [query.data?.pages]);

  useEffect(() => {
    const updateRecord = (event: Event) => {
      const model = (event as CustomEvent<DisputeCaseModel>).detail;
      if (!model) return;
      queryClient.setQueryData<InfiniteData<DisputeCasePageData, string | null>>(disputeBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    };
    window.addEventListener(DISPUTE_CASE_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(DISPUTE_CASE_UPDATED_EVENT, updateRecord);
  }, [queryClient]);

  return { ...query, data };
}

export function useDisputeDetailQuery(disputeId: string, initialModel?: DisputeCaseModel | null) {
  const queryClient = useQueryClient();
  const queryKey = disputeDetailQueryKey(disputeId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const model = await loadDisputeCaseDetailFromApi(disputeId);
      if (!model) throw new Error("The Dispute Case was not found.");
      return model;
    },
    initialData: initialModel ?? undefined,
    staleTime: initialModel ? Infinity : 0,
    gcTime: Infinity,
    refetchOnMount: !initialModel,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialModel) queryClient.setQueryData(queryKey, initialModel);
  }, [initialModel, queryClient, queryKey]);

  useEffect(() => {
    const updateRecord = (event: Event) => {
      const model = (event as CustomEvent<DisputeCaseModel>).detail;
      if (!model || model.id !== disputeId) return;
      queryClient.setQueryData(queryKey, model);
    };
    window.addEventListener(DISPUTE_CASE_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(DISPUTE_CASE_UPDATED_EVENT, updateRecord);
  }, [disputeId, queryClient, queryKey]);

  return { ...query, data: query.data ?? null, queryKey };
}

export function useDisputeEvidenceQuery(disputeId: string, reference: string | null) {
  return useQuery<AdminDisputeEvidence>({
    queryKey: disputeEvidenceQueryKey(disputeId, reference),
    queryFn: () => {
      if (!reference) throw new Error("Evidence Reference was not provided.");
      return adminApiProvider.read.getDisputeEvidence(disputeId, {
        idempotencyKey: `admin-read-dispute-evidence-${disputeId}-${reference}`,
      });
    },
    enabled: Boolean(reference),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
