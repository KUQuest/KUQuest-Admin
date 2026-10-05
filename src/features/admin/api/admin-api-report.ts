import { apiRequest } from "../../../lib/api/client";
import {
  encode,
  queryString,
} from "./admin-api-transport";
import type {
  AdminConductReportCommandResult,
  AdminApiRequestOptions,
  AdminEvidence,
  AdminPage,
  AdminReportCase,
  AdminReportCommandResult,
  AdminReportEvidenceRequestOptions,
  AdminReportListQuery,
  ConductReportDecision,
  ReportCaseDecision,
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

    decideReportCase(reportId: string, options: ReportCaseDecision): Promise<AdminReportCommandResult> {
      return apiRequest<AdminReportCommandResult>(
        `/api/v1/admin/reports/${encode(reportId)}/decide`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": options.idempotencyKey,
            "If-Match": String(options.expectedVersion),
          },
          body: {
            outcome: options.outcome,
            reasonCode: options.reasonCode,
          },
        },
      );
    },

    decideConductReport(reportId: string, options: ConductReportDecision): Promise<AdminConductReportCommandResult> {
      return apiRequest<AdminConductReportCommandResult>(
        `/api/v1/admin/reports/${encode(reportId)}/decide`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": options.idempotencyKey,
            "If-Match": String(options.expectedVersion),
          },
          body: options.outcome === "CONDUCT_REPORT_DISMISSED"
            ? {
                outcome: options.outcome,
                decisionReasonCode: options.decisionReasonCode,
              }
            : { outcome: options.outcome },
        },
      );
    },

    getEvidence(
      evidenceRef: string,
      options: AdminReportEvidenceRequestOptions,
    ): Promise<AdminEvidence> {
      const { idempotencyKey, limit, cursor, ...requestOptions } = options;
      const headers = new Headers(requestOptions.headers);
      headers.set("Idempotency-Key", idempotencyKey);
      return apiRequest<AdminEvidence>(
        `/api/v1/admin/evidence/${encode(evidenceRef)}${queryString({ limit, cursor })}`,
        { cache: "no-store", ...requestOptions, headers },
      );
    },
  };
}
