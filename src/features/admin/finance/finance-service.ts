import { cookies } from "next/headers";

import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import type { AdminMoneyPolicy, AdminPage, AdminTopUpListItem } from "../api/admin-api";
import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";

export type FinanceDataSource = "api" | "mock";

export type FinancePageData = {
  dataSource: FinanceDataSource;
  currentPolicy: AdminMoneyPolicy | null;
  policyRevisions: AdminMoneyPolicy[];
  policyError: string | null;
};

export type TopUpPageData = {
  dataSource: FinanceDataSource;
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
    };
  }

  const options = adminApiRequestOptions(cookieHeader);
  const [currentPolicyResult, revisionsResult] = await Promise.allSettled([
    adminApiProvider.read.getCurrentMoneyPolicy(options),
    adminApiProvider.read.listMoneyPolicyRevisions(options),
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
  };
}

export async function loadTopUpPageData(
  cookieHeader: string | undefined,
  dataSource: FinanceDataSource,
): Promise<TopUpPageData> {
  if (dataSource === "mock") {
    return { dataSource, topUpPage: null, topUpError: null };
  }

  try {
    const topUpPage = await adminApiProvider.read.listTopUps(
      { limit: 25 },
      adminApiRequestOptions(cookieHeader),
    );
    return { dataSource, topUpPage, topUpError: null };
  } catch (error) {
    return { dataSource, topUpPage: null, topUpError: errorMessage(error) };
  }
}
