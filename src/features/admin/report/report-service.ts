import type { AdminReportListQuery } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { displayAdminId } from "../display-admin-id";
import { reportCaseModelFromRecord, type ReportCaseModel } from "./report-model";

export type ReportCasePageData = {
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
  const query: AdminReportListQuery = {
    kind: "REPORT_CASE",
    limit: 50,
    sort: "newest",
    ...(cursor ? { cursor } : {}),
  };
  const page = await adminApiProvider.read.listReports(
    query,
    adminApiRequestOptions(cookieHeader),
  );
  return {
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
  if (model?.relatedQuestId) {
    try {
      const quest = await adminApiProvider.read.getQuest(model.relatedQuestId, adminApiRequestOptions(cookieHeader));
      model.relatedQuestDisplayId = displayAdminId(quest.displayId);
    } catch {
      // The Report Case remains readable when its related Quest cannot load.
    }
  }
  return model?.id === reportId ? model : null;
}

export function newReportCaseIdempotencyKey(reportId: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-decide-report-${reportId}-${uuid}`;
}
