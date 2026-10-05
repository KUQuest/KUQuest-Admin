import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import { replaceInfiniteItem } from "../data/query-data";
import type { MemberModel, MemberPageData } from "./member-model";
import { loadMemberDetailFromApi, loadMemberPageData } from "./member-service";

export const memberBoardQueryKey = ["admin", "members", "board"] as const;

export function memberDetailQueryKey(memberId: string) {
  return ["admin", "members", "detail", memberId] as const;
}

function pageFromQueryData(pages: MemberPageData[]): MemberPageData {
  const lastPage = pages.at(-1);
  return {
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
  };
}

export function useMemberBoardQuery(initialData?: MemberPageData) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: memberBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => loadMemberPageData(undefined, pageParam ?? undefined),
    initialData: initialData
      ? { pages: [initialData], pageParams: [null] }
      : undefined,
    staleTime: initialData ? Infinity : 0,
    refetchOnMount: !initialData,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const data = useMemo(() => pageFromQueryData(query.data?.pages ?? []), [query.data?.pages]);

  return { ...query, data };
}

export function useMemberDetailQuery(memberId: string, initialModel?: MemberModel | null) {
  const queryClient = useQueryClient();
  const queryKey = memberDetailQueryKey(memberId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const model = await loadMemberDetailFromApi(memberId);
      if (!model) throw new Error("The requested Member was not found.");
      return model;
    },
    initialData: initialModel ?? undefined,
    staleTime: initialModel ? Infinity : 0,
    gcTime: Infinity,
    refetchOnMount: !initialModel,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialModel) queryClient.setQueryData(queryKey, initialModel);
  }, [initialModel, queryClient, queryKey]);

  return {
    ...query,
    data: query.data ?? null,
    queryKey,
  };
}

export function useMemberTopUpsQuery(memberId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["admin", "members", "detail", memberId, "top-ups"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminApiProvider.read.listTopUps({
      userId: memberId,
      limit: 25,
      ...(pageParam ? { cursor: pageParam } : {}),
    }),
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
