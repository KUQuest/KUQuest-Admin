import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import { subscribeToAdminDataUpdates, subscribeToStorageUpdates } from "../data/admin-query-events";
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
    const unsubscribeFromDataUpdates = subscribeToAdminDataUpdates(updateOverview);
    const unsubscribeFromStorageUpdates = subscribeToStorageUpdates(updateOverview);
    window.addEventListener("focus", updateOverview);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      unsubscribeFromDataUpdates();
      unsubscribeFromStorageUpdates();
      window.removeEventListener("focus", updateOverview);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [apiEnabled, queryClient, queryKey]);

  return { ...query, queryKey };
}
