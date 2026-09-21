import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";
import type { ReportDecision } from "../api/admin-api";
import { replaceInfiniteItem } from "../data/query-data";
import {
  findReportCaseFromMock,
  loadAllReportCasesFromMock,
  loadReportCasesFromMock,
  saveMockReportDecision,
} from "./report-adapter";
import { loadReportCasePageData, type ReportCasePageData } from "./report-service";
import type { AdminEvidence } from "../api/admin-api";
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
  decision: ReportCaseCommand;
  reason: string;
  options: ReportDecision;
  apiEnabled: boolean;
};

export function useReportDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "report-cases", "decision"],
    mutationFn: async ({ reportId, decision, reason, options, apiEnabled }: ReportDecisionMutationInput) => (
      apiEnabled
        ? adminApiProvider.commands.decideReport(reportId, options)
        : saveMockReportDecision(localStorage, reportId, decision, reason)
    ),
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
    source: lastPage?.source ?? (isAdminApiEnabled() ? "api" : "mock"),
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
  };
}

export function useReportBoardQuery(initialData?: ReportCasePageData) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const query = useInfiniteQuery({
    queryKey: reportBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (apiEnabled) return loadReportCasePageData(undefined, pageParam ?? undefined);
      return pageParam
        ? loadReportCasesFromMock(window.localStorage, pageParam)
        : loadAllReportCasesFromMock(window.localStorage);
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
  const apiEnabled = isAdminApiEnabled();
  const queryKey = reportDetailQueryKey(reportId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const record = apiEnabled
        ? await adminApiProvider.read.getReport(reportId)
        : findReportCaseFromMock(localStorage, reportId);
      const model = reportCaseModelFromRecord(record);
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
  const apiEnabled = isAdminApiEnabled();
  return useQuery<AdminEvidence>({
    queryKey: reportEvidenceQueryKey(reference),
    queryFn: async () => {
      if (!reference) throw new Error("Evidence Reference was not provided.");
      return apiEnabled ? adminApiProvider.read.getEvidence(reference) : { evidenceRef: reference };
    },
    enabled: Boolean(reference),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
