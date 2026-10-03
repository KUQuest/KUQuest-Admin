import type {
  AdminActivityLog,
  AdminApiRequestOptions,
  AdminFinanceOverview,
  AdminSearchResultKind,
} from "../api/admin-api";
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


function activityTargetKind(resourceType: string): AdminSearchResultKind | null {
  switch (resourceType.trim().toUpperCase()) {
    case "CONDUCT_REPORT": return "conduct-report";
    case "DISPUTE_CASE": return "dispute";
    case "MEMBER":
    case "USER": return "member";
    case "PAYOUT": return "payout";
    case "QUEST": return "quest";
    case "REPORT_CASE": return "report";
    case "WALLET": return "wallet";
    default: return null;
  }
}

function activityTargetKey(entry: Pick<AdminActivityLog, "resourceType" | "resourceId">): string {
  return `${entry.resourceType.trim().toUpperCase()}\u0000${entry.resourceId}`;
}

async function activityDisplayIds(
  entries: AdminActivityLog[],
  options: AdminApiRequestOptions,
): Promise<Map<string, string>> {
  const targets = new Map<string, AdminActivityLog>();
  entries.forEach((entry) => targets.set(activityTargetKey(entry), entry));
  const displayIds = new Map<string, string>();
  await Promise.all([...targets.entries()].map(async ([key, entry]) => {
    const kind = activityTargetKind(entry.resourceType);
    if (!kind) return;
    const result = await adminApiProvider.read.searchAdminRecords(
      { q: entry.resourceId, kind },
      options,
    ).catch(() => null);
    const displayId = result?.items.find((item) => (
      item.kind === kind
      && item.resourceId === entry.resourceId
      && item.displayId?.trim()
    ))?.displayId?.trim();
    if (displayId) displayIds.set(key, displayId);
  }));
  return displayIds;
}
export async function loadOverviewFromApi(cookieHeader?: string): Promise<OverviewModel> {
  const options = adminApiRequestOptions(cookieHeader);
  const [overview, activityPage] = await Promise.all([
    adminApiProvider.read.getOverview(options),
    adminApiProvider.read.listActivityLogs({ limit: 10, sort: "newest" }, options)
      .catch(() => ({ items: [], nextCursor: null })),
  ]);
  const activityIds = await activityDisplayIds(activityPage.items, options);
  const activity = activityPage.items.map((entry) => dashboardActivityFromApi(
    entry,
    activityIds.get(activityTargetKey(entry)),
  ));
  return overviewModelFromApi(
    overview,
    activity,
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
