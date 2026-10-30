import type { QueryClient } from "@tanstack/react-query";

import type { AdminEvent, AdminEventSubjectType } from "./api/admin-api-types-commands";

type QueryKeyPrefix = readonly unknown[];

const sharedQueryPrefixes: readonly QueryKeyPrefix[] = [
  ["admin", "navigation-counts"],
  ["admin", "overview"],
  ["admin", "global-search"],
];

const subjectPrefixesForEvent = (event: AdminEvent): Record<AdminEventSubjectType, QueryKeyPrefix[]> => ({
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
    ["admin", "dispute-cases", "board"],
    ["admin", "dispute-cases", "detail"],
    ["admin", "report-cases", "board"],
    ["admin", "report-cases", "detail"],
    ["admin", "conduct-reports", "board"],
    ["admin", "conduct-reports", "detail"],
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
});

function queryKeyStartsWith(queryKey: readonly unknown[], prefix: QueryKeyPrefix): boolean {
  return prefix.length <= queryKey.length
    && prefix.every((part, index) => Object.is(part, queryKey[index]));
}

export function invalidateAdminQueriesForEvent(queryClient: QueryClient, event: AdminEvent): Promise<void> {
  const prefixes = [...sharedQueryPrefixes, ...subjectPrefixesForEvent(event)[event.subjectType]];
  return queryClient.invalidateQueries({
    predicate: (query) => prefixes.some((prefix) => queryKeyStartsWith(query.queryKey, prefix)),
  });
}

export function invalidateActiveAdminQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ["admin"], refetchType: "active" });
}
