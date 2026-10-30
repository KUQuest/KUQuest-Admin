import type { AdminActivityListQuery, AdminSearchKind } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { displayAdminId } from "../display-admin-id";
import {
  activityTargetHref,
  activityLogEntryFromApi,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  type ActivityLogEntry,
  type ActivityLogFilters,
  type ActivityLogPageData,
} from "./activity-log-model";

export type { ActivityLogEntry, ActivityLogFilters, ActivityLogPageData } from "./activity-log-model";
export {
  activityLogCsv,
  activityLogMatchesSearch,
  activityLogEntryMatchesFilters,
  activityLogTargetLabel,
  activityTargetHref,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
} from "./activity-log-model";

function activityTargetSearchKind(resourceType: string): AdminSearchKind | null {
  switch (resourceType.trim().toUpperCase()) {
    case "DISPUTE_CASE": return "dispute";
    case "MEMBER":
    case "USER": return "member";
    case "QUEST": return "quest";
    case "PAYOUT": return "payout";
    case "REPORT_CASE": return "report";
    case "CONDUCT_REPORT": return "conduct-report";
    default: return null;
  }
}

export function canOpenActivityTarget(entry: Pick<ActivityLogEntry, "resourceType" | "resourceId" | "resourceDisplayId">): boolean {
  if (activityTargetHref(entry.resourceType, entry.resourceId)) return true;
  return Boolean(displayAdminId(entry.resourceDisplayId) && activityTargetSearchKind(entry.resourceType));
}

export async function resolveActivityTargetHref(
  entry: Pick<ActivityLogEntry, "resourceType" | "resourceId" | "resourceDisplayId">,
  searchRecords = (query: { q: string; kind: AdminSearchKind }) => adminApiProvider.read.searchAdminRecords(query),
): Promise<string | null> {
  const directHref = activityTargetHref(entry.resourceType, entry.resourceId);
  if (directHref) return directHref;

  const kind = activityTargetSearchKind(entry.resourceType);
  const displayId = displayAdminId(entry.resourceDisplayId);
  if (!kind || !displayId) return null;

  const response = await searchRecords({ q: displayId, kind });
  const match = response.items.find((item) => item.kind === kind && item.displayId === displayId);
  return match ? activityTargetHref(entry.resourceType, match.resourceId) : null;
}

export async function loadActivityLogPageData(
  cookieHeader?: string,
  filters: ActivityLogFilters = DEFAULT_ACTIVITY_LOG_FILTERS,
  cursor?: string,
): Promise<ActivityLogPageData> {
  const query: AdminActivityListQuery = {
    limit: 50,
    sort: filters.sort,
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
    ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
    ...(filters.adminId ? { adminId: filters.adminId } : {}),
    ...(cursor ? { cursor } : {}),
  };
  const page = await adminApiProvider.read.listActivityLogs(query, adminApiRequestOptions(cookieHeader));
  return {
    items: page.items.map(activityLogEntryFromApi),
    nextCursor: page.nextCursor,
  };
}
