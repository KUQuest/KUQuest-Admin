import type { BrowserStorage } from "../data/legacy-admin-data-adapter";
import type { PersistedAdminData } from "../data/admin-records";
import type { DashboardActivity } from "../dashboard/dashboard-model";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import { overviewModelFromMockData, type OverviewModel } from "./overview-model";

const ACTIVITY_STORAGE_KEY = "kuquest-admin-activity-v2";

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

export function loadOverviewMockData(storage: BrowserStorage): PersistedAdminData {
  return loadDashboardData(storage);
}

export function loadOverviewModelFromMock(storage: BrowserStorage): OverviewModel {
  return overviewModelFromMockData(loadOverviewMockData(storage), localActivityEvents(storage));
}
