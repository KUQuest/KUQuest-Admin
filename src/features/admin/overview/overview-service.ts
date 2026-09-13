import type {
  AdminFinanceOverview,
  AdminMemberListItem,
  AdminPayout,
  AdminQuest,
} from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import { dashboardActivityFromApi } from "../dashboard/dashboard-model";
import {
  overviewFallbackWithoutApiData,
  overviewModelFromApi,
  type OverviewModel,
} from "./overview-model";

export type OverviewApiSearchData = {
  quests: AdminQuest[];
  members: AdminMemberListItem[];
  payouts: AdminPayout[];
};

export async function loadOverviewFromApi(): Promise<OverviewModel> {
  const [overview, activityPage] = await Promise.all([
    adminApi.getOverview(),
    adminApi.listActivityLogs({ limit: 4, sort: "newest" }).catch(() => ({ items: [], nextCursor: null })),
  ]);
  return overviewModelFromApi(
    overview,
    activityPage.items.map(dashboardActivityFromApi),
    overviewFallbackWithoutApiData(),
  );
}

export function loadFinanceOverview(): Promise<AdminFinanceOverview> {
  return adminApi.getFinanceOverview();
}

export async function loadOverviewSearchData(): Promise<OverviewApiSearchData> {
  const [quests, members, payouts] = await Promise.all([
    adminApi.listQuests({ limit: 100, sort: "newest" }),
    adminApi.listMembers({ limit: 100 }),
    adminApi.listPayouts({ limit: 100, sort: "newest" }),
  ]);
  return {
    quests: quests.items,
    members: members.items,
    payouts: payouts.items,
  };
}
