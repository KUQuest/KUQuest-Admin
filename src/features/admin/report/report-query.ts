import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import {
  loadAllReportCasesFromMock,
  loadReportCasesFromMock,
} from "./report-adapter";
import { loadReportCasePageData, type ReportCasePageData } from "./report-service";
import { REPORT_CASE_UPDATED_EVENT, type ReportCaseModel } from "./report-model";

export const reportBoardQueryKey = ["admin", "report-cases", "board"] as const;

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
      queryClient.setQueryData<InfiniteData<ReportCasePageData, string | null>>(reportBoardQueryKey, (current) => current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => item.id === model.id ? model : item),
            })),
          }
        : current);
    };
    window.addEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
    return () => window.removeEventListener(REPORT_CASE_UPDATED_EVENT, updateRecord);
  }, [queryClient]);

  return { ...query, data };
}
