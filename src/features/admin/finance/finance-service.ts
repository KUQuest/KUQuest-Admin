import { adminApiRequestOptions } from "../api/admin-api-request-options";
import type { AdminMoneyPolicy, AdminPage, AdminTopUpListItem } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";

export type FinancePageData = {
  currentPolicy: AdminMoneyPolicy | null;
  policyRevisions: AdminMoneyPolicy[];
  policyError: string | null;
};

export type TopUpPageData = {
  topUpPage: AdminPage<AdminTopUpListItem> | null;
  topUpError: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The Admin API is unavailable.";
}

export async function loadFinancePageData(
  cookieHeader?: string,
): Promise<FinancePageData> {
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
    currentPolicy: currentPolicyResult.status === "fulfilled" ? currentPolicyResult.value.policy : null,
    policyRevisions: revisionsResult.status === "fulfilled" ? revisionsResult.value.policies : [],
    policyError: policyFailure,
  };
}

export async function loadTopUpPageData(
  cookieHeader?: string,
): Promise<TopUpPageData> {
  try {
    const topUpPage = await adminApiProvider.read.listTopUps(
      { limit: 25 },
      adminApiRequestOptions(cookieHeader),
    );
    return { topUpPage, topUpError: null };
  } catch (error) {
    return { topUpPage: null, topUpError: errorMessage(error) };
  }
}
