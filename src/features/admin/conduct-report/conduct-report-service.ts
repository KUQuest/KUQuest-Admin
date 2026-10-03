import type { AdminReportListQuery } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import type { ConductReportStatus } from "../domain/rulebook";
import { displayAdminId } from "../display-admin-id";
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

function timestampValue(value: unknown): number {
  if (typeof value !== "string") return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
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
    .sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt));
  return {
    source: "api",
    items: conductReportModels(records),
    nextCursor: Object.keys(nextCursors).length ? JSON.stringify(nextCursors) : null,
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
  if (model?.questId && !model.questDisplayId) {
    try {
      const quest = await adminApiProvider.read.getQuest(model.questId, adminApiRequestOptions(cookieHeader));
      model.questDisplayId = displayAdminId(quest.displayId, quest.id);
    } catch {
      // The Conduct Report remains readable when its related Quest cannot load.
    }
  }
  return model?.id === reportId ? model : null;
}
