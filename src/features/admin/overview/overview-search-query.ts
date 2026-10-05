import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AdminSearchKind } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";

export type OverviewSearchQueryData = Awaited<ReturnType<typeof adminApiProvider.read.searchAdminRecords>>;

export const overviewSearchQueryKey = ["admin", "global-search"] as const;

export function useOverviewSearchQuery(
  open: boolean,
  query: string,
  kind: AdminSearchKind,
) {
  const normalizedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(normalizedQuery), 250);
    return () => window.clearTimeout(timeoutId);
  }, [normalizedQuery]);

  const isDebouncing = normalizedQuery !== debouncedQuery;
  const search = useQuery<OverviewSearchQueryData>({
    queryKey: [
      ...overviewSearchQueryKey,
      debouncedQuery,
      kind,
    ],
    enabled: open && Boolean(debouncedQuery) && !isDebouncing,
    queryFn: () => adminApiProvider.read.searchAdminRecords({ q: debouncedQuery, kind }),
    staleTime: 5_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return { ...search, isDebouncing };
}
