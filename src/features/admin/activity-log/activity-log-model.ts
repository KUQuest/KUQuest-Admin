import type { AdminActivityLog } from "../api/admin-api";
import { displayAdminId } from "../display-admin-id";
import { formatAdminTimestamp } from "../date-format";
import {
  activityRoutes,
  conductReportRoutes,
  disputeRoutes,
  memberRoutes,
  payoutRoutes,
  questRoutes,
  reportRoutes,
  walletRoutes,
} from "../admin-routes";

export type ActivityLogEntry = {
  activityDisplayId?: string;
  id?: string;
  admin: AdminActivityLog["admin"];
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceDisplayId?: string | null;
  beforeState?: string | null;
  afterState?: string | null;
  reasonCode: string | null;
  decisionReasonText?: string | null;
  reasonCatalogVersion: number | null;
  resultVersion: number | null;
  resultTimestamp: string | null;
  createdAt: string | null;
  adminId: string;
  adminName: string;
  adminInitials: string;
  createdAtTimestamp: number | null;
  /** Display-only alias retained for the Activity Log drawer. */
  note?: string | null;
};

export type ActivityLogFilters = {
  action: string;
  resourceType: string;
  resourceId: string;
  adminId: string;
  fromDate?: string;
  toDate?: string;
  sort: "newest" | "oldest";
};

export type ActivityLogPageData = {
  items: ActivityLogEntry[];
  nextCursor: string | null;
};

export const DEFAULT_ACTIVITY_LOG_FILTERS: ActivityLogFilters = {
  action: "",
  resourceType: "",
  resourceId: "",
  adminId: "",
  fromDate: "",
  toDate: "",
  sort: "newest",
};

export function parseActivityLogDateInput(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmedValue);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return null;

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day < 1 || day > daysInMonth) return null;

  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function formatActivityLogDateInput(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function activityLogEntryFromApi(entry: AdminActivityLog): ActivityLogEntry {
  const firstName = entry.admin.firstName.trim();
  const lastName = entry.admin.lastName.trim();
  const adminName = `${firstName} ${lastName}`.trim();
  const adminInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const note = entry.decisionReasonText ?? entry.note;

  const parsedCreatedAt = Date.parse(entry.createdAt);
  return {
    ...entry,
    resourceId: entry.resourceId ?? "",
    ...(note === undefined ? {} : { note }),
    adminId: entry.admin.id ?? "",
    adminName,
    adminInitials,
    createdAtTimestamp: Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : null,
  };
}

export function activityLogEntryKeys(
  entries: readonly Pick<ActivityLogEntry, "activityDisplayId" | "id">[],
): string[] {
  const usedKeys = new Set<string>();
  return entries.map((entry, index) => {
    const identifier = entry.activityDisplayId?.trim() || entry.id?.trim();
    const baseKey = identifier ? `activity:${identifier}` : `activity:row:${index}`;
    let key = baseKey;
    let suffix = 1;
    while (usedKeys.has(key)) {
      key = `${baseKey}:${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);
    return key;
  });
}

function normalizedFilterValue(value: string): string {
  return value.trim().toLowerCase();
}

export function activityLogEntryMatchesFilters(entry: ActivityLogEntry, filters: ActivityLogFilters): boolean {
  const matches = (value: string | number | null | undefined, filter: string): boolean => (
    !filter || String(value ?? "").toLowerCase().includes(normalizedFilterValue(filter))
  );
  if (!matches(entry.action, filters.action)) return false;
  if (!matches(entry.resourceType, filters.resourceType)) return false;
  if (!matches(entry.resourceDisplayId ?? entry.resourceId, filters.resourceId)) return false;
  if (filters.adminId && entry.adminId && !matches(entry.adminId, filters.adminId)) return false;
  const createdTimestamp = timestampValue(entry.createdAt);
  if (filters.fromDate) {
    const from = Date.parse(`${filters.fromDate}T00:00:00+07:00`);
    if (createdTimestamp === null || Number.isNaN(from) || createdTimestamp < from) return false;
  }
  if (filters.toDate) {
    const to = Date.parse(`${filters.toDate}T23:59:59.999+07:00`);
    if (createdTimestamp === null || Number.isNaN(to) || createdTimestamp > to) return false;
  }
  return true;
}

function timestampValue(value: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatActivityLogTimestamp(value: string | null): string {
  const formatted = formatAdminTimestamp(value, "Asia/Bangkok");
  return formatted === value && timestampValue(value) === null ? "Not provided" : formatted;
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
  return formatActivityLogTimestamp(value).split(" ").slice(0, 3).join(" ");
}

export function activityLogMatchesSearch(entry: ActivityLogEntry, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const displayValues = [
    entry.action ? activityLogActionLabel(entry.action) : null,
    entry.resourceType ? activityLogResourceTypeLabel(entry.resourceType) : null,
    entry.reasonCode ? activityLogReasonLabel(entry.reasonCode) : null,
    activityLogTargetLabel(entry) || null,
  ];
  return [
    entry.activityDisplayId ?? entry.id,
    entry.adminName,
    entry.admin.firstName,
    entry.admin.lastName,
    entry.action,
    entry.resourceType,
    entry.resourceDisplayId ?? entry.resourceId,
    entry.beforeState,
    entry.afterState,
    entry.reasonCode,
    entry.reasonCatalogVersion,
    entry.resultVersion,
    entry.resultTimestamp,
    entry.createdAt,
    ...displayValues,
  ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
}

/**
 * Convert an Admin API enum into text that is easy to scan in the UI.
 * Keep the original enum in ActivityLogEntry for filters and CSV export.
 */
export function activityLogValueLabel(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return "Not provided";
  return normalized
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

const activityResourceLabels: Record<string, string> = {
  ACTIVITY_LOG: "Activity Log",
  CONDUCT_REPORT: "Conduct Report",
  DISPUTE_CASE: "Dispute Case",
  MEMBER: "Member",
  PAYOUT: "Payout",
  QUEST: "Quest",
  REPORT_CASE: "Report Case",
  USER: "Member",
  WALLET: "Wallet",
};

export function activityLogActionLabel(value: string | null | undefined): string {
  return activityLogValueLabel(value);
}

export function activityLogReasonLabel(value: string | null | undefined): string {
  return activityLogValueLabel(value);
}

export function activityLogResourceTypeLabel(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return "Not provided";
  return activityResourceLabels[normalized] ?? activityLogValueLabel(normalized);
}

export function activityLogTargetLabel(entry: ActivityLogEntry): string {
  const resourceType = entry.resourceType ? activityLogResourceTypeLabel(entry.resourceType) : "";
  const resourceId = displayAdminId(entry.resourceDisplayId, entry.resourceId) ?? "";
  return !resourceType && !resourceId ? "" : [resourceType, resourceId].filter(Boolean).join(" · ");
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function activityLogCsv(entries: readonly ActivityLogEntry[]): string {
  const headers = [
    "id",
    "createdAt",
    "adminId",
    "adminName",
    "action",
    "resourceType",
    "resourceId",
    "target",
    "reasonCode",
    "reasonCatalogVersion",
    "resultVersion",
    "resultTimestamp",
    "note",
  ];
  const rows = entries.map((entry) => [
    displayAdminId(entry.activityDisplayId, entry.id) ?? "",
    entry.createdAt,
    displayAdminId(entry.adminId) ?? "",
    entry.adminName,
    entry.action,
    entry.resourceType,
    displayAdminId(entry.resourceDisplayId, entry.resourceId) ?? "",
    activityLogTargetLabel(entry),
    entry.reasonCode,
    entry.reasonCatalogVersion,
    entry.resultVersion,
    entry.resultTimestamp,
    entry.note,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function activityTargetHref(resourceType: string, resourceId: string | undefined): string | null {
  const normalizedType = resourceType.trim().toUpperCase();
  if (normalizedType === "WALLET") return walletRoutes.list();
  if (normalizedType === "ACTIVITY_LOG") return activityRoutes.list();
  if (!resourceId) return null;
  switch (normalizedType) {
    case "DISPUTE_CASE":
      return disputeRoutes.detail(resourceId);
    case "MEMBER":
    case "USER":
      return memberRoutes.detail(resourceId);
    case "QUEST":
      return questRoutes.detail(resourceId);
    case "PAYOUT":
      return payoutRoutes.detail(resourceId);
    case "REPORT_CASE":
      return reportRoutes.detail(resourceId);
    case "CONDUCT_REPORT":
      return conductReportRoutes.detail(resourceId);
    default:
      return null;
  }
}
