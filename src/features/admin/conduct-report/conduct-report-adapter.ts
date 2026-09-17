import type { PersistedAdminData } from "../data/admin-records";
import { ADMIN_DEMO_DATA_KEY, type BrowserStorage } from "../data/legacy-admin-data-adapter";
import { pageMockItems } from "../data/mock-pagination";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import { conductReportRoutes } from "../admin-routes";
import { recordMemberViolationInData } from "../member/member-adapter";
import {
  conductReportDecisionDetailsForCommand,
  conductReportModelFromRecord,
  conductReportStatusFromRecord,
  conductReportsOnly,
  isConductReportActionable,
  isConductReportRecord,
  type ConductReportCommand,
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

export function loadConductReportsFromMock(storage: BrowserStorage, cursor?: string): ConductReportMockPage {
  const records = conductReportRecords(loadDashboardData(storage));
  const models = records.flatMap((record) => {
    const model = conductReportModelFromRecord(record);
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
  const records = conductReportRecords(loadDashboardData(storage));
  const items = records.flatMap((record) => {
    const model = conductReportModelFromRecord(record);
    return model ? [model] : [];
  });
  return { source: "mock", items, nextCursor: null };
}

export function findConductReportFromMock(
  storage: BrowserStorage,
  reportId: string,
): ConductReportRecord | null {
  return conductReportRecords(loadDashboardData(storage)).find((record) => record.id === reportId) ?? null;
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
  reason: string,
): ConductReportRecord | null {
  const data = loadDashboardData(storage);
  const report = conductReportRecords(data).find((candidate) => candidate.id === reportId);
  const status = report && conductReportStatusFromRecord(report);
  if (!report || !isConductReportRecord(report) || !status || !isConductReportActionable(status)) {
    return null;
  }

  const now = new Date().toISOString();
  const metadata = conductReportDecisionDetailsForCommand(decision);
  report.status = decision;
  report.conductReportStatus = decision;
  report.decision = metadata.choice;
  report.decisionLabel = metadata.label;
  report.decisionReason = reason;
  report.resolvedBy = "Admin";
  report.resolutionAt = now;
  report.closedAt = now;
  report.tone = decision === "CONDUCT_REPORT_UPHELD" ? "danger" : "neutral";
  report.resolution = decision === "CONDUCT_REPORT_UPHELD"
    ? "Violation confirmed; the Member Misconduct ladder was applied."
    : "Conduct Report dismissed; no policy violation found.";
  if (typeof report.version === "number") report.version += 1;

  if (decision === "CONDUCT_REPORT_UPHELD") {
    const memberResult = recordMemberViolationInData(
      data,
      typeof report.reportedMemberId === "string" ? report.reportedMemberId : "",
      reason,
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
