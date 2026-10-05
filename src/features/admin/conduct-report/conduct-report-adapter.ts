import type { PersistedAdminData } from "../data/admin-records";
import { ADMIN_DEMO_DATA_KEY, type BrowserStorage } from "../data/admin-demo-data-adapter";
import { pageMockItems } from "../data/mock-pagination";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import { conductReportRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { findMemberModerationSummaryFromMockData, recordMemberViolationInData } from "../member/member-adapter";
import {
  conductReportDecisionDetailsForChoice,
  conductReportModelFromRecord,
  conductReportStatusFromRecord,
  conductReportsOnly,
  isConductReportActionable,
  isConductReportRecord,
  type ConductReportCommand,
  type ConductReportDecisionChoice,
  type ConductReportDecisionReasonCode,
  type ConductReportModel,
  type ConductReportRecord,
} from "./conduct-report-model";

export type ConductReportMockPage = {
  source: "mock";
  items: ConductReportModel[];
  nextCursor: string | null;
};

// The first page preserves the original three-row demo while exposing more
// pages for pagination and terminal-state checks.
export const CONDUCT_REPORT_MOCK_PAGE_SIZE = 3;

export function newConductReportIdempotencyKey(reportId: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-decide-conduct-report-${reportId}-${uuid}`;
}

function conductReportRecords(data: PersistedAdminData): ConductReportRecord[] {
  return conductReportsOnly(data.collections.reports);
}

function timestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const formatted = formatAdminTimestamp(value, "Asia/Bangkok");
  const parsed = Date.parse(formatted);
  return Number.isFinite(parsed) ? parsed : null;
}

function recordTimestamp(record: Record<string, unknown>): number | null {
  return timestamp(record.reportedAt) ?? timestamp(record.submittedAt) ?? timestamp(record.createdAt);
}

function conductReportModelFromMockRecord(
  record: ConductReportRecord,
  data: PersistedAdminData,
): ConductReportModel | null {
  const model = conductReportModelFromRecord(record);
  if (!model) return null;

  const member = findMemberModerationSummaryFromMockData(data, model.reportedMemberId);
  if (!member) return model;

  const submittedAt = recordTimestamp(record);
  const previousReportCount = data.collections.reports.filter((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const related = value as Record<string, unknown>;
    const reportedMemberId = related.reportedMemberId ?? related.reportedUserId;
    if (reportedMemberId !== member.id || related.id === model.id) return false;
    const relatedAt = recordTimestamp(related);
    return submittedAt === null || (relatedAt !== null && relatedAt < submittedAt);
  }).length;
  const previousActions = member.moderationHistory
    .filter((entry) => {
      if (entry.caseId === model.id || !/(applied|removed|restored|dismissed|upheld|hidden|expired|reversed)/i.test(entry.event)) return false;
      const actionAt = timestamp(entry.at);
      return submittedAt === null || (actionAt !== null && actionAt < submittedAt);
    })
    .map((entry) => entry.event)
    .slice(0, 10);
  const currentViolationCount = member.confirmedViolationCount;
  const previousViolationCount = currentViolationCount === null
    ? model.moderationHistory.confirmedViolationCount
    : Math.max(0, currentViolationCount - (model.status === "CONDUCT_REPORT_UPHELD" ? 1 : 0));

  return {
    ...model,
    moderationHistory: {
      ...model.moderationHistory,
      memberRecordAvailable: true,
      currentMemberStatus: member.memberStatus ?? model.moderationHistory.currentMemberStatus,
      previousReportCount,
      confirmedViolationCount: previousViolationCount,
      previousActions: previousActions.length ? previousActions : model.moderationHistory.previousActions,
    },
  };
}

export function loadConductReportsFromMock(storage: BrowserStorage, cursor?: string): ConductReportMockPage {
  const data = loadDashboardData(storage);
  const records = conductReportRecords(data);
  const models = records.flatMap((record) => {
    const model = conductReportModelFromMockRecord(record, data);
    return model ? [model] : [];
  });
  const page = pageMockItems(models, cursor, CONDUCT_REPORT_MOCK_PAGE_SIZE);
  return {
    source: "mock",
    items: page.items,
    nextCursor: page.nextCursor,
  };
}

/** Load the complete mock Conduct Report collection for local pagination. */
export function loadAllConductReportsFromMock(storage: BrowserStorage): ConductReportMockPage {
  const data = loadDashboardData(storage);
  const records = conductReportRecords(data);
  const items = records.flatMap((record) => {
    const model = conductReportModelFromMockRecord(record, data);
    return model ? [model] : [];
  });
  return { source: "mock", items, nextCursor: null };
}

export function findConductReportModelFromMock(
  storage: BrowserStorage,
  reportId: string,
): ConductReportModel | null {
  const data = loadDashboardData(storage);
  const record = conductReportRecords(data).find((candidate) => candidate.id === reportId);
  return record ? conductReportModelFromMockRecord(record, data) : null;
}

function persist(storage: BrowserStorage, data: PersistedAdminData): void {
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(data));
  } catch {
    // The in-memory demo record is still useful when browser storage is full.
  }
}

export function saveMockConductReportDecision(
  storage: BrowserStorage,
  reportId: string,
  decision: ConductReportCommand,
  decisionReasonCode: ConductReportDecisionReasonCode | null,
  choice?: ConductReportDecisionChoice,
): ConductReportRecord | null {
  const data = loadDashboardData(storage);
  const report = conductReportRecords(data).find((candidate) => candidate.id === reportId);
  const status = report && conductReportStatusFromRecord(report);
  if (!report || !isConductReportRecord(report) || !status || !isConductReportActionable(status)) {
    return null;
  }

  if (decision === "CONDUCT_REPORT_DISMISSED" && !decisionReasonCode) return null;
  const now = new Date().toISOString();
  const selectedChoice = choice ?? (decision === "CONDUCT_REPORT_UPHELD" ? "confirmed-violation" : "dismiss");
  const metadata = conductReportDecisionDetailsForChoice(selectedChoice);
  if (metadata.command !== decision) return null;
  report.status = decision;
  report.conductReportStatus = decision;
  report.decision = metadata.choice;
  report.decisionLabel = decision === "CONDUCT_REPORT_UPHELD"
    ? "Violation confirmed"
    : decisionReasonCode === "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE"
      ? "Insufficient evidence"
      : "No violation";
  report.decisionReasonCode = decision === "CONDUCT_REPORT_DISMISSED" ? decisionReasonCode : null;
  report.resolvedBy = "Admin";
  report.resolutionAt = now;
  report.closedAt = now;
  report.tone = decision === "CONDUCT_REPORT_UPHELD" ? "danger" : "neutral";
  report.resolution = decision === "CONDUCT_REPORT_UPHELD"
    ? "Violation confirmed; the Member Misconduct ladder was applied."
    : decisionReasonCode === "CONDUCT_REPORT_INSUFFICIENT_EVIDENCE"
      ? "Conduct Report dismissed; the evidence did not establish a policy violation."
      : "Conduct Report dismissed; no policy violation found.";
  if (typeof report.version === "number") report.version += 1;

  if (decision === "CONDUCT_REPORT_UPHELD") {
    const memberResult = recordMemberViolationInData(
      data,
      typeof report.reportedMemberId === "string" ? report.reportedMemberId : "",
      typeof report.reasonCode === "string" ? report.reasonCode : "",
      "",
      {
        caseId: report.id,
        caseType: "Conduct Report",
        caseHref: conductReportRoutes.detail(report.id),
      },
    );
    if (memberResult) {
      report.reportedMemberStatus = memberResult.model.memberStatus;
      report.confirmedViolationCount = memberResult.model.confirmedViolationCount;
      report.previousModerationActions = memberResult.model.penaltyHistory
        .slice(0, 10)
        .map((entry) => entry.event);
    }
  }
  persist(storage, data);
  return report;
}
