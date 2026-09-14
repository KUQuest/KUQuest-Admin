import type { AdminActivityListQuery } from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import {
  activityLogEntryFromApi,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  type ActivityLogFilters,
  type ActivityLogPageData,
} from "./activity-log-model";

export type { ActivityLogEntry, ActivityLogFilters, ActivityLogPageData } from "./activity-log-model";
export {
  activityLogCsv,
  activityLogMatchesSearch,
  activityLogTargetLabel,
  activityTargetHref,
  DEFAULT_ACTIVITY_LOG_FILTERS,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
} from "./activity-log-model";

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
  const page = await adminApi.listActivityLogs(query, adminApiRequestOptions(cookieHeader));
  return {
    source: "api",
    items: page.items.map(activityLogEntryFromApi),
    nextCursor: page.nextCursor,
  };
}
