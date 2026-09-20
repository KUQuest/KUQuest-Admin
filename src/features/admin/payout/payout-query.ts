import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  PayoutBoardPageData,
  PayoutDataSource,
} from "./payout-service";

export function payoutBoardQueryKey(dataSource: PayoutDataSource) {
  return ["admin", "payouts", "board", dataSource] as const;
}

export function usePayoutBoardQuery(
  initialData: PayoutBoardPageData,
  dataSource: PayoutDataSource,
) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => payoutBoardQueryKey(dataSource), [dataSource]);
  const query = useQuery({
    queryKey,
    queryFn: async () => initialData,
    initialData,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    queryClient.setQueryData(queryKey, initialData);
  }, [initialData, queryClient, queryKey]);

  return { ...query, queryKey };
}
