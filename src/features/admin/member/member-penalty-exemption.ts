import type { MemberPenaltyHistoryCollection } from "./member-model";

export type DirectActionExemption = "PC-12" | "PC-13" | "none" | "unknown";

function calendarMonthAfter(timestamp: number): number {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  date.setUTCFullYear(year, month, Math.min(day, lastDay));
  return date.getTime();
}

export function directActionExemption(
  penaltyHistory: MemberPenaltyHistoryCollection,
  complete: boolean,
): DirectActionExemption {
  const summary = penaltyHistory.summary;
  const entries = penaltyHistory.items;
  if (!complete || !summary || !entries) return "unknown";
  if (summary.confirmedMisconductCount < 10) return "PC-12";

  const now = Date.now();
  const banLifts: number[] = [];
  let activeBan = false;
  for (const entry of entries) {
    if (entry.result !== "PENALTY_TEMPORARY_BAN_7_DAYS"
      && entry.result !== "PENALTY_TEMPORARY_BAN_1_MONTH"
      && entry.result !== "PENALTY_PERMANENT_BAN") continue;

    const createdAt = Date.parse(entry.createdAt);
    const reversalAt = entry.reversal?.relation === "REVERSED_BY"
      ? Date.parse(entry.reversal.createdAt)
      : null;
    if (entry.result === "PENALTY_PERMANENT_BAN") {
      if (entry.isEffective) activeBan = true;
      if (reversalAt !== null) banLifts.push(reversalAt);
      continue;
    }

    const expiresAt = entry.result === "PENALTY_TEMPORARY_BAN_7_DAYS"
      ? createdAt + 7 * 24 * 60 * 60 * 1000
      : calendarMonthAfter(createdAt);
    if (entry.isEffective && expiresAt > now) activeBan = true;
    if (reversalAt !== null) banLifts.push(Math.min(expiresAt, reversalAt));
    else if (expiresAt <= now) banLifts.push(expiresAt);
  }

  if (activeBan) return "none";
  const lastBanLift = banLifts.length ? Math.max(...banLifts) : null;
  if (lastBanLift === null) return "none";

  const confirmedSinceBanLift = entries.filter((entry) => (
    entry.ladder === "MISCONDUCT"
    && entry.source !== "REVIEW_AVERAGE"
    && entry.result !== "PENALTY_REVERSAL"
    && entry.recalculatedFrom === null
    && Date.parse(entry.createdAt) >= lastBanLift
  )).length;
  return confirmedSinceBanLift < 3 ? "PC-13" : "none";
}
