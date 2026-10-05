import type { AdminActivityLog } from "../api/admin-api";
import {
  activityLogActionLabel,
  activityLogReasonLabel,
  activityLogTargetLabel,
  type ActivityLogEntry,
} from "../activity-log/activity-log-model";

export type DashboardActivity = {
  id: string;
  actor: string;
  title: string;
  detail: string;
  timestamp: number;
};

function activityInitials(entry: AdminActivityLog): string {
  const initials = `${entry.admin.firstName.trim().charAt(0)}${entry.admin.lastName.trim().charAt(0)}`.toUpperCase();
  return initials || "AD";
}

export function dashboardActivityFromApi(entry: AdminActivityLog, displayId?: string): DashboardActivity {
  const activityEntry: ActivityLogEntry = {
    ...entry,
    resourceId: displayId ?? "",
    adminId: entry.admin.id,
    adminName: `${entry.admin.firstName.trim()} ${entry.admin.lastName.trim()}`.trim(),
    adminInitials: activityInitials(entry),
    createdAtTimestamp: Date.parse(entry.createdAt) || null,
  };
  return {
    id: entry.id,
    actor: activityInitials(entry),
    title: activityLogActionLabel(entry.action),
    detail: `${activityLogTargetLabel(activityEntry)}${entry.reasonCode ? ` · ${activityLogReasonLabel(entry.reasonCode)}` : ""}`,
    timestamp: Date.parse(entry.createdAt) || 0,
  };
}

export function dashboardActivityKey(entry: DashboardActivity, index: number): string {
  const identity = typeof entry.id === "string" ? entry.id.trim() : "";
  if (identity) return `activity-${identity}`;
  return `activity-${entry.timestamp}-${entry.actor}-${entry.title}-${entry.detail}-${index}`;
}
