import type {
  LegacyDomElement,
  LegacyModalOptions,
  LegacyPageState,
  LegacyRecord,
} from "./runtime";
import {
  confirmedViolationCount,
  escapeActivityText,
  fmt,
  ico,
  penaltyOutcomeFor,
  penaltyOutcomeLabel,
  payoutFinancials,
  payoutBadge,
  payoutDecisionContext,
  redFlagExemptionFor,
  recordActivity,
  recordConfirmedViolation,
  data,
  disputeCases,
  adminCommands,
} from "./runtime-core";
import { createOverlayRuntime } from "./overlay-runtime";
import { setActiveNavigation as setActiveNavigationCore } from "./navigation-state";
import { newAdminIdempotencyKey } from "./admin-command-port";
import { isAdminApiEnabled } from "../api/admin-provider";
import { isQuestModerationAction, setupQuestReasonCode } from "./quest-admin-reason";
import type { AdminQuestReasonCode } from "../api/admin-api";
import {
  disputeCaseStatusFor,
  isReportCasePending,
  payoutStatusFor,
} from "../domain/rulebook";

export {
  addUserHistory,
  adminDateTime,
  badge,
  completedPayoutQuests,
  confirmedViolationCount,
  currentAdminName,
  disputeTypeLabel,
  escapeActivityText,
  fmt,
  ico,
  penaltyOutcomeFor,
  penaltyOutcomeLabel,
  payoutEarningForQuest,
  payoutBadge,
  payoutFinancials,
  payoutPreviousRecords,
  payoutQuestId,
  payoutTimestamp,
  payoutDecisionContext,
  redFlagExemptionFor,
  recordActivity,
  reportDateTime,
  timeline,
  toneClass,
  userQuestRecords,
  userReportsFor,
} from "./runtime-core";

type LegacyView = "home" | "disputes" | "quests" | "users" | "payouts" | "reports" | "policies" | "activity";
type IconName = "home" | "scale" | "quest" | "users" | "wallet" | "settings" | "history" | "menu" | "search" | "filter" | "paperclip" | "check" | "user" | "flag";
type LegacyForm = HTMLFormElement & {
  elements: HTMLFormControlsCollection & Record<string, LegacyDomElement>;
};

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
export { adminCommands };

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
  setActiveNavigationCore(document, view);
}

const overlayRuntime = createOverlayRuntime({ drawer, scrim, shell });
export const closeActiveLayer = overlayRuntime.closeActiveLayer;
export const closeDrawer = overlayRuntime.closeDrawer;
export const showDrawerLayer = overlayRuntime.showDrawerLayer;
export const showModalLayer = overlayRuntime.showModalLayer;
function refreshNavigationCounts(): void {
  const counts = {
    disputes: data.disputes.filter((record) => disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING").length,
    payouts: data.payouts.filter((record) => payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL").length,
    reports: data.reports.filter((record) => isReportCasePending(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision)).length,
  };
  Object.entries(counts).forEach(([view, count]) => {
    const counter = document.querySelector<HTMLElement>(`[data-view="${view}"] b`);
    if (counter) counter.textContent = String(count);
  });
}

function persistAdminData(): void {
  window.persistAdminData?.();
}

export function openPenaltyDialog(user: LegacyRecord): void {
  closeActiveLayer();
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
    refreshNavigationCounts();
    persistAdminData();
    recordActivity(`Violation confirmed · ${penaltyOutcomeLabel(outcome)}`, `${user.id} · ${user.title} · ${reason}`);
    close();
    window.__KUQUEST_USER_DETAIL__?.render();
    toast(`${penaltyOutcomeLabel(outcome)} recorded for ${user.title}.`);
  });
  updateFields();
}


function openPayoutDrawer(index: number): void {
  const record = data.payouts[index];
  if (!record) return;
  if (isAdminApiEnabled() && !record.apiBacked) {
    toast("This Payout is not available from the Admin API.");
    return;
  }
  const context = payoutDecisionContext(record);
  const status = payoutStatusFor(record.payoutStatus ?? record.status);
  showDrawerLayer();
  drawer.innerHTML = `<div class="drawer-top"><strong>${escapeActivityText(record.id)}</strong><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body"><div class="drawer-title"><span class="att-icon neutral">${ico("wallet")}</span><div><h2>${escapeActivityText(record.title)}</h2><p>${escapeActivityText(record.person)} · ${escapeActivityText(record.other)}</p></div></div><div class="facts"><div class="fact"><span>Status</span>${payoutBadge(status, record.tone)}</div><div class="fact"><span>Payout amount</span><strong>฿${fmt(record.amount)}</strong></div><div class="fact"><span>Record</span><strong>${escapeActivityText(record.id)}</strong></div></div><section class="section"><h3>${escapeActivityText(context.heading)}</h3><p>${escapeActivityText(context.copy)}</p><p class="audit-note">${escapeActivityText(context.next)}</p></section><section class="section"><h3>Financial summary</h3><div class="facts"><div class="fact"><span>Available to withdraw</span><strong>฿${fmt(payoutFinancials(record).available)}</strong></div><div class="fact"><span>Remaining after payout</span><strong>฿${fmt(payoutFinancials(record).remaining)}</strong></div></div></section></div><div class="drawer-actions">${status === "PENDING_ADMIN_APPROVAL" ? '<button class="btn" data-action="Reject payout">Reject payout</button><button class="btn primary" data-action="Approve payout">Approve payout</button>' : '<button class="btn" id="close-payout-record">Close record</button>'}</div>`;
  drawer.querySelector<HTMLElement>("#close")?.addEventListener("click", closeDrawer);
  drawer.querySelector<HTMLElement>("#close-payout-record")?.addEventListener("click", closeDrawer);
  scrim.onclick = closeDrawer;
  drawer.querySelectorAll<HTMLElement>("[data-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (!action) return;
    confirmAction(action, record, "", (reason) => {
      const command = action === "Approve payout"
        ? adminCommands.approvePayout(record.id, {
          idempotencyKey: newAdminIdempotencyKey("approve-payout", record.id),
          ...(typeof record.version === "number" ? { expectedVersion: record.version } : {}),
          note: reason,
        })
        : adminCommands.rejectPayout(record.id, {
          idempotencyKey: newAdminIdempotencyKey("reject-payout", record.id),
          ...(typeof record.version === "number" ? { expectedVersion: record.version } : {}),
          reason,
        });
      void command.then(() => {
        persistAdminData();
        closeDrawer();
        return undefined;
      });
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
export function confirmAction(action: string, record: LegacyRecord, decisionDetail = "", onConfirm?: (reason: string, reasonCode?: AdminQuestReasonCode) => void, options: Pick<LegacyModalOptions, "keepDrawerOpen"> = {}): void {
  if (!dialog) return;
  const form = requiredQuery<LegacyForm>(document, "#confirm-form");
  const reason = requiredQuery<HTMLTextAreaElement>(document, "#confirm-reason");
  const error = requiredQuery<HTMLElement>(document, "#confirm-reason-error");
  const count = requiredQuery<HTMLElement>(document, "#confirm-reason-count");
  const confirmButton = requiredQuery<HTMLButtonElement>(document, "#confirm-btn");
  const context = document.querySelector<HTMLElement>("#confirm-context");
  if (context) { context.hidden = true; context.innerHTML = ""; }
  reason.value = "";
  const reasonCode = setupQuestReasonCode(document, action, isAdminApiEnabled());
  reason.required = !reasonCode;
  error.hidden = true;
  count.textContent = "0 / 500";
  confirmButton.textContent = action;
  confirmButton.disabled = true;
  requiredQuery<HTMLElement>(document, "#confirm-title").textContent = action;
  requiredQuery<HTMLElement>(document, "#confirm-copy").textContent = decisionDetail || `This will update ${record.id} and add your decision to the permanent admin audit trail.`;
  const validate = () => {
    const reasonValid = !reasonCode || !reasonCode.required || reasonCode.value.length > 0;
    const valid = reasonCode ? reasonValid : reason.value.trim().length >= 8;
    confirmButton.disabled = !valid;
    reason.setAttribute("aria-invalid", String(!valid && reason.value.length > 0));
    count.textContent = `${reason.value.length} / 500`;
    error.textContent = reasonCode && !reasonValid
      ? "Select a reason code before confirming."
      : "Enter at least 8 characters before confirming.";
    return valid;
  };
  reason.oninput = validate;
  reasonCode?.addEventListener("change", validate);
  form.onsubmit = (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value === "confirm" && !validate()) {
      event.preventDefault();
      reason.setAttribute("aria-invalid", "true");
      error.hidden = false;
      (reasonCode && !reasonCode.value ? reasonCode : reason).focus();
    }
  };
  dialog.showModal();
  requestAnimationFrame(() => (reasonCode && reasonCode.required ? reasonCode : reason).focus());
  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "confirm") return;
    if (!options.keepDrawerOpen && drawer.classList.contains("open")) closeDrawer();
    const decisionReason = reason.value.trim();
    onConfirm?.(decisionReason, reasonCode?.value as AdminQuestReasonCode | undefined);
    const localAudit = !isAdminApiEnabled() || !isQuestModerationAction(action) && action !== "Confirm dispute resolution";
    if (localAudit) {
      recordActivity(action, `${record.id} · ${record.title || record.reportedUserName || "Record"}${decisionReason ? ` · ${decisionReason}` : ""}`);
      toast(`${action} recorded for ${record.id}. Audit reason saved.`);
    }
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
