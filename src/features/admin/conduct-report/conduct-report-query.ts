import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";
import type { ConductReportDecision } from "../api/admin-api";
import { replaceInfiniteItem } from "../data/query-data";
import {
  findConductReportFromMock,
  loadAllConductReportsFromMock,
  loadConductReportsFromMock,
  saveMockConductReportDecision,
} from "./conduct-report-adapter";
import { loadConductReportPageData, type ConductReportPageData } from "./conduct-report-service";
import { CONDUCT_REPORT_UPDATED_EVENT, conductReportModelFromRecord, type ConductReportCommand, type ConductReportDecisionChoice, type ConductReportModel } from "./conduct-report-model";

export const conductReportBoardQueryKey = ["admin", "conduct-reports", "board"] as const;

export function conductReportDetailQueryKey(reportId: string) {
  return ["admin", "conduct-reports", "detail", reportId] as const;
}

export type ConductReportDecisionMutationInput = {
  reportId: string;
  currentModel: ConductReportModel;
  decision: ConductReportCommand;
  choice: ConductReportDecisionChoice;
  reason: string;
  options: ConductReportDecision;
  apiEnabled: boolean;
};

export function useConductReportDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "conduct-reports", "decision"],
    mutationFn: async ({ reportId, currentModel, decision, choice, reason, options, apiEnabled }: ConductReportDecisionMutationInput) => {
      if (!apiEnabled) return saveMockConductReportDecision(localStorage, reportId, decision, reason, choice);

      const result = await adminApiProvider.commands.decideConductReport(reportId, options);
      const summary = result.resourceSummary;
      if (summary.kind !== "CONDUCT_REPORT" || summary.id !== reportId || summary.status !== decision) {
        throw new Error("The Admin API returned an invalid Conduct Report decision.");
      }
      return {
        ...currentModel,
        ...summary,
        status: summary.status,
        version: result.resourceVersion,
        decisionLabel: options.outcome === "CONDUCT_REPORT_UPHELD"
          ? "Violation confirmed"
          : options.decisionReasonCode === "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE"
            ? "Insufficient evidence"
            : "No violation",
        decisionReasonCode: options.outcome === "CONDUCT_REPORT_DISMISSED"
          ? options.decisionReasonCode
          : null,
        decisionReason: options.outcome === "CONDUCT_REPORT_DISMISSED"
          ? options.decisionReasonCode
          : null,
      };
    },
    onSuccess: (record, { reportId }) => {
      const model = conductReportModelFromRecord(record);
      if (!model || model.id !== reportId) return;
      queryClient.setQueryData(conductReportDetailQueryKey(reportId), model);
      queryClient.setQueryData<InfiniteData<ConductReportPageData, string | null>>(conductReportBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    },
  });
}

function pageFromQueryData(pages: ConductReportPageData[]): ConductReportPageData {
  const lastPage = pages.at(-1);
  return {
    source: lastPage?.source ?? (isAdminApiEnabled() ? "api" : "mock"),
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
  };
}

export function useConductReportBoardQuery(initialData?: ConductReportPageData) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const query = useInfiniteQuery({
    queryKey: conductReportBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (apiEnabled) return loadConductReportPageData(undefined, pageParam ?? undefined);
      return pageParam
        ? loadConductReportsFromMock(window.localStorage, pageParam)
        : loadAllConductReportsFromMock(window.localStorage);
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
      const model = (event as CustomEvent<ConductReportModel>).detail;
      if (!model) return;
      queryClient.setQueryData<InfiniteData<ConductReportPageData, string | null>>(conductReportBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    };
    window.addEventListener(CONDUCT_REPORT_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(CONDUCT_REPORT_UPDATED_EVENT, updateRecord);
  }, [queryClient]);

  return { ...query, data };
}

export function useConductReportDetailQuery(reportId: string, initialModel?: ConductReportModel | null) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const queryKey = conductReportDetailQueryKey(reportId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const record = apiEnabled
        ? await adminApiProvider.read.getReport(reportId)
        : findConductReportFromMock(localStorage, reportId);
      const model = conductReportModelFromRecord(record);
      if (!model || model.id !== reportId) throw new Error("The Conduct Report was not found.");
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
      const model = (event as CustomEvent<ConductReportModel>).detail;
      if (!model || model.id !== reportId) return;
      queryClient.setQueryData(queryKey, model);
    };
    window.addEventListener(CONDUCT_REPORT_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(CONDUCT_REPORT_UPDATED_EVENT, updateRecord);
  }, [queryClient, queryKey, reportId]);

  return { ...query, data: query.data ?? null, queryKey };
}
