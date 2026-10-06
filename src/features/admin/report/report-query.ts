import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { AdminEvidence, ReportCaseDecision } from "../api/admin-api";
import { replaceInfiniteItem } from "../data/query-data";
import { loadReportCasePageData, type ReportCasePageData } from "./report-service";
import { REPORT_CASE_UPDATED_EVENT, reportCaseModelFromRecord, type ReportCaseCommand, type ReportCaseModel } from "./report-model";

export const reportBoardQueryKey = ["admin", "report-cases", "board"] as const;

export function reportDetailQueryKey(reportId: string) {
  return ["admin", "report-cases", "detail", reportId] as const;
}

export function reportEvidenceQueryKey(reference: string | null) {
  return ["admin", "report-cases", "evidence", reference] as const;
}

export type ReportDecisionMutationInput = {
  reportId: string;
  currentModel: ReportCaseModel;
  decision: ReportCaseCommand;
  options: ReportCaseDecision;
};

export function useReportDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "report-cases", "decision"],
    mutationFn: async ({ reportId, currentModel, decision, options }: ReportDecisionMutationInput) => {
      const result = await adminApiProvider.commands.decideReportCase(reportId, options);
      const summary = result.resourceSummary;
      if (summary.kind !== "REPORT_CASE" || summary.id !== reportId || summary.status !== decision) {
        throw new Error("The Admin API returned an invalid Report Case decision.");
      }
      return {
        ...currentModel,
        ...summary,
        status: summary.status,
        version: result.resourceVersion,
      };
    },
    onSuccess: (record, { reportId }) => {
      const model = reportCaseModelFromRecord(record);
      if (!model || model.id !== reportId) return;
      queryClient.setQueryData(reportDetailQueryKey(reportId), model);
      queryClient.setQueryData<InfiniteData<ReportCasePageData, string | null>>(reportBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    },
  });
}

function pageFromQueryData(pages: ReportCasePageData[]): ReportCasePageData {
  const lastPage = pages.at(-1);
  return {
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
  };
}

export function useReportBoardQuery(initialData?: ReportCasePageData) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: reportBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => loadReportCasePageData(undefined, pageParam ?? undefined),
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
      const model = (event as CustomEvent<ReportCaseModel>).detail;
      if (!model) return;
      queryClient.setQueryData<InfiniteData<ReportCasePageData, string | null>>(reportBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    };
    window.addEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
  }, [queryClient]);

  return { ...query, data };
}

export function useReportDetailQuery(reportId: string, initialModel?: ReportCaseModel | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => reportDetailQueryKey(reportId), [reportId]);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const model = reportCaseModelFromRecord(await adminApiProvider.read.getReport(reportId));
      if (!model || model.id !== reportId) throw new Error("The Report Case was not found.");
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
      const model = (event as CustomEvent<ReportCaseModel>).detail;
      if (!model || model.id !== reportId) return;
      queryClient.setQueryData(queryKey, model);
    };
    window.addEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
  }, [queryClient, queryKey, reportId]);

  return { ...query, data: query.data ?? null, queryKey };
}

export function useReportEvidenceQuery(reference: string | null) {
  return useQuery<AdminEvidence>({
    queryKey: reportEvidenceQueryKey(reference),
    queryFn: () => {
      if (!reference) throw new Error("Evidence Reference was not provided.");
      const id = typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return adminApiProvider.read.getEvidence(reference, {
        idempotencyKey: `admin-evidence-read-${id}`,
      });
    },
    enabled: Boolean(reference),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
