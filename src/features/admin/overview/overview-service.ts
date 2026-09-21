import type { AdminFinanceOverview } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { dashboardActivityFromApi } from "../dashboard/dashboard-model";
import {
  overviewFallbackWithoutApiData,
  overviewModelFromApi,
  type OverviewApiSearchData,
  type OverviewModel,
} from "./overview-model";

export type OverviewPageData = {
  model: OverviewModel;
  financeOverview: AdminFinanceOverview | null;
  financeOverviewError: string | null;
  searchData: OverviewApiSearchData | null;
  searchError: string | null;
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

export async function loadOverviewSearchData(cookieHeader?: string): Promise<OverviewApiSearchData> {
  const options = adminApiRequestOptions(cookieHeader);
  const [quests, members, payouts] = await Promise.all([
    adminApiProvider.read.listQuests({ limit: 100, sort: "newest" }, options),
    adminApiProvider.read.listMembers({ limit: 100 }, options),
    adminApiProvider.read.listPayouts({ limit: 100, sort: "newest" }, options),
  ]);
  return {
    quests: quests.items.map(({ id, displayId, title, questStatus, hiddenAt, createdAt, updatedAt }) => ({
      id,
      displayId: displayId ?? id,
      title,
      status: questStatus,
      newestAt: updatedAt || createdAt,
      hiddenAt,
    })),
    members: members.items.map(({ id, firstName, lastName, studentId, createdAt }) => ({
      id,
      firstName,
      lastName,
      studentId,
      newestAt: createdAt,
    })),
    payouts: payouts.items.map(({ id, student, payoutStatus, createdAt, updatedAt }) => ({
      id,
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
      },
      status: payoutStatus,
      newestAt: updatedAt || createdAt,
    })),
  };
}

export async function loadOverviewPageData(cookieHeader?: string): Promise<OverviewPageData> {
  const [model, finance, search] = await Promise.allSettled([
    loadOverviewFromApi(cookieHeader),
    loadFinanceOverview(cookieHeader),
    loadOverviewSearchData(cookieHeader),
  ]);
  if (model.status === "rejected") throw model.reason;

  return {
    model: model.value,
    financeOverview: finance.status === "fulfilled" ? finance.value : null,
    financeOverviewError: finance.status === "rejected" ? "Finance Overview is not available." : null,
    searchData: search.status === "fulfilled" ? search.value : null,
    searchError: search.status === "rejected" ? "The Admin API search is not available." : null,
  };
}
