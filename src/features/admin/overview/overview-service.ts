import type { AdminFinanceOverview } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { dashboardActivityFromApi } from "../dashboard/dashboard-model";
import {
  overviewFallbackWithoutApiData,
  overviewModelFromApi,
  type OverviewModel,
} from "./overview-model";

export type OverviewPageData = {
  model: OverviewModel;
  financeOverview: AdminFinanceOverview | null;
  financeOverviewError: string | null;
};

export async function loadOverviewFromApi(cookieHeader?: string): Promise<OverviewModel> {
  const options = adminApiRequestOptions(cookieHeader);
  const [overview, activityPage] = await Promise.all([
    adminApiProvider.read.getOverview(options),
    adminApiProvider.read.listActivityLogs({ limit: 10, sort: "newest" }, options).catch(() => ({ items: [], nextCursor: null })),
  ]);
  return overviewModelFromApi(
    overview,
    activityPage.items.map(dashboardActivityFromApi),
    overviewFallbackWithoutApiData(),
  );
}

export function loadFinanceOverview(cookieHeader?: string): Promise<AdminFinanceOverview> {
  return adminApiProvider.read.getFinanceOverview(adminApiRequestOptions(cookieHeader));
}

export async function loadOverviewPageData(cookieHeader?: string): Promise<OverviewPageData> {
  const [model, finance] = await Promise.allSettled([
    loadOverviewFromApi(cookieHeader),
    loadFinanceOverview(cookieHeader),
  ]);
  if (model.status === "rejected") throw model.reason;

  return {
    model: model.value,
    financeOverview: finance.status === "fulfilled" ? finance.value : null,
    financeOverviewError: finance.status === "rejected" ? "Finance Overview is not available." : null,
  };
}
