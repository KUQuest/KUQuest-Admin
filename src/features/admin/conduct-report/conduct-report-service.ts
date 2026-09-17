import type { AdminReportListQuery } from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { conductReportModelFromRecord, type ConductReportModel } from "./conduct-report-model";

export type ConductReportPageData = {
  source: "api" | "mock";
  items: ConductReportModel[];
  nextCursor: string | null;
};

function conductReportModels(values: readonly unknown[]): ConductReportModel[] {
  return values.flatMap((value) => {
    const model = conductReportModelFromRecord(value);
    return model ? [model] : [];
  });
}

export async function loadConductReportPageData(
  cookieHeader?: string,
  cursor?: string,
): Promise<ConductReportPageData> {
  const query: AdminReportListQuery = { limit: 50, ...(cursor ? { cursor } : {}) };
  const page = await adminApi.listReports(
    query,
    adminApiRequestOptions(cookieHeader),
  );
  return {
    source: "api",
    items: conductReportModels(page.items),
    nextCursor: page.nextCursor,
  };
}

export async function loadConductReportDetailFromApi(
  reportId: string,
  cookieHeader?: string,
): Promise<ConductReportModel | null> {
  const report = await adminApi.getReport(
    reportId,
    adminApiRequestOptions(cookieHeader),
  );
  const model = conductReportModelFromRecord(report);
  return model?.id === reportId ? model : null;
}
