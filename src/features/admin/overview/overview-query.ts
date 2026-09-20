import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import { CONDUCT_REPORT_UPDATED_EVENT } from "../conduct-report/conduct-report-model";
import { DISPUTE_CASE_UPDATED_EVENT } from "../dispute/dispute-model";
import { PAYOUT_MOCK_UPDATED_EVENT } from "../payout/payout-mock-state";
import { REPORT_CASE_UPDATED_EVENT } from "../report/report-model";
import { loadOverviewModelFromMock } from "./overview-adapter";
import { mockFinanceOverview } from "./overview-finance-mock-data";
import { loadOverviewPageData, type OverviewPageData } from "./overview-service";

export const overviewQueryKey = ["admin", "overview"] as const;

function mockOverviewPageData(): OverviewPageData {
  return {
    model: loadOverviewModelFromMock(window.localStorage),
    financeOverview: mockFinanceOverview,
    financeOverviewError: null,
    searchData: null,
    searchError: null,
  };
}

export function useOverviewQuery(initialData?: OverviewPageData) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const queryKey = useMemo(
    () => [...overviewQueryKey, apiEnabled ? "api" : "mock"] as const,
    [apiEnabled],
  );
  const query = useQuery({
    queryKey,
    queryFn: () => apiEnabled ? loadOverviewPageData() : mockOverviewPageData(),
    initialData,
    staleTime: initialData ? Infinity : apiEnabled ? 0 : Infinity,
    gcTime: Infinity,
    refetchOnMount: !initialData && apiEnabled,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialData) queryClient.setQueryData(queryKey, initialData);
  }, [initialData, queryClient, queryKey]);

  useEffect(() => {
    const updateOverview = () => {
      void queryClient.invalidateQueries({ queryKey });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") updateOverview();
    };
    const updateEvents = [
      CONDUCT_REPORT_UPDATED_EVENT,
      DISPUTE_CASE_UPDATED_EVENT,
      PAYOUT_MOCK_UPDATED_EVENT,
      REPORT_CASE_UPDATED_EVENT,
    ];

    updateEvents.forEach((eventName) => window.addEventListener(eventName, updateOverview));
    window.addEventListener("focus", updateOverview);
    window.addEventListener("storage", updateOverview);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      updateEvents.forEach((eventName) => window.removeEventListener(eventName, updateOverview));
      window.removeEventListener("focus", updateOverview);
      window.removeEventListener("storage", updateOverview);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [apiEnabled, queryClient, queryKey]);

  return { ...query, queryKey };
}
