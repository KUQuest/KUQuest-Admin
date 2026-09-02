import type { LegacyRecord } from "./runtime";
import { data, disputeCases } from "./runtime-data";
import { payoutStatusFor } from "../domain/rulebook";
import { mockAdminCommandPort } from "./admin-command-port";
import { adminApiCommandPort } from "../api/admin-api";
import type { AdminCommandPort } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { payoutRecordFromApi } from "./live-review-data";

export { data, disputeCases };
export { mockAdminCommandPort };
export type { AdminCommandPort };

function mergeLivePayout(id: string, payout: Awaited<ReturnType<typeof adminApiCommandPort.approvePayout>>): void {
  const record = data.payouts.find((candidate) => candidate.id === id);
  if (record) Object.assign(record, payoutRecordFromApi(payout));
}

const livePayoutCommands: AdminCommandPort = {
  ...mockAdminCommandPort,
  approvePayout: async (payoutId, options) => {
    const payout = await adminApiCommandPort.approvePayout(payoutId, options);
    mergeLivePayout(payoutId, payout);
    return payout;
  },
  rejectPayout: async (payoutId, options) => {
    const payout = await adminApiCommandPort.rejectPayout(payoutId, options);
    mergeLivePayout(payoutId, payout);
    return payout;
  },
};

// Keep unsupported resources on the demo adapter until their API routes are
// available. Payout commands use the live API when the API data source is on.
export const adminCommands: AdminCommandPort = isAdminApiEnabled()
  ? livePayoutCommands
  : mockAdminCommandPort;
export {
  addUserHistory,
  adminDateTime,
  completedPayoutQuests,
  confirmedViolationCount,
  currentAdminName,
  formatActivityTime,
  payoutFinancials,
  payoutPreviousRecords,
  payoutEarningForQuest,
  payoutQuestId,
  payoutTimestamp,
  penaltyOutcomeFor,
  penaltyOutcomeLabel,
  penaltyPolicy,
  readActivityEvents,
  redFlagExemptionFor,
  recordActivity,
  recordConfirmedViolation,
  reportDateTime,
  seedGeneratedActivity,
  userQuestRecords,
  userReportsFor,
} from "./runtime-seed";

type IconName = "home" | "scale" | "quest" | "users" | "wallet" | "settings" | "history" | "menu" | "search" | "filter" | "check" | "user" | "flag";
type Tone = "warning" | "danger" | "success" | "info" | "neutral" | "assigned" | "cancelled";
type TimelineEntry = string | { title: string; detail?: string; time?: string; showDetails?: boolean };
type TimelineOptions = { showDetails?: boolean };

const paths: Record<IconName, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 6h6L5 7Zm14 0-3 6h6l-3-6ZM8 21h8"/>',
  quest: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 9h8M8 13h8M8 17h5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0-0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.8"/>',
  wallet: '<path d="M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 0 12-3v3"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flag: '<path d="M5 21V4m0 0h12l-2 4 2 4H5"/>',
};

export const ico = (name: string): string =>
  `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name as IconName] || paths.quest}</svg>`;

const allowedTones: Tone[] = ["warning", "danger", "success", "info", "neutral", "assigned", "cancelled"];
export function toneClass(tone: string): Tone {
  return allowedTones.includes(tone as Tone) ? tone as Tone : "neutral";
}

export function fmt(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function escapeActivityText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || "");
}

function questStatusClass(status: string): string {
  const slug = String(status ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ["open", "assigned", "in-progress", "submitted", "change-pending", "approved", "disputed", "completed", "hidden", "draft", "cancelled"].includes(slug)
    ? ` quest-status-${slug}`
    : "";
}

export const badge = (status: string, tone: string): string =>
  `<span class="badge ${toneClass(tone)}${questStatusClass(status)}">${escapeActivityText(status)}</span>`;

export function disputeTypeLabel(record: Pick<LegacyRecord, "disputeType">): string {
  return record.disputeType || "Other";
}

export function payoutDecisionContext(record: LegacyRecord): { heading: string; copy: string; next: string } {
  const contexts: Record<string, { heading: string; copy: string; next: string }> = {
    PENDING_ADMIN_APPROVAL: {
      heading: "Why your approval is needed",
      copy: "This payout is ready for release, but it cannot move to the bank until an admin approves it.",
      next: "Approve payout → status changes to SUBMITTED_TO_PROVIDER. Funds are not yet transferred.",
    },
    SUBMITTED_TO_PROVIDER: {
      heading: "Transfer submitted",
      copy: "The payout was approved and submitted to the payment provider.",
      next: "The provider will report the final transfer result.",
    },
    PROVIDER_PENDING: {
      heading: "Transfer in progress",
      copy: "The payout has been approved and is moving to the recipient’s bank. No action is needed unless the transfer fails.",
      next: "The record will become SUCCEEDED after the provider confirms the transfer.",
    },
    SUCCEEDED: {
      heading: "Transfer completed",
      copy: "The recipient’s bank transfer completed successfully. This record is retained for audit.",
      next: "No further admin action is available.",
    },
    CANCELLED: {
      heading: "Payout rejected",
      copy: "This payout was rejected before funds were released. Review the recorded reason before creating a new payout request.",
      next: "No retry is available from this record.",
    },
    FAILED: {
      heading: "Transfer failed",
      copy: "The payment provider could not complete this transfer.",
      next: "Review the failure reason before creating a new payout request.",
    },
  };
  const status = payoutStatusFor(record.payoutStatus ?? record.status);
  return contexts[status] || contexts.PENDING_ADMIN_APPROVAL;
}

function timelineDetail(title: string, index: number): string {
  if (index === 0) return "Current state recorded in the audit trail";
  if (/Quest published/i.test(title)) return "The quest became available under its published terms";
  if (/Applications received/i.test(title)) return "Applicants were recorded for review against the quest requirements";
  if (/Applications closed/i.test(title)) return "The application window closed and no further applications were accepted";
  if (/selected|accepted the terms/i.test(title)) return "Participant selection and acceptance were recorded for this quest";
  if (/proposed terms change|change pending/i.test(title)) return "A proposed change is waiting for participant consent";
  if (/submitted|evidence/i.test(title)) return "Submitted evidence was added to the record for review";
  if (/field work started|work started/i.test(title)) return "The assigned participant began work on the quest";
  if (/identity matched/i.test(title)) return "The account identity check was completed";
  if (/account ownership verified/i.test(title)) return "The payout account was confirmed for the participant";
  if (/quest funds reserved/i.test(title)) return "Quest funds were reserved for this payout";
  if (/record created/i.test(title)) return "This record was added to the audit trail";
  return "This event was recorded in the audit trail";
}

export function timeline(items: TimelineEntry[], options: TimelineOptions = {}): string {
  return `<ul class="timeline">${items.map((item, index) => {
    const rawParts = typeof item === "string" ? String(item).split(" · ") : [];
    const entry = typeof item === "string"
      ? { title: rawParts.shift() || "Quest activity", detail: rawParts.join(" · ") }
      : item;
    const parts = String(entry.detail || "").split(" · ");
    const timeParts = entry.time ? 0 : parts.length > 2 ? 2 : parts.length > 1 ? 1 : 0;
    const time = (entry.time || parts.slice(0, timeParts).join(" · ")).replace(/\s+ICT$/, "");
    const detail = entry.time ? entry.detail : parts.slice(timeParts).join(" · ") || timelineDetail(entry.title, index);
    return `<li><strong>${escapeActivityText(entry.title)}</strong>${time ? `<time>${escapeActivityText(time)}</time>` : ""}${options.showDetails === false || entry.showDetails === false ? "" : `<span>${escapeActivityText(detail)}</span>`}</li>`;
  }).join("")}</ul>`;
}
