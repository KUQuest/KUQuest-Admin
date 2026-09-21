import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import { replaceInfiniteItem } from "../data/query-data";
import { loadAllMembersFromMock, loadMembersFromMock } from "./member-adapter";
import { MEMBER_UPDATED_EVENT } from "./member-events";
import { findMemberFromMock } from "./member-adapter";
import type { MemberModel, MemberPageData } from "./member-model";
import { loadMemberDetailFromApi, loadMemberPageData } from "./member-service";

export const memberBoardQueryKey = ["admin", "members", "board"] as const;

export function memberDetailQueryKey(memberId: string) {
  return ["admin", "members", "detail", memberId] as const;
}

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
      queryClient.setQueryData<InfiniteData<MemberPageData, string | null>>(memberBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    };
    window.addEventListener(MEMBER_UPDATED_EVENT, updateMember);
    return () => window.removeEventListener(MEMBER_UPDATED_EVENT, updateMember);
  }, [queryClient]);

  return { ...query, data };
}

export function useMemberDetailQuery(memberId: string, initialModel?: MemberModel | null) {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  const queryKey = memberDetailQueryKey(memberId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const model = apiEnabled
        ? await loadMemberDetailFromApi(memberId)
        : findMemberFromMock(localStorage, memberId);
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

  useEffect(() => {
    const updateMember = (event: Event) => {
      const model = (event as CustomEvent<MemberModel>).detail;
      if (!model || model.id !== memberId) return;
      queryClient.setQueryData(queryKey, model);
    };
    window.addEventListener(MEMBER_UPDATED_EVENT, updateMember);
    return () => window.removeEventListener(MEMBER_UPDATED_EVENT, updateMember);
  }, [memberId, queryClient, queryKey]);

  return {
    ...query,
    data: query.data ?? null,
    queryKey,
  };
}
