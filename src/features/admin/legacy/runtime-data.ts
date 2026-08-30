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
  return data[view as keyof LegacyRuntimeData] || [];
}
