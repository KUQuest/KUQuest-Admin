import type { PersistedAdminData } from "../data/admin-records";
import {
  QUEST_STATES,
  disputeCaseStatusFor,
  payoutStatusFor,
  questStateFor,
  isReportCasePending,
  walletStatusFor,
} from "../domain/rulebook";

type LegacyRecord = Record<string, unknown>;

export type DashboardTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "assigned"
  | "cancelled";

export type DashboardDecision = {
  id: string;
  view: "disputes" | "reports";
  title: string;
  detail: string;
  metric: string;
  age: string;
  tone: DashboardTone;
  timestamp: number;
};

export type DashboardRow = {
  id: string;
  title: string;
  detail: string;
  amount?: number;
  status: string;
  tone: DashboardTone;
};

export type DashboardActivity = {
  actor: string;
  title: string;
  detail: string;
  timestamp: number;
};

export type DashboardModel = {
  activeDisputes: number;
  payoutsNeedingReview: number;
  openReports: number;
  totalWorkLeft: number;
  decisions: DashboardDecision[];
  questStatusCounts: Array<{ status: string; count: number; tone: DashboardTone }>;
  payouts: DashboardRow[];
  users: DashboardRow[];
  activity: DashboardActivity[];
};

const questStatuses = QUEST_STATES;

function isRecord(value: unknown): value is LegacyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function records(data: PersistedAdminData, collection: string): LegacyRecord[] {
  const entries = data.collections[collection] ?? [];
  return entries.filter(isRecord);
}

function text(record: LegacyRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function number(record: LegacyRecord, key: string): number {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : 0;
}

function tone(record: LegacyRecord, fallback: DashboardTone): DashboardTone {
  const value = text(record, "tone");
  return ["success", "warning", "danger", "info", "neutral", "assigned", "cancelled"].includes(value)
    ? value as DashboardTone
    : fallback;
}

function statusTone(status: string): DashboardTone {
  if (["ACTIVE", "QUEST_OPEN", "QUEST_COMPLETED", "SUCCEEDED"].includes(status)) return "success";
  if (["FROZEN", "REPORT_CASE_PENDING", "CONDUCT_REPORT_PENDING", "DISPUTE_CASE_PENDING", "PENDING_ADMIN_APPROVAL"].includes(status)) return "warning";
  if (["QUEST_IN_PROGRESS", "SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING"].includes(status)) return "info";
  if (status === "QUEST_ASSIGNED") return "assigned";
  if (["QUEST_CANCELLED", "CANCELLED"].includes(status)) return "cancelled";
  if (["QUEST_DRAFT", "DISPUTE_CASE_DISMISSED", "DISPUTE_CASE_RESOLVED", "REPORT_CASE_DISMISSED", "REPORT_CASE_HIDDEN", "REPORT_CASE_RESTORED", "CONDUCT_REPORT_DISMISSED", "CONDUCT_REPORT_UPHELD", "CLOSED"].includes(status)) return "neutral";
  if (["Normal", "Completed", "Approved", "Open"].includes(status)) return "success";
  if (["Red Flag", "Submitted", "Change pending", "Needs approval"].includes(status)) return "warning";
  if (["In progress", "Processing"].includes(status)) return "info";
  if (status === "Assigned") return "assigned";
  if (status === "Cancelled") return "cancelled";
  if (status === "Draft") return "neutral";
  return "danger";
}

function reviewTimestamp(record: LegacyRecord): number {
  const value = text(record, "reportedAt") || text(record, "disputeDate");
  return Date.parse(value.replace(" · ", " ").replace(" ICT", "")) || 0;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}

export function dashboardModel(
  data: PersistedAdminData,
  activity: DashboardActivity[] = [],
): DashboardModel {
  const disputes = records(data, "disputes");
  const payouts = records(data, "payouts");
  const users = records(data, "users");
  const reports = records(data, "reports");
  const quests = records(data, "quests");
  const activeDisputes = disputes.filter((record) => disputeCaseStatusFor(text(record, "disputeCaseStatus") || text(record, "status")) === "DISPUTE_CASE_PENDING");
  const pendingPayouts = payouts.filter((record) => payoutStatusFor(text(record, "payoutStatus") || text(record, "status")) === "PENDING_ADMIN_APPROVAL");
  const openReports = reports.filter((record) => isReportCasePending(
    text(record, "reportCaseStatus") || text(record, "conductReportStatus") || text(record, "status"),
    text(record, "decision"),
  ));
  const reviewUsers = users.filter((record) => {
    const legacyStatus = text(record, "status");
    const walletStatus = walletStatusFor(text(record, "walletStatus") || legacyStatus);
    return ["Red Flag", "Temp ban", "Perm ban"].includes(legacyStatus)
      || ["FROZEN", "SUSPENDED", "CLOSED"].includes(walletStatus);
  });
  const decisions = [
    ...activeDisputes.map((record): DashboardDecision => ({
      id: text(record, "id"),
      view: "disputes",
      title: `Resolve ${text(record, "disputeType")} dispute`,
      detail: `${text(record, "id")} · ${text(record, "title")}`,
      metric: `฿${formatAmount(number(record, "amount"))} held`,
      age: text(record, "disputeDate"),
      tone: tone(record, "danger"),
      timestamp: reviewTimestamp(record),
    })),
    ...openReports.map((record): DashboardDecision => ({
      id: text(record, "id"),
      view: "reports",
      title: "New user report",
      detail: `${text(record, "id")} · ${text(record, "reportedUserName")}`,
      metric: "Active report",
      age: text(record, "reportedAt"),
      tone: tone(record, "warning"),
      timestamp: reviewTimestamp(record),
    })),
  ].toSorted((first, second) => second.timestamp - first.timestamp).slice(0, 6);

  return {
    activeDisputes: activeDisputes.length,
    payoutsNeedingReview: pendingPayouts.length,
    openReports: openReports.length,
    totalWorkLeft: activeDisputes.length + pendingPayouts.length + openReports.length,
    decisions,
    questStatusCounts: questStatuses.map((status) => ({
      status,
      count: quests.filter((record) => questStateFor(text(record, "questState") || text(record, "status")) === status).length,
      tone: statusTone(status),
    })),
    payouts: pendingPayouts.slice(0, 3).map((record) => ({
      id: text(record, "id"),
      title: text(record, "title"),
      detail: payoutStatusFor(text(record, "payoutStatus") || text(record, "status")),
      amount: number(record, "amount"),
      status: payoutStatusFor(text(record, "payoutStatus") || text(record, "status")),
      tone: tone(record, "warning"),
    })),
    users: reviewUsers.slice(0, 3).map((record) => ({
      id: text(record, "id"),
      title: text(record, "title"),
      detail: text(record, "age"),
      status: walletStatusFor(text(record, "walletStatus") || text(record, "status")),
      tone: tone(record, statusTone(walletStatusFor(text(record, "walletStatus") || text(record, "status")))),
    })),
    activity: activity.slice(0, 3),
  };
}
