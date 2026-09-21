import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { isAdminMockEnabled } from "../../lib/auth/admin-auth-mode";
import { adminApiProvider } from "./api/admin-provider";
import { CONDUCT_REPORT_UPDATED_EVENT } from "./conduct-report/conduct-report-model";
import { DISPUTE_CASE_UPDATED_EVENT } from "./dispute/dispute-model";
import { PAYOUT_MOCK_UPDATED_EVENT } from "./payout/payout-mock-state";
import { REPORT_CASE_UPDATED_EVENT } from "./report/report-model";
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
    const updateEvents = [
      CONDUCT_REPORT_UPDATED_EVENT,
      DISPUTE_CASE_UPDATED_EVENT,
      PAYOUT_MOCK_UPDATED_EVENT,
      REPORT_CASE_UPDATED_EVENT,
    ];

    updateEvents.forEach((eventName) => window.addEventListener(eventName, refreshCounts));
    window.addEventListener("storage", refreshCounts);
    return () => {
      updateEvents.forEach((eventName) => window.removeEventListener(eventName, refreshCounts));
      window.removeEventListener("storage", refreshCounts);
    };
  }, [queryClient, queryKey]);

  return query;
}
