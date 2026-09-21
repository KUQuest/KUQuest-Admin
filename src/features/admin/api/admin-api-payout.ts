import { apiRequest } from "../../../lib/api/client";
import {
  encode,
  payoutCommandHeaders,
  queryString,
} from "./admin-api-transport";
import type {
  AdminApiRequestOptions,
  AdminPage,
  AdminPayout,
  AdminPayoutCommandResult,
  AdminPayoutDetail,
  AdminPayoutHistoryEntry,
  AdminPayoutListQuery,
  AdminPayoutProviderEventResult,
  AdminPayoutReconcileResult,
  AdminTopUpListItem,
  AdminTopUpListQuery,
  AdminTopUpProviderEventResult,
  AdminTopUpReconcileResult,
  PayoutApproval,
  PayoutRejection,
} from "./admin-api";

export function createAdminPayoutApi() {
  return {
    listPayouts(
      query: AdminPayoutListQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminPayout>> {
      return apiRequest<AdminPage<AdminPayout>>(
        `/api/v1/admin/payouts${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    getPayout(
      payoutId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPayoutDetail> {
      return apiRequest<AdminPayoutDetail>(
        `/api/v1/admin/payouts/${encode(payoutId)}`,
        { cache: "no-store", ...options },
      );
    },

    getPayoutHistory(payoutId: string): Promise<AdminPayoutHistoryEntry[]> {
      return apiRequest<AdminPayoutHistoryEntry[]>(
        `/api/v1/admin/payouts/${encode(payoutId)}/status-history`,
        { cache: "no-store" },
      );
    },

    approvePayout(payoutId: string, options: PayoutApproval): Promise<AdminPayoutCommandResult> {
      return apiRequest<AdminPayoutCommandResult>(
        `/api/v1/admin/payouts/${encode(payoutId)}/approve`,
        {
          method: "POST",
          headers: payoutCommandHeaders(options),
          body: options.reasonCode ? { reasonCode: options.reasonCode } : {},
        },
      );
    },

    rejectPayout(payoutId: string, options: PayoutRejection): Promise<AdminPayoutCommandResult> {
      return apiRequest<AdminPayoutCommandResult>(
        `/api/v1/admin/payouts/${encode(payoutId)}/cancel`,
        {
          method: "POST",
          headers: payoutCommandHeaders(options),
          body: {
            reasonCode: options.reasonCode,
            ...(options.reason?.trim() ? { reason: options.reason.trim() } : {}),
          },
        },
      );
    },

    reconcilePayout(payoutId: string): Promise<AdminPayoutReconcileResult> {
      return apiRequest<AdminPayoutReconcileResult>(
        `/api/v1/admin/payouts/${encode(payoutId)}/reconcile`,
        { method: "POST" },
      );
    },

    retryPayoutProviderEvent(eventId: string): Promise<AdminPayoutProviderEventResult> {
      return apiRequest<AdminPayoutProviderEventResult>(
        `/api/v1/admin/payouts/events/${encode(eventId)}/retry`,
        { method: "POST" },
      );
    },

    listTopUps(query: AdminTopUpListQuery = {}): Promise<AdminPage<AdminTopUpListItem>> {
      return apiRequest<AdminPage<AdminTopUpListItem>>(
        `/api/v1/admin/top-ups${queryString(query)}`,
        { cache: "no-store" },
      );
    },

    reconcileTopUp(topUpId: string): Promise<AdminTopUpReconcileResult> {
      return apiRequest<AdminTopUpReconcileResult>(
        `/api/v1/admin/top-ups/${encode(topUpId)}/reconcile`,
        { method: "POST" },
      );
    },

    retryTopUpProviderEvent(eventId: string): Promise<AdminTopUpProviderEventResult> {
      return apiRequest<AdminTopUpProviderEventResult>(
        `/api/v1/admin/top-ups/events/${encode(eventId)}/retry`,
        { method: "POST" },
      );
    },
  };
}
