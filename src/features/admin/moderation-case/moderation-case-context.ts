export type ModerationHistorySummary = {
  currentMemberStatus: string | null;
  previousReportCount: number | null;
  confirmedViolationCount: number | null;
  previousActions: string[];
  adminNotes: string[];
};

export type ModerationCaseRelatedRecord = {
  id: string | null;
  title: string | null;
  href: string | null;
  state?: string | null;
};

export function emptyModerationHistory(): ModerationHistorySummary {
  return {
    currentMemberStatus: null,
    previousReportCount: null,
    confirmedViolationCount: null,
    previousActions: [],
    adminNotes: [],
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
 * The Admin UI may render this context with mock data today and with an
 * API-compatible read model later. Missing values stay explicit; the view
 * must not infer a Member risk score or invent a moderation decision.
 */
export function moderationHistoryFromRecord(value: unknown): ModerationHistorySummary {
  const record = asRecord(value);
  const member = asRecord(record?.reportedMember) ?? asRecord(record?.member);
  return {
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
    adminNotes: stringList(record?.adminNotes),
  };
}

export function hasModerationHistory(summary: ModerationHistorySummary): boolean {
  return Boolean(
    summary.currentMemberStatus
      || summary.previousReportCount !== null
      || summary.confirmedViolationCount !== null
      || summary.previousActions.length
      || summary.adminNotes.length,
  );
}
