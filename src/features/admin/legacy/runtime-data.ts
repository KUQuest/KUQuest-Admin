import type { LegacyDisputeCase, LegacyRecord, LegacyRuntimeData } from "./runtime";

export const disputeCases: Record<string, LegacyDisputeCase> = {};
export const data: LegacyRuntimeData = {
  disputes: [],
  quests: [],
  users: [],
  payouts: [],
  reports: [],
};

export function recordsFor(view: string): LegacyRecord[] {
  if (view === "reports") {
    return data.reports.filter((record) => !record.conductReportStatus);
  }
  if (view === "conduct-reports") {
    return data.reports.filter((record) => Boolean(record.conductReportStatus));
  }
  if (view === "wallets") {
    return data.users;
  }
  return data[view as keyof LegacyRuntimeData] || [];
}
