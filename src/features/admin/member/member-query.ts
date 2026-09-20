import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import { loadAllMembersFromMock, loadMembersFromMock } from "./member-adapter";
import { MEMBER_UPDATED_EVENT } from "./member-events";
import type { MemberModel, MemberPageData } from "./member-model";
import { loadMemberPageData } from "./member-service";

export const memberBoardQueryKey = ["admin", "members", "board"] as const;

function pageFromQueryData(pages: MemberPageData[]): MemberPageData {
  const lastPage = pages.at(-1);
  return {
    source: lastPage?.source ?? (isAdminApiEnabled() ? "api" : "mock"),
    items: pages.flatMap((page) => page.items),
    nextCursor: lastPage?.nextCursor ?? null,
  };
}

export function useMemberBoardQuery(initialData?: MemberPageData) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const query = useInfiniteQuery({
    queryKey: memberBoardQueryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (apiEnabled) return loadMemberPageData(undefined, pageParam ?? undefined);
      return pageParam
        ? loadMembersFromMock(window.localStorage, pageParam)
        : loadAllMembersFromMock(window.localStorage);
    },
    initialData: initialData
      ? { pages: [initialData], pageParams: [null] }
      : undefined,
    staleTime: initialData ? Infinity : 0,
    refetchOnMount: !initialData,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const data = useMemo(() => pageFromQueryData(query.data?.pages ?? []), [query.data?.pages]);

  useEffect(() => {
    const updateMember = (event: Event) => {
      const model = (event as CustomEvent<MemberModel>).detail;
      if (!model) return;
      queryClient.setQueryData<InfiniteData<MemberPageData, string | null>>(memberBoardQueryKey, (current) => current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => item.id === model.id ? model : item),
            })),
          }
        : current);
    };
    window.addEventListener(MEMBER_UPDATED_EVENT, updateMember);
    return () => window.removeEventListener(MEMBER_UPDATED_EVENT, updateMember);
  }, [queryClient]);

  return { ...query, data };
}
