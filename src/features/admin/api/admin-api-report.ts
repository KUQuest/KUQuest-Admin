import { apiRequest } from "../../../lib/api/client";
import {
  commandBody,
  commandHeaders,
  encode,
  queryString,
} from "./admin-api-transport";
import type {
  AdminApiRequestOptions,
  AdminEvidence,
  AdminPage,
  AdminReportCase,
  AdminReportListQuery,
  ReportDecision,
} from "./admin-api";

export function createAdminReportApi() {
  return {
    listReports(
      query: AdminReportListQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminReportCase>> {
      return apiRequest<AdminPage<AdminReportCase>>(
        `/api/v1/admin/reports${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    getReport(
      reportId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminReportCase> {
      return apiRequest<AdminReportCase>(
        `/api/v1/admin/reports/${encode(reportId)}`,
        { cache: "no-store", ...options },
      );
    },

    decideReport(reportId: string, options: ReportDecision): Promise<AdminReportCase> {
      return apiRequest<AdminReportCase>(
        `/api/v1/admin/reports/${encode(reportId)}/decide`,
        {
          method: "POST",
          headers: commandHeaders(options),
          body: commandBody(options),
        },
      );
    },

    getEvidence(
      evidenceRef: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminEvidence> {
      return apiRequest<AdminEvidence>(
        `/api/v1/admin/evidence/${encode(evidenceRef)}`,
        { cache: "no-store", ...options },
      );
    },
  };
}
