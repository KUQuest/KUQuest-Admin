import type { LegacyHistoryEntry, LegacyRecord, LegacyRuntimeData } from "./runtime";
import { data } from "./runtime-data";
import {
  disputeCaseStatusFor,
  isReportCasePending,
  payoutStatusFor,
  questStateFor,
  walletStatusFor,
} from "../domain/rulebook";

export type PenaltyOutcome = { key?: string; label: string; status: string; tone: string; durationDays?: number | null };
type PenaltyExemption = { remaining: number; label: string; field: string };

export function reportDateTime(date = new Date()): string {
  const datePart = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
  const timePart = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
  return `${datePart} · ${timePart}`;
}

export function adminDateTime(date = new Date()): string {
  return reportDateTime(date).replace(/\s+ICT$/, "");
}

export function currentAdminName(): string {
  return "Nicha P.";
}

const activityStorageKey = "kuquest-admin-activity-v2";
const activityDataVersionKey = "kuquest-admin-activity-version";
const activityDataVersion = "2026-08-28-large-refresh-v2";
try {
  if (localStorage.getItem(activityDataVersionKey) !== activityDataVersion) {
    localStorage.removeItem(activityStorageKey);
    localStorage.setItem(activityDataVersionKey, activityDataVersion);
  }
} catch {
  // Keep activity empty if browser storage is blocked.
}

export function readActivityEvents(): Array<{ actor?: string; title: string; detail: string; timestamp: number }> {
  try {
    const events: unknown = JSON.parse(localStorage.getItem(activityStorageKey) || "[]");
    return Array.isArray(events)
      ? events.filter((event): event is { actor?: string; title: string; detail: string; timestamp: number } => Boolean(event && typeof event === "object"))
      : [];
  } catch {
    return [];
  }
}

export function formatActivityTime(timestamp: number): string {
  const age = Math.max(0, Date.now() - Number(timestamp || 0));
  const minutes = Math.floor(age / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function activityTimestamp(value: unknown, fallback: number): number {
  const timestamp = Date.parse(String(value ?? "").replace(" · ", " "));
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function activityInitials(name: unknown, fallback: string): string {
  const initials = String(name ?? "").trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return initials || fallback;
}

function formatAmount(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function seedGeneratedActivity(records: LegacyRuntimeData): void {
  if (readActivityEvents().length) return;
  const events: Array<{ actor: string; title: string; detail: string; timestamp: number }> = [];
  const now = Date.now();
  const add = (actor: string, title: string, detail: string, at: unknown, fallback: number): void => {
    events.push({ actor, title, detail, timestamp: activityTimestamp(at, fallback) });
  };
  (records.reports || []).slice(0, 14).forEach((record, index) => {
    const fallback = now - (index + 1) * 38 * 60 * 1000;
    add(activityInitials(record.reporterName, "US"), "User report received", `${record.id} · ${record.reporterName} reported ${record.reportedUserName}`, record.reportedAt, fallback);
    if (!isReportCasePending(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision)) add("NP", "Report resolved", `${record.id} · ${record.decisionLabel || "Report closed"}`, record.resolutionAt || record.closedAt, fallback + 47 * 60 * 1000);
  });
  (records.disputes || []).slice(0, 12).forEach((record, index) => {
    const fallback = now - (index + 2) * 17 * 60 * 60 * 1000;
    add("SYS", "Dispute opened", `${record.id} · ${record.title}`, record.disputeDate, fallback);
    if (disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) !== "DISPUTE_CASE_PENDING") add("NP", "Dispute resolved", `${record.id} · ${record.resolution || "Resolution recorded"}`, record.disputeDate, fallback + 3 * 60 * 60 * 1000);
  });
  (records.payouts || []).slice(0, 12).forEach((record, index) => {
    const fallback = now - (index + 1) * 21 * 60 * 60 * 1000;
    add("SYS", "Payout requested", `${record.id} · ${record.title} · ฿${formatAmount(record.amount)}`, record.requestedAt, fallback);
    const payoutStatus = payoutStatusFor(record.payoutStatus ?? record.status);
    if (["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "SUCCEEDED"].includes(payoutStatus)) add("NP", "Payout approved", `${record.id} · ${record.title}`, record.approvedAt, fallback + 2 * 60 * 60 * 1000);
    else if (payoutStatus === "CANCELLED") add("NP", "Payout rejected", `${record.id} · ${record.rejectionReason}`, record.rejectedAt, fallback + 2 * 60 * 60 * 1000);
  });
  (records.users || []).slice(0, 16).forEach((user, index) => {
    (user.moderationHistory || []).slice(0, 2).forEach((entry, entryIndex) => add(
      activityInitials(entry.by, entry.by === "System" ? "SYS" : "NP"),
      entry.event || "Activity",
      `${user.id} · ${user.title}${entry.reason || entry.note ? ` · ${entry.reason || entry.note}` : ""}`,
      entry.at,
      now - (index * 2 + entryIndex + 1) * 29 * 60 * 60 * 1000,
    ));
  });
  events.sort((first, second) => second.timestamp - first.timestamp);
  try {
    localStorage.setItem(activityStorageKey, JSON.stringify(events.slice(0, 40)));
  } catch {
    // Keep activity empty if browser storage is blocked.
  }
}

export function recordActivity(title: string, detail: string, actor = "NP"): void {
  try {
    localStorage.setItem(activityStorageKey, JSON.stringify([
      { actor, title: String(title), detail: String(detail), timestamp: Date.now() },
      ...readActivityEvents(),
    ].slice(0, 40)));
  } catch {
    // Ignore activity writes if browser storage is blocked.
  }
}

export const penaltyPolicy = Object.freeze({
  redFlagDays: 7,
  temporaryBanDays: 7,
  newUserExemptionCount: 10,
  postBanExemptionCount: 3,
});

export function confirmedViolationCount(user: LegacyRecord): number {
  const fallback = user.status === "Red Flag" ? 1 : user.status === "Temp ban" ? 2 : user.status === "Perm ban" ? 3 : 0;
  return Math.max(0, Number(user.confirmedViolationCount ?? fallback) || 0);
}

export function redFlagExemptionFor(user: LegacyRecord): PenaltyExemption | null {
  const newUserRemaining = Math.max(0, Number(user.newUserExemptionRemaining) || 0);
  if (newUserRemaining) return { field: "newUserExemptionRemaining", remaining: newUserRemaining, label: "new user (PC-12)" };
  const postBanRemaining = Math.max(0, Number(user.postBanExemptionRemaining) || 0);
  if (postBanRemaining) return { field: "postBanExemptionRemaining", remaining: postBanRemaining, label: "post-ban (PC-13)" };
  return null;
}

export function penaltyOutcomeFor(user: LegacyRecord): PenaltyOutcome {
  const violationNumber = confirmedViolationCount(user) + 1;
  if (violationNumber === 1) return { key: "red-flag", label: "Red Flag", status: "Red Flag", tone: "warning", durationDays: penaltyPolicy.redFlagDays };
  if (violationNumber === 2) return { key: "temporary-ban", label: "Temporary ban", status: "Temp ban", tone: "danger", durationDays: penaltyPolicy.temporaryBanDays };
  return { key: "permanent-ban", label: "Permanent ban", status: "Perm ban", tone: "danger" };
}

export function penaltyOutcomeLabel(outcome: PenaltyOutcome | null): string {
  if (!outcome) return "No penalty determined";
  if (outcome.key === "red-flag-exempted") return "Red Flag exempted";
  return `${outcome.label}${outcome.durationDays ? ` · ${outcome.durationDays} days` : ""}`;
}

export function addUserHistory(user: LegacyRecord, entry: LegacyHistoryEntry): void {
  user.moderationHistory = [entry, ...(user.moderationHistory || [])];
}

function consumeRedFlagExemption(user: LegacyRecord, exemption: PenaltyExemption | null): void {
  if (exemption) user[exemption.field] = Math.max(0, exemption.remaining - 1);
}

export function recordConfirmedViolation(user: LegacyRecord, reason: string, note: string): PenaltyOutcome {
  const previousStatus = user.status;
  const appliedAt = adminDateTime();
  const appliedBy = currentAdminName();
  const violationNumber = confirmedViolationCount(user) + 1;
  const nextOutcome = penaltyOutcomeFor(user);
  const exemption = nextOutcome.key === "red-flag" ? redFlagExemptionFor(user) : null;
  const outcome = exemption ? { ...nextOutcome, key: "red-flag-exempted", status: "Normal", tone: "success", durationDays: null } : nextOutcome;
  user.confirmedViolationCount = violationNumber;
  consumeRedFlagExemption(user, exemption);
  let expiresAt = "";
  if (outcome.durationDays) {
    const expires = new Date();
    expires.setDate(expires.getDate() + outcome.durationDays);
    expiresAt = adminDateTime(expires);
  }
  user.status = outcome.status;
  user.walletStatus = walletStatusFor(outcome.status);
  user.tone = outcome.tone;
  user.statusReason = reason;
  user.statusAppliedAt = appliedAt;
  user.statusAppliedBy = appliedBy;
  delete user.redFlagExpiresAt;
  delete user.banExpiresAt;
  delete user.penalty;
  if (outcome.key !== "red-flag-exempted") {
    if (outcome.key === "red-flag") user.redFlagExpiresAt = expiresAt;
    if (outcome.key === "temporary-ban") user.banExpiresAt = expiresAt;
    user.penalty = { label: outcome.label, reason, recordedAt: appliedAt, appliedBy, ...(outcome.durationDays ? { durationDays: outcome.durationDays } : {}), ...(expiresAt ? { expiresAt } : {}) };
  }
  user.age = outcome.key === "red-flag-exempted" ? "Violation recorded · Red Flag exempted" : expiresAt ? `${outcome.status} · expires ${expiresAt}` : outcome.status;
  addUserHistory(user, { event: outcome.key === "red-flag-exempted" ? "Violation recorded (Red Flag exempted)" : `${outcome.label} applied`, at: appliedAt, by: appliedBy, reason, previousStatus, newStatus: outcome.status, violationNumber, outcome: penaltyOutcomeLabel(outcome) });
  if (note) user.adminNotes = [{ at: appliedAt, by: appliedBy, note }, ...(user.adminNotes || [])];
  return outcome;
}

export function applyDemoAction(action: string, record: LegacyRecord): boolean {
  if (action === "Hide quest") {
    record.hiddenAt = adminDateTime();
    record.hiddenByAdminId = currentAdminName();
    record.age = "Just now";
    return true;
  }
  if (action === "Restore quest") {
    record.hiddenAt = null;
    record.hiddenByAdminId = null;
    record.age = "Just now";
    return true;
  }
  const transitions: Record<string, [string, string]> = {
    "Restrict user": ["Temp ban", "danger"],
    "Set normal": ["Normal", "success"],
    "Lift penalty": ["Normal", "success"],
    "Reject payout": ["Rejected", "danger"],
    "Approve payout": ["Processing", "info"],
    "Close report": ["Closed", "neutral"],
    "Terminate quest": ["Cancelled", "cancelled"],
  };
  const next = transitions[action];
  if (!next) return false;
  [record.status, record.tone] = next;
  if (["Restrict user", "Set normal", "Lift penalty"].includes(action)) {
    record.walletStatus = walletStatusFor(record.status);
  }
  if (action === "Lift penalty") delete record.penalty;
  if (action === "Reject payout") record.payoutStatus = "CANCELLED";
  if (action === "Approve payout") record.payoutStatus = "SUBMITTED_TO_PROVIDER";
  if (action === "Close report") record.reportCaseStatus = "REPORT_CASE_DISMISSED";
  if (action === "Terminate quest") record.questState = "QUEST_CANCELLED";
  record.age = "Just now";
  if (action === "Close report") record.closedAt = reportDateTime();
  return true;
}

export function applyReportDecision(report: LegacyRecord, decision: string, reason: string): void {
  const user = data.users.find((candidate) => candidate.id === report.reportedUserId);
  const resolvedAt = adminDateTime();
  const resolvedBy = currentAdminName();
  const outcome = decision === "confirmed-violation" && user ? recordConfirmedViolation(user, reason, "") : null;
  report.status = "Closed";
  report.reportCaseStatus = decision === "confirmed-violation"
    ? "REPORT_CASE_HIDDEN"
    : "REPORT_CASE_DISMISSED";
  report.tone = "neutral";
  report.closedAt = reportDateTime();
  report.decision = decision;
  report.decisionLabel = decision === "no-violation" ? "No violation" : `Violation confirmed · ${penaltyOutcomeLabel(outcome)}`;
  report.decisionDays = outcome?.durationDays || null;
  report.decisionReason = reason;
  report.resolution = decision === "no-violation" ? "Report dismissed; no policy violation found." : `${report.decisionLabel}.`;
  report.resolvedBy = resolvedBy;
  report.resolutionAt = resolvedAt;
  if (user && decision === "no-violation") addUserHistory(user, { event: "Report dismissed", at: resolvedAt, by: resolvedBy, reason, previousStatus: user.status, newStatus: user.status });
}

export function payoutTimestamp(record: LegacyRecord): number {
  return Date.parse(String(record.requestedAt || "").replace(" · ", " ")) || 0;
}

export function payoutEarningForQuest(quest: LegacyRecord): number {
  if (!quest.teamQuest) return Number(quest.amount || 0);
  const workerCount = quest.teamParticipants?.length || Number(quest.teamSize) || 1;
  return Math.round(Number(quest.amount || 0) / workerCount);
}

export function completedPayoutQuests(record: LegacyRecord): LegacyRecord[] {
  return data.quests.filter((quest) => questStateFor(quest.questState ?? quest.status) === "QUEST_COMPLETED" && (quest.selectedParticipant === record.title || quest.teamParticipants?.some(([name]) => name === record.title)));
}

export function userReportsFor(user: LegacyRecord): LegacyRecord[] {
  return data.reports.filter((report) => report.reportedUserId === user.id).sort((first, second) => payoutTimestamp({ ...second, requestedAt: second.reportedAt }) - payoutTimestamp({ ...first, requestedAt: first.reportedAt }));
}

export function userQuestRecords(user: LegacyRecord): LegacyRecord[] {
  return data.quests.filter((quest) => quest.person === user.title || quest.selectedParticipant === user.title || quest.teamParticipants?.some(([name]) => name === user.title));
}

export function payoutPreviousRecords(record: LegacyRecord): LegacyRecord[] {
  const currentTimestamp = payoutTimestamp(record);
  return data.payouts
    .filter((payout) => {
      if (payout.title !== record.title || payout.id === record.id) return false;
      const timestamp = payoutTimestamp(payout);
      return timestamp < currentTimestamp || (!timestamp && !currentTimestamp);
    })
    .sort((first, second) => payoutTimestamp(second) - payoutTimestamp(first));
}

export type PayoutFinancials = {
  earned: number;
  committed: number;
  pending: number;
  available: number;
  remaining: number;
  previousPaidOut: number;
};

export function payoutFinancials(record: LegacyRecord): PayoutFinancials {
  const previousPayouts = payoutPreviousRecords(record);
  const processingReserved = previousPayouts
    .filter((payout) => ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING"].includes(payoutStatusFor(payout.payoutStatus ?? payout.status)))
    .reduce((total, payout) => total + Number(payout.amount || 0), 0);
  const pendingReserved = previousPayouts
    .filter((payout) => payoutStatusFor(payout.payoutStatus ?? payout.status) === "PENDING_ADMIN_APPROVAL")
    .reduce((total, payout) => total + Number(payout.amount || 0), 0);
  const previousPaidOut = Number(record.previouslyPaidOut ?? previousPayouts
    .filter((payout) => payoutStatusFor(payout.payoutStatus ?? payout.status) === "SUCCEEDED")
    .reduce((total, payout) => total + Number(payout.amount || 0), 0));
  const earned = completedPayoutQuests(record).reduce(
    (total, quest) => total + payoutEarningForQuest(quest),
    0,
  );
  const balanceBeforeRequest = Math.max(
    0,
    earned - previousPaidOut - processingReserved - pendingReserved,
  );
  return {
    earned,
    committed: processingReserved + pendingReserved,
    pending: pendingReserved,
    available: balanceBeforeRequest,
    remaining: ["CANCELLED", "FAILED"].includes(payoutStatusFor(record.payoutStatus ?? record.status))
      ? balanceBeforeRequest
      : Math.max(0, balanceBeforeRequest - Number(record.amount || 0)),
    previousPaidOut,
  };
}

export function payoutQuestId(record: { questId?: unknown; other?: unknown }): string {
  const questId = typeof record.questId === "string" ? record.questId : "";
  const other = typeof record.other === "string" ? record.other : "";
  return questId || other.match(/QST-\d+/)?.[0] || "";
}
