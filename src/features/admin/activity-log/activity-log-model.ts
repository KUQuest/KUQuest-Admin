import type { AdminActivityLog } from "../api/admin-api";
import { disputeRoutes, memberRoutes, questRoutes, reportRoutes } from "../admin-routes";

export type ActivityLogEntry = {
  id: string;
  admin: AdminActivityLog["admin"];
  action: string;
  resourceType: string;
  resourceId: string;
  reasonCode: string | null;
  reasonCatalogVersion: number | null;
  resultVersion: number | null;
  resultTimestamp: string | null;
  createdAt: string | null;
  adminId: string;
  adminName: string;
  adminInitials: string;
  createdAtTimestamp: number | null;
};

export function activityLogEntryFromApi(entry: AdminActivityLog): ActivityLogEntry {
  const adminName = `${entry.admin.firstName.trim()} ${entry.admin.lastName.trim()}`.trim();
  const adminInitials = `${entry.admin.firstName.trim().charAt(0)}${entry.admin.lastName.trim().charAt(0)}`.toUpperCase();

  const parsedCreatedAt = Date.parse(entry.createdAt);
  return {
    ...entry,
    adminId: entry.admin.id,
    adminName,
    adminInitials,
    createdAtTimestamp: Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : null,
  };
}

function timestampValue(value: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatActivityLogTimestamp(value: string | null): string {
  const timestamp = timestampValue(value);
  if (timestamp === null) return "Not provided";

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "short",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value || "";
  return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}:${part("minute")} ICT`;
}

export function formatActivityLogRelativeTime(value: string | null, now = Date.now()): string {
  const timestamp = timestampValue(value);
  if (timestamp === null) return "Not provided";

  const minutes = Math.floor(Math.max(0, now - timestamp) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatActivityLogTimestamp(value).split(",")[0];
}

export function activityLogMatchesSearch(entry: ActivityLogEntry, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    entry.id,
    entry.adminName,
    entry.adminId,
    entry.admin.firstName,
    entry.admin.lastName,
    entry.action,
    entry.resourceType,
    entry.resourceId,
    entry.reasonCode,
    entry.reasonCatalogVersion,
    entry.resultVersion,
    entry.resultTimestamp,
    entry.createdAt,
  ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
}

export function activityTargetHref(resourceType: string, resourceId: string): string | null {
  if (!resourceId) return null;
  switch (resourceType.trim().toUpperCase()) {
    case "DISPUTE_CASE":
      return disputeRoutes.detail(resourceId);
    case "MEMBER":
    case "USER":
      return memberRoutes.detail(resourceId);
    case "QUEST":
      return questRoutes.detail(resourceId);
    case "REPORT_CASE":
      return reportRoutes.detail(resourceId);
    default:
      return null;
  }
}
