import { expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import { invalidateAdminQueriesForEvent } from "../../src/features/admin/admin-live-invalidation";

const memberAffectedQueryKeys = [
  ["admin", "navigation-counts"],
  ["admin", "overview"],
  ["admin", "global-search", "members"],
  ["admin", "members", "board"],
  ["admin", "members", "detail", "member-1"],
  ["admin", "wallets", "board"],
  ["admin", "wallets", "detail", "wallet-1"],
  ["admin", "quests", "board"],
  ["admin", "dispute-cases", "board"],
  ["admin", "dispute-cases", "detail", "dispute-1"],
  ["admin", "report-cases", "board"],
  ["admin", "report-cases", "detail", "report-1"],
  ["admin", "conduct-reports", "board"],
  ["admin", "conduct-reports", "detail", "conduct-report-1"],
] as const;

it("invalidates cached Member data in case boards, details, counts, and summaries", async () => {
  const queryClient = new QueryClient();
  for (const queryKey of memberAffectedQueryKeys) {
    queryClient.setQueryData(queryKey, { memberName: "Old name" });
  }
  const unrelatedQueryKey = ["admin", "payouts", "board"] as const;
  queryClient.setQueryData(unrelatedQueryKey, { memberName: "Old name" });

  await invalidateAdminQueriesForEvent(queryClient, {
    type: "RESOURCE_UPDATED",
    subjectType: "MEMBER",
    subjectId: "member-1",
  });

  for (const queryKey of memberAffectedQueryKeys) {
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
  }
  expect(queryClient.getQueryState(unrelatedQueryKey)?.isInvalidated).toBe(false);
  queryClient.clear();
});
