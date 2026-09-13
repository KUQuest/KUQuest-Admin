import type {
  AdminFinanceOverview,
  AdminMemberListItem,
  AdminPayout,
  AdminQuest,
} from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import type { BrowserStorage } from "../data/legacy-admin-data-adapter";
import type { PersistedAdminData } from "../data/admin-records";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import {
  dashboardActivityFromApi,
  type DashboardActivity,
} from "../dashboard/dashboard-model";
import {
  overviewFallbackWithoutApiData,
  overviewModelFromApi,
  overviewModelFromMockData,
  type OverviewModel,
} from "./overview-model";

const ACTIVITY_STORAGE_KEY = "kuquest-admin-activity-v2";

export type OverviewApiSearchData = {
  quests: AdminQuest[];
  members: AdminMemberListItem[];
  payouts: AdminPayout[];
};

function localActivityEvents(storage: BrowserStorage): DashboardActivity[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(ACTIVITY_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry, index): DashboardActivity[] => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      const timestamp = typeof record.timestamp === "number" ? record.timestamp : 0;
      const storedId = typeof record.id === "string" ? record.id.trim() : "";
      return [{
        id: storedId || `local-${index}-${timestamp}`,
        actor: typeof record.actor === "string" ? record.actor : "AD",
        title: typeof record.title === "string" ? record.title : "Administrative activity",
        detail: typeof record.detail === "string" ? record.detail : "",
        timestamp,
      }];
    });
  } catch {
    return [];
  }
}

export function loadOverviewFromMock(storage: BrowserStorage): OverviewModel {
  const data = loadDashboardData(storage);
  return overviewModelFromMockData(data, localActivityEvents(storage));
}

export function loadOverviewSearchDataFromMock(storage: BrowserStorage): PersistedAdminData {
  return loadDashboardData(storage);
}

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
