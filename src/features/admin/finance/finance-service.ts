import { cookies } from "next/headers";

import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import type { AdminApiTopUpStatus, AdminMoneyPolicy, AdminPage, AdminTopUpListItem } from "../api/admin-api";
import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";

export type FinanceDataSource = "api" | "mock";

export type FinancePageData = {
  dataSource: FinanceDataSource;
  currentPolicy: AdminMoneyPolicy | null;
  policyRevisions: AdminMoneyPolicy[];
  policyError: string | null;
  topUpPage: AdminPage<AdminTopUpListItem> | null;
  topUpError: string | null;
};

export async function loadFinanceRouteContext(): Promise<{
  dataSource: FinanceDataSource;
  cookieHeader?: string;
}> {
  const dataSource = isAdminApiEnabled() ? "api" : "mock";
  if (dataSource === "mock") return { dataSource };

  const cookieStore = await cookies();
  return {
    dataSource,
    cookieHeader: adminSessionCookieHeader(cookieStore.getAll()),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The Admin API is unavailable.";
}

export async function loadFinancePageData(
  cookieHeader: string | undefined,
  dataSource: FinanceDataSource,
): Promise<FinancePageData> {
  if (dataSource === "mock") {
    return {
      dataSource,
      currentPolicy: null,
      policyRevisions: [],
      policyError: null,
      topUpPage: null,
      topUpError: null,
    };
  }

  const options = adminApiRequestOptions(cookieHeader);
  const [currentPolicyResult, revisionsResult, topUpResult] = await Promise.allSettled([
    adminApiProvider.read.getCurrentMoneyPolicy(options),
    adminApiProvider.read.listMoneyPolicyRevisions(options),
    adminApiProvider.read.listTopUps({ limit: 25 }, options),
  ]);

  const policyFailure = currentPolicyResult.status === "rejected"
    ? errorMessage(currentPolicyResult.reason)
    : revisionsResult.status === "rejected"
      ? errorMessage(revisionsResult.reason)
      : null;

  return {
    dataSource,
    currentPolicy: currentPolicyResult.status === "fulfilled" ? currentPolicyResult.value.policy : null,
    policyRevisions: revisionsResult.status === "fulfilled" ? revisionsResult.value.policies : [],
    policyError: policyFailure,
    topUpPage: topUpResult.status === "fulfilled" ? topUpResult.value : null,
    topUpError: topUpResult.status === "rejected" ? errorMessage(topUpResult.reason) : null,
  };
}

export type FinanceTopUpFilter = "ALL" | AdminApiTopUpStatus;
