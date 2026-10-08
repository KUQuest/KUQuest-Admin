export type ModerationHistorySummary = {
  memberRecordAvailable: boolean;
  currentMemberStatus: string | null;
  previousReportCount: number | null;
  confirmedViolationCount: number | null;
  previousActions: string[];
};

export type ModerationCaseRelatedRecord = {
  id: string | null;
  displayId?: string | null;
  title: string | null;
  href: string | null;
  state?: string | null;
};

const moderationActionLabels: Record<string, string> = {
  REPORT_CASE_DISMISS: "Report Case dismissed",
  REPORT_CASE_HIDE: "Message hidden",
  REPORT_CASE_RESTORE: "Message restored",
  CONDUCT_REPORT_DISMISS: "Conduct Report dismissed",
  CONDUCT_REPORT_UPHOLD: "Conduct Report upheld",
};

const moderationMemberStatusLabels: Record<string, string> = {
  NORMAL: "Normal",
  RED_FLAG: "Flag",
  TEMPORARY_BAN: "Temp Ban",
  PERMANENT_BAN: "Perm Ban",
};

export function moderationMemberStatusLabel(status: string | null): string | null {
  return status ? moderationMemberStatusLabels[status] ?? null : null;
}

export function moderationActionLabel(action: string): string {
  const label = moderationActionLabels[action];
  if (label) return label;

  if (!/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(action)) return action;
  return action
    .split("_")
    .map((word) => `${word[0]}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function emptyModerationHistory(): ModerationHistorySummary {
  return {
    memberRecordAvailable: false,
    currentMemberStatus: null,
    previousReportCount: null,
    confirmedViolationCount: null,
    previousActions: [],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
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

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const result = text(entry);
    return result ? [result] : [];
  });
}

/**
 * Read only factual moderation context supplied by a record.
 *
 * The Admin UI renders the context supplied by the Admin API. Missing values
 * stay explicit; the view must not infer a Member risk score or invent a
 * moderation decision.
 */
export function moderationHistoryFromRecord(value: unknown): ModerationHistorySummary {
  const record = asRecord(value);
  const member = asRecord(record?.reportedMember) ?? asRecord(record?.member);
  return {
    memberRecordAvailable: Boolean(member),
    currentMemberStatus: firstText(
      record?.reportedMemberStatus,
      record?.memberStatus,
      member?.status,
    ),
    previousReportCount: nonNegativeInteger(
      record?.previousReportCount ?? record?.previousReportsReceived,
    ),
    confirmedViolationCount: nonNegativeInteger(
      record?.confirmedViolationCount ?? record?.confirmedReports,
    ),
    previousActions: stringList(record?.previousModerationActions ?? record?.moderationActions),
  };
}

export function hasModerationHistory(summary: ModerationHistorySummary): boolean {
  return Boolean(
    summary.currentMemberStatus
      || summary.previousReportCount !== null
      || summary.confirmedViolationCount !== null
      || summary.previousActions.length,
  );
}
