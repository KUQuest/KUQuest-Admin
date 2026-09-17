import type { PersistedAdminData } from "../data/admin-records";
import { ADMIN_DEMO_DATA_KEY, type BrowserStorage } from "../data/legacy-admin-data-adapter";
import { pageMockItems } from "../data/mock-pagination";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import { reportRoutes } from "../admin-routes";
import { recordMemberViolationInData } from "../member/member-adapter";
import {
  reportCaseDecisionDetailsForCommand,
  isReportCaseRecord,
  reportCaseStatusFromRecord,
  reportCaseModelFromRecord,
  reportCasesOnly,
  type ReportCaseCommand,
  type ReportCaseModel,
  type ReportCaseRecord,
} from "./report-model";

export type ReportCaseMockPage = {
  source: "mock";
  items: ReportCaseModel[];
  nextCursor: string | null;
};

// The first page preserves the original two-row demo while exposing more
// pages for pagination and empty-state checks.
export const REPORT_CASE_MOCK_PAGE_SIZE = 2;

export function newReportCaseIdempotencyKey(reportId: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-decide-report-${reportId}-${uuid}`;
}

function reportRecords(data: PersistedAdminData): ReportCaseRecord[] {
  return reportCasesOnly(data.collections.reports);
}

export function loadReportCasesFromMock(storage: BrowserStorage, cursor?: string): ReportCaseMockPage {
  const records = reportRecords(loadDashboardData(storage));
  const models = records.flatMap((record) => {
    const model = reportCaseModelFromRecord(record);
    return model ? [model] : [];
  });
  const page = pageMockItems(models, cursor, REPORT_CASE_MOCK_PAGE_SIZE);
  return {
    source: "mock",
    items: page.items,
    nextCursor: page.nextCursor,
  };
}

/** Load the complete mock Report Case collection for local pagination. */
export function loadAllReportCasesFromMock(storage: BrowserStorage): ReportCaseMockPage {
  const records = reportRecords(loadDashboardData(storage));
  const items = records.flatMap((record) => {
    const model = reportCaseModelFromRecord(record);
    return model ? [model] : [];
  });
  return { source: "mock", items, nextCursor: null };
}

export function findReportCaseFromMock(
  storage: BrowserStorage,
  reportId: string,
): ReportCaseRecord | null {
  return reportRecords(loadDashboardData(storage)).find((record) => record.id === reportId) ?? null;
}

function persist(storage: BrowserStorage, data: PersistedAdminData): void {
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(data));
  } catch {
    // The in-memory demo record is still useful when browser storage is full.
  }
}

export function saveMockReportDecision(
  storage: BrowserStorage,
  reportId: string,
  decision: ReportCaseCommand,
  reason: string,
): ReportCaseRecord | null {
  const data = loadDashboardData(storage);
  const report = reportRecords(data).find((candidate) => candidate.id === reportId);
  if (!report || !isReportCaseRecord(report)) return null;

  const previousStatus = reportCaseStatusFromRecord(report);
  const now = new Date().toISOString();
  const metadata = reportCaseDecisionDetailsForCommand(decision);
  report.status = decision;
  report.reportCaseStatus = decision;
  report.decision = metadata.choice;
  report.decisionLabel = metadata.label;
  report.decisionReason = reason;
  report.resolvedBy = "Admin";
  report.resolutionAt = now;
  report.tone = decision === "REPORT_CASE_HIDDEN" ? "danger" : "neutral";
  report.resolution = decision === "REPORT_CASE_HIDDEN"
    ? "Message hidden; Report Case remains open for re-evaluation."
    : metadata.label;
  if (decision !== "REPORT_CASE_HIDDEN") report.closedAt = now;
  if (typeof report.version === "number") report.version += 1;

  // A confirmed Report Case is a Misconduct strike on its reported Member.
  // Apply it to the same loaded data set so the case and Member update are
  // persisted together. Do not add a second strike when a hidden case is
  // re-evaluated with the same decision.
  if (decision === "REPORT_CASE_HIDDEN" && previousStatus !== "REPORT_CASE_HIDDEN") {
    const memberResult = recordMemberViolationInData(
      data,
      typeof report.reportedMemberId === "string" ? report.reportedMemberId : "",
      reason,
      "",
      {
        caseId: report.id,
        caseType: "Report Case",
        caseHref: reportRoutes.detail(report.id),
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
