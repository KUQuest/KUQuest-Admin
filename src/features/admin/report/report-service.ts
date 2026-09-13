import type { AdminApiRequestOptions, AdminReportCase } from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import { isReportCaseRecord, type ReportCaseRecord } from "./report-model";

export type ReportCasePageData = {
  source: "api" | "mock";
  items: ReportCaseRecord[];
  nextCursor: string | null;
};

function apiRequestOptions(cookieHeader?: string): AdminApiRequestOptions {
  return cookieHeader === undefined ? {} : { headers: { Cookie: cookieHeader } };
}

function apiReportCase(value: AdminReportCase): value is AdminReportCase & ReportCaseRecord {
  return isReportCaseRecord(value);
}

export async function loadReportCasePageData(cookieHeader?: string): Promise<ReportCasePageData> {
  const page = await adminApi.listReports(
    { limit: 100 },
    apiRequestOptions(cookieHeader),
  );
  return {
    source: "api",
    items: page.items.filter(apiReportCase),
    nextCursor: page.nextCursor,
  };
}

export async function loadReportCaseDetailFromApi(
  reportId: string,
  cookieHeader?: string,
): Promise<ReportCaseRecord | null> {
  const report = await adminApi.getReport(reportId, apiRequestOptions(cookieHeader));
  return report.id === reportId && isReportCaseRecord(report) ? report : null;
}
