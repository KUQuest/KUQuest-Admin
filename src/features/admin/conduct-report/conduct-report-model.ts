import { memberRoutes, questRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import {
  moderationHistoryFromRecord,
  type ModerationHistorySummary,
} from "../moderation-case/moderation-case-context";
import {
  isConductReportStatus,
  isReportCaseStatus,
  questStateFor,
  type ConductReportStatus,
  type QuestState,
} from "../domain/rulebook";
import { statusBadgeClass } from "../status-badge";

export type ConductReportRecord = {
  id: string;
  [key: string]: unknown;
};

export type ConductReportDecisionChoice = "no-violation" | "confirmed-violation";

export type ConductReportCommand =
  | "CONDUCT_REPORT_DISMISSED"
  | "CONDUCT_REPORT_UPHELD";

export const conductReportDecisionMetadata = {
  "no-violation": {
    command: "CONDUCT_REPORT_DISMISSED",
    label: "No violation",
  },
  "confirmed-violation": {
    command: "CONDUCT_REPORT_UPHELD",
    label: "Violation confirmed",
  },
} as const satisfies Record<
  ConductReportDecisionChoice,
  { command: ConductReportCommand; label: string }
>;

export type ConductReportModel = {
  id: string;
  status: ConductReportStatus;
  statusLabel: string;
  badgeClass: string;
  isActionable: boolean;
  title: string;
  reason: string;
  reasonCode: string | null;
  questId: string | null;
  questTitle: string;
  questHref: string | null;
  questState: QuestState | null;
  questFailedAt: string | null;
  questRecord: string | null;
  reportedMemberId: string;
  reportedMemberName: string;
  reportedMemberHref: string | null;
  reporterId: string | null;
  reporterName: string;
  reporterHref: string | null;
  moderationHistory: ModerationHistorySummary;
  detail: string;
  submittedAt: string;
  decisionLabel: string | null;
  decisionReason: string | null;
  resolution: string | null;
  resolvedBy: string | null;
  resolutionAt: string | null;
  closedAt: string | null;
  version: number | undefined;
};

export const CONDUCT_REPORT_UPDATED_EVENT = "kuquest:conduct-report-updated";

function asRecord(value: unknown): ConductReportRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ConductReportRecord
    : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function personName(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return text(value);
  return firstText(
    record.name,
    record.title,
    [record.firstName, record.lastName]
      .filter((part): part is string => Boolean(text(part)))
      .join(" "),
  );
}

export function conductReportStatusFromRecord(value: unknown): ConductReportStatus | null {
  const record = asRecord(value);
  if (!record) return null;

  // A Conduct Report must not carry a Report Case status marker. This keeps
  // the two moderation routes separate when the API returns a mixed DTO.
  if (
    isReportCaseStatus(record.status)
    || isReportCaseStatus(record.reportCaseStatus)
    || (record.reportCaseStatus !== undefined && record.reportCaseStatus !== null)
  ) {
    return null;
  }

  if (isConductReportStatus(record.conductReportStatus)) return record.conductReportStatus;
  if (isConductReportStatus(record.status)) return record.status;
  return null;
}

export function isConductReportRecord(value: unknown): value is ConductReportRecord {
  const record = asRecord(value);
  return Boolean(text(record?.id)) && conductReportStatusFromRecord(record) !== null;
}

export function conductReportsOnly(values: readonly unknown[]): ConductReportRecord[] {
  return values.filter(isConductReportRecord);
}

export function isConductReportActionable(status: unknown): boolean {
  return status === "CONDUCT_REPORT_PENDING";
}

export function conductReportStatusLabel(status: ConductReportStatus): string {
  switch (status) {
    case "CONDUCT_REPORT_PENDING":
      return "Open";
    case "CONDUCT_REPORT_UPHELD":
      return "Confirmed";
    case "CONDUCT_REPORT_DISMISSED":
      return "Dismissed";
  }
}

export function conductReportReasonLabel(value: unknown): string {
  switch (value) {
    case "CONDUCT_ABANDONED":
    case "Abandoned work":
      return "Abandoned work";
    case "CONDUCT_NO_SHOW":
    case "No show":
      return "No show";
    case "CONDUCT_OUT_OF_SCOPE":
    case "Out of scope work":
      return "Out of scope work";
    default:
      return text(value) ?? "Reason not provided";
  }
}

export function conductReportDecisionFor(
  choice: ConductReportDecisionChoice,
): ConductReportCommand {
  return conductReportDecisionMetadata[choice].command;
}

export function conductReportDecisionDetailsForCommand(command: ConductReportCommand): {
  choice: ConductReportDecisionChoice;
  command: ConductReportCommand;
  label: string;
} {
  for (const [choice, metadata] of Object.entries(conductReportDecisionMetadata)) {
    if (metadata.command === command) {
      return { choice: choice as ConductReportDecisionChoice, ...metadata };
    }
  }
  throw new Error(`Unsupported Conduct Report command: ${command}`);
}

export function conductReportModelFromRecord(value: unknown): ConductReportModel | null {
  if (!isConductReportRecord(value)) return null;
  const record = value;
  const status = conductReportStatusFromRecord(record);
  if (!status) return null;

  const id = text(record.id) as string;
  const reportedMemberId = firstText(record.reportedMemberId, record.reportedUserId) ?? "";
  const reporterId = firstText(
    record.reporterId,
    record.submittedByMemberId,
    record.submittedByUserId,
  );
  const reportedMemberName = firstText(
    record.reportedMemberName,
    record.reportedUserName,
    personName(record.reportedMember),
    reportedMemberId ? `Member ${reportedMemberId}` : "Member not provided",
  ) as string;
  const reporterName = firstText(
    record.reporterName,
    record.submittedByMemberName,
    personName(record.reporter),
    reporterId ? `Member ${reporterId}` : "Reporter not provided",
  ) as string;
  const reasonValue = firstText(
    record.reasonCode,
    record.conductReportReason,
    record.category,
    record.reportType,
    record.reason,
  );
  const reason = conductReportReasonLabel(reasonValue);
  const quest = asRecord(record.quest);
  const questId = firstText(record.questId, record.relatedQuestId, quest?.id);
  const questTitle = firstText(
    record.relatedQuestTitle,
    record.questTitle,
    quest?.title,
    record.title,
  ) ?? "Quest not recorded";
  const questStateValue = firstText(record.questState, record.questStatus, quest?.questState, quest?.questStatus);
  const questState = questStateValue ? questStateFor(questStateValue) : null;
  const questFailedAt = firstText(record.failedAt, record.questFailedAt, quest?.failedAt);
  const decisionLabel = firstText(
    record.decisionLabel,
    status === "CONDUCT_REPORT_UPHELD" ? "Violation confirmed" : null,
    status === "CONDUCT_REPORT_DISMISSED" ? "No violation" : null,
  );

  return {
    id,
    status,
    statusLabel: conductReportStatusLabel(status),
    badgeClass: statusBadgeClass(status),
    isActionable: isConductReportActionable(status),
    title: reason,
    reason,
    reasonCode: firstText(record.reasonCode, record.conductReportReason),
    questId,
    questTitle,
    questHref: questId ? questRoutes.detail(questId) : null,
    questState,
    questFailedAt,
    questRecord: firstText(record.questRecord, record.questRecordSummary, record.questEvidence),
    reportedMemberId,
    reportedMemberName,
    reportedMemberHref: reportedMemberId ? memberRoutes.detail(reportedMemberId) : null,
    reporterId,
    reporterName,
    reporterHref: reporterId ? memberRoutes.detail(reporterId) : null,
    moderationHistory: moderationHistoryFromRecord(record),
    detail: firstText(record.details, record.description)
      ?? "No Conduct Report detail was provided.",
    submittedAt: formatAdminTimestamp(firstText(record.reportedAt, record.submittedAt, record.createdAt) ?? "Time not provided"),
    decisionLabel,
    decisionReason: firstText(record.decisionReason),
    resolution: firstText(record.resolution),
    resolvedBy: firstText(record.resolvedBy, record.resolvedByAdminId),
    resolutionAt: firstText(record.resolutionAt),
    closedAt: firstText(record.closedAt),
    version: typeof record.version === "number" ? record.version : undefined,
  };
}
