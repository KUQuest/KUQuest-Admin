import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "./api/admin-provider";
import { subscribeToAdminDataUpdates } from "./data/admin-query-events";
import { adminNavigationCountsFromOverview } from "./admin-navigation";

export const adminNavigationCountsQueryKey = ["admin", "navigation-counts"] as const;

export function useAdminNavigationCountsQuery() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: adminNavigationCountsQueryKey,
    queryFn: async () => adminNavigationCountsFromOverview(await adminApiProvider.read.getOverview()),
    staleTime: 30_000,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const refreshCounts = () => {
      void queryClient.invalidateQueries({ queryKey: adminNavigationCountsQueryKey });
    };
    const unsubscribeFromDataUpdates = subscribeToAdminDataUpdates(refreshCounts);
    return () => {
      unsubscribeFromDataUpdates();
    };
  }, [queryClient]);

  return query;
}
