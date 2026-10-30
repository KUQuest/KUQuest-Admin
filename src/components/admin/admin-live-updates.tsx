"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { subscribeToAdminEvents } from "../../features/admin/api/admin-api-events";
import type { AdminEvent, AdminEventSubjectType } from "../../features/admin/api/admin-api-types-commands";

type QueryKeyPrefix = readonly unknown[];

const sharedQueryPrefixes: readonly QueryKeyPrefix[] = [
  ["admin", "navigation-counts"],
  ["admin", "overview"],
  ["admin", "global-search"],
];

function queryPrefixesForEvent(event: AdminEvent): QueryKeyPrefix[] {
  const subjectPrefixes: Record<AdminEventSubjectType, QueryKeyPrefix[]> = {
    QUEST: [["admin", "quests"]],
    DISPUTE_CASE: [
      ["admin", "dispute-cases", "board"],
      ["admin", "dispute-cases", "detail", event.subjectId],
    ],
    REPORT_CASE: [
      ["admin", "report-cases", "board"],
      ["admin", "report-cases", "detail", event.subjectId],
    ],
    CONDUCT_REPORT: [
      ["admin", "conduct-reports", "board"],
      ["admin", "conduct-reports", "detail", event.subjectId],
    ],
    MEMBER: [
      ["admin", "members", "board"],
      ["admin", "members", "detail", event.subjectId],
      ["admin", "wallets"],
      ["admin", "quests"],
    ],
    WALLET: [
      ["admin", "wallets", "board"],
      ["admin", "wallets", "detail", event.subjectId],
      ["admin", "members", "detail"],
      ["admin", "finance"],
    ],
    PAYOUT: [
      ["admin", "payouts"],
      ["admin", "members", "detail"],
      ["admin", "finance"],
    ],
    TOP_UP: [
      ["admin", "finance"],
      ["admin", "members", "detail"],
    ],
    ADMIN_ACTIVITY_LOG: [["admin", "activity-log"]],
  };

  return [...sharedQueryPrefixes, ...subjectPrefixes[event.subjectType]];
}

function queryKeyStartsWith(queryKey: readonly unknown[], prefix: QueryKeyPrefix): boolean {
  return prefix.length <= queryKey.length
    && prefix.every((part, index) => Object.is(part, queryKey[index]));
}

export function AdminLiveUpdates() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const refreshActiveAdminData = () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"], refetchType: "active" });
      router.refresh();
    };

    const subscription = subscribeToAdminEvents({
      onEvent: (event) => {
        const prefixes = queryPrefixesForEvent(event);
        void queryClient.invalidateQueries({
          predicate: (query) => prefixes.some((prefix) => queryKeyStartsWith(query.queryKey, prefix)),
        });
        router.refresh();
      },
      onOpen: refreshActiveAdminData,
    });

    return () => subscription.close();
  }, [queryClient, router]);

  return null;
}
