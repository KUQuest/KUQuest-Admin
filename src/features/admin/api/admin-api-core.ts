import { apiClient, apiRequest } from "../../../lib/api/client";
import {
  getOverviewRequest,
  queryString,
} from "./admin-api-transport";
import type {
  AdminActivityListQuery,
  AdminActivityLog,
  AdminApiRequestOptions,
  AdminAuthSession,
  AdminAuthSessionDetails,
  AdminFinanceOverview,
  AdminOverview,
  AdminPage,
} from "./admin-api";

export function createAdminCoreApi() {
  return {
    signInEmail(email: string, password: string): Promise<AdminAuthSession> {
      return apiClient<AdminAuthSession>("/api/admin/auth/sign-in/email", {
        method: "POST",
        body: { email, password },
      });
    },

    getSession(): Promise<AdminAuthSessionDetails | null> {
      return apiClient<AdminAuthSessionDetails | null>("/api/admin/auth/get-session", {
        cache: "no-store",
      });
    },

    signOut(): Promise<null> {
      return apiRequest<null | undefined>("/api/admin/auth/sign-out", {
        method: "POST",
      }).then(() => null);
    },

    getOverview(options: AdminApiRequestOptions = {}): Promise<AdminOverview> {
      return getOverviewRequest(options);
    },

    getFinanceOverview(options: AdminApiRequestOptions = {}): Promise<AdminFinanceOverview> {
      return apiRequest<AdminFinanceOverview>(
        "/api/v1/admin/finance/overview",
        { cache: "no-store", ...options },
      );
    },

    listActivityLogs(
      query: AdminActivityListQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminActivityLog>> {
      return apiRequest<AdminPage<AdminActivityLog>>(
        `/api/v1/admin/activity-log${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },
  };
}
