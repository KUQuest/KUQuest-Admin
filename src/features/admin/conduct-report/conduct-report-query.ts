import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { ConductReportDecision } from "../api/admin-api";
import { replaceInfiniteItem } from "../data/query-data";
import { adminDecisionActivityQueryKey } from "../activity-log/activity-log-query";
import { loadConductReportPageData, type ConductReportPageData } from "./conduct-report-service";
import {
  CONDUCT_REPORT_UPDATED_EVENT,
  conductReportDecisionDetailsForCommand,
  conductReportModelFromRecord,
  type ConductReportCommand,
  type ConductReportModel,
} from "./conduct-report-model";

export const conductReportBoardQueryKey = ["admin", "conduct-reports", "board"] as const;

export function conductReportDetailQueryKey(reportId: string) {
  return ["admin", "conduct-reports", "detail", reportId] as const;
}

export type ConductReportDecisionMutationInput = {
  reportId: string;
  currentModel: ConductReportModel;
  decision: ConductReportCommand;
  options: ConductReportDecision;
};

export function useConductReportDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "conduct-reports", "decision"],
    mutationFn: async ({ reportId, currentModel, decision, options }: ConductReportDecisionMutationInput) => {
      const result = await adminApiProvider.commands.decideConductReport(reportId, options);
      const summary = result.resourceSummary;
      if (summary.kind !== "CONDUCT_REPORT" || summary.id !== reportId || summary.status !== decision) {
        throw new Error("The Admin API returned an invalid Conduct Report decision.");
      }
      const decisionDetails = conductReportDecisionDetailsForCommand(options);
      return {
        ...currentModel,
        ...summary,
        status: summary.status,
        version: result.resourceVersion,
        decisionLabel: decisionDetails.label,
        decisionReasonCode: decisionDetails.decisionReasonCode,
      };
    },
    onSuccess: async (record, { reportId }) => {
      const model = conductReportModelFromRecord(record);
      if (!model || model.id !== reportId) return;
      queryClient.setQueryData(conductReportDetailQueryKey(reportId), model);
      queryClient.setQueryData<InfiniteData<ConductReportPageData, string | null>>(conductReportBoardQueryKey, (current) => replaceInfiniteItem(current, model));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: conductReportBoardQueryKey, refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: adminDecisionActivityQueryKey("conduct_report", reportId) }),
      ]);
    },
  });
}

function pageFromQueryData(pages: ConductReportPageData[]): ConductReportPageData {
  const firstPage = pages[0];
  const lastPage = pages.at(-1);
  return {
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
    ...(firstPage?.countsByStatus ? { countsByStatus: firstPage.countsByStatus } : {}),
  };
}

export function useConductReportBoardQuery(initialData?: ConductReportPageData) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: conductReportBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => loadConductReportPageData(undefined, pageParam ?? undefined),
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
  const queryKey = conductReportDetailQueryKey(reportId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const model = conductReportModelFromRecord(await adminApiProvider.read.getReport(reportId));
      if (!model || model.id !== reportId) throw new Error("The Conduct Report was not found.");
      return model;
    },
    initialData: initialModel ?? undefined,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: true,
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
