import type {
  LegacyDomElement,
  LegacyHistoryEntry,
  LegacyModalOptions,
  LegacyPageState,
  LegacyRecord,
} from "./runtime";
import { data, disputeCases } from "./runtime-data";

type LegacyView = "home" | "disputes" | "quests" | "users" | "payouts" | "reports" | "policies" | "activity";
type IconName = "home" | "scale" | "quest" | "users" | "wallet" | "settings" | "history" | "menu" | "search" | "filter" | "paperclip" | "check" | "user" | "flag";
type Tone = "warning" | "danger" | "success" | "info" | "neutral" | "assigned" | "cancelled";
type TimelineEntry = string | { title: string; detail?: string; time?: string; showDetails?: boolean };
type TimelineOptions = { showDetails?: boolean };
type PenaltyOutcome = { key?: string; label: string; status: string; tone: string; durationDays?: number | null };
type PenaltyExemption = { remaining: number; label: string; field: string };
type LegacyForm = HTMLFormElement & {
  elements: HTMLFormControlsCollection & Record<string, LegacyDomElement>;
};

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
  paperclip: '<path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
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

const navItems: Array<[LegacyView, IconName, string, string]> = [
  ["home", "home", "Overview", ""],
  ["quests", "quest", "Quests", ""],
  ["disputes", "scale", "Disputes", "7"],
  ["reports", "flag", "Reports", "0"],
  ["payouts", "wallet", "Payouts", "4"],
  ["users", "users", "Users", ""],
];

function requiredQuery<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Legacy element is required: ${selector}`);
  return element;
}

const requestedView = new URLSearchParams(location.search).get("view");
const initialView: LegacyView = ["home", "disputes", "quests", "users", "payouts", "reports", "policies", "activity"].includes(requestedView as LegacyView)
  ? requestedView as LegacyView
  : "home";
export const state: LegacyPageState = {
  view: initialView,
  tab: "all",
  query: "",
  questFilters: { mode: "all", status: "all" },
  filters: {},
  orderBy: {},
  pagination: {},
  visibleColumns: {},
};

const mainElement = document.querySelector<HTMLElement>("main");
const drawerElement = document.querySelector<HTMLElement>("#drawer");
const scrimElement = document.querySelector<HTMLElement>("#scrim");
const shellElement = document.querySelector<HTMLElement>(".shell");
const nav = document.querySelector<HTMLElement>("#nav");
if (!mainElement || !drawerElement || !scrimElement || !shellElement || !nav) {
  throw new Error("Legacy detail runtime elements are required");
}
const navigation = nav;
export const main = mainElement;
export const drawer = drawerElement;
export const scrim = scrimElement;
export const shell = shellElement;
export { data, disputeCases };

export const fmt = (value: number | null | undefined): string =>
  new Intl.NumberFormat("en-US").format(Number(value || 0));

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

export function initializeDetailRuntime(): void {
  navigation.innerHTML = navItems.map(([view, icon, label, count]) =>
    `<button data-view="${view}" type="button"><span>${ico(icon)}</span>${label}${count ? `<b>${count}</b>` : ""}</button>`).join("");
  document.querySelectorAll<HTMLElement>("[data-static-icon]").forEach((element) => {
    element.innerHTML = ico(element.dataset.staticIcon || "");
  });
  navigation.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => {
    button.onclick = () => navigate(button.dataset.view || "");
  });
}

function boardUrl(view: string): string {
  return view === "home" ? "/" : `/?view=${encodeURIComponent(view)}`;
}

export function navigate(view: string): void {
  location.assign(boardUrl(view));
}

export function setActiveNavigation(view: string): void {
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");
let drawerTrigger: Element | null = null;
let drawerKeydown: ((event: KeyboardEvent) => void) | null = null;
let activeCustomLayerClose: (() => void) | null = null;

export function closeActiveLayer(): void {
  activeCustomLayerClose?.();
}

function visibleFocusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (element) => element.getClientRects().length && !element.closest("[hidden]"),
  );
}

function trapFocus(event: KeyboardEvent, layer: HTMLElement): void {
  if (event.key !== "Tab") return;
  const focusable = visibleFocusable(layer);
  if (!focusable.length) {
    event.preventDefault();
    layer.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function showDrawerLayer(): void {
  drawerTrigger = document.activeElement;
  shell.inert = true;
  drawer.inert = false;
  scrim.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  drawerKeydown = (event) => trapFocus(event, drawer);
  drawer.addEventListener("keydown", drawerKeydown);
  requestAnimationFrame(() => {
    drawer.classList.add("open");
    const title = drawer.querySelector<HTMLElement>("h2")?.textContent?.trim();
    drawer.setAttribute("aria-label", title ? `Record details: ${title}` : "Record details");
    drawer.querySelector<HTMLElement>("#close")?.focus();
  });
}

export function closeDrawer(): void {
  if (drawerKeydown) {
    drawer.removeEventListener("keydown", drawerKeydown);
    drawerKeydown = null;
  }
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;
  shell.inert = false;
  const restore = drawerTrigger;
  drawerTrigger = null;
  setTimeout(() => {
    scrim.hidden = true;
    if (restore instanceof HTMLElement && restore.isConnected) restore.focus();
  }, 220);
}

export function showModalLayer(layer: HTMLElement, options: LegacyModalOptions = {}): () => void {
  activeCustomLayerClose?.();
  const trigger = document.activeElement;
  const removeOnClose = options.removeOnClose !== false;
  if (!layer.isConnected) document.body.append(layer);
  const siblings = [...document.body.children]
    .filter((element) => element !== layer)
    .map((element) => ({ element: element as HTMLElement, inert: (element as HTMLElement).inert }));
  siblings.forEach(({ element }) => (element.inert = true));
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    trapFocus(event, layer);
  };
  const close = () => {
    layer.removeEventListener("keydown", onKeydown);
    siblings.forEach(({ element, inert }) => (element.inert = inert));
    if (removeOnClose) layer.remove();
    options.onClose?.();
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    if (activeCustomLayerClose === close) activeCustomLayerClose = null;
  };
  activeCustomLayerClose = close;
  layer.addEventListener("keydown", onKeydown);
  requestAnimationFrame(() => {
    const preferred = typeof options.initialFocus === "string"
      ? layer.querySelector<HTMLElement>(options.initialFocus)
      : options.initialFocus;
    (preferred || visibleFocusable(layer)[0] || layer).focus();
  });
  return close;
}

export function chatTimeLabel(date = new Date()): string {
  return `Today · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

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

export function disputeTypeLabel(record: Pick<LegacyRecord, "disputeType">): string {
  return record.disputeType || "Other";
}

export function chatMessage(sender: string, time: string, message: string, variant: string): string {
  return `<article class="chat-message ${variant}"><div class="chat-message-meta"><strong>${escapeActivityText(sender)}</strong><time>${escapeActivityText(time)}</time></div><p>${escapeActivityText(message)}</p></article>`;
}

export function bindChatAttachment(form: HTMLFormElement): void {
  const input = form.querySelector<HTMLElement & { files?: FileList }>("[data-chat-attachment]");
  const label = form.querySelector<HTMLElement>("[data-chat-attachment-name]");
  if (!input || !label) return;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    label.textContent = file?.name || "No file attached";
    label.title = file?.name || "";
  });
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

const activityStorageKey = "kuquest-admin-activity-v2";
function readActivityEvents(): Array<{ actor?: string; title: string; detail: string; timestamp: number }> {
  try {
    const events: unknown = JSON.parse(localStorage.getItem(activityStorageKey) || "[]");
    return Array.isArray(events) ? events.filter((event): event is { actor?: string; title: string; detail: string; timestamp: number } => Boolean(event && typeof event === "object")) : [];
  } catch {
    return [];
  }
}

function activityTimestamp(value: unknown, fallback: number): number {
  const timestamp = Date.parse(String(value ?? "").replace(" · ", " "));
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function activityInitials(name: unknown, fallback: string): string {
  const initials = String(name ?? "").trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return initials || fallback;
}

export function seedGeneratedActivity(records: typeof data): void {
  if (readActivityEvents().length) return;
  const events: Array<{ actor: string; title: string; detail: string; timestamp: number }> = [];
  const now = Date.now();
  const add = (actor: string, title: string, detail: string, at: unknown, fallback: number) => {
    events.push({ actor, title, detail, timestamp: activityTimestamp(at, fallback) });
  };
  (records.reports || []).slice(0, 14).forEach((record, index) => {
    const fallback = now - (index + 1) * 38 * 60 * 1000;
    add(activityInitials(record.reporterName, "US"), "User report received", `${record.id} · ${record.reporterName} reported ${record.reportedUserName}`, record.reportedAt, fallback);
    if (record.status === "Closed") add("NP", "Report resolved", `${record.id} · ${record.decisionLabel || "Report closed"}`, record.resolutionAt || record.closedAt, fallback + 47 * 60 * 1000);
  });
  (records.disputes || []).slice(0, 12).forEach((record, index) => {
    const fallback = now - (index + 2) * 17 * 60 * 60 * 1000;
    add("SYS", "Dispute opened", `${record.id} · ${record.title}`, record.disputeDate, fallback);
    if (record.status === "Closed") add("NP", "Dispute resolved", `${record.id} · ${record.resolution || "Resolution recorded"}`, record.disputeDate, fallback + 3 * 60 * 60 * 1000);
  });
  (records.payouts || []).slice(0, 12).forEach((record, index) => {
    const fallback = now - (index + 1) * 21 * 60 * 60 * 1000;
    add("SYS", "Payout requested", `${record.id} · ${record.title} · ฿${fmt(record.amount)}`, record.requestedAt, fallback);
    if (["Processing", "Completed"].includes(record.status)) add("NP", "Payout approved", `${record.id} · ${record.title}`, record.approvedAt, fallback + 2 * 60 * 60 * 1000);
    else if (record.status === "Rejected") add("NP", "Payout rejected", `${record.id} · ${record.rejectionReason}`, record.rejectedAt, fallback + 2 * 60 * 60 * 1000);
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

function addUserHistory(user: LegacyRecord, entry: LegacyHistoryEntry): void {
  user.moderationHistory = [entry, ...(user.moderationHistory || [])];
}
export { addUserHistory };

function refreshNavigationCounts(): void {
  const counts = {
    disputes: data.disputes.filter((record) => record.status === "Active").length,
    payouts: data.payouts.filter((record) => record.status === "Needs approval").length,
    reports: data.reports.filter((record) => record.status === "Active").length,
  };
  Object.entries(counts).forEach(([view, count]) => {
    const counter = document.querySelector<HTMLElement>(`[data-view="${view}"] b`);
    if (counter) counter.textContent = String(count);
  });
}

function consumeRedFlagExemption(user: LegacyRecord, exemption: PenaltyExemption | null): void {
  if (exemption) user[exemption.field] = Math.max(0, exemption.remaining - 1);
}

function recordConfirmedViolation(user: LegacyRecord, reason: string, note: string): PenaltyOutcome {
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
  refreshNavigationCounts();
  return outcome;
}

function persistAdminData(): void {
  window.persistAdminData?.();
}

export function openPenaltyDialog(user: LegacyRecord): void {
  activeCustomLayerClose?.();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal" role="dialog" aria-modal="true" aria-label="Confirm violation for ${escapeActivityText(user.title)}"><div class="chat-modal-head"><div><strong>Confirm violation</strong><small>${escapeActivityText(user.title)} · ${escapeActivityText(user.id)}</small></div><button class="icon close-party-chat" aria-label="Close penalty form"><span class="close-lines"></span></button></div><form class="penalty-form"><p class="chat-intro">Confirm that this account committed an actual policy violation. The SRS penalty ladder applies the next consequence automatically.</p><section class="penalty-policy-note" aria-label="Penalty ladder"><strong>Penalty ladder</strong><span>1st violation: Red Flag · 7 days</span><span>2nd violation: Temporary ban · 7 days</span><span>3rd violation: Permanent ban</span></section><section class="penalty-preview" data-penalty-preview aria-live="polite"></section><label for="penalty-reason">Reason for confirmed violation<textarea id="penalty-reason" name="reason" rows="3" minlength="8" maxlength="500" required aria-describedby="penalty-reason-help penalty-error" placeholder="State the evidence and policy behind this violation…"></textarea><small id="penalty-reason-help">Enter 8–500 characters explaining the evidence and policy.</small></label><label for="penalty-note">Internal admin note (optional)<textarea id="penalty-note" name="note" rows="2" maxlength="500" placeholder="Add context for authorized moderators…"></textarea></label><p class="login-error penalty-error" id="penalty-error" role="alert" hidden></p><button class="btn danger" type="submit">Confirm violation</button></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "#penalty-reason" });
  overlay.querySelector<HTMLElement>(".close-party-chat")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  const form = overlay.querySelector<LegacyForm>("form");
  const preview = form?.querySelector<HTMLElement>("[data-penalty-preview]");
  if (!form || !preview) return;
  const updateFields = () => {
    const outcome = penaltyOutcomeFor(user);
    const exemption = outcome.key === "red-flag" ? redFlagExemptionFor(user) : null;
    const previewOutcome = exemption ? { ...outcome, key: "red-flag-exempted" } : outcome;
    preview.innerHTML = `<div><span>User</span><strong>${escapeActivityText(user.title)}</strong></div><div><span>Confirmed violations</span><strong>${confirmedViolationCount(user)}</strong></div><div><span>Next outcome</span><strong>${escapeActivityText(penaltyOutcomeLabel(previewOutcome))}</strong></div>${exemption ? `<div><span>Exemption</span><strong>${exemption.remaining} Red Flag decision${exemption.remaining === 1 ? "" : "s"} remaining · ${escapeActivityText(exemption.label)}</strong></div>` : ""}<div><span>Reason</span><strong>${escapeActivityText(form.elements.reason.value.trim() || "Reason required before confirming")}</strong></div>`;
  };
  form.elements.reason.addEventListener("input", updateFields);
  form.elements.note.addEventListener("input", updateFields);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const reason = form.elements.reason.value.trim();
    const error = requiredQuery<HTMLElement>(form, ".penalty-error");
    if (reason.length < 8) {
      error.textContent = "Enter at least 8 characters explaining this confirmed violation.";
      error.hidden = false;
      form.elements.reason.focus();
      return;
    }
    const outcome = recordConfirmedViolation(user, reason, form.elements.note.value.trim());
    persistAdminData();
    recordActivity(`Violation confirmed · ${penaltyOutcomeLabel(outcome)}`, `${user.id} · ${user.title} · ${reason}`);
    close();
    window.__KUQUEST_USER_DETAIL__?.render();
    toast(`${penaltyOutcomeLabel(outcome)} recorded for ${user.title}.`);
  });
  updateFields();
}

export function applyDemoAction(action: string, record: LegacyRecord): void {
  const transitions: Record<string, [string, string]> = {
    "Restrict user": ["Temp ban", "danger"],
    "Set normal": ["Normal", "success"],
    "Lift penalty": ["Normal", "success"],
    "Hide quest": ["Hidden", "neutral"],
    "Reject payout": ["Rejected", "danger"],
    "Approve payout": ["Processing", "info"],
    "Close report": ["Closed", "neutral"],
    "Terminate quest": ["Cancelled", "cancelled"],
  };
  const next = transitions[action];
  if (!next) return;
  [record.status, record.tone] = next;
  if (action === "Lift penalty") delete record.penalty;
  record.age = "Just now";
  if (action === "Close report") record.closedAt = reportDateTime();
  refreshNavigationCounts();
}

export function applyReportDecision(report: LegacyRecord, decision: string, reason: string): void {
  const user = data.users.find((candidate) => candidate.id === report.reportedUserId);
  const resolvedAt = adminDateTime();
  const resolvedBy = currentAdminName();
  const outcome = decision === "confirmed-violation" && user ? recordConfirmedViolation(user, reason, "") : null;
  report.status = "Closed";
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
  refreshNavigationCounts();
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
  return data.quests.filter((quest) => quest.status === "Completed" && (quest.selectedParticipant === record.title || quest.teamParticipants?.some(([name]) => name === record.title)));
}

export function userReportsFor(user: LegacyRecord): LegacyRecord[] {
  return data.reports.filter((report) => report.reportedUserId === user.id).sort((first, second) => payoutTimestamp({ ...second, requestedAt: second.reportedAt }) - payoutTimestamp({ ...first, requestedAt: first.reportedAt }));
}

export function userQuestRecords(user: LegacyRecord): LegacyRecord[] {
  return data.quests.filter((quest) => quest.person === user.title || quest.selectedParticipant === user.title || quest.teamParticipants?.some(([name]) => name === user.title));
}

function payoutDecisionContext(record: LegacyRecord): { heading: string; copy: string; next: string } {
  const contexts: Record<string, { heading: string; copy: string; next: string }> = {
    "Needs approval": { heading: "Why your approval is needed", copy: "This payout is ready for release, but it cannot move to the bank until an admin approves it.", next: "Approve payout → status changes to Processing. Funds are not yet transferred." },
    Processing: { heading: "Transfer in progress", copy: "The payout has been approved and is moving to the recipient’s bank. No action is needed unless the transfer fails.", next: "The record will become Completed after the bank confirms the transfer." },
    Completed: { heading: "Transfer completed", copy: "The recipient’s bank transfer completed successfully. This record is retained for audit.", next: "No further admin action is available." },
    Rejected: { heading: "Payout rejected", copy: "This payout was rejected before funds were released. Review the recorded reason before creating a new payout request.", next: "No retry is available from this record." },
    Failed: { heading: "Transfer failed", copy: "The payment provider could not complete this transfer.", next: "Review the failure reason before creating a new payout request." },
  };
  return contexts[record.status] || contexts["Needs approval"];
}

function payoutPreviousRecords(record: LegacyRecord): LegacyRecord[] {
  const currentTimestamp = payoutTimestamp(record);
  return data.payouts.filter((payout) => payout.title === record.title && payout.id !== record.id && payoutTimestamp(payout) < currentTimestamp).sort((first, second) => payoutTimestamp(second) - payoutTimestamp(first));
}

function payoutFinancials(record: LegacyRecord): { available: number; remaining: number } {
  const previousPayouts = payoutPreviousRecords(record);
  const processingReserved = previousPayouts.filter((payout) => payout.status === "Processing").reduce((total, payout) => total + Number(payout.amount || 0), 0);
  const pendingReserved = previousPayouts.filter((payout) => payout.status === "Needs approval").reduce((total, payout) => total + Number(payout.amount || 0), 0);
  const previousPaidOut = Number(record.previouslyPaidOut ?? previousPayouts.filter((payout) => payout.status === "Completed").reduce((total, payout) => total + Number(payout.amount || 0), 0));
  const earned = completedPayoutQuests(record).reduce((total, quest) => total + payoutEarningForQuest(quest), 0);
  const available = Math.max(0, earned - previousPaidOut - processingReserved - pendingReserved);
  return { available, remaining: ["Rejected", "Failed"].includes(record.status) ? available : Math.max(0, available - Number(record.amount || 0)) };
}

export function autoRejectUnavailablePayout(record: LegacyRecord): boolean {
  if (record.status !== "Needs approval") return false;
  if (payoutFinancials(record).available >= Number(record.amount || 0)) return false;
  record.status = "Rejected";
  record.tone = "danger";
  record.rejectedAt = adminDateTime();
  record.rejectedBy = currentAdminName();
  record.rejectionReason = "Insufficient withdrawable balance.";
  record.rejectionNote = "Automatically rejected before admin review because the available balance did not cover the request.";
  return true;
}

export function payoutQuestId(record: { questId?: unknown; other?: unknown }): string {
  const questId = typeof record.questId === "string" ? record.questId : "";
  const other = typeof record.other === "string" ? record.other : "";
  return questId || other.match(/QST-\d+/)?.[0] || "";
}

function openPayoutDrawer(index: number): void {
  const record = data.payouts[index];
  if (!record) return;
  const context = payoutDecisionContext(record);
  showDrawerLayer();
  drawer.innerHTML = `<div class="drawer-top"><strong>${escapeActivityText(record.id)}</strong><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body"><div class="drawer-title"><span class="att-icon neutral">${ico("wallet")}</span><div><h2>${escapeActivityText(record.title)}</h2><p>${escapeActivityText(record.person)} · ${escapeActivityText(record.other)}</p></div></div><div class="facts"><div class="fact"><span>Status</span>${badge(record.status, record.tone)}</div><div class="fact"><span>Payout amount</span><strong>฿${fmt(record.amount)}</strong></div><div class="fact"><span>Record</span><strong>${escapeActivityText(record.id)}</strong></div></div><section class="section"><h3>${escapeActivityText(context.heading)}</h3><p>${escapeActivityText(context.copy)}</p><p class="audit-note">${escapeActivityText(context.next)}</p></section><section class="section"><h3>Financial summary</h3><div class="facts"><div class="fact"><span>Available to withdraw</span><strong>฿${fmt(payoutFinancials(record).available)}</strong></div><div class="fact"><span>Remaining after payout</span><strong>฿${fmt(payoutFinancials(record).remaining)}</strong></div></div></section></div><div class="drawer-actions">${record.status === "Needs approval" ? '<button class="btn" data-action="Reject payout">Reject payout</button><button class="btn primary" data-action="Approve payout">Approve payout</button>' : '<button class="btn" id="close-payout-record">Close record</button>'}</div>`;
  drawer.querySelector<HTMLElement>("#close")?.addEventListener("click", closeDrawer);
  drawer.querySelector<HTMLElement>("#close-payout-record")?.addEventListener("click", closeDrawer);
  scrim.onclick = closeDrawer;
  drawer.querySelectorAll<HTMLElement>("[data-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (!action) return;
    confirmAction(action, record, "", () => {
      applyDemoAction(action, record);
      persistAdminData();
      closeDrawer();
    });
  }));
}

export function openDrawer(view: string, index: number): void {
  if (view === "payouts") openPayoutDrawer(index);
}

export function ensureDetailDrawer(view: string, index: number): void {
  if (view !== "quests" && view !== "disputes") return;
  const open = view === "quests" ? window.openQuestDrawer : window.openDisputeDrawer;
  open?.(index);
}

const dialog = document.querySelector<HTMLDialogElement>("#confirm");
export function confirmAction(action: string, record: LegacyRecord, decisionDetail = "", onConfirm?: (reason: string) => void, options: Pick<LegacyModalOptions, "keepDrawerOpen"> = {}): void {
  if (!dialog) return;
  const form = requiredQuery<LegacyForm>(document, "#confirm-form");
  const reason = requiredQuery<HTMLTextAreaElement>(document, "#confirm-reason");
  const error = requiredQuery<HTMLElement>(document, "#confirm-reason-error");
  const count = requiredQuery<HTMLElement>(document, "#confirm-reason-count");
  const confirmButton = requiredQuery<HTMLButtonElement>(document, "#confirm-btn");
  const context = document.querySelector<HTMLElement>("#confirm-context");
  if (context) { context.hidden = true; context.innerHTML = ""; }
  reason.value = "";
  error.hidden = true;
  count.textContent = "0 / 500";
  confirmButton.textContent = action;
  confirmButton.disabled = true;
  requiredQuery<HTMLElement>(document, "#confirm-title").textContent = action;
  requiredQuery<HTMLElement>(document, "#confirm-copy").textContent = decisionDetail || `This will update ${record.id} and add your decision to the permanent admin audit trail.`;
  const validate = () => {
    const valid = reason.value.trim().length >= 8;
    confirmButton.disabled = !valid;
    reason.setAttribute("aria-invalid", String(!valid && reason.value.length > 0));
    count.textContent = `${reason.value.length} / 500`;
    return valid;
  };
  reason.oninput = validate;
  form.onsubmit = (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value === "confirm" && !validate()) {
      event.preventDefault();
      reason.setAttribute("aria-invalid", "true");
      error.hidden = false;
      reason.focus();
    }
  };
  dialog.showModal();
  requestAnimationFrame(() => reason.focus());
  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "confirm") return;
    if (!options.keepDrawerOpen && drawer.classList.contains("open")) closeDrawer();
    const decisionReason = reason.value.trim();
    onConfirm?.(decisionReason);
    recordActivity(action, `${record.id} · ${record.title || record.reportedUserName || "Record"}${decisionReason ? ` · ${decisionReason}` : ""}`);
    toast(`${action} recorded for ${record.id}. Audit reason saved.`);
  }, { once: true });
}

export function toast(message: string): void {
  const element = document.createElement("div");
  element.className = "toast";
  element.innerHTML = `${ico("check")}<span>${escapeActivityText(message)}</span>`;
  document.querySelector<HTMLElement>("#toasts")?.append(element);
  setTimeout(() => element.remove(), 3500);
}

let detailSearchInitialized = false;

export function initializeDetailSearch(): void {
  if (detailSearchInitialized) return;
  const command = document.querySelector<HTMLElement>("#command");
  const input = document.querySelector<HTMLInputElement>("#global-search");
  const results = document.querySelector<HTMLElement>("#results");
  if (!command || !input || !results) return;
  detailSearchInitialized = true;
  let closeCommandLayer: (() => void) | null = null;
  const closeSearch = () => {
    if (closeCommandLayer) {
      const close = closeCommandLayer;
      closeCommandLayer = null;
      close();
    } else {
      command.hidden = true;
    }
  };
  const search = (query: string) => {
    const records = Object.entries(data).flatMap(([view, collection]) =>
      collection.map((record, index) => ({ record, view, index })),
    );
    const matches = records.filter(({ record }) =>
      `${record.id} ${record.title || ""} ${record.person || ""} ${record.reportedUserName || ""} ${record.reporterName || ""} ${record.category || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ).slice(0, 7);
    results.innerHTML = matches.length
      ? matches.map(({ record, view, index }) => `<button class="result" data-result="${view}:${index}"><span>${ico(view === "payouts" ? "wallet" : view === "users" ? "user" : view === "reports" ? "flag" : view === "disputes" ? "scale" : "quest")}</span><span><strong>${view === "reports" ? `Report against ${escapeActivityText(record.reportedUserName)}` : escapeActivityText(record.title)}</strong><small>${escapeActivityText(record.id)} · ${escapeActivityText(view === "reports" ? `Reported by ${record.reporterName}` : record.person)}</small></span><small>${view}</small></button>`).join("")
      : '<div class="empty"><h3>No results</h3><p>Try a record ID, person, or quest title.</p></div>';
    results.querySelectorAll<HTMLElement>("[data-result]").forEach((button) => {
      button.onclick = () => {
        const [view, index] = (button.dataset.result || "").split(":");
        if (!view || !index) return;
        closeSearch();
        openDrawer(view, Number(index));
      };
    });
  };
  const openSearch = () => {
    command.hidden = false;
    input.value = "";
    search("");
    closeCommandLayer = showModalLayer(command, {
      initialFocus: input,
      removeOnClose: false,
      onClose: () => (command.hidden = true),
    });
  };
  input.oninput = () => search(input.value);
  command.onclick = (event) => {
    if (event.target === command) closeSearch();
  };
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
    if (event.key === "Escape" && !command.hidden) closeSearch();
  });
}

export function renderHome(): void {
  // Detail pages do not own board rendering; this keeps the shared context contract narrow.
}

export function render(): void {
  // Detail page modules own their render lifecycle.
}

export const legacyRuntime = {
  data,
  navigate,
  ensureDetailDrawer,
  openDrawer,
  closeActiveLayer,
  showModalLayer,
  toast,
  drawer,
  icon: ico,
  persistAdminData,
  recordActivity,
};
