import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import { activityLogFixturePageData, DEFAULT_ACTIVITY_LOG_FILTERS, type ActivityLogFilters, type ActivityLogPageData } from "./activity-log-model";
import { loadActivityLogPageData } from "./activity-log-service";

export const activityLogQueryKey = ["admin", "activity-log"] as const;

function isDefaultFilters(filters: ActivityLogFilters): boolean {
  return filters.action === DEFAULT_ACTIVITY_LOG_FILTERS.action
    && filters.resourceType === DEFAULT_ACTIVITY_LOG_FILTERS.resourceType
    && filters.resourceId === DEFAULT_ACTIVITY_LOG_FILTERS.resourceId
    && filters.adminId === DEFAULT_ACTIVITY_LOG_FILTERS.adminId
    && filters.fromDate === DEFAULT_ACTIVITY_LOG_FILTERS.fromDate
    && filters.toDate === DEFAULT_ACTIVITY_LOG_FILTERS.toDate
    && filters.sort === DEFAULT_ACTIVITY_LOG_FILTERS.sort;
}

function loadAllActivityLogFromMock(filters: ActivityLogFilters): ActivityLogPageData {
  const firstPage = activityLogFixturePageData(filters);
  const items = [...firstPage.items];
  let cursor = firstPage.nextCursor ?? undefined;
  while (cursor) {
    const nextPage = activityLogFixturePageData(filters, cursor);
    items.push(...nextPage.items);
    if (nextPage.nextCursor === cursor) break;
    cursor = nextPage.nextCursor ?? undefined;
  }
  return { ...firstPage, items, nextCursor: null };
}

export function useActivityLogQuery(filters: ActivityLogFilters, initialData?: ActivityLogPageData) {
  const apiEnabled = isAdminApiEnabled();
  const queryKey = useMemo(() => [...activityLogQueryKey, filters] as const, [filters]);
  const seedQuery = Boolean(initialData && isDefaultFilters(filters));
  return useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!apiEnabled) return loadAllActivityLogFromMock(filters);
      return loadActivityLogPageData(undefined, filters, pageParam ?? undefined);
    },
    initialData: seedQuery && initialData ? { pages: [initialData], pageParams: [null] } : undefined,
    staleTime: seedQuery ? Infinity : 0,
    refetchOnMount: !seedQuery,
    refetchOnWindowFocus: false,
    retry: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
