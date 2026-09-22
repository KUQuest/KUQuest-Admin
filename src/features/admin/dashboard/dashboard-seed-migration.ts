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

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function partyId(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return text(value);
  return firstText(record.id, record.userId, record.memberId);
}

function partyName(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return text(value);
  return firstText(record.name, record.displayName, record.title);
}

function roleIs(value: unknown, role: "Hirer" | "Worker"): boolean {
  return text(value)?.toLowerCase() === role.toLowerCase();
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

function repairLegacyDisputeParties(
  existing: unknown[],
  quests: unknown[],
  users: unknown[],
): { records: unknown[]; changed: boolean } {
  const questById = new Map<string, Record<string, unknown>>();
  for (const value of quests) {
    const quest = asRecord(value);
    const id = firstText(quest?.id, quest?.displayId);
    if (quest && id) questById.set(id, quest);
  }
  const memberIdByName = new Map<string, string>();
  const memberNameById = new Map<string, string>();
  for (const value of users) {
    const member = asRecord(value);
    const id = firstText(member?.id, member?.userId, member?.memberId);
    const name = firstText(member?.title, member?.name, member?.displayName, member?.person);
    if (id && name) {
      memberIdByName.set(name.toLocaleLowerCase(), id);
      memberNameById.set(id, name);
    }
  }
  const memberIdForName = (value: unknown): string | null => {
    const name = text(value);
    return name ? memberIdByName.get(name.toLocaleLowerCase()) ?? null : null;
  };
  const memberNameForId = (value: unknown): string | null => {
    const id = text(value);
    return id ? memberNameById.get(id) ?? null : null;
  };

  let changed = false;
  const records = existing.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    if (!isDisputeCaseStatus(record.status) && !isDisputeCaseStatus(record.disputeCaseStatus)) return value;

    const recordQuest = asRecord(record.quest);
    const relatedQuestId = firstText(record.questId, recordQuest?.id, recordQuest?.displayId);
    const relatedQuest = relatedQuestId ? questById.get(relatedQuestId) : null;
    const quest = recordQuest && relatedQuest
      ? { ...relatedQuest, ...recordQuest }
      : recordQuest ?? relatedQuest;
    const legacyHirerName = firstText(record.hirerName, record.person, quest?.hirerName, quest?.person);
    const legacyWorkerName = firstText(record.workerName, record.other, quest?.workerName, quest?.other, quest?.selectedParticipant);
    const hirerId = firstText(
      record.hirerId,
      quest?.hirerId,
      partyId(record.hirer),
      partyId(quest?.hirer),
      quest?.memberId,
      memberIdForName(legacyHirerName),
    );
    const workerId = firstText(
      record.workerId,
      record.resolvedWorkerId,
      quest?.workerId,
      partyId(record.worker),
      partyId(quest?.worker),
      memberIdForName(legacyWorkerName),
    );
    const filerRole = roleIs(record.filerRole, "Worker") ? "Worker" : "Hirer";
    const respondentRole = roleIs(record.respondentRole, "Hirer") ? "Hirer" : "Worker";
    const filerId = firstText(
      record.filerUserId,
      record.filerId,
      roleIs(filerRole, "Hirer") ? hirerId : workerId,
    );
    const respondentId = firstText(
      record.respondentUserId,
      record.respondentId,
      roleIs(respondentRole, "Hirer") ? hirerId : workerId,
      roleIs(filerRole, "Hirer") ? workerId : hirerId,
    );
    const hirerName = firstText(legacyHirerName, partyName(record.hirer), partyName(quest?.hirer), memberNameForId(hirerId));
    const workerName = firstText(legacyWorkerName, partyName(record.worker), partyName(quest?.worker), memberNameForId(workerId));
    const filerName = firstText(
      record.filerName,
      partyName(record.filer),
      roleIs(filerRole, "Hirer") ? hirerName : workerName,
      record.reporterName,
    );
    const respondentName = firstText(
      record.respondentName,
      partyName(record.respondent),
      roleIs(respondentRole, "Hirer") ? hirerName : workerName,
    );

    const repaired = { ...record };
    let recordChanged = false;
    const fill = (field: string, fieldValue: string | null) => {
      if (!isMissingSeedValue(repaired[field]) || !fieldValue) return;
      repaired[field] = fieldValue;
      recordChanged = true;
    };
    fill("filerUserId", filerId);
    fill("respondentUserId", respondentId);
    fill("filerName", filerName);
    fill("respondentName", respondentName);
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
  const repairedLegacyDisputes = repairLegacyDisputeParties(
    repairedDisputes.records,
    quests.records,
    repairedUsers.records,
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
  const repairedDisputesChanged = disputes.changed || repairedDisputes.changed || repairedLegacyDisputes.changed;
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
      disputes: repairedLegacyDisputes.records,
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
  // Mock data can remain in browser storage across releases. Always merge the
  // current fixture set so an older or unknown snapshot does not hide records
  // from the moderation boards. Existing records and Admin decisions remain
  // authoritative because the merge only adds missing records and repairs
  // missing fixture fields.
  return migrateExpandedMockSeed(storage, migrated, config);
}
