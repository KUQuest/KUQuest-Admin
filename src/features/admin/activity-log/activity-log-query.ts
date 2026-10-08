import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { AdminActivityLog } from "../api/admin-api";
import { DEFAULT_ACTIVITY_LOG_FILTERS, type ActivityLogFilters, type ActivityLogPageData } from "./activity-log-model";
import { loadActivityLogPageData } from "./activity-log-service";

export const activityLogQueryKey = ["admin", "activity-log"] as const;

export type AdminDecisionActivity = {
  action: string;
  reasonCode: string | null;
  decisionReasonText: string | null;
  adminName: string | null;
};

export type AdminDecisionActivityReadback =
  | { kind: "found"; entry: AdminDecisionActivity }
  | { kind: "empty" }
  | { kind: "invalid" };

export type AdminDecisionActivityState = AdminDecisionActivityReadback | { kind: "loading" | "unavailable" };

export function decisionActivityStateFromQuery(query: {
  isPending: boolean;
  isError: boolean;
  data?: AdminDecisionActivityReadback;
}): AdminDecisionActivityState {
  if (query.isPending) return { kind: "loading" };
  if (query.isError) return { kind: "unavailable" };
  return query.data ?? { kind: "invalid" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function decisionActivityFromResponse(
  value: unknown,
  resourceType: string,
  actions: readonly string[],
): AdminDecisionActivityReadback {
  if (!isRecord(value) || !Array.isArray(value.items)) return { kind: "invalid" };

  const entries: AdminActivityLog[] = [];
  for (const item of value.items) {
    if (
      !isRecord(item)
      || typeof item.action !== "string"
      || typeof item.resourceType !== "string"
      || !isNullableText(item.reasonCode)
      || !isNullableText(item.decisionReasonText)
      || !isRecord(item.admin)
      || typeof item.admin.firstName !== "string"
      || typeof item.admin.lastName !== "string"
      || typeof item.createdAt !== "string"
      || !Number.isFinite(Date.parse(item.createdAt))
    ) return { kind: "invalid" };
    entries.push(item as unknown as AdminActivityLog);
  }

  const entry = entries
    .filter((item) => (
      item.resourceType.toLocaleLowerCase() === resourceType.toLocaleLowerCase()
      && actions.includes(item.action)
    ))
    .toSorted((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  if (!entry) return { kind: "empty" };

  const adminName = `${entry.admin.firstName} ${entry.admin.lastName}`.trim() || null;
  return {
    kind: "found",
    entry: {
      action: entry.action,
      reasonCode: entry.reasonCode,
      decisionReasonText: entry.decisionReasonText ?? null,
      adminName,
    },
  };
}

export function adminDecisionActivityQueryKey(resourceType: string, resourceId: string) {
  return [...activityLogQueryKey, "decision", resourceType, resourceId] as const;
}

export function useAdminDecisionActivityQuery(
  resourceType: string,
  resourceId: string,
  actions: readonly string[],
) {
  return useQuery({
    queryKey: adminDecisionActivityQueryKey(resourceType, resourceId),
    queryFn: async () => {
      const pages = await Promise.all(actions.map((action) => adminApiProvider.read.listActivityLogs({
        action,
        resourceType,
        resourceId,
        limit: 1,
        sort: "newest",
      })));
      return decisionActivityFromResponse({ items: pages.flatMap((page) => page.items) }, resourceType, actions);
    },
    enabled: Boolean(resourceId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

function isDefaultFilters(filters: ActivityLogFilters): boolean {
  return filters.action === DEFAULT_ACTIVITY_LOG_FILTERS.action
    && filters.resourceType === DEFAULT_ACTIVITY_LOG_FILTERS.resourceType
    && filters.resourceId === DEFAULT_ACTIVITY_LOG_FILTERS.resourceId
    && filters.adminId === DEFAULT_ACTIVITY_LOG_FILTERS.adminId
    && filters.fromDate === DEFAULT_ACTIVITY_LOG_FILTERS.fromDate
    && filters.toDate === DEFAULT_ACTIVITY_LOG_FILTERS.toDate
    && filters.sort === DEFAULT_ACTIVITY_LOG_FILTERS.sort;
}

export function useActivityLogQuery(filters: ActivityLogFilters, initialData?: ActivityLogPageData) {
  const queryKey = useMemo(() => [...activityLogQueryKey, filters] as const, [filters]);
  const seedQuery = Boolean(initialData && isDefaultFilters(filters));
  return useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => loadActivityLogPageData(undefined, filters, pageParam ?? undefined),
    initialData: seedQuery && initialData ? { pages: [initialData], pageParams: [null] } : undefined,
    staleTime: seedQuery ? Infinity : 0,
    refetchOnMount: !seedQuery,
    refetchOnWindowFocus: false,
    retry: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
