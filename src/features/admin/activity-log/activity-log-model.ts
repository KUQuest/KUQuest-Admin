import type { AdminActivityLog } from "../api/admin-api";
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
import { pageMockItems } from "../data/mock-pagination";

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
  /** Fixture-only fields. The current Admin API does not provide state snapshots yet. */
  previousState?: string | null;
  newState?: string | null;
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
  source: "api" | "mock";
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

const mockActivityLogSeedEntries: ActivityLogEntry[] = [
  {
    id: "ACT-9006",
    admin: { id: "admin-supansa", firstName: "Supansa", lastName: "Admin" },
    action: "DISPUTE_CASE_RESOLVED",
    resourceType: "DISPUTE_CASE",
    resourceId: "DSP-5201",
    reasonCode: "EVIDENCE_REVIEWED",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-16T07:30:00.000Z",
    createdAt: "2026-09-16T07:30:00.000Z",
    adminId: "admin-supansa",
    adminName: "Supansa Admin",
    adminInitials: "SA",
    createdAtTimestamp: Date.parse("2026-09-16T07:30:00.000Z"),
    previousState: "DISPUTE_CASE_PENDING",
    newState: "DISPUTE_CASE_RESOLVED",
    note: "Worker evidence matched the recorded Proof Submission.",
  },
  {
    id: "ACT-9005",
    admin: { id: "admin-narin", firstName: "Narin", lastName: "Admin" },
    action: "CONDUCT_REPORT_UPHELD",
    resourceType: "CONDUCT_REPORT",
    resourceId: "CND-8301",
    reasonCode: "QUEST_RECORD_CONFIRMED",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-16T06:15:00.000Z",
    createdAt: "2026-09-16T06:15:00.000Z",
    adminId: "admin-narin",
    adminName: "Narin Admin",
    adminInitials: "NA",
    createdAtTimestamp: Date.parse("2026-09-16T06:15:00.000Z"),
    previousState: "CONDUCT_REPORT_PENDING",
    newState: "CONDUCT_REPORT_UPHELD",
    note: "Quest record confirms the reported conduct violation.",
  },
  {
    id: "ACT-9004",
    admin: { id: "admin-supansa", firstName: "Supansa", lastName: "Admin" },
    action: "REPORT_CASE_HIDDEN",
    resourceType: "REPORT_CASE",
    resourceId: "RPT-8201",
    reasonCode: "HARASSMENT_CONFIRMED",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-15T11:10:00.000Z",
    createdAt: "2026-09-15T11:10:00.000Z",
    adminId: "admin-supansa",
    adminName: "Supansa Admin",
    adminInitials: "SA",
    createdAtTimestamp: Date.parse("2026-09-15T11:10:00.000Z"),
    previousState: "REPORT_CASE_PENDING",
    newState: "REPORT_CASE_HIDDEN",
    note: "Message evidence was reviewed through the Evidence Reference.",
  },
  {
    id: "ACT-9003",
    admin: { id: "admin-narin", firstName: "Narin", lastName: "Admin" },
    action: "WALLET_STATUS_CHANGED",
    resourceType: "WALLET",
    resourceId: "WLT-68000000",
    reasonCode: "MEMBER_BAN_FREEZE",
    reasonCatalogVersion: 1,
    resultVersion: 3,
    resultTimestamp: "2026-09-15T08:45:00.000Z",
    createdAt: "2026-09-15T08:45:00.000Z",
    adminId: "admin-narin",
    adminName: "Narin Admin",
    adminInitials: "NA",
    createdAtTimestamp: Date.parse("2026-09-15T08:45:00.000Z"),
    previousState: "ACTIVE",
    newState: "FROZEN",
    note: "Wallet freeze follows the temporary Member Ban ladder.",
  },
  {
    id: "ACT-9002",
    admin: { id: "admin-supansa", firstName: "Supansa", lastName: "Admin" },
    action: "PAYOUT_APPROVED",
    resourceType: "PAYOUT",
    resourceId: "PAY-9637",
    reasonCode: "PAYOUT_DESTINATION_REVIEWED",
    reasonCatalogVersion: 1,
    resultVersion: 4,
    resultTimestamp: "2026-09-14T09:20:00.000Z",
    createdAt: "2026-09-14T09:20:00.000Z",
    adminId: "admin-supansa",
    adminName: "Supansa Admin",
    adminInitials: "SA",
    createdAtTimestamp: Date.parse("2026-09-14T09:20:00.000Z"),
    previousState: "PENDING_ADMIN_APPROVAL",
    newState: "PROCESSING",
    note: "Masked payout destination matched the reviewed Member record.",
  },
  {
    id: "ACT-9001",
    admin: { id: "admin-narin", firstName: "Narin", lastName: "Admin" },
    action: "QUEST_HIDDEN",
    resourceType: "QUEST",
    resourceId: "QST-12001",
    reasonCode: "POLICY_REVIEW",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-13T05:00:00.000Z",
    createdAt: "2026-09-13T05:00:00.000Z",
    adminId: "admin-narin",
    adminName: "Narin Admin",
    adminInitials: "NA",
    createdAtTimestamp: Date.parse("2026-09-13T05:00:00.000Z"),
    previousState: "DISCOVERABLE",
    newState: "HIDDEN",
    note: "Quest discovery visibility changed; Quest State and escrow are unchanged.",
  },
];

const generatedActivityDefinitions = [
  {
    action: "QUEST_HIDDEN",
    resourceType: "QUEST",
    resourcePrefix: "QST",
    resourceStart: 12002,
    reasonCode: "POLICY_REVIEW",
    previousState: "DISCOVERABLE",
    newState: "HIDDEN",
    note: "Quest discovery visibility changed; Quest State and escrow are unchanged.",
  },
  {
    action: "REPORT_CASE_DISMISSED",
    resourceType: "REPORT_CASE",
    resourcePrefix: "RPT",
    resourceStart: 8202,
    reasonCode: "EVIDENCE_NOT_CONFIRMED",
    previousState: "REPORT_CASE_PENDING",
    newState: "REPORT_CASE_DISMISSED",
    note: "The submitted evidence did not confirm a Report Case violation.",
  },
  {
    action: "DISPUTE_CASE_RESOLVED",
    resourceType: "DISPUTE_CASE",
    resourcePrefix: "DSP",
    resourceStart: 5202,
    reasonCode: "EVIDENCE_REVIEWED",
    previousState: "DISPUTE_CASE_PENDING",
    newState: "DISPUTE_CASE_RESOLVED",
    note: "Dispute Case evidence was reviewed against the Quest record.",
  },
  {
    action: "CONDUCT_REPORT_UPHELD",
    resourceType: "CONDUCT_REPORT",
    resourcePrefix: "CND",
    resourceStart: 8302,
    reasonCode: "QUEST_RECORD_CONFIRMED",
    previousState: "CONDUCT_REPORT_PENDING",
    newState: "CONDUCT_REPORT_UPHELD",
    note: "The Quest record confirms the reported conduct violation.",
  },
  {
    action: "WALLET_STATUS_CHANGED",
    resourceType: "WALLET",
    resourcePrefix: "WLT",
    resourceStart: 68000001,
    reasonCode: "MEMBER_BAN_FREEZE",
    previousState: "ACTIVE",
    newState: "FROZEN",
    note: "Wallet status changed with the Member moderation decision.",
  },
  {
    action: "PAYOUT_APPROVED",
    resourceType: "PAYOUT",
    resourcePrefix: "PAY",
    resourceStart: 9638,
    reasonCode: "PAYOUT_DESTINATION_REVIEWED",
    previousState: "PENDING_ADMIN_APPROVAL",
    newState: "PROCESSING",
    note: "Masked Payout Destination matched the reviewed Member record.",
  },
] as const;

const generatedActivityLogEntries: ActivityLogEntry[] = Array.from({ length: 194 }, (_, index) => {
  const definition = generatedActivityDefinitions[index % generatedActivityDefinitions.length];
  const admin = index % 2 === 0
    ? { id: "admin-supansa", firstName: "Supansa", lastName: "Admin", initials: "SA" }
    : { id: "admin-narin", firstName: "Narin", lastName: "Admin", initials: "NA" };
  const createdAt = new Date(Date.UTC(2026, 8, 12, 12, 0, 0) - index * 60 * 60 * 1000).toISOString();
  const resourceId = `${definition.resourcePrefix}-${definition.resourceStart + Math.floor(index / generatedActivityDefinitions.length)}`;

  return {
    id: `ACT-${String(9000 - index).padStart(4, "0")}`,
    admin: { id: admin.id, firstName: admin.firstName, lastName: admin.lastName },
    action: definition.action,
    resourceType: definition.resourceType,
    resourceId,
    reasonCode: definition.reasonCode,
    reasonCatalogVersion: 1,
    resultVersion: 2 + (index % 3),
    resultTimestamp: createdAt,
    createdAt,
    adminId: admin.id,
    adminName: `${admin.firstName} ${admin.lastName}`,
    adminInitials: admin.initials,
    createdAtTimestamp: Date.parse(createdAt),
    previousState: definition.previousState,
    newState: definition.newState,
    note: definition.note,
  };
});

const mockActivityLogEntries: ActivityLogEntry[] = [
  ...mockActivityLogSeedEntries,
  ...generatedActivityLogEntries,
];

export function activityLogFixtures(): ActivityLogEntry[] {
  return mockActivityLogEntries.map((entry) => ({ ...entry, admin: { ...entry.admin } }));
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
  if (!matches(entry.resourceId, filters.resourceId)) return false;
  if (!matches(entry.adminId, filters.adminId)) return false;
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

export function activityLogFixturePageData(
  filters: ActivityLogFilters = DEFAULT_ACTIVITY_LOG_FILTERS,
  cursor?: string,
): ActivityLogPageData {
  const filtered = activityLogFixtures()
    .filter((entry) => activityLogEntryMatchesFilters(entry, filters))
    .toSorted((left, right) => {
      const leftTimestamp = left.createdAtTimestamp ?? 0;
      const rightTimestamp = right.createdAtTimestamp ?? 0;
      return filters.sort === "oldest" ? leftTimestamp - rightTimestamp : rightTimestamp - leftTimestamp;
    });
  const page = pageMockItems(filtered, cursor, 3);
  return {
    source: "mock",
    items: page.items,
    nextCursor: page.nextCursor,
  };
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

export function activityLogStateLabel(value: string | null | undefined): string {
  return activityLogValueLabel(value);
}

export function activityLogTargetLabel(entry: ActivityLogEntry): string {
  const resourceType = entry.resourceType ? activityLogResourceTypeLabel(entry.resourceType) : "";
  const resourceId = entry.resourceId || "";
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
    "previousState",
    "newState",
    "note",
  ];
  const rows = entries.map((entry) => [
    entry.id,
    entry.createdAt,
    entry.adminId,
    entry.adminName,
    entry.action,
    entry.resourceType,
    entry.resourceId,
    activityLogTargetLabel(entry),
    entry.reasonCode,
    entry.reasonCatalogVersion,
    entry.resultVersion,
    entry.resultTimestamp,
    entry.previousState,
    entry.newState,
    entry.note,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
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
    case "PAYOUT":
      return payoutRoutes.detail(resourceId);
    case "REPORT_CASE":
      return reportRoutes.detail(resourceId);
    case "CONDUCT_REPORT":
      return conductReportRoutes.detail(resourceId);
    case "WALLET":
      return walletRoutes.list();
    case "ACTIVITY_LOG":
      return activityRoutes.list();
    default:
      return null;
  }
}
