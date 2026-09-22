import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { isAdminApiEnabled } from "../api/admin-provider";
import { replaceInfiniteItem } from "../data/query-data";
import { loadAllMembersFromMock, loadMembersFromMock, recordMemberViolation, removeMemberPenalty, saveMemberNote } from "./member-adapter";
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
  const mockInitialModel = useMemo(() => {
    if (apiEnabled || initialModel || typeof window === "undefined") return undefined;
    try {
      return findMemberFromMock(window.localStorage, memberId) ?? undefined;
    } catch {
      return undefined;
    }
  }, [apiEnabled, initialModel, memberId]);
  const resolvedInitialModel = initialModel ?? mockInitialModel;
  const initialModelIsAuthoritative = initialModel?.source === "api";
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const model = apiEnabled
        ? await loadMemberDetailFromApi(memberId)
        : findMemberFromMock(localStorage, memberId);
      if (!model) throw new Error("The requested Member was not found.");
      return model;
    },
    initialData: resolvedInitialModel,
    staleTime: initialModelIsAuthoritative ? Infinity : 0,
    gcTime: Infinity,
    refetchOnMount: !initialModelIsAuthoritative,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialModel?.source === "api") queryClient.setQueryData(queryKey, initialModel);
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

export type MemberActionMutationInput =
  | { type: "record-violation"; memberId: string; reason: string; note: string }
  | { type: "remove-penalty"; memberId: string; reason: string }
  | { type: "save-note"; memberId: string; note: string };

export function useMemberActionMutation() {
  const queryClient = useQueryClient();
  const apiEnabled = isAdminApiEnabled();
  return useMutation({
    mutationKey: ["admin", "members", "action"],
    mutationFn: async (input: MemberActionMutationInput): Promise<MemberModel> => {
      if (apiEnabled) throw new Error(input.type === "save-note"
        ? "Admin notes are not available from the Admin API."
        : "Member penalty commands are not available from the Admin API.");

      if (input.type === "record-violation") {
        const result = recordMemberViolation(localStorage, input.memberId, input.reason, input.note);
        if (!result) throw new Error("The Member penalty could not be saved.");
        return result.model;
      }
      if (input.type === "remove-penalty") {
        const result = removeMemberPenalty(localStorage, input.memberId, input.reason);
        if (!result) throw new Error("The Member penalty could not be removed.");
        return result.model;
      }
      const model = saveMemberNote(localStorage, input.memberId, input.note);
      if (!model) throw new Error("The Admin note could not be saved.");
      return model;
    },
    onSuccess: (model) => {
      queryClient.setQueryData(memberDetailQueryKey(model.id), model);
      queryClient.setQueryData<InfiniteData<MemberPageData, string | null>>(memberBoardQueryKey, (current) => replaceInfiniteItem(current, model));
    },
  });
}
