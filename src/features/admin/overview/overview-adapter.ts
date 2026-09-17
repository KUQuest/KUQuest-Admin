import type { BrowserStorage } from "../data/legacy-admin-data-adapter";
import type { PersistedAdminData } from "../data/admin-records";
import {
  activityLogActionLabel,
  activityLogFixtures,
  activityLogReasonLabel,
  activityLogTargetLabel,
} from "../activity-log/activity-log-model";
import type { DashboardActivity } from "../dashboard/dashboard-model";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import { readMockPayoutOverrides } from "../payout/payout-mock-state";
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

function mockActivityEvents(): DashboardActivity[] {
  return activityLogFixtures().map((entry) => ({
    id: entry.id,
    actor: entry.adminInitials,
    title: activityLogActionLabel(entry.action),
    detail: `${activityLogTargetLabel(entry)}${entry.reasonCode ? ` · ${activityLogReasonLabel(entry.reasonCode)}` : ""}`,
    timestamp: entry.createdAtTimestamp ?? 0,
  }));
}

function activityEvents(storage: BrowserStorage): DashboardActivity[] {
  return [...localActivityEvents(storage), ...mockActivityEvents()]
    .toSorted((left, right) => right.timestamp - left.timestamp);
}

function applyMockPayoutOverrides(
  data: PersistedAdminData,
  storage: BrowserStorage,
): PersistedAdminData {
  const overrides = readMockPayoutOverrides(storage);
  if (!Object.keys(overrides).length) return data;

  let changed = false;
  const payouts = data.collections.payouts.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const override = id ? overrides[id] : undefined;
    if (!override) return value;
    changed = true;
    return {
      ...record,
      status: override.status,
      payoutStatus: override.status,
      updatedAt: override.updatedAt,
      version: override.version,
      cancellationReasonCode: override.cancellationReasonCode,
    };
  });

  return changed
    ? { ...data, collections: { ...data.collections, payouts } }
    : data;
}

export function loadOverviewMockData(storage: BrowserStorage): PersistedAdminData {
  return applyMockPayoutOverrides(loadDashboardData(storage), storage);
}

export function loadOverviewModelFromMock(storage: BrowserStorage): OverviewModel {
  return overviewModelFromMockData(loadOverviewMockData(storage), activityEvents(storage));
}
