import type { LegacyDisputeCase, LegacyRecord, LegacyRuntimeData } from "./runtime";

export const disputeCases: Record<string, LegacyDisputeCase> = {};
export const data: LegacyRuntimeData = {
  disputes: [],
  quests: [],
  users: [],
  wallets: [],
  payouts: [],
  topups: [],
  reports: [],
};

export function recordsFor(view: string): LegacyRecord[] {
  if (view === "reports") {
    return data.reports;
  }
  if (view === "conduct-reports") {
    return data.reports.filter((record) => Boolean(record.conductReportStatus));
  }
  if (view === "wallets") {
    return data.wallets;
  }
  return data[view as keyof LegacyRuntimeData] || [];
}
