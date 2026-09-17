import { memberRoutes, questRoutes } from "../admin-routes";
import {
  moderationHistoryFromRecord,
  type ModerationHistorySummary,
} from "../moderation-case/moderation-case-context";
import {
  isConductReportStatus,
  isReportCaseStatus,
  reportCaseStatusFor,
  reportCaseStatusLabel,
  type ReportCaseStatus,
} from "../domain/rulebook";
import { statusBadgeClass } from "../status-badge";

export type ReportCaseRecord = {
  id: string;
  [key: string]: unknown;
};

export type ReportCaseDecisionChoice =
  | "no-violation"
  | "confirmed-violation"
  | "restore";

export type ReportCaseCommand =
  | "REPORT_CASE_DISMISSED"
  | "REPORT_CASE_HIDDEN"
  | "REPORT_CASE_RESTORED";

export const reportCaseDecisionMetadata = {
  "no-violation": {
    command: "REPORT_CASE_DISMISSED",
    label: "No violation",
  },
  "confirmed-violation": {
    command: "REPORT_CASE_HIDDEN",
    label: "Violation confirmed",
  },
  restore: {
    command: "REPORT_CASE_RESTORED",
    label: "Message restored",
  },
} as const satisfies Record<ReportCaseDecisionChoice, { command: ReportCaseCommand; label: string }>;

export type ReportCaseEvidence = {
  reference: string | null;
  label: string;
};

export type ReportCaseModel = {
  id: string;
  status: ReportCaseStatus;
  statusLabel: string;
  badgeClass: string;
  isActionable: boolean;
  title: string;
  reportType: string;
  source: "Message";
  reportedMemberId: string;
  reportedMemberName: string;
  reportedMemberHref: string | null;
  reporterId: string | null;
  reporterName: string;
  reporterHref: string | null;
  relatedQuestId: string | null;
  relatedQuestTitle: string | null;
  relatedQuestHref: string | null;
  moderationHistory: ModerationHistorySummary;
  detail: string;
  submittedAt: string;
  evidence: ReportCaseEvidence[];
  decisionLabel: string | null;
  decisionReason: string | null;
  resolution: string | null;
  resolvedBy: string | null;
  resolutionAt: string | null;
  closedAt: string | null;
  version: number | undefined;
};

export const REPORT_CASE_UPDATED_EVENT = "kuquest:report-case-updated";

function asRecord(value: unknown): ReportCaseRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ReportCaseRecord
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
    [record.firstName, record.lastName].filter((part): part is string => Boolean(text(part))).join(" "),
  );
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const reference = text(entry);
    return reference ? [reference] : [];
  });
}

export function reportCaseStatusFromRecord(value: unknown): ReportCaseStatus | null {
  const record = asRecord(value);
  if (!record) return null;

  // A record with Conduct Report state is never valid for this route. This
  // check prevents a mixed moderation record from crossing the route boundary.
  if (
    isConductReportStatus(record.status)
    || isConductReportStatus(record.reportCaseStatus)
    || isConductReportStatus(record.conductReportStatus)
  ) {
    return null;
  }

  if (isReportCaseStatus(record.reportCaseStatus)) return record.reportCaseStatus;
  if (isReportCaseStatus(record.status)) return record.status;

  // The demo adapter can contain older Report Case rows. Only an explicit
  // reportCaseStatus field may use the legacy Closed value.
  if (record.reportCaseStatus === "Closed") {
    const status = reportCaseStatusFor(record.reportCaseStatus, record.decision);
    return isReportCaseStatus(status) ? status : null;
  }

  return null;
}

export function isReportCaseRecord(value: unknown): value is ReportCaseRecord {
  const record = asRecord(value);
  return Boolean(text(record?.id)) && reportCaseStatusFromRecord(record) !== null;
}

export function reportCasesOnly(values: readonly unknown[]): ReportCaseRecord[] {
  return values.filter(isReportCaseRecord);
}

export function isReportCaseActionable(status: unknown): boolean {
  return status === "REPORT_CASE_PENDING" || status === "REPORT_CASE_HIDDEN";
}

export function reportCaseDecisionFor(
  choice: ReportCaseDecisionChoice,
): ReportCaseCommand {
  return reportCaseDecisionMetadata[choice].command;
}

export function reportCaseDecisionDetailsForCommand(command: ReportCaseCommand): {
  choice: ReportCaseDecisionChoice;
  command: ReportCaseCommand;
  label: string;
} {
  for (const [choice, metadata] of Object.entries(reportCaseDecisionMetadata)) {
    if (metadata.command === command) {
      return { choice: choice as ReportCaseDecisionChoice, ...metadata };
    }
  }
  throw new Error(`Unsupported Report Case command: ${command}`);
}

export function reportCaseModelFromRecord(value: unknown): ReportCaseModel | null {
  if (!isReportCaseRecord(value)) return null;
  const record = value;
  const status = reportCaseStatusFromRecord(record);
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
  const quest = asRecord(record.quest);
  const relatedQuestId = firstText(record.questId, record.relatedQuestId, quest?.id);
  const relatedQuestTitle = firstText(record.questTitle, record.relatedQuestTitle, quest?.title);
  const evidenceRefs = stringList(record.evidenceRefs);
  const evidenceLabel = text(record.evidence);
  const evidence = evidenceRefs.length
    ? evidenceRefs.map((reference, index) => ({
      reference,
      label: evidenceLabel && evidenceRefs.length === 1
        ? evidenceLabel
        : `Evidence Reference ${index + 1}`,
    }))
    : evidenceLabel
      ? [{ reference: null, label: evidenceLabel }]
      : [];
  const decisionLabel = firstText(
    record.decisionLabel,
    status === "REPORT_CASE_DISMISSED" ? "No violation" : null,
    status === "REPORT_CASE_HIDDEN" ? "Violation confirmed" : null,
    status === "REPORT_CASE_RESTORED" ? "Message restored" : null,
  );

  return {
    id,
    status,
    statusLabel: reportCaseStatusLabel(status),
    badgeClass: statusBadgeClass(status),
    isActionable: isReportCaseActionable(status),
    title: `Report against ${reportedMemberName}`,
    reportType: firstText(record.category, record.reportType, record.reason) ?? "Message content",
    source: "Message",
    reportedMemberId,
    reportedMemberName,
    reportedMemberHref: reportedMemberId ? memberRoutes.detail(reportedMemberId) : null,
    reporterId,
    reporterName,
    reporterHref: reporterId ? memberRoutes.detail(reporterId) : null,
    relatedQuestId,
    relatedQuestTitle,
    relatedQuestHref: relatedQuestId ? questRoutes.detail(relatedQuestId) : null,
    moderationHistory: moderationHistoryFromRecord(record),
    detail: firstText(record.details, record.description) ?? "No Report Case detail was provided.",
    submittedAt: firstText(record.reportedAt, record.submittedAt, record.createdAt) ?? "Time not provided",
    evidence,
    decisionLabel,
    decisionReason: firstText(record.decisionReason),
    resolution: firstText(record.resolution),
    resolvedBy: firstText(record.resolvedBy, record.resolvedByAdminId),
    resolutionAt: firstText(record.resolutionAt),
    closedAt: firstText(record.closedAt),
    version: typeof record.version === "number" ? record.version : undefined,
  };
}
