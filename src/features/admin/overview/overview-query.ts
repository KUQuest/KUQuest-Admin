import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { subscribeToAdminDataUpdates } from "../data/admin-query-events";
import { loadOverviewPageData, type OverviewPageData } from "./overview-service";

export const overviewQueryKey = ["admin", "overview"] as const;

export function useOverviewQuery(initialData?: OverviewPageData) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: overviewQueryKey,
    queryFn: () => loadOverviewPageData(),
    initialData,
    staleTime: initialData ? Infinity : 0,
    gcTime: Infinity,
    refetchOnMount: !initialData,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialData) queryClient.setQueryData(overviewQueryKey, initialData);
  }, [initialData, queryClient]);

  useEffect(() => {
    const updateOverview = () => {
      void queryClient.invalidateQueries({ queryKey: overviewQueryKey });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") updateOverview();
    };
    const unsubscribeFromDataUpdates = subscribeToAdminDataUpdates(updateOverview);
    window.addEventListener("focus", updateOverview);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      unsubscribeFromDataUpdates();
      window.removeEventListener("focus", updateOverview);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [queryClient]);

  return { ...query, queryKey: overviewQueryKey };
}
