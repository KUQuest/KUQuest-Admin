import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";
import { replaceInfiniteItem } from "../data/query-data";
import {
  findDisputeCaseFromMock,
  loadAllDisputeCasesFromMock,
  loadDisputeCasesFromMock,
} from "./dispute-adapter";
import { loadDisputeCasePageData, type DisputeCasePageData } from "./dispute-service";
import type { AdminDisputeEvidence } from "../api/admin-api";
import { DISPUTE_CASE_UPDATED_EVENT, disputeCaseModelFromRecord, type DisputeCaseModel } from "./dispute-model";

export const disputeBoardQueryKey = ["admin", "dispute-cases", "board"] as const;

export function disputeDetailQueryKey(disputeId: string) {
  return ["admin", "dispute-cases", "detail", disputeId] as const;
}

export function disputeEvidenceQueryKey(disputeId: string, reference: string | null) {
  return ["admin", "dispute-cases", "evidence", disputeId, reference] as const;
}

function pageFromQueryData(
  pages: DisputeCasePageData[],
): DisputeCasePageData {
  const lastPage = pages.at(-1);
  return {
    source: lastPage?.source ?? (isAdminApiEnabled() ? "api" : "mock"),
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
  };
}

export function useDisputeBoardQuery(initialData?: DisputeCasePageData) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const query = useInfiniteQuery({
    queryKey: disputeBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (apiEnabled) return loadDisputeCasePageData(undefined, pageParam ?? undefined);
      return pageParam
        ? loadDisputeCasesFromMock(window.localStorage, pageParam)
        : loadAllDisputeCasesFromMock(window.localStorage);
    },
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
  }, [query.data, queryClient]);

  return { ...query, data };
}

export function useDisputeDetailQuery(disputeId: string, initialModel?: DisputeCaseModel | null) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const queryKey = disputeDetailQueryKey(disputeId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const record = apiEnabled
        ? await adminApiProvider.read.getDispute(disputeId)
        : findDisputeCaseFromMock(localStorage, disputeId);
      const model = disputeCaseModelFromRecord(record, apiEnabled ? "api" : "mock");
      if (!model || model.id !== disputeId) throw new Error("The Dispute Case was not found.");
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
  const apiEnabled = isAdminApiEnabled();
  return useQuery<AdminDisputeEvidence | { evidenceRef: string }>({
    queryKey: disputeEvidenceQueryKey(disputeId, reference),
    queryFn: async () => {
      if (!reference) throw new Error("Evidence Reference was not provided.");
      return apiEnabled
        ? adminApiProvider.read.getDisputeEvidence(disputeId, { idempotencyKey: `admin-read-dispute-evidence-${disputeId}-${reference}` })
        : { evidenceRef: reference };
    },
    enabled: Boolean(reference),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
