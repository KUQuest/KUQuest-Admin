import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AdminSearchKind } from "../api/admin-api";
import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";
import { loadOverviewMockData } from "./overview-adapter";

export type OverviewSearchQueryData =
  | { source: "mock"; data: ReturnType<typeof loadOverviewMockData> }
  | { source: "api"; data: Awaited<ReturnType<typeof adminApiProvider.read.searchAdminRecords>> };

export const overviewSearchQueryKey = ["admin", "global-search"] as const;

export function useOverviewSearchQuery(
  open: boolean,
  query: string,
  kind: AdminSearchKind,
) {
  const apiEnabled = isAdminApiEnabled();
  const normalizedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(normalizedQuery), 250);
    return () => window.clearTimeout(timeoutId);
  }, [normalizedQuery]);

  const isDebouncing = apiEnabled && normalizedQuery !== debouncedQuery;
  const search = useQuery<OverviewSearchQueryData>({
    queryKey: [
      ...overviewSearchQueryKey,
      apiEnabled ? "api" : "mock",
      apiEnabled ? debouncedQuery : "",
      apiEnabled ? kind : "all",
    ],
    enabled: open && (!apiEnabled || (Boolean(debouncedQuery) && !isDebouncing)),
    queryFn: async () => apiEnabled
      ? { source: "api", data: await adminApiProvider.read.searchAdminRecords({ q: debouncedQuery, kind }) }
      : { source: "mock", data: loadOverviewMockData(localStorage) },
    staleTime: 5_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return { ...search, isDebouncing };
}
