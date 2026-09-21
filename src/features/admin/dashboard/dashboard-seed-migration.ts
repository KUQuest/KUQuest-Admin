import {
  ADMIN_DEMO_DATA_KEY,
  type BrowserStorage,
} from "../data/admin-demo-data-adapter";
import type { PersistedAdminData } from "../data/admin-records";
import {
  isConductReportStatus,
  isDisputeCaseStatus,
  isReportCaseStatus,
} from "../domain/rulebook";

export type DashboardSeedMigrationConfig = {
  dashboardSeedVersion: string;
  previousDashboardSeedVersion: string;
  previousCanonicalDashboardSeedVersion: string;
  dashboardConductReportSeedData: readonly unknown[];
  dashboardDisputeSeedData: readonly { id: string }[];
  dashboardSeedData: PersistedAdminData;
};

function hasConductReports(data: PersistedAdminData): boolean {
  return data.collections.reports.some((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const candidate = record as Record<string, unknown>;
    return isConductReportStatus(candidate.status) || isConductReportStatus(candidate.conductReportStatus);
  });
}

function migrateConductReportSeed(
  storage: BrowserStorage,
  data: PersistedAdminData,
  config: DashboardSeedMigrationConfig,
): PersistedAdminData {
  if (data.version !== config.previousDashboardSeedVersion || hasConductReports(data)) return data;

  const migrated: PersistedAdminData = {
    ...data,
    version: config.dashboardSeedVersion,
    collections: {
      ...data.collections,
      reports: [...data.collections.reports, ...config.dashboardConductReportSeedData],
    },
  };
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(migrated));
  } catch {
    // The migrated data remains useful for the current render.
  }
  return migrated;
}

function migrateDisputeSeed(
  storage: BrowserStorage,
  data: PersistedAdminData,
  config: DashboardSeedMigrationConfig,
): PersistedAdminData {
  const seedById = new Map(config.dashboardDisputeSeedData.map((record) => [record.id, record]));
  let changed = false;
  const disputes = data.collections.disputes.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    const seed = typeof record.id === "string" ? seedById.get(record.id) : undefined;
    if (!seed || record.questId && record.questState && record.displayId) return value;
    changed = true;
    return { ...seed, ...record };
  });
  if (!changed) return data;

  const migrated: PersistedAdminData = {
    ...data,
    collections: { ...data.collections, disputes },
  };
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(migrated));
  } catch {
    // The migrated data remains useful for the current render.
  }
  return migrated;
}

function mergeSeedRecords(existing: unknown[], seeded: readonly unknown[]): { records: unknown[]; changed: boolean } {
  const ids = new Set(existing.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const id = (value as Record<string, unknown>).id;
    return typeof id === "string" ? [id] : [];
  }));
  const missing = seeded.filter((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const id = (value as Record<string, unknown>).id;
    return typeof id === "string" && !ids.has(id);
  });
  return { records: missing.length ? [...existing, ...missing] : existing, changed: missing.length > 0 };
}

function isMissingSeedValue(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function repairMissingSeedFields(
  existing: unknown[],
  seeded: readonly unknown[],
  fields: readonly string[],
  shouldRepair: (record: Record<string, unknown>) => boolean,
): { records: unknown[]; changed: boolean } {
  const seedById = new Map<string, Record<string, unknown>>();
  for (const value of seeded) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    if (typeof record.id === "string") seedById.set(record.id, record);
  }

  let changed = false;
  const records = existing.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    if (typeof record.id !== "string" || !shouldRepair(record)) return value;
    const seed = seedById.get(record.id);
    if (!seed) return value;

    let recordChanged = false;
    const repaired = { ...record };
    for (const field of fields) {
      if (!isMissingSeedValue(repaired[field]) || isMissingSeedValue(seed[field])) continue;
      repaired[field] = seed[field];
      recordChanged = true;
    }
    if (!recordChanged) return value;
    changed = true;
    return repaired;
  });

  return { records, changed };
}

function migrateExpandedMockSeed(
  storage: BrowserStorage,
  data: PersistedAdminData,
  config: DashboardSeedMigrationConfig,
): PersistedAdminData {
  const seeded = config.dashboardSeedData.collections;
  const users = mergeSeedRecords(data.collections.users, seeded.users);
  const repairedUsers = repairMissingSeedFields(
    users.records,
    seeded.users,
    ["faculty", "department", "occupation"],
    () => true,
  );
  const quests = mergeSeedRecords(data.collections.quests, seeded.quests);
  const payouts = mergeSeedRecords(data.collections.payouts, seeded.payouts);
  const disputes = mergeSeedRecords(data.collections.disputes, seeded.disputes);
  const reports = mergeSeedRecords(data.collections.reports, seeded.reports);
  const repairedDisputes = repairMissingSeedFields(
    disputes.records,
    seeded.disputes,
    ["questId", "title", "filerUserId", "filerName", "respondentUserId", "respondentName", "respondentStatement"],
    (record) => isDisputeCaseStatus(record.status) || isDisputeCaseStatus(record.disputeCaseStatus),
  );
  const repairedConductReports = repairMissingSeedFields(
    reports.records,
    seeded.reports,
    ["questId", "questTitle", "questState", "failedAt", "questRecord", "reportedMemberId", "reportedUserName", "reporterId", "reporterName"],
    (record) => isConductReportStatus(record.status) || isConductReportStatus(record.conductReportStatus),
  );
  const repairedReportCases = repairMissingSeedFields(
    repairedConductReports.records,
    seeded.reports,
    ["reportedMemberId", "reportedUserName", "reporterId", "reporterName"],
    (record) => isReportCaseStatus(record.status) || isReportCaseStatus(record.reportCaseStatus),
  );
  const repairedReportsChanged = reports.changed || repairedConductReports.changed || repairedReportCases.changed;
  const repairedDisputesChanged = disputes.changed || repairedDisputes.changed;
  const repairedUsersChanged = users.changed || repairedUsers.changed;
  if (!repairedUsersChanged && !quests.changed && !payouts.changed && !repairedDisputesChanged && !repairedReportsChanged && data.version === config.dashboardSeedVersion) {
    return data;
  }

  const migrated: PersistedAdminData = {
    version: config.dashboardSeedVersion,
    collections: {
      ...data.collections,
      users: repairedUsers.records as PersistedAdminData["collections"]["users"],
      quests: quests.records,
      payouts: payouts.records,
      disputes: repairedDisputes.records,
      reports: repairedReportCases.records,
    },
  };
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(migrated));
  } catch {
    // The expanded data remains useful for the current render.
  }
  return migrated;
}

export function migrateDashboardData(
  storage: BrowserStorage,
  stored: PersistedAdminData,
  config: DashboardSeedMigrationConfig,
): PersistedAdminData {
  const migrated = migrateDisputeSeed(storage, migrateConductReportSeed(storage, stored, config), config);
  return stored.version === config.previousCanonicalDashboardSeedVersion
    || stored.version === config.previousDashboardSeedVersion
    || stored.version === config.dashboardSeedVersion
    ? migrateExpandedMockSeed(storage, migrated, config)
    : migrated;
}
