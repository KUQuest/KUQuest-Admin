import type { AdminReportListQuery } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { reportCaseModelFromRecord, type ReportCaseModel } from "./report-model";

export type ReportCasePageData = {
  source: "api" | "mock";
  items: ReportCaseModel[];
  nextCursor: string | null;
};

function reportCaseModels(values: readonly unknown[]): ReportCaseModel[] {
  return values.flatMap((value) => {
    const model = reportCaseModelFromRecord(value);
    return model ? [model] : [];
  });
}

export async function loadReportCasePageData(
  cookieHeader?: string,
  cursor?: string,
): Promise<ReportCasePageData> {
  const query: AdminReportListQuery = { limit: 50, ...(cursor ? { cursor } : {}) };
  const page = await adminApiProvider.read.listReports(
    query,
    adminApiRequestOptions(cookieHeader),
  );
  return {
    source: "api",
    items: reportCaseModels(page.items),
    nextCursor: page.nextCursor,
  };
}

export async function loadReportCaseDetailFromApi(
  reportId: string,
  cookieHeader?: string,
): Promise<ReportCaseModel | null> {
  const report = await adminApiProvider.read.getReport(reportId, adminApiRequestOptions(cookieHeader));
  const model = reportCaseModelFromRecord(report);
  return model?.id === reportId ? model : null;
}
