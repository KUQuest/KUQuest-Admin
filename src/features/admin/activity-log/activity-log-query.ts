import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { DEFAULT_ACTIVITY_LOG_FILTERS, type ActivityLogFilters, type ActivityLogPageData } from "./activity-log-model";
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

export function useActivityLogQuery(filters: ActivityLogFilters, initialData?: ActivityLogPageData) {
  const queryKey = useMemo(() => [...activityLogQueryKey, filters] as const, [filters]);
  const seedQuery = Boolean(initialData && isDefaultFilters(filters));
  return useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => loadActivityLogPageData(undefined, filters, pageParam ?? undefined),
    initialData: seedQuery && initialData ? { pages: [initialData], pageParams: [null] } : undefined,
    staleTime: seedQuery ? Infinity : 0,
    refetchOnMount: !seedQuery,
    refetchOnWindowFocus: false,
    retry: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
