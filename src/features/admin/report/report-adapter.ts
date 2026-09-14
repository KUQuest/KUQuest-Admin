import type { PersistedAdminData } from "../data/admin-records";
import { ADMIN_DEMO_DATA_KEY, type BrowserStorage } from "../data/legacy-admin-data-adapter";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import {
  reportCaseDecisionDetailsForCommand,
  isReportCaseRecord,
  reportCaseModelFromRecord,
  reportCasesOnly,
  type ReportCaseCommand,
  type ReportCaseModel,
  type ReportCaseRecord,
} from "./report-model";

export type ReportCaseMockPage = {
  source: "mock";
  items: ReportCaseModel[];
  nextCursor: null;
};

export function newReportCaseIdempotencyKey(reportId: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-decide-report-${reportId}-${uuid}`;
}

function reportRecords(data: PersistedAdminData): ReportCaseRecord[] {
  return reportCasesOnly(data.collections.reports);
}

export function loadReportCasesFromMock(storage: BrowserStorage): ReportCaseMockPage {
  return {
    source: "mock",
    items: reportRecords(loadDashboardData(storage)).flatMap((record) => {
      const model = reportCaseModelFromRecord(record);
      return model ? [model] : [];
    }),
    nextCursor: null,
  };
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
  persist(storage, data);
  return report;
}
