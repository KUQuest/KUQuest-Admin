import {
  ADMIN_DEMO_DATA_KEY,
  readAdminData,
  type BrowserStorage,
} from "../data/admin-demo-data-adapter";
import type { PersistedAdminData } from "../data/admin-records";
import { migrateDashboardData } from "./dashboard-seed-migration";
import {
  dashboardConductReportSeedData,
  dashboardDisputeSeedData,
  dashboardSeedData,
  dashboardSeedVersion,
  previousCanonicalDashboardSeedVersion,
  previousDashboardSeedVersion,
} from "./dashboard-seed-data";

export function loadDashboardData(storage: BrowserStorage): PersistedAdminData {
  const stored = readAdminData(storage);
  if (stored) {
    return migrateDashboardData(storage, stored, {
      dashboardSeedVersion,
      previousDashboardSeedVersion,
      previousCanonicalDashboardSeedVersion,
      dashboardConductReportSeedData,
      dashboardDisputeSeedData,
      dashboardSeedData,
    });
  }

  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(dashboardSeedData));
  } catch {
    // Use the in-memory seed when browser storage is unavailable.
  }
  return dashboardSeedData;
}
