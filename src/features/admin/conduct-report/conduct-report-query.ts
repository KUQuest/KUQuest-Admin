import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";
import {
  findConductReportFromMock,
  loadAllConductReportsFromMock,
  loadConductReportsFromMock,
} from "./conduct-report-adapter";
import { loadConductReportPageData, type ConductReportPageData } from "./conduct-report-service";
import { CONDUCT_REPORT_UPDATED_EVENT, conductReportModelFromRecord, type ConductReportModel } from "./conduct-report-model";

export const conductReportBoardQueryKey = ["admin", "conduct-reports", "board"] as const;

export function conductReportDetailQueryKey(reportId: string) {
  return ["admin", "conduct-reports", "detail", reportId] as const;
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
      queryClient.setQueryData<InfiniteData<ConductReportPageData, string | null>>(conductReportBoardQueryKey, (current) => current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => item.id === model.id ? model : item),
            })),
          }
        : current);
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
