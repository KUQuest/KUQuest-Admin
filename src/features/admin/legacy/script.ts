import type { LegacyDomElement, LegacyHistoryEntry, LegacyModalOptions, LegacyPageState, LegacyRecord, LegacyRuntimeData } from "./runtime";
import { reportSubmissionSchema } from "../data/admin-records";
import {
  adminDateTime,
  badge,
  completedPayoutQuests,
  confirmedViolationCount,
  currentAdminName,
  disputeTypeLabel,
  escapeActivityText,
  fmt,
  formatActivityTime,
  ico,
  penaltyOutcomeFor,
  penaltyOutcomeLabel,
  payoutEarningForQuest,
  payoutFinancials,
  payoutPreviousRecords,
  payoutDecisionContext,
  readActivityEvents,
  redFlagExemptionFor,
  recordActivity,
  recordConfirmedViolation,
  reportDateTime,
  timeline,
  toneClass,
  userQuestRecords,
  userReportsFor,
  data,
  adminCommands,
} from "./runtime-core";
import { createOverlayRuntime } from "./overlay-runtime";
import { setActiveNavigation as setActiveNavigationCore } from "./navigation-state";
import { recordsFor } from "./runtime-data";
import { newAdminIdempotencyKey } from "./admin-command-port";
import {
  hydrateLivePayout,
  payoutServerValue,
  refreshLiveDisputes,
  refreshLivePayouts,
} from "./live-review-data";
import { isAdminApiEnabled } from "../api/admin-provider";
import {
  QUEST_STATES,
  disputeCaseStatusFor,
  hasHiddenQuestOverlay,
  isReportCasePending,
  payoutStatusFor,
  questStateFor,
  reportCaseStatusFor,
  walletStatusFor,
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
  payoutFinancials,
  payoutPreviousRecords,
  payoutQuestId,
  payoutTimestamp,
  payoutDecisionContext,
  redFlagExemptionFor,
  recordActivity,
  reportDateTime,
  seedGeneratedActivity,
  timeline,
  toneClass,
  userQuestRecords,
  userReportsFor,
  data,
  disputeCases,
  adminCommands,
} from "./runtime-core";

type LegacyView = "home" | "disputes" | "quests" | "users" | "payouts" | "reports" | "policies" | "activity";
type IconName = "home" | "scale" | "quest" | "users" | "wallet" | "settings" | "history" | "menu" | "search" | "filter" | "check" | "user" | "flag";
type LegacyForm = HTMLFormElement & {
  elements: HTMLFormControlsCollection & Record<string, LegacyDomElement>;
};
type ConfirmActionOptions = LegacyModalOptions;

function statusForView(view: string, record: LegacyRecord): string {
  if (view === "quests") return questStateFor(record.questState ?? record.status);
  if (view === "disputes") return disputeCaseStatusFor(record.disputeCaseStatus ?? record.status);
  if (view === "payouts") return payoutStatusFor(record.payoutStatus ?? record.status);
  if (view === "reports") return reportCaseStatusFor(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision);
  if (view === "users") return walletStatusFor(record.walletStatus ?? record.status);
  return record.status;
}

function questStatusTone(status: string): string {
  if (status === "QUEST_FAILED") return "danger";
  if (status === "QUEST_CANCELLED") return "cancelled";
  if (status === "QUEST_COMPLETED") return "success";
  if (status === "QUEST_IN_PROGRESS") return "info";
  if (status === "QUEST_ASSIGNED") return "assigned";
  if (status === "QUEST_DRAFT") return "neutral";
  return "success";
}

function memberNeedsReview(record: LegacyRecord): boolean {
  const legacyStatus = record.status;
  const walletStatus = walletStatusFor(record.walletStatus ?? legacyStatus);
  return Boolean(record.penalty)
    || ["FROZEN", "SUSPENDED", "CLOSED"].includes(walletStatus);
}

const navItems: Array<[LegacyView, IconName, string, string]> = [
  ["home", "home", "Overview", ""],
  ["quests", "quest", "Quests", ""],
  ["disputes", "scale", "Disputes", "7"],
  ["reports", "flag", "Reports", "0"],
  ["payouts", "wallet", "Payouts", "4"],
  ["users", "users", "Users", ""],
];
function persistAdminData(): void {
  window.persistAdminData?.();
}

function runAdminAction(record: LegacyRecord, action: string, reason: string): Promise<void> {
  const idempotencyKey = newAdminIdempotencyKey(action, record.id);
  const expectedVersion = typeof record.version === "number" ? { expectedVersion: record.version } : {};
  if (action === "Hide quest") {
    return adminCommands.hideQuest(record.id, { ...expectedVersion, idempotencyKey, reason }).then(() => undefined);
  }
  if (action === "Restore quest") {
    return adminCommands.restoreQuest(record.id, { ...expectedVersion, idempotencyKey }).then(() => undefined);
  }
  if (action === "Terminate quest") {
    return adminCommands.terminateQuest(record.id, { ...expectedVersion, idempotencyKey, reason }).then(() => undefined);
  }
  if (action === "Restrict user" || action === "Set normal" || action === "Lift penalty") {
    return adminCommands.setWalletStatus(record.id, {
      ...expectedVersion,
      idempotencyKey,
      reason,
      status: action === "Restrict user" ? "FROZEN" : "ACTIVE",
    }).then(() => undefined);
  }
  if (action === "Close report") {
    return adminCommands.decideReport(record.id, {
      ...expectedVersion,
      idempotencyKey,
      reason,
      decision: "REPORT_CASE_DISMISSED",
    }).then(() => undefined);
  }
  return Promise.resolve();
}
function requiredQuery<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Legacy element is required: ${selector}`);
  return element;
}
const requestedView = new URLSearchParams(location.search).get("view");
const initialView: LegacyView = [
    "home",
    "disputes",
    "quests",
    "users",
    "payouts",
    "reports",
    "policies",
    "activity",
  ].includes(requestedView as LegacyView)
    ? requestedView as LegacyView
    : "home";
export const state: LegacyPageState = { view: initialView, tab: "all", query: "", questFilters: { mode: "all", status: "all" }, filters: {}, orderBy: {}, pagination: {}, visibleColumns: {} };
const mainElement = document.querySelector<LegacyDomElement>("main");
if (!mainElement) throw new Error("Legacy admin main element is required");
export const main: HTMLElement = mainElement;
const nav = document.querySelector<LegacyDomElement>("#nav");
if (!nav) throw new Error("Legacy admin navigation element is required");
nav.innerHTML = navItems
  .map(
    ([v, i, l, c]) =>
      `<button data-view="${v}"><span>${ico(i)}</span>${l}${c ? `<b>${c}</b>` : ""}</button>`,
  )
  .join("");
document
  .querySelectorAll<LegacyDomElement>("[data-static-icon]")
  .forEach((x) => (x.innerHTML = ico(x.dataset.staticIcon || "")));
export const heads: Record<Exclude<LegacyView, "home">, [string, string]> = {
  disputes: ["Disputes", "Review evidence and make accountable resolutions."],
  quests: ["Quests", "Moderate listings through every marketplace state."],
  users: ["Users", "Review student accounts, reports, and marketplace access."],
  payouts: ["Payouts", "Approve or investigate money leaving the marketplace."],
  reports: ["Reports", "Review reports submitted by users about other users."],
  policies: [
    "Money policies",
    "Review current financial limits and fee rules.",
  ],
  activity: ["Activity log", "An audit trail of administrative decisions."],
};
export const pageHead = (t: string, p: string, a = ""): string =>
  `<div class="page-head"><div><h1>${t}</h1><p>${p}</p></div>${a}</div>`;
function homeDecisions(): Array<{ view: keyof LegacyRuntimeData; record: LegacyRecord; priority: number; icon: string; title: string; detail: string; metric: string; age?: string }> {
  const decisions: Array<{ view: keyof LegacyRuntimeData; record: LegacyRecord; priority: number; icon: string; title: string; detail: string; metric: string; age?: string }> = [
    ...data.disputes
      .filter((record) => disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING")
      .map((record) => ({
        view: "disputes" as const,
        record,
        priority: 500 + Number(record.amount || 0),
        icon: "⚖",
        title: `Resolve ${disputeTypeLabel(record)} dispute`,
        detail: `${record.id} · ${record.title}`,
        metric: `฿${fmt(record.amount)} held`,
        age: record.disputeDate,
      })),
    ...data.payouts
      .filter((record) => payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL")
      .map((record) => ({
        view: "payouts" as const,
        record,
        priority: 300 + Number(record.amount || 0),
        icon: "฿",
        title: `${payoutStatusFor(record.payoutStatus ?? record.status)} payout`,
        detail: `${record.id} · ${record.title}`,
        metric: `฿${fmt(record.amount)}`,
      })),
    ...data.users
      .filter(memberNeedsReview)
      .map((record) => ({
        view: "users" as const,
        record,
        priority: record.penalty?.label === "Permanent ban" ? 400 : record.penalty?.label === "Temporary ban" ? 350 : 250,
        icon: "♙",
        title: `${walletStatusFor(record.walletStatus ?? record.status)} account`,
        detail: `${record.title} · ${record.age}`,
        metric: "Open review",
      })),
    ...data.reports
      .filter((record) => isReportCasePending(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision))
      .map((record) => ({
        view: "reports" as const,
        record,
        priority: 450,
        icon: "flag",
        title: "New user report",
        detail: `${record.id} · ${record.reportedUserName}`,
        metric: "Active report",
        age: record.reportedAt,
      })),
    ...data.quests
      .filter((record) => record.editRequestStatus === "EDIT_REQUEST_PENDING")
      .map((record) => ({
        view: "quests" as const,
        record,
        priority: 200,
        icon: "▣",
        title: "Check participant consent",
        detail: `${record.id} · ${record.title}`,
        metric: "View progress",
      })),
  ];
  return decisions
    .filter((item) => ["disputes", "reports"].includes(item.view))
    .sort(
      (first, second) =>
        reviewTimestamp(second.record) - reviewTimestamp(first.record),
    )
    .slice(0, 6);
}
function reviewTimestamp(record: LegacyRecord): number {
  const value = String(record.reportedAt || record.disputeDate || "")
    .replace(" · ", " ")
    .replace(" ICT", "");
  return Date.parse(value) || 0;
}

export function renderHome() {
  const decisions = homeDecisions();
  const activeDisputes = data.disputes.filter((record) => disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING"),
    pendingPayouts = data.payouts.filter((record) => payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL"),
    reviewUsers = data.users.filter(memberNeedsReview),
    openReports = data.reports.filter((record) => isReportCasePending(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision)),
    workLeft = [
      ...activeDisputes,
      ...openReports,
      ...pendingPayouts,
    ],
    statusCounts: Array<[string, number]> = QUEST_STATES.map((status): [string, number] => [status, data.quests.filter((record) => questStateFor(record.questState ?? record.status) === status).length]);
  main.innerHTML = `${pageHead("Overview", "A live snapshot of marketplace risk, money, and work in progress.", '<button class="btn primary" data-jump="disputes">Open review queue</button>')}<section class="dashboard-stats"><div class="stat"><span>Total work left</span><strong>${workLeft.length}</strong><small>Items requiring admin action</small></div></section><div class="grid dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Needs a decision</h2><p>Showing ${decisions.length} latest dispute/report records</p></div><button class="link" data-jump="activity">View activity</button></div>${decisions.length ? decisions.map((item) => attention(item.view, recordsFor(item.view).indexOf(item.record), item.record.tone, item.icon, item.title, item.detail, item.metric, String(item.age || item.record.age))).join("") : '<div class="empty"><h3>No decisions waiting</h3><p>All current records are clear or processing normally.</p></div>'}</section><aside><section class="panel"><div class="panel-head"><div><h2>Quest flow</h2><p>Current marketplace distribution</p></div><button class="link" data-jump="quests">Open quests</button></div><div class="dashboard-status-list">${statusCounts.map(([status, count]) => `<div><span>${badge(status, questStatusTone(status))}</span><strong>${count}</strong></div>`).join("")}</div></section><section class="panel dashboard-activity"><div class="panel-head"><div><h2>Recent activity</h2><p>Latest administrative trail</p></div></div>${activityList().slice(0, 3).join("")}</section></aside></div><div class="dashboard-lower"><section class="panel"><div class="panel-head"><div><h2>Payout watch</h2><p>Money movement requiring a closer look</p></div><button class="link" data-jump="payouts">Open payouts</button></div>${pendingPayouts.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="payouts:${data.payouts.indexOf(record)}"><span><strong>${record.id}</strong><small>${record.title} · ${payoutStatusFor(record.payoutStatus ?? record.status)}</small></span><strong>฿${fmt(record.amount)}</strong><span>${badge(payoutStatusFor(record.payoutStatus ?? record.status), record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No payouts need review</h3><p>Processing and completed payouts are moving normally.</p></div>'}</section><section class="panel"><div class="panel-head"><div><h2>User watch</h2><p>Accounts that may need a moderator</p></div><button class="link" data-jump="users">Open users</button></div>${reviewUsers.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="users:${data.users.indexOf(record)}"><span><strong>${record.title}</strong><small>${record.id} · ${record.age}</small></span><span>${badge(walletStatusFor(record.walletStatus ?? record.status), record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No user reviews</h3><p>All accounts are currently in good standing.</p></div>'}</section></div>`;
  main.querySelector<LegacyDomElement>(".page-head > div > p")?.remove();
  const dashboardStats = main.querySelector<LegacyDomElement>(".dashboard-stats");
  if (dashboardStats) {
    dashboardStats.innerHTML = `<div class="stat"><span>Active disputes</span><strong>${activeDisputes.length}</strong></div><div class="stat"><span>Payouts needing review</span><strong>${pendingPayouts.length}</strong></div><div class="stat"><span>Open report</span><strong>${openReports.length}</strong></div><div class="stat"><span>Total work left</span><strong>${workLeft.length}</strong></div>`;
    dashboardStats.querySelector<LegacyDomElement>(".stat:last-child")?.classList.add(
      "dashboard-stat-work-left",
    );
  }
  const decisionsHeading = main.querySelector<LegacyDomElement>(".dashboard-grid > .panel h2");
  if (decisionsHeading) decisionsHeading.textContent = "Latest dispute/report";
  const lowerHeadings = main.querySelectorAll<LegacyDomElement>(".dashboard-lower .panel h2");
  if (lowerHeadings[0]) lowerHeadings[0].textContent = "Recent Payout Request";
  if (lowerHeadings[1]) lowerHeadings[1].textContent = "Recent User penalty";
  const recentActivity = main.querySelector<LegacyDomElement>(".dashboard-activity"),
    dashboardLower = main.querySelector<LegacyDomElement>(".dashboard-lower");
  if (recentActivity && dashboardLower) dashboardLower.after(recentActivity);
  bind();
}
function attention(v: string, i: number, t: string, ic: string, title: string, sub: string, x: string, y: string): string {
  const name =
    ic === "⚖"
      ? "scale"
      : ic === "฿"
        ? "wallet"
        : ic === "♙"
          ? "user"
          : ic === "flag"
            ? "flag"
          : "quest";
  return `<button class="attention" data-open="${v}:${i}"><span class="att-icon ${toneClass(t)}">${ico(name)}</span><span><strong>${escapeActivityText(title)}</strong><small>${escapeActivityText(sub)}</small></span><span><strong>${escapeActivityText(x)}</strong><small>${escapeActivityText(y)}</small></span></button>`;
}
export function activityList() {
  const saved = readActivityEvents().map((event) => [
    event.actor || "NP",
    event.title,
    event.detail,
    formatActivityTime(event.timestamp),
  ]);
  return saved.length ? saved.map(
    (a) =>
      `<ul class="activity"><li><span class="avatar">${escapeActivityText(a[0])}</span><span><strong>${escapeActivityText(a[1])}</strong><p>${escapeActivityText(a[2])}</p><time>${escapeActivityText(a[3])}</time></span></li></ul>`,
  ) : ['<div class="empty"><h3>No activity recorded</h3><p>Administrative activity will appear here as actions are taken.</p></div>'];
}
export let renderResource = function renderResource(v: string): void {
  if (v === "policies") return renderPolicies();
  if (v === "activity") return renderActivity();
  const rows = recordsFor(v),
    tabs =
      v === "disputes"
        ? ["All", "DISPUTE_CASE_PENDING", "DISPUTE_CASE_DISMISSED", "DISPUTE_CASE_RESOLVED"]
        : v === "payouts"
          ? ["All", "PENDING_ADMIN_APPROVAL", "SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "SUCCEEDED", "FAILED", "CANCELLED"]
          : v === "quests"
            ? ["All", ...QUEST_STATES]
            : v === "reports"
              ? ["All", "REPORT_CASE_PENDING", "REPORT_CASE_DISMISSED", "REPORT_CASE_HIDDEN", "REPORT_CASE_RESTORED", "CONDUCT_REPORT_PENDING", "CONDUCT_REPORT_UPHELD", "CONDUCT_REPORT_DISMISSED"]
              : ["All", "ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"];
  const filtered = rows.filter(
    (r) =>
      `${r.id} ${r.title || ""} ${r.person || ""} ${r.reportedUserName || ""} ${r.reporterName || ""} ${r.category || ""}`
        .toLowerCase()
        .includes(state.query.toLowerCase()) &&
      (state.tab === "all" || statusForView(v, r).toLowerCase() === state.tab || r.status.toLowerCase().includes(state.tab)),
  );
  const header = heads[v as keyof typeof heads] || [v, ""];
  main.innerHTML = `${pageHead(header[0], header[1])}<section class="panel resource"><div class="tabs">${tabs.map((t) => `<button class="tab ${state.tab === t.toLowerCase() ? "active" : ""}" data-tab="${t.toLowerCase()}">${t}${t === "All" ? ` (${rows.length})` : ""}</button>`).join("")}</div><div class="toolbar"><div class="inline-search"><input id="resource-search" value="${state.query}" placeholder="⌕  Search ${v}…"></div><span class="count">${filtered.length} results</span></div>${filtered.length ? table(v, filtered) : '<div class="empty"><h3>No matching records</h3><p>Try changing your search or selected view.</p></div>'}</section>`;
  bind();
};
export function setRenderResource(renderer: (view: string) => void): void {
  renderResource = renderer;
}
function table(v: string, rows: LegacyRecord[]): string {
  if (v === "reports") {
    return `<div class="table-wrap"><table class="data report-table"><thead><tr><th>Report</th><th>Reported user</th><th>Submitted by</th><th>Report type</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr data-open="reports:${data.reports.indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong><small>${escapeActivityText(r.reportedAt)}</small></td><td><strong>${escapeActivityText(r.reportedUserName)}</strong><small>${escapeActivityText(r.reportedUserId)}</small></td><td><strong>${escapeActivityText(r.reporterName)}</strong><small>${escapeActivityText(r.reporterId)}</small></td><td>${escapeActivityText(r.category)}</td><td>${badge(statusForView("reports", r), r.tone || "warning")}</td></tr>`).join("")}</tbody></table></div>`;
  }
  const h =
    v === "disputes"
      ? [
          "Case",
          "Quest",
          "Amount",
          "Status",
          "Dispute date",
          "Category",
        ]
      : v === "quests"
        ? ["Quest", "Title", "Hirer", "Tag", "Wage", "Status"]
        : v === "users"
          ? ["Student ID", "User", "Email", "Academic profile", "Status"]
          : ["Payout", "Recipient", "Account", "Amount", "Status"];
  const collection = recordsFor(v);
  return `<div class="table-wrap"><table class="data"><thead><tr>${h.map((x) => `<th>${escapeActivityText(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr data-open="${v}:${collection.indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong></td><td><strong>${escapeActivityText(r.title)}</strong>${v === "disputes" ? `<small>${escapeActivityText(r.detail).slice(0, 45)}…</small>` : ""}</td>${v === "disputes" ? "" : `<td><strong>${escapeActivityText(r.person)}</strong></td>`}${v === "disputes" || v === "payouts" ? "" : `<td>${escapeActivityText(r.other)}</td>`}${r.amount !== null ? `<td class="money">฿${fmt(r.amount)}</td>` : ""}<td>${badge(statusForView(v, r), r.tone)}${v === "quests" && hasHiddenQuestOverlay(r) ? '<span class="badge neutral quest-hidden-overlay">Hidden</span>' : ""}</td>${v === "disputes" ? `<td>${escapeActivityText(r.disputeDate || "—")}</td><td><strong>${escapeActivityText(disputeTypeLabel(r))}</strong></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}
export function renderPolicies() {
  main.innerHTML = `${pageHead(...heads.policies, '<button class="btn">Revision history</button>')}<section class="panel"><div class="panel-head"><div><h2>Current policy · Revision 12</h2><p>Effective 18 July 2026 · authored by Nicha P.</p></div>${badge("ACTIVE", "success")}</div><div class="health"><div class="stat"><span>Platform fee</span><strong>2.00%</strong><small>200 basis points · rounding UP</small></div><div class="stat"><span>Funded quest range</span><strong>฿100–50k</strong><small>Per quest</small></div><div class="stat"><span>Payout range</span><strong>฿200–30k</strong><small>Per request</small></div></div><div class="drawer-body"><div class="facts">${[
    ["Minimum top-up", "฿100"],
    ["Maximum top-up", "฿50,000"],
    ["Review window", "72 hours"],
    ["Quote lifetime", "15 minutes"],
    ["Two-person dispute threshold", "฿5,000"],
    ["Default application window", "7 days"],
  ]
    .map(
      (x) =>
        `<div class="fact"><span>${x[0]}</span><strong>${x[1]}</strong></div>`,
    )
    .join("")}</div></div></section>`;
  bind();
}
export function renderActivity() {
  main.innerHTML = `${pageHead(...heads.activity, '<button class="btn">Export CSV</button>')}<section class="panel resource"><div class="toolbar"><div class="inline-search"><input id="activity-search" type="search" placeholder="Search activity…" aria-label="Search activity"></div></div>${activityList().join("")}</section>`;
  bind();
}
export function render() {
  if (state.view === "home") renderHome();
  else renderResource(state.view);
  setActiveNavigation(state.view);
}
export function setActiveNavigation(view: string): void {
  setActiveNavigationCore(document, view);
}
export let bind = function bind(): void {
  document.querySelectorAll<LegacyDomElement>(".filter").forEach((b) => {
    b.innerHTML =
      ico(b.textContent.includes("Columns") ? "settings" : "filter") +
      b.textContent.replace("☷", "").trim();
  });
  document
    .querySelectorAll<LegacyDomElement>(".queue>span:last-child")
    .forEach((x) => x.lastChild?.remove());
  document
    .querySelectorAll<LegacyDomElement>("[data-jump]")
    .forEach((b) => (b.onclick = () => navigate(b.dataset.jump || "")));
  document.querySelectorAll<LegacyDomElement>("[data-open]").forEach(
    (b) =>
      (b.onclick = (event) => {
        if (b.matches("button, a")) event.stopPropagation();
        const [v, i] = (b.dataset.open || "").split(":");
        if (!v || !i) return;
        openDrawer(v, +i);
      }),
  );
  document.querySelectorAll<LegacyDomElement>("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        if (state.view === "quests" && b.dataset.filterKind) {
          const filters = state.questFilters || (state.questFilters = { mode: "all", status: "all" });
          if (b.dataset.filterKind === "mode") {
            filters.mode = filters.mode === b.dataset.tab ? "all" : (b.dataset.tab || "all");
          } else if (b.dataset.filterKind === "status") {
            const status = b.dataset.filterValue || b.dataset.tab;
            filters.status = filters.status === status ? "all" : (status || "all");
          } else {
            filters.mode = "all";
            filters.status = "all";
          }
          state.tab = "all";
        } else {
          state.tab = b.dataset.tab || "all";
        }
        if (state.pagination?.[state.view]) state.pagination[state.view].page = 1;
        render();
      }),
  );
  const s = document.querySelector<LegacyDomElement>("#resource-search");
  if (s) {
    s.placeholder = s.placeholder.replace("⌕  ", "");
    s.oninput = (e) => {
      state.query = (e.currentTarget as HTMLInputElement).value;
      renderResource(state.view);
      document.querySelector<LegacyDomElement>("#resource-search")?.focus();
    };
  }
};
export function setBind(nextBind: () => void): void {
  bind = nextBind;
}
export function navigate(v: string): void {
  const nextUrl = v === "home" ? "/" : `/?view=${encodeURIComponent(v)}`;
  if (window.__KUQUEST_RESET_RESOURCE_STATE__) window.__KUQUEST_RESET_RESOURCE_STATE__();
  else {
    state.tab = "all";
    state.query = "";
    state.questFilters = { mode: "all", status: "all" };
  }
  if (/^\/(quests|disputes|reports|users)\//.test(location.pathname)) {
    location.assign(nextUrl);
    return;
  }
  history.replaceState(null, "", nextUrl);
  state.view = v;
  state.tab = "all";
  state.query = "";
  if (isAdminApiEnabled() && (v === "payouts" || v === "disputes")) {
    const refresh = v === "payouts" ? refreshLivePayouts() : refreshLiveDisputes();
    render();
    void refresh.then(() => {
      if (state.view === v) render();
    });
  } else {
    render();
  }
  setMobileNavigation(false);
}
document
  .querySelectorAll<LegacyDomElement>("[data-view]")
  .forEach((b) => (b.onclick = () => navigate(b.dataset.view || "")));
const drawerElement = document.querySelector<LegacyDomElement>("#drawer");
const scrimElement = document.querySelector<LegacyDomElement>("#scrim");
const shellElement = document.querySelector<LegacyDomElement>(".shell");
if (!drawerElement || !scrimElement || !shellElement) throw new Error("Legacy overlay elements are required");
export const drawer: HTMLElement = drawerElement;
export const scrim: HTMLElement = scrimElement;
export const shell: HTMLElement = shellElement;
const overlayRuntime = createOverlayRuntime({ drawer, scrim, shell });
export const closeActiveLayer = overlayRuntime.closeActiveLayer;
export const closeDrawer = overlayRuntime.closeDrawer;
export const showDrawerLayer = overlayRuntime.showDrawerLayer;
export const showModalLayer = overlayRuntime.showModalLayer;
function payoutSummarySection(record: LegacyRecord): string {
  if (record.apiBacked) {
    const value = (field: "principalSatang" | "receiptSatang" | "maximumFeeSatang" | "maximumTaxSatang" | "maximumDebitSatang"): string => {
      const amount = payoutServerValue(record, field);
      return amount === null ? "Not provided" : `฿${fmt(amount)}`;
    };
    return `<section class="section payout-summary"><h3>Payout summary</h3><div class="payout-summary-grid"><div><span>Principal</span><strong>${value("principalSatang")}</strong></div><div><span>Recipient receipt</span><strong>${value("receiptSatang")}</strong></div><div><span>Maximum fee</span><strong>${value("maximumFeeSatang")}</strong></div><div><span>Maximum tax</span><strong>${value("maximumTaxSatang")}</strong></div><div><span>Maximum debit</span><strong>${value("maximumDebitSatang")}</strong></div></div><p class="audit-note">Amounts are supplied by the Payout API. The Admin client does not calculate fees.</p></section>`;
  }
  const financials = payoutFinancials(record);
  return `<section class="section payout-summary"><h3>Payout summary</h3><div class="payout-summary-grid"><div><span>Available to withdraw</span><strong>฿${fmt(financials.available)}</strong></div><div><span>Payout amount</span><strong>฿${fmt(record.amount)}</strong></div><div><span>Remaining after payout</span><strong>฿${fmt(financials.remaining)}</strong></div><div><span>Previously paid out</span><strong>฿${fmt(financials.previousPaidOut)}</strong></div></div></section>`;
}
function payoutTimingSection(record: LegacyRecord): string {
  if (record.apiBacked && record.payoutHistory?.length) {
    const events = record.payoutHistory.flatMap((entry) => [
      ["Status", String(entry.newStatus || entry.event || "Not recorded")],
      ["Occurred at", String(entry.at)],
      ...(entry.reason ? [["Reason", entry.reason] as [string, string]] : []),
    ] as Array<[string, string]>);
    return `<section class="section payout-timing"><h3>Payout timing</h3><div class="payout-audit-list">${events.map(([label, value]) => `<div><span>${escapeActivityText(label)}</span><strong>${escapeActivityText(value)}</strong></div>`).join("")}</div></section>`;
  }
  const events: Array<[string, string]> = [["Requested", String(record.requestedAt || "Not recorded")]];
  if (record.approvedAt) {
    events.push(["Status", "SUBMITTED_TO_PROVIDER"], ["Approved at", String(record.approvedAt)], ["Approved by", String(record.approvedBy || "Admin")]);
    if (record.approvalReason) events.push(["Approval reason", String(record.approvalReason)]);
  }
  if (record.rejectedAt) events.push(["Status", "CANCELLED"], ["Rejected at", String(record.rejectedAt)], ["Rejected by", String(record.rejectedBy || "Admin")]);
  return `<section class="section payout-timing"><h3>Payout timing</h3><div class="payout-audit-list">${events.map(([label, value]) => `<div><span>${escapeActivityText(label)}</span><strong>${escapeActivityText(value)}</strong></div>`).join("")}</div></section>`;
}
function payoutOutcomeSection(record: LegacyRecord): string {
  const reason = record.rejectionReason || record.failureReason;
  const status = payoutStatusFor(record.payoutStatus ?? record.status);
  if (!reason || !["CANCELLED", "FAILED"].includes(status)) return "";
  return `<section class="section payout-outcome"><h3>${status === "FAILED" ? "Transfer failure reason" : "Rejection reason"}</h3><p>${escapeActivityText(reason)}</p>${record.rejectionNote ? `<p class="payout-admin-note"><strong>Admin note:</strong> ${escapeActivityText(record.rejectionNote)}</p>` : ""}</section>`;
}
function payoutQuestHistory(record: LegacyRecord): string {
  if (record.apiBacked) return '<p class="audit-note">Quest earning sources are not provided by the Payout API.</p>';
  const quests = completedPayoutQuests(record);
  if (!quests.length)
    return '<p class="audit-note">No completed quests are connected to this recipient yet.</p>';
  return `<div class="payout-quest-history-list">${quests
    .map(
      (quest) =>
        `<a class="payout-quest-history-row" href="/quests/${encodeURIComponent(quest.id)}"><span><strong>${escapeActivityText(quest.id)} · ${escapeActivityText(quest.title)}</strong><small>${quest.teamQuest ? "Team quest" : "Individual quest"} · Quest State: QUEST_COMPLETED</small></span><span class="payout-earning-amount"><small>Amount earned</small><strong>฿${fmt(payoutEarningForQuest(quest))}</strong></span></a>`,
    )
    .join("")}</div>`;
}
function payoutPreviousHistory(record: LegacyRecord): string {
  if (record.apiBacked && !record.payoutHistoryLoaded) return '<p class="audit-note">Previous Payout records are loading from the Admin API.</p>';
  const previous = payoutPreviousRecords(record);
  if (!previous.length)
    return '<p class="audit-note">No previous payouts are connected to this recipient.</p>';
  return `<div class="payout-previous-list">${previous.map((payout) => `<div class="payout-previous-row"><span><strong>${escapeActivityText(payout.id)}</strong><small>${escapeActivityText(payout.requestedAt || "Date not recorded")}</small></span><span><strong>฿${fmt(payout.amount)}</strong>${badge(payoutStatusFor(payout.payoutStatus ?? payout.status), payout.tone)}</span></div>`).join("")}</div>`;
}
function reportStatusLabel(report: LegacyRecord): string {
  return reportCaseStatusFor(report.reportCaseStatus ?? report.conductReportStatus ?? report.status, report.decision);
}
function reportStatusTone(report: LegacyRecord): string {
  const label = reportStatusLabel(report);
  return isReportCasePending(label) ? "warning" : "neutral";
}
function userReportCounts(reports: LegacyRecord[]): { open: number; closed: number } {
  return reports.reduce(
    (counts, report) => {
      const label = reportStatusLabel(report);
      if (isReportCasePending(label)) counts.open += 1;
      else counts.closed += 1;
      return counts;
    },
    { open: 0, closed: 0 },
  );
}
function userAccountSection(user: LegacyRecord): string {
  return `<section class="section user-account"><h3>Account</h3><div class="user-context-list"><div><span>Student ID</span><strong>${escapeActivityText(user.id)}</strong></div><div><span>Created</span><strong>${escapeActivityText(user.accountCreatedAt || "Not recorded")}</strong></div><div><span>Last active</span><strong>${escapeActivityText(user.lastActiveAt || "Not recorded")}</strong></div></div></section>`;
}
function userModerationSection(user: LegacyRecord): string {
  const reason = user.statusReason || user.penalty?.reason || "No reason recorded.";
  const appliedAt = user.statusAppliedAt || user.penalty?.recordedAt || "Not recorded";
  const appliedBy = user.statusAppliedBy || user.penalty?.appliedBy || "Not recorded";
  const expiresAt = user.banExpiresAt || user.penalty?.expiresAt;
  const walletStatus = walletStatusFor(user.walletStatus ?? user.status);
  const activeModeration = Boolean(user.penalty)
    || walletStatus !== "ACTIVE";
  const confirmedViolations = confirmedViolationCount(user);
  const nextOutcome = penaltyOutcomeFor(user);
  const exemption = redFlagExemptionFor(user);
  const penaltyLabel = user.penalty?.label || "";
  return `<section class="section user-moderation"><h3>Moderation</h3><div class="user-context-list"><div><span>Status</span>${badge(walletStatusFor(user.walletStatus ?? user.status), user.tone)}</div><div><span>Confirmed violations</span><strong>${confirmedViolations}</strong></div><div><span>Next outcome</span><strong>${escapeActivityText(penaltyOutcomeLabel(nextOutcome))}</strong></div>${exemption ? `<div><span>Red Flag exemption</span><strong>${exemption.remaining} remaining (${escapeActivityText(exemption.label)})</strong></div>` : ""}<div><span>Reason</span><strong>${escapeActivityText(reason)}</strong></div>${activeModeration ? `<div><span>Applied</span><strong>${escapeActivityText(appliedAt)}</strong></div><div><span>By</span><strong>${escapeActivityText(appliedBy)}</strong></div>${(penaltyLabel === "Temporary ban" || penaltyLabel === "Red Flag") && expiresAt ? `<div><span>Expires</span><strong>${escapeActivityText(expiresAt)}</strong></div>` : ""}` : ""}</div></section>`;
}
function userReportsSection(user: LegacyRecord): string {
  const reports = userReportsFor(user);
  const counts = userReportCounts(reports);
  const summary = `REPORT_CASE_PENDING ${counts.open} · Closed cases ${counts.closed}`;
  return `<section class="section user-reports"><div class="section-title"><h3>Reports · ${reports.length}</h3><span class="section-count">${reports.length}</span></div><p class="user-report-summary">${summary}</p>${reports.length ? `<div class="user-report-list">${reports.map((report) => `<button type="button" class="user-report-card" data-user-report="${data.reports.indexOf(report)}"><span><strong>${escapeActivityText(report.category)}</strong><small>Reported by ${escapeActivityText(report.reporterName)} · ${escapeActivityText(report.reportedAt || "Date not recorded").replace(/\s+ICT$/, "")}</small></span><span>${badge(reportStatusLabel(report), reportStatusTone(report))}</span></button>`).join("")}</div>` : '<p class="audit-note">No reports have been filed against this account.</p>'}</section>`;
}
function userActivitySection(user: LegacyRecord): string {
  const quests = userQuestRecords(user);
  const count = (status: string) => quests.filter((quest) => questStateFor(quest.questState ?? quest.status) === status).length;
  return `<section class="section user-activity"><h3>Activity summary</h3><div class="user-activity-list"><div><span>Completed quests</span><strong>${count("QUEST_COMPLETED")}</strong></div><div><span>Cancelled quests</span><strong>${count("QUEST_CANCELLED")}</strong></div><div><span>Failed quests</span><strong>${count("QUEST_FAILED")}</strong></div><div><span>Reports received</span><strong>${userReportsFor(user).length}</strong></div></div></section>`;
}
function userPayoutSection(user: LegacyRecord): string {
  const pending = data.payouts.filter(
    (payout) => payout.title === user.title && ["PENDING_ADMIN_APPROVAL", "SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING"].includes(payoutStatusFor(payout.payoutStatus ?? payout.status)),
  );
  if (!pending.length) return "";
  const amount = pending.reduce((total, payout) => total + Number(payout.amount || 0), 0);
  return `<section class="section user-payout"><h3>Payout status</h3><div class="user-payout-summary"><span>Pending payout</span><strong>฿${fmt(amount)}</strong></div><p class="audit-note">Financial details remain in the dedicated payout review.</p><a class="btn full-width" href="/?view=payouts">View payouts</a></section>`;
}
function userHistorySection(user: LegacyRecord): string {
  const history: LegacyHistoryEntry[] = Array.isArray(user.moderationHistory) && user.moderationHistory.length
    ? user.moderationHistory
    : [{ event: "Account created", at: String(user.accountCreatedAt || "Not recorded"), by: "System", note: "Account created." }];
  return `<section class="section user-history"><h3>History</h3><div class="user-history-list">${history.map((entry) => `<article class="user-history-entry"><div><strong>${escapeActivityText(entry.event)}</strong><time>${escapeActivityText(entry.at || "Date not recorded")}</time></div>${entry.by ? `<small>By ${escapeActivityText(entry.by)}</small>` : ""}${entry.previousStatus || entry.newStatus ? `<small>Status: ${escapeActivityText(entry.previousStatus ? walletStatusFor(entry.previousStatus) : "—")} → ${escapeActivityText(entry.newStatus ? walletStatusFor(entry.newStatus) : "—")}</small>` : ""}${entry.reason ? `<p>Reason: ${escapeActivityText(entry.reason)}</p>` : entry.note ? `<p>${escapeActivityText(entry.note)}</p>` : ""}</article>`).join("")}</div></section>`;
}
function userNotesSection(user: LegacyRecord): string {
  const notes = Array.isArray(user.adminNotes) ? user.adminNotes : [];
  return `<section class="section user-notes"><div class="section-title"><h3>Admin notes</h3><button type="button" class="link" data-add-admin-note>Add note</button></div>${notes.length ? `<div class="user-notes-list">${notes.map((note) => `<article><div><strong>${escapeActivityText(note.at || "Date not recorded")}</strong><small>${escapeActivityText(note.by || "Admin")}</small></div><p>${escapeActivityText(note.note)}</p></article>`).join("")}</div>` : '<p class="audit-note">No internal notes recorded.</p>'}</section>`;
}
function userDrawerActions(user: LegacyRecord): string {
  const reportButton = '<button class="btn" type="button" data-report-user>Report user</button>';
  if (["FROZEN", "SUSPENDED", "CLOSED"].includes(walletStatusFor(user.walletStatus ?? user.status))) return reportButton;
  return `${reportButton}<button class="btn primary" data-penalty-user>Record violation</button>`;
}
function userReportDetailStatus(report: LegacyRecord): string {
  return badge(reportStatusLabel(report), reportStatusTone(report));
}
function reportPenaltySummary(report: LegacyRecord): string {
  if (isReportCasePending(reportStatusLabel(report))) return "Pending moderator resolution";
  if (report.decision === "no-violation" || report.decision === "do-nothing") return "No penalty applied";
  const label = report.decisionLabel || "Penalty applied";
  return report.decisionDays ? `${String(label)} · ${report.decisionDays} days` : String(label);
}
function openUserReportDetails(user: LegacyRecord, report: LegacyRecord): void {
  const isOpen = isReportCasePending(reportStatusLabel(report));
  drawer.innerHTML = `<div class="drawer-top"><div><strong>${escapeActivityText(report.id)}</strong><small>Report details</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body user-report-detail"><div class="drawer-title"><span class="att-icon ${isOpen ? "warning" : "neutral"}">${ico("flag")}</span><div><h2>${escapeActivityText(report.category)}</h2><p>Reported user: ${escapeActivityText(user.title)}</p></div></div><section class="section"><h3>Report overview</h3><div class="user-context-list"><div><span>Status</span>${userReportDetailStatus(report)}</div><div><span>Reporter</span><strong>${escapeActivityText(report.reporterName)}</strong></div><div><span>Reported</span><strong>${escapeActivityText(report.reportedAt || "Date not recorded").replace(/\s+ICT$/, "")}</strong></div><div><span>Category</span><strong>${escapeActivityText(report.category)}</strong></div></div></section><section class="section"><h3>Description</h3><p>${escapeActivityText(report.details)}</p></section><section class="section"><h3>Evidence</h3>${report.evidence?.[0] && report.evidenceRefs?.[0] ? `<button class="evidence-item" data-report-evidence data-evidence-ref="${escapeActivityText(report.evidenceRefs[0])}"><span class="evidence-state">${ico("check")}</span><span><strong>${escapeActivityText(report.evidence[0])}</strong><small>Attached by ${escapeActivityText(report.reporterName)}</small></span><span>Open</span></button>` : '<p class="audit-note">No Evidence Reference was provided.</p>'}</section><section class="section"><h3>Resolution</h3>${isOpen ? '<div class="user-context-list"><div><span>Penalty</span><strong>Pending moderator resolution</strong></div></div>' : `<div class="user-context-list"><div><span>Outcome</span><strong>${escapeActivityText(report.resolution || report.decisionLabel || "Closed")}</strong></div><div><span>Penalty applied</span><strong>${escapeActivityText(reportPenaltySummary(report))}</strong></div><div><span>Resolved by</span><strong>${escapeActivityText(report.resolvedBy || "Admin")}</strong></div><div><span>Resolved</span><strong>${escapeActivityText(report.resolutionAt || report.closedAt || "Date not recorded").replace(/\s+ICT$/, "")}</strong></div></div>`}</section></div><div class="drawer-actions"><button class="btn" id="back-to-user">Back to user</button><a class="btn" href="/users/${encodeURIComponent(user.id)}">See full user profile</a><a class="btn primary" href="/reports/${encodeURIComponent(report.id)}">Open full report</a><button class="btn" id="close-user-report">Close record</button></div>`;
  drawer.querySelector<LegacyDomElement>("#close")?.addEventListener("click", closeDrawer);
  drawer.querySelector<LegacyDomElement>("#close-user-report")?.addEventListener("click", closeDrawer);
  drawer.querySelector<LegacyDomElement>("#back-to-user")?.addEventListener("click", () => {
    openDrawer("users", data.users.indexOf(user));
  });
}
function openReportDrawer(index: number): void {
  const report = data.reports[index];
  if (!report) return;
  showDrawerLayer();
  const status = reportCaseStatusFor(report.reportCaseStatus ?? report.conductReportStatus ?? report.status, report.decision),
    isClosed = !isReportCasePending(status);
  drawer.innerHTML = `<div class="drawer-top"><div><strong>${report.id}</strong><small>User report</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body report-record ${isClosed ? "closed-record" : "open-record"}"><div class="drawer-title"><span class="att-icon ${isClosed ? "neutral" : "warning"}">${ico("flag")}</span><div><h2>Report against ${escapeActivityText(report.reportedUserName)}</h2><p>Submitted by ${escapeActivityText(report.reporterName)}</p></div></div><div class="case-alert"><span>${ico("flag")}</span><div><strong>${isClosed ? "Report decision recorded" : "Open report — review is required"}</strong><p>${isClosed ? "This report is retained as a read-only audit record." : "Review the submitted details and evidence before closing this report."}</p></div></div><section class="section"><h3>Report overview</h3><div class="facts"><div class="fact"><span>Status</span>${badge(status, report.tone || (isClosed ? "neutral" : "warning"))}</div><div class="fact"><span>Report type</span><strong>${escapeActivityText(report.category)}</strong></div><div class="fact"><span>Reported</span><strong>${escapeActivityText(report.reportedAt)}</strong></div></div></section><section class="section"><h3>Report detail</h3><p>${escapeActivityText(report.details)}</p></section><section class="section"><h3>People involved</h3><div class="facts"><div class="fact"><span>Reported user</span><strong>${escapeActivityText(report.reportedUserName)}</strong><small>${escapeActivityText(report.reportedUserId)}</small></div><div class="fact"><span>Reporting user</span><strong>${escapeActivityText(report.reporterName)}</strong><small>${escapeActivityText(report.reporterId)}</small></div></div></section><section class="section"><h3>Evidence</h3>${report.evidence?.[0] && report.evidenceRefs?.[0] ? `<button class="evidence-item" data-report-evidence data-evidence-ref="${escapeActivityText(report.evidenceRefs[0])}"><span class="evidence-state">${ico("check")}</span><span><strong>${escapeActivityText(report.evidence[0])}</strong><small>Attached by ${escapeActivityText(report.reporterName)}</small></span><span>Open</span></button>` : '<p class="audit-note">No Evidence Reference was provided.</p>'}</section>${isClosed && report.decisionReason ? `<section class="section"><h3>Closing note</h3><p>${escapeActivityText(report.decisionReason)}</p></section>` : ""}</div><div class="drawer-actions"><a class="btn" href="/reports/${encodeURIComponent(report.id)}">Full report detail</a><button class="btn" id="close-report-record">Close record</button>${isClosed ? "" : '<a class="btn primary" href="/reports/' + encodeURIComponent(report.id) + '">Review report</a>'}</div>`;
  if (!isClosed)
    requiredQuery<LegacyDomElement>(drawer, ".case-alert strong").textContent =
      "Active report — review is required";
  if (!isClosed) {
    drawer.querySelector<LegacyDomElement>('.drawer-actions a[href^="/reports/"]')?.remove();
  }
  drawer.querySelector<LegacyDomElement>("#close")?.addEventListener("click", closeDrawer);
  scrim.onclick = closeDrawer;
  drawer.querySelector<LegacyDomElement>("#close-report-record")?.addEventListener("click", closeDrawer);
}
export function openDrawer(v: string, i: number): void {
  if (v === "reports") return openReportDrawer(i);
  if (v === "quests" || v === "disputes") return ensureDetailDrawer(v, i);
  const r = recordsFor(v)[i],
    isP = v === "payouts",
    isD = v === "disputes";
  showDrawerLayer();
  const payoutContext = isP ? payoutDecisionContext(r) : null,
    payoutNeedsDecision = isP && payoutStatusFor(r.payoutStatus ?? r.status) === "PENDING_ADMIN_APPROVAL",
    drawerContent =
      v === "users"
        ? `${userAccountSection(r)}${userModerationSection(r)}${userReportsSection(r)}${userActivitySection(r)}${userPayoutSection(r)}${userHistorySection(r)}${userNotesSection(r)}`
        : isD
          ? `<section class="section"><h3>Issue summary</h3><p>${escapeActivityText(r.detail)}</p></section><section class="section"><h3>Evidence on record</h3>${(r.evidence || []).map((e, evidenceIndex) => { const parts = String(e).split(" · "); const reference = r.evidenceRefs?.[evidenceIndex]; return reference ? `<button class="evidence-item" data-evidence-ref="${escapeActivityText(reference)}"><strong>${escapeActivityText(parts[0])}</strong><small>${escapeActivityText(parts.slice(1).join(" · "))}</small><span>Open</span></button>` : `<div class="evidence"><strong>${escapeActivityText(parts[0])}</strong><small>Evidence Reference not available</small></div>`; }).join("")}</section>`
          : isP
          ? `<section class="section"><h3>${escapeActivityText(payoutContext?.heading || "Payout")}</h3><p>${escapeActivityText(payoutContext?.copy || "")}</p><p class="audit-note">${escapeActivityText(payoutContext?.next || "")}</p></section>`
            : `<section class="section"><h3>Audit trail</h3>${timeline([statusForView(v, r), "Record created"])}</section>`;
  const drawerActions = isP
      ? payoutNeedsDecision
        ? '<button class="btn" data-action="Reject payout">Reject payout</button><button class="btn primary" data-action="Approve payout">Approve payout</button>'
        : '<button class="btn" id="close-payout-record">Close record</button>'
      : v === "users"
        ? `${userDrawerActions(r)}<a class="btn" href="/users/${encodeURIComponent(r.id)}">See full user profile</a>`
        : `<button class="btn" data-action="${hasHiddenQuestOverlay(r) ? "Restore quest" : "Hide quest"}">${hasHiddenQuestOverlay(r) ? "Restore quest" : "Hide quest"}</button>`;
  drawer.innerHTML = `<div class="drawer-top"><strong>${escapeActivityText(r.id)}</strong><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body"><div class="drawer-title"><span class="att-icon ${toneClass(r.tone)}">${ico(v === "payouts" ? "wallet" : v === "users" ? "user" : v === "quests" ? "quest" : "scale")}</span><div><h2>${escapeActivityText(r.title)}</h2><p>${escapeActivityText(r.person)} · ${escapeActivityText(r.other)}</p></div></div><div class="facts"><div class="fact"><span>Status</span>${badge(statusForView(v, r), r.tone)}${v === "quests" && hasHiddenQuestOverlay(r) ? '<span class="badge neutral quest-hidden-overlay">Hidden</span>' : ""}</div>${r.amount ? `<div class="fact"><span>${isP ? "Payout amount" : "Amount held"}</span><strong>฿${fmt(r.amount)}</strong></div>` : ""}<div class="fact"><span>Record</span><strong>${escapeActivityText(r.id)}</strong></div>${!isP && v !== "users" ? `<div class="fact"><span>Last activity</span><strong>${escapeActivityText(r.age)}</strong></div>` : ""}</div>${drawerContent}</div><div class="drawer-actions">${drawerActions}</div>`;
  if (isP) {
    drawer.querySelector<LegacyDomElement>(".facts")?.insertAdjacentHTML(
      "afterend",
      `${payoutTimingSection(r)}${payoutSummarySection(r)}`,
    );
    const historySection = document.createElement("section");
    historySection.className = "section payout-history";
    historySection.innerHTML = `<h3>Earning sources · ${completedPayoutQuests(r).length}</h3>${payoutQuestHistory(r)}`;
    const existingHistory = [...drawer.querySelectorAll<LegacyDomElement>(".section")].find(
      (section) => ["Quest history", "Earning sources"].some((title) => section.querySelector<LegacyDomElement>("h3")?.textContent.startsWith(title)),
    );
    const decisionSection = [...drawer.querySelectorAll<LegacyDomElement>(".section")].find(
      (section) => section.querySelector<LegacyDomElement>("h3")?.textContent === payoutContext?.heading,
    );
    if (existingHistory) existingHistory.replaceWith(historySection);
    else decisionSection?.before(historySection);
    [
      `<section class="section payout-previous"><h3>Previous payouts</h3>${payoutPreviousHistory(r)}</section>`,
      payoutOutcomeSection(r),
    ].forEach((section) => decisionSection?.insertAdjacentHTML("beforebegin", section));
    if (r.apiBacked && !r.payoutHistoryLoaded) {
      void hydrateLivePayout(r).then(() => {
        if (drawer.classList.contains("open") && data.payouts[i] === r) openDrawer(v, i);
      });
    }
  }
  document.querySelector<LegacyDomElement>("#close")?.addEventListener("click", closeDrawer);
  scrim.onclick = closeDrawer;
  drawer.querySelector<LegacyDomElement>("#close-payout-record")?.addEventListener("click", closeDrawer);
  drawer.querySelectorAll<LegacyDomElement>("[data-action]").forEach(
    (b) =>
      (b.onclick = () => {
        const action = b.dataset.action;
        if (!action) return;
        if (action === "Approve payout")
          return confirmPayoutApproval(r);
        if (action === "Reject payout")
          return confirmPayoutRejection(r);
        confirmAction(action, r, "", (reason) => {
          void runAdminAction(r, action, reason).then(() => {
            persistAdminData();
            if (state.view === "home") renderHome();
            else render();
            return undefined;
          });
        });
      }),
  );
  drawer
    .querySelectorAll<LegacyDomElement>("[data-user-report]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const report = data.reports[Number(button.dataset.userReport)];
        if (report) openUserReportDetails(r, report);
      });
    });
  drawer
    .querySelector<LegacyDomElement>("[data-add-admin-note]")
    ?.addEventListener("click", () => openAdminNoteDialog(r));
  drawer
    .querySelector<LegacyDomElement>("[data-penalty-user]")
    ?.addEventListener("click", () => openPenaltyDialog(r));
  drawer
    .querySelector<LegacyDomElement>("[data-report-user]")
    ?.addEventListener("click", () => openUserReportDialog(r));
}

function openUserReportDialog(user: LegacyRecord): void {
  closeActiveLayer();
  const reporter = data.users.find((candidate) => candidate.id !== user.id);
  if (!reporter) return;
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal report-modal" role="dialog" aria-modal="true" aria-label="Report ${user.title}"><div class="chat-modal-head"><div><strong>Report user</strong><small>${user.title} · ${user.id}</small></div><button class="icon close-party-chat" aria-label="Close report form"><span class="close-lines"></span></button></div><form class="report-form"><p class="chat-intro">Record a report submitted by one KuQuest user about another. This report does not apply a penalty automatically.</p><div class="report-selected-user" role="group" aria-labelledby="report-selected-user-label"><span id="report-selected-user-label">Reported user</span><strong>${escapeActivityText(user.title)}</strong><small>Student ID · ${escapeActivityText(user.id)}</small></div><input type="hidden" name="reporter" value="${escapeActivityText(reporter.id)}"><label for="report-category">Report type<select id="report-category" name="category" required><option>Harassment or abuse</option><option>Fraud or payment issue</option><option>Misleading quest activity</option><option>Other</option></select></label><label for="report-details">What happened?<textarea id="report-details" name="details" rows="5" minlength="20" maxlength="500" required placeholder="Describe what happened and what evidence supports the report…"></textarea></label><label class="report-file" for="report-attachment"><span>Evidence file (optional)</span><input id="report-attachment" type="file" data-report-attachment><small data-report-attachment-name>No file attached</small></label><p class="login-error report-error" role="alert" hidden></p><button class="btn danger" type="submit">Submit report</button></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "#report-category" });
  overlay.querySelector<LegacyDomElement>(".close-party-chat")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector<LegacyForm>("form");
  if (!form) return;
  const attachmentInput = form.querySelector<LegacyDomElement>("[data-report-attachment]"),
    attachmentName = form.querySelector<LegacyDomElement>("[data-report-attachment-name]"),
    error = form.querySelector<LegacyDomElement>(".report-error");
  if (!attachmentInput || !attachmentName || !error) return;
  attachmentInput.addEventListener("change", () => {
    attachmentName.textContent = attachmentInput.files?.[0]?.name || "No file attached";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const details = form.elements.details.value.trim();
    const result = reportSubmissionSchema.safeParse({
      reporterId: reporter.id,
      reporterName: reporter.title,
      reportedUserId: user.id,
      reportedUserName: user.title,
      category: form.elements.category.value,
      details,
      evidence: attachmentInput.files?.[0]?.name ? [attachmentInput.files[0].name] : [],
    });
    if (!result.success) {
      error.textContent = "Describe the report in at least 20 characters.";
      error.hidden = false;
      form.elements.details.focus();
      return;
    }
    const report: LegacyRecord = {
      id: `RPT-${String(Date.now()).slice(-6)}`,
      title: `Report against ${user.title}`,
      person: result.data.reporterName,
      other: result.data.reportedUserName,
      amount: null,
      age: "Just now",
      ...result.data,
      status: "REPORT_CASE_PENDING",
      reportCaseStatus: "REPORT_CASE_PENDING",
      tone: "warning",
      reportedAt: reportDateTime(),
    };
    data.reports.push(report);
    persistAdminData();
    refreshNavigationCounts();
    recordActivity("User report submitted", `${reporter.title} reported ${user.title} · ${report.category}`);
    close();
    if (!refreshUserAfterMutation(user)) openDrawer("users", data.users.indexOf(user));
    toast(`Report submitted against ${user.title}.`);
  });
}

function refreshUserAfterMutation(user: LegacyRecord): boolean {
  if (window.__KUQUEST_USER_DETAIL__?.user?.id === user.id) {
    window.__KUQUEST_USER_DETAIL__.render();
    return true;
  }
  if (state.view === "home") renderHome();
  else if (state.view === "users") render();
  return false;
}
export function openPenaltyDialog(user: LegacyRecord): void {
  closeActiveLayer();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal" role="dialog" aria-modal="true" aria-label="Confirm violation for ${escapeActivityText(user.title)}"><div class="chat-modal-head"><div><strong>Confirm violation</strong><small>${escapeActivityText(user.title)} · ${escapeActivityText(user.id)}</small></div><button class="icon close-party-chat" aria-label="Close penalty form"><span class="close-lines"></span></button></div><form class="penalty-form"><p class="chat-intro">Confirm that this account committed an actual policy violation. The SRS penalty ladder applies the next consequence automatically.</p><section class="penalty-policy-note" aria-label="Penalty ladder"><strong>Penalty ladder</strong><span>1st violation: Red Flag · 7 days</span><span>2nd violation: Temporary ban · 7 days</span><span>3rd violation: Permanent ban</span></section><section class="penalty-preview" data-penalty-preview aria-live="polite"></section><label for="penalty-reason">Reason for confirmed violation<textarea id="penalty-reason" name="reason" rows="3" minlength="8" maxlength="500" required aria-describedby="penalty-reason-help penalty-error" placeholder="State the evidence and policy behind this violation…"></textarea><small id="penalty-reason-help">Enter 8–500 characters explaining the evidence and policy.</small></label><label for="penalty-note">Internal admin note (optional)<textarea id="penalty-note" name="note" rows="2" maxlength="500" placeholder="Add context for authorized moderators…"></textarea></label><p class="login-error penalty-error" id="penalty-error" role="alert" hidden></p><button class="btn danger" type="submit">Confirm violation</button></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "#penalty-reason" });
  overlay.querySelector<LegacyDomElement>(".close-party-chat")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector<LegacyForm>("form");
  if (!form) return;
  const preview = form.querySelector<LegacyDomElement>("[data-penalty-preview]");
  if (!preview) return;
  const updateFields = () => {
    const outcome = penaltyOutcomeFor(user);
    const exemption = outcome.key === "red-flag" ? redFlagExemptionFor(user) : null;
    const previewOutcome = exemption ? { ...outcome, key: "red-flag-exempted" } : outcome;
    const expires = outcome.durationDays ? new Date(Date.now() + outcome.durationDays * 86400000) : null;
    preview.innerHTML = `<div><span>User</span><strong>${escapeActivityText(user.title)}</strong></div><div><span>Confirmed violations</span><strong>${confirmedViolationCount(user)}</strong></div><div><span>Next outcome</span><strong>${escapeActivityText(penaltyOutcomeLabel(previewOutcome))}</strong></div>${exemption ? `<div><span>Exemption</span><strong>${exemption.remaining} Red Flag decision${exemption.remaining === 1 ? "" : "s"} remaining · ${escapeActivityText(exemption.label)}</strong></div>` : ""}${expires && !exemption ? `<div><span>Expires</span><strong>${escapeActivityText(adminDateTime(expires))}</strong></div>` : ""}<div><span>Reason</span><strong>${escapeActivityText(form.elements.reason.value.trim() || "Reason required before confirming")}</strong></div>${form.elements.note.value.trim() ? `<div><span>Internal note</span><strong>${escapeActivityText(form.elements.note.value.trim())}</strong></div>` : ""}`;
  };
  form.elements.reason.addEventListener("input", updateFields);
  form.elements.note.addEventListener("input", updateFields);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const reason = form.elements.reason.value.trim();
    const error = requiredQuery<LegacyDomElement>(form, ".penalty-error");
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
    if (!refreshUserAfterMutation(user)) openDrawer("users", data.users.indexOf(user));
    toast(`${penaltyOutcomeLabel(outcome)} recorded for ${user.title}.`);
  });
  updateFields();
}
function openAdminNoteDialog(user: LegacyRecord): void {
  closeActiveLayer();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal" role="dialog" aria-modal="true" aria-label="Add admin note for ${escapeActivityText(user.title)}"><div class="chat-modal-head"><div><strong>Add admin note</strong><small>${escapeActivityText(user.title)} · ${escapeActivityText(user.id)}</small></div><button class="icon close-party-chat" aria-label="Close admin note form"><span class="close-lines"></span></button></div><form class="penalty-form admin-note-form"><p class="chat-intro">This note is visible only to authorized moderation staff.</p><label>Internal note<textarea name="note" rows="5" minlength="4" maxlength="500" required placeholder="Record useful moderation context…"></textarea></label><p class="login-error penalty-error" role="alert" hidden></p><button class="btn primary" type="submit">Save note</button></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "textarea" });
  overlay.querySelector<LegacyDomElement>(".close-party-chat")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector<LegacyForm>("form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = form.elements.note.value.trim();
    const error = requiredQuery<LegacyDomElement>(form, ".penalty-error");
    if (note.length < 4) {
      error.textContent = "Enter at least 4 characters for the admin note.";
      error.hidden = false;
      form.elements.note.focus();
      return;
    }
    user.adminNotes = [{ at: adminDateTime(), by: currentAdminName(), note }, ...(user.adminNotes || [])];
    persistAdminData();
    recordActivity("Admin note added", `${user.id} · ${user.title}`);
    close();
    if (!refreshUserAfterMutation(user)) openDrawer("users", data.users.indexOf(user));
    toast(`Admin note saved for ${user.title}.`);
  });
}
function refreshNavigationCounts(): void {
  const counts = {
    disputes: data.disputes.filter((record) => disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING").length,
    payouts: data.payouts.filter((record) => payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL").length,
    reports: data.reports.filter((record) => isReportCasePending(record.reportCaseStatus ?? record.conductReportStatus ?? record.status, record.decision)).length,
  };
  Object.entries(counts).forEach(([view, count]) => {
    const counter = document.querySelector<LegacyDomElement>(`[data-view="${view}"] b`);
    if (counter) counter.textContent = String(count);
  });
}
export function ensureDetailDrawer(view: string, index: number): void {
  if (view !== "quests" && view !== "disputes") return;
  const opener = view === "quests" ? "openQuestDrawer" : "openDisputeDrawer";
  const open = window[opener];
  if (open) open(index);
}
const dialog = document.querySelector<LegacyDomElement>("#confirm");
export function confirmAction(a: string, r: LegacyRecord, decisionDetail = "", onConfirm?: (reason: string) => void, options: ConfirmActionOptions = {}): void {
  if (!dialog) return;
  const form = requiredQuery<LegacyForm>(document, "#confirm-form"),
    reason = requiredQuery<LegacyDomElement>(document, "#confirm-reason"),
    error = requiredQuery<LegacyDomElement>(document, "#confirm-reason-error"),
    count = requiredQuery<LegacyDomElement>(document, "#confirm-reason-count"),
    confirmButton = requiredQuery<LegacyDomElement>(document, "#confirm-btn");
  resetConfirmationDialog();
  requiredQuery<LegacyDomElement>(document, "#confirm-title").textContent = a;
  requiredQuery<LegacyDomElement>(document, "#confirm-copy").textContent =
    decisionDetail ||
    `This will update ${r.id} and add your decision to the permanent admin audit trail.`;
  confirmButton.textContent = a;
  confirmButton.disabled = true;
  reason.value = "";
  reason.setAttribute("aria-invalid", "false");
  error.hidden = true;
  count.textContent = "0 / 500";
  const validate = () => {
    const valid = reason.value.trim().length >= 8;
    confirmButton.disabled = !valid;
    reason.setAttribute(
      "aria-invalid",
      String(!valid && reason.value.length > 0),
    );
    error.hidden = true;
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
  dialog.addEventListener(
    "close",
    () => {
      if (dialog.returnValue === "confirm") {
        if (!options.keepDrawerOpen && drawer?.classList.contains("open"))
          closeDrawer();
        const decisionReason = reason.value.trim();
        onConfirm?.(decisionReason);
        recordActivity(
          a,
          `${r.id} · ${r.title || r.reportedUserName || "Record"}${decisionReason ? ` · ${decisionReason}` : ""}`,
        );
        toast(`${a} recorded for ${r.id}. Audit reason saved.`);
      }
    },
    { once: true },
  );
}
function payoutConfirmationSummary(record: LegacyRecord): string {
  if (record.apiBacked) {
    const amount = payoutServerValue(record, "principalSatang");
    const maximumDebit = payoutServerValue(record, "maximumDebitSatang");
    return `<div class="payout-confirm-summary"><div><span>Recipient</span><strong>${escapeActivityText(record.title)}</strong></div><div><span>Payout amount</span><strong>${amount === null ? "Not provided" : `฿${fmt(amount)}`}</strong></div><div><span>Bank / payout destination</span><strong>${escapeActivityText(record.person)}</strong></div><div><span>Maximum debit</span><strong>${maximumDebit === null ? "Not provided" : `฿${fmt(maximumDebit)}`}</strong></div></div><p class="payout-confirm-note">The amount and maximum debit come from the Payout API. Approving this Payout changes its status to SUBMITTED_TO_PROVIDER.</p>`;
  }
  const financials = payoutFinancials(record);
  return `<div class="payout-confirm-summary"><div><span>Recipient</span><strong>${escapeActivityText(record.title)}</strong></div><div><span>Payout amount</span><strong>฿${fmt(record.amount)}</strong></div><div><span>Bank / payout destination</span><strong>${escapeActivityText(record.person)}</strong></div><div><span>Available balance</span><strong>฿${fmt(financials.available)}</strong></div><div><span>Remaining after payout</span><strong>฿${fmt(financials.remaining)}</strong></div></div><p class="payout-confirm-note">Approving this Payout changes its status to SUBMITTED_TO_PROVIDER. Funds are not transferred immediately.</p>`;
}
function resetConfirmationDialog() {
  const context = document.querySelector<LegacyDomElement>("#confirm-context"),
    reason = document.querySelector<LegacyDomElement>("#confirm-reason"),
    reasonLabel = reason?.closest("label"),
    help = document.querySelector<LegacyDomElement>("#confirm-reason-help"),
    error = document.querySelector<LegacyDomElement>("#confirm-reason-error"),
    count = document.querySelector<LegacyDomElement>("#confirm-reason-count"),
    confirmButton = document.querySelector<LegacyDomElement>("#confirm-btn");
  if (context) {
    context.hidden = true;
    context.innerHTML = "";
  }
  if (reasonLabel) {
    reasonLabel.hidden = false;
    if (reasonLabel.firstChild) reasonLabel.firstChild.textContent = "Reason for this decision ";
    if (!reasonLabel.querySelector<LegacyDomElement>('span[aria-hidden="true"]')) {
      const requiredMark = document.createElement("span");
      requiredMark.setAttribute("aria-hidden", "true");
      requiredMark.textContent = "*";
      reasonLabel.insertBefore(requiredMark, reason);
    }
  }
  if (reason) {
    reason.value = "";
    reason.required = true;
    reason.disabled = false;
    reason.setAttribute("aria-invalid", "false");
    reason.placeholder = "State the evidence and policy behind this decision…";
  }
  if (help) help.hidden = false;
  if (error) error.hidden = true;
  if (count) count.textContent = "0 / 500";
  if (confirmButton) confirmButton.className = "btn danger";
}
function finishPayoutAction(record: LegacyRecord, action: string, onComplete?: () => void): void {
  persistAdminData();
  closeDrawer();
  if (state.view === "home") renderHome();
  else render();
  onComplete?.();
  recordActivity(action, `${record.id} · ${record.title}`);
  toast(`${action} recorded for ${record.id}.`);
}
function confirmPayoutApproval(record: LegacyRecord): void {
  if (!dialog) return;
  const form = requiredQuery<LegacyForm>(document, "#confirm-form"),
    reason = requiredQuery<LegacyDomElement>(document, "#confirm-reason"),
    reasonLabel = reason.closest("label"),
    help = requiredQuery<LegacyDomElement>(document, "#confirm-reason-help"),
    error = requiredQuery<LegacyDomElement>(document, "#confirm-reason-error"),
    count = requiredQuery<LegacyDomElement>(document, "#confirm-reason-count"),
    context = requiredQuery<LegacyDomElement>(document, "#confirm-context"),
    confirmButton = requiredQuery<LegacyDomElement>(document, "#confirm-btn");
  resetConfirmationDialog();
  if (!reasonLabel) return;
  requiredQuery<LegacyDomElement>(document, "#confirm-title").textContent = "Approve payout";
  requiredQuery<LegacyDomElement>(document, "#confirm-copy").textContent =
    "Review the destination and balance before approving this payout.";
  context.hidden = false;
  context.innerHTML = payoutConfirmationSummary(record);
  reasonLabel.hidden = false;
  reason.required = true;
  reason.disabled = false;
  help.hidden = false;
  confirmButton.textContent = "Approve payout";
  confirmButton.className = "btn primary";
  confirmButton.disabled = true;
  const validate = () => {
    const valid = reason.value.trim().length >= 8;
    confirmButton.disabled = !valid;
    reason.setAttribute(
      "aria-invalid",
      String(!valid && reason.value.length > 0),
    );
    error.hidden = true;
    count.textContent = `${reason.value.length} / 500`;
    return valid;
  };
  reason.oninput = validate;
  form.onsubmit = (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value !== "confirm") return;
    if (!validate()) {
      event.preventDefault();
      reason.setAttribute("aria-invalid", "true");
      error.hidden = false;
      reason.focus();
      return;
    }
    event.preventDefault();
    dialog.close("confirm");
  };
  dialog.addEventListener(
    "close",
    () => {
      if (dialog.returnValue !== "confirm") return;
      const approvalReason = reason.value.trim();
      void adminCommands.approvePayout(record.id, {
        idempotencyKey: newAdminIdempotencyKey("approve-payout", record.id),
        ...(typeof record.version === "number" ? { expectedVersion: record.version } : {}),
        note: approvalReason,
      }).then(() => {
        finishPayoutAction(record, "Approve payout", () => {
          recordActivity("Payout approval reason", `${record.id} · ${approvalReason}`);
        });
        return undefined;
      }).catch((error: unknown) => {
        toast(`Approve payout failed: ${error instanceof Error ? error.message : "Request failed."}`);
      });
    },
    { once: true },
  );
  dialog.showModal();
  requestAnimationFrame(() => reason.focus());
}
function confirmPayoutRejection(record: LegacyRecord): void {
  if (!dialog) return;
  const form = requiredQuery<LegacyForm>(document, "#confirm-form"),
    reason = requiredQuery<LegacyDomElement>(document, "#confirm-reason"),
    reasonLabel = reason.closest("label"),
    help = requiredQuery<LegacyDomElement>(document, "#confirm-reason-help"),
    error = requiredQuery<LegacyDomElement>(document, "#confirm-reason-error"),
    count = requiredQuery<LegacyDomElement>(document, "#confirm-reason-count"),
    context = requiredQuery<LegacyDomElement>(document, "#confirm-context"),
    confirmButton = requiredQuery<LegacyDomElement>(document, "#confirm-btn");
  resetConfirmationDialog();
  if (!reasonLabel) return;
  requiredQuery<LegacyDomElement>(document, "#confirm-title").textContent = "Reject payout";
  requiredQuery<LegacyDomElement>(document, "#confirm-copy").textContent =
    "Choose a reason for rejecting this payout. An admin note is optional.";
  context.hidden = false;
  context.innerHTML = `<div class="payout-rejection-fields"><label for="payout-rejection-reason">Rejection reason <span aria-hidden="true">*</span></label><select id="payout-rejection-reason"><option value="">Choose a reason</option><option>Bank account name does not match the verified account holder.</option><option>Recipient account could not be verified.</option><option>Insufficient withdrawable balance.</option><option>Duplicate payout request.</option></select></div>`;
  if (reasonLabel.firstChild) reasonLabel.firstChild.textContent = "Admin note (optional)";
  reasonLabel.querySelector<LegacyDomElement>("span")?.remove();
  reason.required = false;
  reason.placeholder = "Add context for the rejection (optional)…";
  help.hidden = true;
  error.hidden = true;
  count.textContent = "0 / 500";
  confirmButton.textContent = "Reject payout";
  confirmButton.className = "btn danger";
  confirmButton.disabled = true;
  const choice = requiredQuery<LegacyDomElement>(context, "#payout-rejection-reason");
  const validate = () => {
    const valid = Boolean(choice.value);
    confirmButton.disabled = !valid;
    error.hidden = true;
    return valid;
  };
  choice.addEventListener("change", validate);
  form.onsubmit = (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value !== "confirm") return;
    if (!validate()) {
      event.preventDefault();
      error.textContent = "Choose a rejection reason before confirming.";
      error.hidden = false;
      choice.focus();
      return;
    }
    event.preventDefault();
    dialog.close("confirm");
  };
  dialog.addEventListener(
    "close",
    () => {
      if (dialog.returnValue !== "confirm") return;
      const adminNote = reason.value.trim();
      void adminCommands.rejectPayout(record.id, {
        idempotencyKey: newAdminIdempotencyKey("reject-payout", record.id),
        ...(typeof record.version === "number" ? { expectedVersion: record.version } : {}),
        reason: choice.value,
      }).then(() => {
        record.rejectionNote = adminNote;
        if (!record.apiBacked) record.remainingBalance = payoutFinancials(record).available;
        finishPayoutAction(record, "Reject payout", () => {
          recordActivity("Payout rejection reason", `${record.id} · ${choice.value}${adminNote ? ` · ${adminNote}` : ""}`);
        });
        return undefined;
      }).catch((error: unknown) => {
        toast(`Reject payout failed: ${error instanceof Error ? error.message : "Request failed."}`);
      });
    },
    { once: true },
  );
  dialog.showModal();
  requestAnimationFrame(() => choice.focus());
}
export function toast(s: string): void {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `${ico("check")}<span>${escapeActivityText(s)}</span>`;
  document.querySelector<LegacyDomElement>("#toasts")?.append(t);
  setTimeout(() => t.remove(), 3500);
}
const command = document.querySelector<LegacyDomElement>("#command"),
  g = document.querySelector<LegacyDomElement>("#global-search"),
  results = document.querySelector<LegacyDomElement>("#results");
let closeCommandLayer: (() => void) | null = null;
function closeSearch() {
  if (closeCommandLayer) {
    const close = closeCommandLayer;
    closeCommandLayer = null;
    close();
  } else if (command) command.hidden = true;
}
function openSearch() {
  if (!command || !g || !results) return;
  command.hidden = false;
  g.value = "";
  search("");
  closeCommandLayer = showModalLayer(command, {
    initialFocus: g,
    removeOnClose: false,
    onClose: () => (command.hidden = true),
  });
}
function search(q: string): void {
  if (!results) return;
  const all = Object.entries(data).flatMap(([view, rs]) =>
    rs.map((r, index) => ({ ...r, view, index })),
  );
  const m = all
    .filter((r) =>
      `${r.id} ${r.title || ""} ${r.person || ""} ${r.reportedUserName || ""} ${r.reporterName || ""} ${r.category || ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .slice(0, 7);
  results.innerHTML = m.length
    ? m
        .map(
          (r) =>
            `<button class="result" data-result="${r.view}:${r.index}"><span>${ico(r.view === "payouts" ? "wallet" : r.view === "users" ? "user" : r.view === "reports" ? "flag" : r.view === "disputes" ? "scale" : "quest")}</span><span><strong>${r.view === "reports" ? `Report against ${r.reportedUserName}` : r.title}</strong><small>${r.id} · ${r.view === "reports" ? `Reported by ${r.reporterName}` : r.person}</small></span><small>${r.view}</small></button>`,
        )
        .join("")
    : '<div class="empty"><h3>No results</h3><p>Try a record ID, person, or quest title.</p></div>';
  results.querySelectorAll<LegacyDomElement>("[data-result]").forEach(
    (b) =>
      (b.onclick = () => {
        const [v, i] = (b.dataset.result || "").split(":");
        if (!v || !i) return;
        closeSearch();
        openDrawer(v, +i);
      }),
  );
}
document.querySelector<LegacyDomElement>("#open-search")?.addEventListener("click", openSearch);
if (g) g.oninput = (e) => search((e.currentTarget as HTMLInputElement).value);
if (command)
  command.onclick = (e) => {
    if (e.target === command) closeSearch();
  };
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && g) {
    e.preventDefault();
    openSearch();
  }
  if (e.key === "Escape") {
    if (command && !command.hidden) closeSearch();
    if (drawer?.classList.contains("open")) closeDrawer();
    if (document.querySelector<LegacyDomElement>(".sidebar.open")) setMobileNavigation(false);
  }
});
const sidebar = document.querySelector<LegacyDomElement>(".sidebar"),
  menuButton = document.querySelector<LegacyDomElement>("#menu"),
  closeMenuButton = document.querySelector<LegacyDomElement>("#close-menu"),
  mobileNavigationQuery = matchMedia("(max-width: 900px)");
function setMobileNavigation(open?: boolean): void {
  const isMobile = mobileNavigationQuery.matches;
  if (!sidebar) return;
  if (!isMobile) {
    sidebar.classList.remove("open");
    sidebar.inert = false;
    sidebar.removeAttribute("aria-hidden");
    menuButton?.setAttribute("aria-expanded", "false");
    return;
  }
  const canOpen = Boolean(menuButton),
    expanded = canOpen && open;
  sidebar.classList.toggle("open", expanded);
  sidebar.inert = !expanded;
  sidebar.setAttribute("aria-hidden", String(!expanded));
  menuButton?.setAttribute("aria-expanded", String(expanded));
  menuButton?.setAttribute(
    "aria-label",
    expanded ? "Close navigation" : "Open navigation",
  );
  if (expanded) sidebar.querySelector<LegacyDomElement>("button")?.focus();
  else if (open === false && menuButton) menuButton.focus();
}
menuButton?.addEventListener("click", () =>
  setMobileNavigation(!sidebar?.classList.contains("open")),
);
closeMenuButton?.addEventListener("click", () => setMobileNavigation(false));
mobileNavigationQuery.addEventListener("change", () => setMobileNavigation(false));
setMobileNavigation(false);
window.__KUQUEST_LEGACY_RUNTIME__ = {
  data,
  navigate,
  ensureDetailDrawer,
  openDrawer,
  closeActiveLayer,
  showModalLayer,
  toast,
  drawer,
  icon: ico,
};
