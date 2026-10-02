import type { AdminReportListQuery } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import type { ConductReportStatus } from "../domain/rulebook";
import { conductReportModelFromRecord, type ConductReportModel } from "./conduct-report-model";

export type ConductReportPageData = {
  source: "api" | "mock";
  items: ConductReportModel[];
  nextCursor: string | null;
  countsByStatus?: Record<ConductReportStatus, number>;
};

const conductReportStatuses = [
  "CONDUCT_REPORT_PENDING",
  "CONDUCT_REPORT_UPHELD",
  "CONDUCT_REPORT_DISMISSED",
] as const satisfies readonly ConductReportStatus[];

type ConductReportStatusCursors = Partial<Record<ConductReportStatus, string>>;

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
  const statusCursors = cursor ? JSON.parse(cursor) as ConductReportStatusCursors : {};
  const statusesToLoad = cursor
    ? conductReportStatuses.filter((status) => statusCursors[status])
    : conductReportStatuses;
  const pages = await Promise.all(statusesToLoad.map(async (status) => {
    const query: AdminReportListQuery = {
      kind: "CONDUCT_REPORT",
      status,
      limit: 50,
      sort: "newest",
      ...(statusCursors[status] ? { cursor: statusCursors[status] } : {}),
    };
    const page = await adminApiProvider.read.listReports(
      query,
      adminApiRequestOptions(cookieHeader),
    );
    return { status, page };
  }));
  const nextCursors: ConductReportStatusCursors = {};
  for (const { status, page } of pages) {
    if (page.nextCursor) nextCursors[status] = page.nextCursor;
  }
  const records = pages
    .flatMap(({ page }) => page.items)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const apiCounts = pages[0]?.page.countsByStatus;
  return {
    source: "api",
    items: conductReportModels(records),
    nextCursor: Object.keys(nextCursors).length ? JSON.stringify(nextCursors) : null,
    ...(apiCounts ? {
      countsByStatus: {
        CONDUCT_REPORT_PENDING: apiCounts.CONDUCT_REPORT_PENDING,
        CONDUCT_REPORT_UPHELD: apiCounts.CONDUCT_REPORT_UPHELD,
        CONDUCT_REPORT_DISMISSED: apiCounts.CONDUCT_REPORT_DISMISSED,
      },
    } : {}),
  };
}

export async function loadConductReportDetailFromApi(
  reportId: string,
  cookieHeader?: string,
): Promise<ConductReportModel | null> {
  const report = await adminApiProvider.read.getReport(
    reportId,
    adminApiRequestOptions(cookieHeader),
  );
  const model = conductReportModelFromRecord(report);
  return model?.id === reportId ? model : null;
}
