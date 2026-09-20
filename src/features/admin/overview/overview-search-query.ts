import { useQuery } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import { loadOverviewMockData } from "./overview-adapter";
import {
  loadOverviewSearchData,
} from "./overview-service";
import type { OverviewApiSearchData } from "./overview-model";

export type OverviewSearchQueryData =
  | { source: "mock"; data: ReturnType<typeof loadOverviewMockData> }
  | { source: "api"; data: OverviewApiSearchData };

export const overviewSearchQueryKey = ["admin", "overview-search"] as const;

export function useOverviewSearchQuery(
  open: boolean,
  initialData?: OverviewApiSearchData | null,
) {
  const apiEnabled = isAdminApiEnabled();
  return useQuery<OverviewSearchQueryData>({
    queryKey: [...overviewSearchQueryKey, apiEnabled ? "api" : "mock"],
    enabled: open,
    queryFn: async () => apiEnabled
      ? { source: "api", data: await loadOverviewSearchData() }
      : { source: "mock", data: loadOverviewMockData(localStorage) },
    initialData: initialData ? { source: "api", data: initialData } : undefined,
    staleTime: 30_000,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
