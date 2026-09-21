import { apiRequest } from "../../../lib/api/client";
import {
  commandHeaders,
  disputeCommandBody,
  disputeCommandHeaders,
  encode,
  queryString,
} from "./admin-api-transport";
import type {
  AdminApiRequestOptions,
  AdminDisputeCase,
  AdminDisputeCaseDetail,
  AdminDisputeEvidence,
  AdminDisputeEvidenceRequest,
  AdminDisputeListQuery,
  AdminDisputeOpenCommand,
  AdminDisputeOpenResult,
  AdminDisputeResolutionResult,
  AdminPage,
  DisputeResolution,
} from "./admin-api";

export function createAdminDisputeApi() {
  return {
    listDisputes(
      query: AdminDisputeListQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminDisputeCase>> {
      return apiRequest<AdminPage<AdminDisputeCase>>(
        `/api/v1/admin/disputes${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    getDispute(
      disputeId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminDisputeCaseDetail> {
      return apiRequest<AdminDisputeCaseDetail>(
        `/api/v1/admin/disputes/${encode(disputeId)}`,
        { cache: "no-store", ...options },
      );
    },

    openDispute(questId: string, options: AdminDisputeOpenCommand): Promise<AdminDisputeOpenResult> {
      return apiRequest<AdminDisputeOpenResult>(
        `/api/v1/admin/disputes/open/${encode(questId)}`,
        {
          method: "POST",
          body: { workerId: options.workerId },
        },
      );
    },

    resolveDispute(
      disputeCaseId: string,
      options: DisputeResolution,
    ): Promise<AdminDisputeResolutionResult> {
      return apiRequest<AdminDisputeResolutionResult>(
        `/api/v1/admin/disputes/${encode(disputeCaseId)}/resolve`,
        {
          method: "POST",
          headers: disputeCommandHeaders(options),
          body: disputeCommandBody(options),
        },
      );
    },

    getDisputeEvidence(
      disputeCaseId: string,
      options: AdminDisputeEvidenceRequest,
    ): Promise<AdminDisputeEvidence> {
      return apiRequest<AdminDisputeEvidence>(
        `/api/v1/admin/disputes/${encode(disputeCaseId)}/evidence`,
        {
          cache: "no-store",
          headers: commandHeaders(options),
        },
      );
    },
  };
}
