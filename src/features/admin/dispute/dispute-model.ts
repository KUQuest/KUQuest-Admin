import { memberRoutes, questRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import {
  moderationHistoryFromRecord,
  type ModerationHistorySummary,
} from "../moderation-case/moderation-case-context";
import {
  isConductReportStatus,
  isDisputeCaseStatus,
  isReportCaseStatus,
  canResolveDispute,
  disputeCaseStatusFor,
  disputeCaseStatusLabel,
  questStateFor,
  type DisputeCaseStatus,
  type QuestState,
} from "../domain/rulebook";
import { statusBadgeClass } from "../status-badge";

export type DisputeCaseRecord = {
  id: string;
  [key: string]: unknown;
};

export type DisputeCaseDecisionChoice = "dismiss" | "resolve";
export type DisputeCaseCommand =
  | "DISPUTE_CASE_DISMISSED"
  | "DISPUTE_CASE_RESOLVED";

export const disputeCaseDecisionMetadata = {
  dismiss: {
    command: "DISPUTE_CASE_DISMISSED",
    label: "Retained",
  },
  resolve: {
    command: "DISPUTE_CASE_RESOLVED",
    label: "Redirected",
  },
} as const satisfies Record<DisputeCaseDecisionChoice, { command: DisputeCaseCommand; label: string }>;

export type DisputeCaseEvidence = {
  reference: string | null;
  label: string;
};

export type DisputeCaseModel = {
  id: string;
  displayId: string;
  status: DisputeCaseStatus;
  statusLabel: string;
  badgeClass: string;
  isActionable: boolean;
  title: string;
  questId: string;
  questTitle: string;
  questHref: string | null;
  questState: QuestState;
  questFailedAt: string | null;
  moneyHoldDeadline: string | null;
  category: string;
  detail: string;
  filerId: string | null;
  filerRole: string;
  filerName: string;
  filerHref: string | null;
  filerStatement: string;
  respondentId: string | null;
  respondentRole: string;
  respondentName: string;
  respondentHref: string | null;
  respondentStatement: string;
  amountAtRiskSatang: number | null;
  amountAtRiskLabel: string;
  sharedCapSatang: number | null;
  sharedCapLabel: string;
  resolvedAmountSatang: number | null;
  resolvedAmountLabel: string | null;
  workerId: string | null;
  workerName: string;
  workerHref: string | null;
  moderationHistory: ModerationHistorySummary;
  evidence: DisputeCaseEvidence[];
  submittedAt: string;
  updatedAt: string | null;
  decisionLabel: string | null;
  decisionReason: string | null;
  resolution: string | null;
  resolvedBy: string | null;
  resolutionAt: string | null;
  closedAt: string | null;
  version: number | undefined;
};

export type DisputeCaseModelSource = "api" | "mock";

export const DISPUTE_CASE_UPDATED_EVENT = "kuquest:dispute-case-updated";

const missingApiValue = "Not provided by the Admin API.";

function missingValueFor(source: DisputeCaseModelSource): string {
  return source === "mock" ? "Not provided." : missingApiValue;
}

function asRecord(value: unknown): DisputeCaseRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as DisputeCaseRecord
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

function disputeDecisionLabel(value: unknown): string | null {
  switch (text(value)) {
    case "Hirer wins":
    case "Hirer retains funds":
      return "Retained";
    case "Worker wins":
    case "Worker receives funds":
      return "Redirected";
    default:
      return text(value);
  }
}

function personName(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return text(value);
  return firstText(
    record.name,
    record.displayName,
    record.title,
    [record.firstName, record.lastName]
      .filter((part): part is string => Boolean(text(part)))
      .join(" "),
  );
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return text(entry) ? [entry.trim()] : [];
    const record = asRecord(entry);
    const reference = firstText(record?.evidenceRef, record?.reference, record?.id);
    return reference ? [reference] : [];
  });
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function roleIs(value: unknown, role: "Hirer" | "Worker"): boolean {
  return text(value)?.toLowerCase() === role.toLowerCase();
}

function formatSatang(value: number | null, fallback = missingApiValue): string {
  if (value === null) return fallback;
  return `฿${(value / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown, fallback: string): string {
  const raw = text(value);
  if (!raw) return fallback;
  const formatted = formatAdminTimestamp(raw, "Asia/Bangkok");
  return formatted === "Not provided" ? fallback : formatted;
}

function sevenDayHoldDeadline(value: unknown, fallback = missingApiValue): string | null {
  const raw = text(value);
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return null;
  return formatDate(new Date(timestamp + 7 * 24 * 60 * 60 * 1000).toISOString(), fallback);
}

export function disputeCaseStatusFromRecord(value: unknown): DisputeCaseStatus | null {
  const record = asRecord(value);
  if (!record) return null;
  if (
    isReportCaseStatus(record.status)
    || isConductReportStatus(record.status)
    || isReportCaseStatus(record.disputeCaseStatus)
    || isConductReportStatus(record.disputeCaseStatus)
  ) return null;

  if (isDisputeCaseStatus(record.disputeCaseStatus)) return record.disputeCaseStatus;
  if (isDisputeCaseStatus(record.status)) return record.status;
  if (record.disputeCaseStatus === "Closed") {
    return disputeCaseStatusFor(record.disputeCaseStatus);
  }
  return null;
}

export function isDisputeCaseRecord(value: unknown): value is DisputeCaseRecord {
  const record = asRecord(value);
  return Boolean(text(record?.id)) && disputeCaseStatusFromRecord(record) !== null;
}

export function disputeCasesOnly(values: readonly unknown[]): DisputeCaseRecord[] {
  return values.filter(isDisputeCaseRecord);
}

export function isDisputeCaseActionable(status: unknown): boolean {
  return status === "DISPUTE_CASE_PENDING";
}

export function disputeCaseDecisionFor(choice: DisputeCaseDecisionChoice): DisputeCaseCommand {
  return disputeCaseDecisionMetadata[choice].command;
}

export function disputeCaseDecisionDetailsForCommand(command: DisputeCaseCommand): {
  choice: DisputeCaseDecisionChoice;
  command: DisputeCaseCommand;
  label: string;
} {
  for (const [choice, metadata] of Object.entries(disputeCaseDecisionMetadata)) {
    if (metadata.command === command) {
      return { choice: choice as DisputeCaseDecisionChoice, ...metadata };
    }
  }
  throw new Error(`Unsupported Dispute Case command: ${command}`);
}

export function disputeCaseModelFromRecord(
  value: unknown,
  source: DisputeCaseModelSource = "mock",
): DisputeCaseModel | null {
  if (!isDisputeCaseRecord(value)) return null;
  const record = value;
  const status = disputeCaseStatusFromRecord(record);
  if (!status) return null;
  const missingValue = missingValueFor(source);

  const id = text(record.id) as string;
  const quest = asRecord(record.quest);
  const questId = firstText(record.questId, quest?.id) ?? "";
  const questTitle = firstText(record.questTitle, quest?.title, record.title) ?? missingValue;
  const questState = questStateFor(record.questState ?? quest?.questStatus);
  const filerId = firstText(record.filerUserId, record.filerId);
  const respondentId = firstText(record.respondentUserId, record.respondentId);
  const filerRole = firstText(record.filerRole) ?? "Hirer";
  const respondentRole = firstText(record.respondentRole) ?? "Worker";
  const workerId = firstText(
    record.resolvedWorkerId,
    record.workerId,
    roleIs(filerRole, "Worker") ? filerId : null,
    roleIs(respondentRole, "Worker") ? respondentId : null,
  );
  const filerName = firstText(
    record.filerName,
    personName(record.filer),
    filerId ? `Member ${filerId}` : null,
    source === "mock" ? record.reporterName : null,
    source === "mock" ? "Hirer not provided" : null,
  ) ?? missingValue;
  const respondentName = firstText(
    record.respondentName,
    personName(record.respondent),
    personName(record.worker),
    respondentId ? `Member ${respondentId}` : null,
    source === "mock" ? record.workerName : null,
    source === "mock" ? "Worker not provided" : null,
  ) ?? missingValue;
  const workerName = roleIs(filerRole, "Worker") ? filerName : respondentName;
  const amountAtRiskSatang = positiveInteger(record.amountAtRiskSatang)
    ?? (source === "mock" ? positiveInteger(record.amountSatang) : null)
    ?? (source === "mock" && typeof record.amount === "number" ? Math.round(record.amount * 100) : null);
  const sharedCapSatang = positiveInteger(record.remainingDisputeCapSatang)
    ?? positiveInteger(record.remainingFundingReservationSatang)
    ?? (source === "mock" ? amountAtRiskSatang : null);
  const resolvedAmountSatang = positiveInteger(record.resolvedAmountSatang);
  const evidenceRefs = stringList(record.evidenceRefs);
  const evidenceLabel = firstText(record.evidence);
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
    disputeDecisionLabel(record.decisionLabel),
    status === "DISPUTE_CASE_DISMISSED" ? "Retained" : null,
    status === "DISPUTE_CASE_RESOLVED" ? "Redirected" : null,
  );
  const submittedAt = formatDate(
    record.createdAt ?? record.disputeDate,
    source === "mock" ? firstText(record.disputeDate) ?? "Time not provided" : missingValue,
  );
  const questFailedAt = firstText(record.failedAt, quest?.failedAt);

  return {
    id,
    displayId: firstText(record.displayId) ?? id,
    status,
    statusLabel: disputeCaseStatusLabel(status),
    badgeClass: statusBadgeClass(status),
    isActionable: canResolveDispute(questState, status),
    title: questTitle,
    questId,
    questTitle,
    questHref: questId ? questRoutes.detail(questId) : null,
    questState,
    questFailedAt,
    moneyHoldDeadline: sevenDayHoldDeadline(questFailedAt, missingValue),
    category: firstText(record.category, record.disputeType) ?? (source === "mock" ? "Dispute Case" : missingValue),
    detail: firstText(record.detail, record.details, record.description)
      ?? (source === "mock" ? "Review the Quest record and the submitted statements." : missingValue),
    filerId,
    filerRole,
    filerName,
    filerHref: filerId ? memberRoutes.detail(filerId) : null,
    filerStatement: firstText(record.filerStatement, record.claim)
      ?? (source === "mock" ? "The Hirer submitted this Dispute Case for Admin review." : missingValue),
    respondentId,
    respondentRole,
    respondentName,
    respondentHref: respondentId ? memberRoutes.detail(respondentId) : null,
    respondentStatement: firstText(record.respondentStatement, record.response)
      ?? (source === "mock" ? "The Worker statement was not provided in the demo record." : missingValue),
    amountAtRiskSatang,
    amountAtRiskLabel: formatSatang(amountAtRiskSatang, missingValue),
    sharedCapSatang,
    sharedCapLabel: formatSatang(sharedCapSatang, missingValue),
    resolvedAmountSatang,
    resolvedAmountLabel: resolvedAmountSatang === null ? null : formatSatang(resolvedAmountSatang, missingValue),
    workerId,
    workerName,
    workerHref: workerId ? memberRoutes.detail(workerId) : null,
    moderationHistory: moderationHistoryFromRecord(record),
    evidence,
    submittedAt,
    updatedAt: firstText(record.updatedAt) ? formatDate(record.updatedAt, missingValue) : null,
    decisionLabel,
    decisionReason: firstText(record.decisionReason, record.reason),
    resolution: firstText(record.resolution),
    resolvedBy: firstText(record.resolvedBy, record.resolvedByAdminId),
    resolutionAt: firstText(record.resolutionAt, record.resolvedAt)
      ? formatDate(record.resolutionAt ?? record.resolvedAt, missingValue)
      : null,
    closedAt: firstText(record.closedAt)
      ? formatDate(record.closedAt, missingValue)
      : null,
    version: typeof record.version === "number" ? record.version : undefined,
  };
}
