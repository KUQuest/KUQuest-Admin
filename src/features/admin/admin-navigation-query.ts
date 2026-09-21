import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { isAdminMockEnabled } from "../../lib/auth/admin-auth-mode";
import { adminApiProvider } from "./api/admin-provider";
import { subscribeToAdminDataUpdates, subscribeToStorageUpdates } from "./data/admin-query-events";
import {
  adminNavigationCountsFromMockData,
  adminNavigationCountsFromOverview,
  type AdminNavigationCounts,
} from "./admin-navigation";
import { loadDashboardData } from "./dashboard/dashboard-bootstrap";

export const adminNavigationCountsQueryKey = ["admin", "navigation-counts"] as const;

export function useAdminNavigationCountsQuery() {
  const queryClient = useQueryClient();
  const mockEnabled = isAdminMockEnabled();
  const queryKey = useMemo(
    () => [...adminNavigationCountsQueryKey, mockEnabled ? "mock" : "api"] as const,
    [mockEnabled],
  );
  const query = useQuery<AdminNavigationCounts>({
    queryKey,
    queryFn: async () => {
      if (mockEnabled) {
        return adminNavigationCountsFromMockData(loadDashboardData(localStorage).collections);
      }
      return adminNavigationCountsFromOverview(await adminApiProvider.read.getOverview());
    },
    staleTime: 30_000,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const refreshCounts = () => {
      void queryClient.invalidateQueries({ queryKey });
    };
    const unsubscribeFromDataUpdates = subscribeToAdminDataUpdates(refreshCounts);
    const unsubscribeFromStorageUpdates = subscribeToStorageUpdates(refreshCounts);
    return () => {
      unsubscribeFromDataUpdates();
      unsubscribeFromStorageUpdates();
    };
  }, [queryClient, queryKey]);

  return query;
}
