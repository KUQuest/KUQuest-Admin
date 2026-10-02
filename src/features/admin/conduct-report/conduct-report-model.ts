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

export type ConductReportDecisionChoice =
  | "no-violation"
  | "insufficient-evidence"
  | "confirmed-violation";

export type ConductReportDecisionReasonCode =
  | "CONDUCT_REPORT_NO_VIOLATION"
  | "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE";

export type ConductReportCommand =
  | "CONDUCT_REPORT_DISMISSED"
  | "CONDUCT_REPORT_UPHELD";

export type ConductReportAssignment = {
  workerName: string | null;
  workerEmail: string | null;
  status: string | null;
  startedAt: string | null;
  createdAt: string | null;
};

export type ConductReportProofSubmission = {
  submittedByName: string | null;
  status: string | null;
  description: string | null;
  workerMessage: string | null;
  content: string | null;
  reviewNote: string | null;
  submittedAt: string | null;
  sentAt: string | null;
  reviewedAt: string | null;
};

export const conductReportDecisionMetadata = {
  "no-violation": {
    command: "CONDUCT_REPORT_DISMISSED",
    label: "No violation",
    reasonCode: "CONDUCT_REPORT_NO_VIOLATION",
  },
  "insufficient-evidence": {
    command: "CONDUCT_REPORT_DISMISSED",
    label: "Insufficient evidence",
    reasonCode: "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE",
  },
  "confirmed-violation": {
    command: "CONDUCT_REPORT_UPHELD",
    label: "Violation confirmed",
    reasonCode: null,
  },
} as const satisfies Record<
  ConductReportDecisionChoice,
  { command: ConductReportCommand; label: string; reasonCode: ConductReportDecisionReasonCode | null }
>;

export type ConductReportModel = {
  id: string;
  displayId: string;
  status: ConductReportStatus;
  statusLabel: string;
  badgeClass: string;
  isActionable: boolean;
  title: string;
  reason: string;
  reasonCode: string | null;
  questId: string | null;
  questDisplayId: string | null;
  questTitle: string;
  questHref: string | null;
  questState: QuestState | null;
  questFailedAt: string | null;
  questRecord: string | null;
  assignment: ConductReportAssignment | null;
  proofSubmission: ConductReportProofSubmission | null;
  reportedMemberId: string;
  reportedMemberDisplayId: string | null;
  reportedMemberName: string;
  reportedMemberHref: string | null;
  reporterId: string | null;
  reporterDisplayId: string | null;
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

export function conductReportDecisionReasonCodeFor(
  choice: ConductReportDecisionChoice,
): ConductReportDecisionReasonCode | null {
  return conductReportDecisionMetadata[choice].reasonCode;
}

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

function readableId(value: unknown): string | null {
  const result = text(value);
  if (!result || /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(result)) return null;
  return result;
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

function statusLabel(value: unknown, prefix: string): string | null {
  const code = text(value);
  if (!code) return null;
  const label = code.startsWith(prefix) ? code.slice(prefix.length) : code;
  return label.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase()).replaceAll("_", " ");
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
      return "Pending";
    case "CONDUCT_REPORT_UPHELD":
      return "Upheld";
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

export function conductReportDecisionDetailsForChoice(choice: ConductReportDecisionChoice) {
  return { choice, ...conductReportDecisionMetadata[choice] };
}

export function conductReportModelFromRecord(value: unknown): ConductReportModel | null {
  if (!isConductReportRecord(value)) return null;
  const record = value;
  const status = conductReportStatusFromRecord(record);
  if (!status) return null;

  const id = text(record.id) as string;
  const filer = asRecord(record.filer) ?? asRecord(record.reporter);
  const reportedMember = asRecord(record.reportedMember);
  const assignmentRecord = asRecord(record.assignment);
  const assignmentWorker = asRecord(assignmentRecord?.worker);
  const proofRecord = asRecord(record.proofSubmission);
  const proofSubmitter = asRecord(proofRecord?.submittedBy);
  const reportedMemberId = firstText(record.reportedMemberId, record.reportedUserId, reportedMember?.id) ?? "";
  const reporterId = firstText(
    record.reporterId,
    record.submittedByMemberId,
    record.submittedByUserId,
    filer?.id,
  );
  const reportedMemberName = firstText(
    record.reportedMemberName,
    record.reportedUserName,
    personName(reportedMember),
    "Member not provided",
  ) as string;
  const reporterName = firstText(
    record.reporterName,
    record.submittedByMemberName,
    personName(filer),
    "Reporter not provided",
  ) as string;
  const reasonValue = firstText(
    record.reasonCode,
    record.conductReportReason,
    record.category,
    record.reportType,
    record.reason,
  );
  const reason = conductReportReasonLabel(reasonValue);
  const quest = asRecord(record.quest) ?? asRecord(record.relatedQuest);
  const questId = firstText(record.questId, record.relatedQuestId, quest?.id);
  const questDisplayId = firstText(
    readableId(record.questDisplayId),
    readableId(record.relatedQuestDisplayId),
    readableId(quest?.displayId),
    readableId(questId),
  );
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
    status === "CONDUCT_REPORT_DISMISSED"
      && record.decisionReasonCode === "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE"
      ? "Insufficient evidence"
      : null,
    status === "CONDUCT_REPORT_DISMISSED" ? "No violation" : null,
  );

  return {
    id,
    displayId: readableId(record.displayId) ?? readableId(id) ?? "Conduct Report",
    status,
    statusLabel: conductReportStatusLabel(status),
    badgeClass: statusBadgeClass(status),
    isActionable: isConductReportActionable(status),
    title: reason,
    reason,
    reasonCode: firstText(record.reasonCode, record.conductReportReason),
    questId,
    questDisplayId,
    questTitle,
    questHref: questId ? questRoutes.detail(questId) : null,
    questState,
    questFailedAt,
    questRecord: firstText(record.questRecord, record.questRecordSummary, record.questEvidence),
    assignment: assignmentRecord
      ? {
          workerName: personName(assignmentWorker),
          workerEmail: text(assignmentWorker?.email),
          status: statusLabel(assignmentRecord.assignmentStatus, "ASSIGNMENT_"),
          startedAt: firstText(assignmentRecord.startedAt),
          createdAt: firstText(assignmentRecord.createdAt),
        }
      : null,
    proofSubmission: proofRecord
      ? {
          submittedByName: personName(proofSubmitter),
          status: statusLabel(proofRecord.submissionStatus, "PROOF_SUBMISSION_"),
          description: firstText(proofRecord.description),
          workerMessage: firstText(proofRecord.workerMessage),
          content: firstText(proofRecord.content),
          reviewNote: firstText(proofRecord.reviewNote),
          submittedAt: firstText(proofRecord.submittedAt),
          sentAt: firstText(proofRecord.sentAt),
          reviewedAt: firstText(proofRecord.reviewedAt),
        }
      : null,
    reportedMemberId,
    reportedMemberDisplayId: firstText(
      readableId(record.reportedMemberStudentId),
      readableId(reportedMember?.studentId),
      readableId(record.reportedMemberId),
      readableId(record.reportedUserId),
    ),
    reportedMemberName,
    reportedMemberHref: reportedMemberId ? memberRoutes.detail(reportedMemberId) : null,
    reporterId,
    reporterDisplayId: firstText(
      readableId(record.reporterStudentId),
      readableId(record.submittedByStudentId),
      readableId(filer?.studentId),
      readableId(record.reporterId),
      readableId(record.submittedByMemberId),
      readableId(record.submittedByUserId),
    ),
    reporterName,
    reporterHref: reporterId ? memberRoutes.detail(reporterId) : null,
    moderationHistory: moderationHistoryFromRecord(record),
    detail: firstText(record.details, record.detail, record.description)
      ?? "No Conduct Report detail was provided.",
    submittedAt: formatAdminTimestamp(firstText(record.reportedAt, record.submittedAt, record.createdAt) ?? "Time not provided"),
    decisionLabel,
    decisionReason: firstText(record.decisionReason),
    resolution: firstText(record.resolution),
    resolvedBy: firstText(record.resolvedBy, record.resolvedByAdminId),
    resolutionAt: firstText(record.resolutionAt, record.resolvedAt),
    closedAt: firstText(record.closedAt),
    version: typeof record.version === "number" ? record.version : undefined,
  };
}
