import type { LegacyDomElement, LegacyHistoryEntry, LegacyModalOptions, LegacyPageState, LegacyRecord } from "./runtime";
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
  payoutBadge,
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
  hydrateLiveMember,
  hydrateLivePayout,
  hydrateLiveWallet,
  reconcileLivePayout,
  payoutServerValue,
  refreshLiveDisputes,
  refreshLiveMembers,
  refreshLiveQuests,
  refreshLivePayouts,
  refreshLiveWallets,
  verifyLiveWallet,
  loadLiveWalletStatement,
} from "./live-review-data";
import { ADMIN_LEDGER_EVENT_TYPES, adminApi, type AdminLedgerEventType, type AdminQuestReasonCode } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import {
  adminNavigationCountsFromMockData,
  adminNavigationCountsFromOverview,
  type AdminNavigationCounts,
  type MockNavigationCounts,
} from "../admin-navigation";
import { isQuestModerationAction, setupQuestReasonCode, type AdminReasonCode } from "./quest-admin-reason";
import type { DashboardActivity } from "../dashboard/dashboard-model";
import {
  activityLogEntryFromApi,
  activityLogMatchesSearch,
  activityTargetHref,
  formatActivityLogRelativeTime,
  formatActivityLogTimestamp,
  type ActivityLogEntry,
} from "../activity-log/activity-log-model";
import {
  QUEST_STATES,
  disputeCaseStatusFor,
  disputeCaseStatusLabel,
  hasHiddenQuestOverlay,
  isReportCasePending,
  payoutStatusFor,
  payoutStatusLabel,
  questStateLabel,
  questStateFor,
  memberStatusLabel,
  memberStatusFor,
  reportCaseStatusLabel,
  reportCaseStatusFor,
  walletStatusFor,
  walletStatusLabel,
} from "../domain/rulebook";
import {
  currentWalletBalance,
  filterWalletStatementTransactions,
  latestWalletTransactionDate,
  walletStatementRows,
  type WalletBalances,
  type WalletStatementFilters,
  type WalletStatementRow,
  type WalletStatementTransaction,
} from "./wallet-model";

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
  payoutBadge,
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

type LegacyView = "home" | "disputes" | "quests" | "users" | "wallets" | "payouts" | "reports" | "conduct-reports" | "policies" | "activity";
type IconName = "home" | "scale" | "quest" | "users" | "wallet" | "settings" | "history" | "menu" | "search" | "filter" | "check" | "user" | "flag";
type LegacyForm = HTMLFormElement & {
  elements: HTMLFormControlsCollection & Record<string, LegacyDomElement>;
};
type ConfirmActionOptions = LegacyModalOptions;

function statusForView(view: string, record: LegacyRecord): string {
  if (view === "quests") return questStateFor(record.questState ?? record.status);
  if (view === "disputes") return disputeCaseStatusFor(record.disputeCaseStatus ?? record.status);
  if (view === "payouts") return payoutStatusFor(record.payoutStatus ?? record.status);
  if (view === "reports") return reportCaseStatusFor(record.reportCaseStatus ?? record.status, record.decision);
  if (view === "conduct-reports") return reportCaseStatusFor(record.conductReportStatus ?? record.status, record.decision);
  if (view === "users") return memberStatusFor(record.memberStatus);
  if (view === "wallets") return walletStatusFor(record.walletStatus ?? record.status);
  return record.status;
}

function statusBadgeForView(view: string, record: LegacyRecord): string {
  return view === "payouts"
    ? payoutBadge(record.payoutStatus ?? record.status, record.tone)
    : badge(statusForView(view, record), record.tone);
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

const navItems: Array<[LegacyView, IconName, string]> = [
  ["home", "home", "Overview"],
  ["quests", "quest", "Quests"],
  ["disputes", "scale", "Disputes"],
  ["reports", "flag", "Report Cases"],
  ["conduct-reports", "flag", "Conduct Reports"],
  ["payouts", "wallet", "Payouts"],
  ["users", "users", "Users"],
  ["wallets", "wallet", "Wallets"],
];
function persistAdminData(): void {
  window.persistAdminData?.();
}

function runAdminAction(record: LegacyRecord, action: string, reason: string, reasonCode?: AdminQuestReasonCode): Promise<void> {
  const idempotencyKey = newAdminIdempotencyKey(action, record.id);
  const expectedVersion = typeof record.version === "number" ? { expectedVersion: record.version } : {};
  if (action === "Hide quest") {
    return adminCommands.hideQuest(record.id, { ...expectedVersion, idempotencyKey, reason, reasonCode: reasonCode ?? "POLICY_REVIEW" }).then(() => undefined);
  }
  if (action === "Restore quest") {
    return adminCommands.restoreQuest(record.id, { ...expectedVersion, idempotencyKey }).then(() => undefined);
  }
  if (action === "Terminate quest") {
    return adminCommands.terminateQuest(record.id, { ...expectedVersion, idempotencyKey, reason, reasonCode: reasonCode ?? "POLICY_REVIEW" }).then(() => undefined);
  }
  if (action === "Restrict user" || action === "Set normal" || action === "Lift penalty") {
    const walletId = typeof record.walletId === "string" ? record.walletId : record.id;
    return adminCommands.setWalletStatus(walletId, {
      ...expectedVersion,
      idempotencyKey,
      reason,
      toStatus: action === "Restrict user" ? "FROZEN" : "ACTIVE",
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
    "wallets",
    "payouts",
    "reports",
    "conduct-reports",
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
const navigation = nav;
navigation.innerHTML = navItems
  .map(
    ([v, i, l]) =>
      `<button data-view="${v}"><span>${ico(i)}</span>${l}</button>`,
  )
  .join("");

function setNavigationCount(view: string, count: number): void {
  const button = navigation.querySelector<LegacyDomElement>(`[data-view="${view}"]`);
  if (!button) return;
  let counter = button.querySelector<HTMLElement>("b");
  if (!counter) {
    counter = document.createElement("b");
    button.append(counter);
  }
  counter.textContent = String(count);
}

function removeNavigationCount(view: string): void {
  navigation.querySelector<HTMLElement>(`[data-view="${view}"] b`)?.remove();
}

export function setNavigationCounts(counts: AdminNavigationCounts): void {
  setNavigationCount("disputes", counts.disputes);
  setNavigationCount("payouts", counts.payouts);
  removeNavigationCount("reports");
  removeNavigationCount("conduct-reports");
}

export function setMockNavigationCounts(counts: MockNavigationCounts): void {
  if (typeof counts.disputes === "number") setNavigationCount("disputes", counts.disputes);
  setNavigationCount("reports", counts.reports);
  setNavigationCount("conduct-reports", counts.conductReports);
}
document
  .querySelectorAll<LegacyDomElement>("[data-static-icon]")
  .forEach((x) => (x.innerHTML = ico(x.dataset.staticIcon || "")));
export const heads: Record<Exclude<LegacyView, "home">, [string, string]> = {
  disputes: ["Disputes", "Review evidence and make accountable resolutions."],
  quests: ["Quests", "Moderate listings through every marketplace state."],
  users: ["Users", "Review student accounts, reports, and marketplace access."],
  wallets: ["Wallets", "Review Wallet status and administrative holds."],
  payouts: ["Payouts", "Approve or investigate money leaving the marketplace."],
  reports: ["Report Cases", "Review reports about Message or Attachment content."],
  "conduct-reports": ["Conduct Reports", "Review Member behavior on Quests."],
  policies: [
    "Money policies",
    "Review current financial limits and fee rules.",
  ],
  activity: ["Activity log", "An audit trail of administrative decisions."],
};
export const pageHead = (t: string, p: string, a = ""): string =>
  `<div class="page-head"><div><h1>${t}</h1><p>${p}</p></div>${a}</div>`;
function homeDecisions(): Array<{ view: string; record: LegacyRecord; priority: number; icon: string; title: string; detail: string; metric: string; age?: string }> {
  const decisions: Array<{ view: string; record: LegacyRecord; priority: number; icon: string; title: string; detail: string; metric: string; age?: string }> = [
    ...data.disputes
      .filter((record) => disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING")
      .map((record) => ({
        view: "disputes" as const,
        record,
        priority: 500 + Number(record.amount || 0),
        icon: "⚖",
        title: `Resolve ${disputeTypeLabel(record)} dispute`,
        detail: `${record.id} · ${record.title}`,
        metric: `${disputeAmountText(record)} held`,
        age: record.disputeDate,
      })),
    ...data.payouts
      .filter((record) => payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL")
      .map((record) => ({
        view: "payouts" as const,
        record,
        priority: 300 + Number(record.amount || 0),
        icon: "฿",
        title: `${payoutStatusLabel(record.payoutStatus ?? record.status)} payout`,
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
      .filter((record) => !record.conductReportStatus && isReportCasePending(record.reportCaseStatus ?? record.status, record.decision))
      .map((record) => ({
        view: "reports",
        record,
        priority: 450,
        icon: "flag",
        title: "New Report Case",
        detail: `${record.id} · ${record.reportedUserName}`,
        metric: "Open Report Case",
        age: record.reportedAt,
      })),
    ...data.reports
      .filter((record) => Boolean(record.conductReportStatus) && isReportCasePending(record.conductReportStatus, record.decision))
      .map((record) => ({
        view: "conduct-reports",
        record,
        priority: 440,
        icon: "flag",
        title: "New Conduct Report",
        detail: `${record.id} · ${record.reportedUserName}`,
        metric: "Open Conduct Report",
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
    .filter((item) => ["disputes", "reports", "conduct-reports"].includes(item.view))
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
  main.innerHTML = `${pageHead("Overview", "A live snapshot of marketplace risk, money, and work in progress.", '<button class="btn primary" data-jump="disputes">Open review queue</button>')}<section class="dashboard-stats"><div class="stat"><span>Total work left</span><strong>${workLeft.length}</strong><small>Items requiring admin action</small></div></section><div class="grid dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Needs a decision</h2><p>Showing ${decisions.length} latest dispute/report records</p></div><button class="link" data-jump="activity">View activity</button></div>${decisions.length ? decisions.map((item) => attention(item.view, recordsFor(item.view).indexOf(item.record), item.record.tone, item.icon, item.title, item.detail, item.metric, String(item.age || item.record.age))).join("") : '<div class="empty"><h3>No decisions waiting</h3><p>All current records are clear or processing normally.</p></div>'}</section><aside><section class="panel"><div class="panel-head"><div><h2>Quest flow</h2><p>Current marketplace distribution</p></div><button class="link" data-jump="quests">Open quests</button></div><div class="dashboard-status-list">${statusCounts.map(([status, count]) => `<div><span>${badge(status, questStatusTone(status))}</span><strong>${count}</strong></div>`).join("")}</div></section><section class="panel dashboard-activity"><div class="panel-head"><div><h2>Recent activity</h2><p>Latest administrative trail</p></div></div>${activityList().slice(0, 3).join("")}</section></aside></div><div class="dashboard-lower"><section class="panel"><div class="panel-head"><div><h2>Payout watch</h2><p>Money movement requiring a closer look</p></div><button class="link" data-jump="payouts">Open payouts</button></div>${pendingPayouts.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="payouts:${data.payouts.indexOf(record)}"><span><strong>${record.id}</strong><small>${record.title} · ${payoutStatusLabel(record.payoutStatus ?? record.status)}</small></span><strong>฿${fmt(record.amount)}</strong><span>${payoutBadge(record.payoutStatus ?? record.status, record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No payouts need review</h3><p>Processing and completed payouts are moving normally.</p></div>'}</section><section class="panel"><div class="panel-head"><div><h2>User watch</h2><p>Accounts that may need a moderator</p></div><button class="link" data-jump="users">Open users</button></div>${reviewUsers.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="users:${data.users.indexOf(record)}"><span><strong>${record.title}</strong><small>${record.id} · ${record.age}</small></span><span>${badge(walletStatusFor(record.walletStatus ?? record.status), record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No user reviews</h3><p>All accounts are currently in good standing.</p></div>'}</section></div>`;
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
function activityListFor(events: DashboardActivity[], query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const saved = events
    .filter((event) => !normalizedQuery || [event.actor, event.title, event.detail].some((value) => value.toLowerCase().includes(normalizedQuery)))
    .map((event) => [
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
export function activityList() {
  return activityListFor(readActivityEvents().map((event) => ({
    actor: event.actor || "NP",
    title: event.title,
    detail: event.detail,
    timestamp: event.timestamp,
  })));
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
              ? ["All", "REPORT_CASE_PENDING", "REPORT_CASE_DISMISSED", "REPORT_CASE_HIDDEN", "REPORT_CASE_RESTORED"]
              : v === "conduct-reports"
                ? ["All", "CONDUCT_REPORT_PENDING", "CONDUCT_REPORT_UPHELD", "CONDUCT_REPORT_DISMISSED"]
              : v === "users"
                ? ["All", "Normal", "Flag", "Temp Ban", "Perm Ban"]
              : ["All", "ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"];
  const filtered = rows.filter(
    (r) =>
      `${r.id} ${r.title || ""} ${r.person || ""} ${r.reportedUserName || ""} ${r.reporterName || ""} ${r.category || ""}`
        .toLowerCase()
        .includes(state.query.toLowerCase()) &&
      (state.tab === "all" || statusForView(v, r).toLowerCase() === state.tab || r.status.toLowerCase().includes(state.tab)),
  );
  const header = heads[v as keyof typeof heads] || [v, ""];
    main.innerHTML = `${pageHead(header[0], header[1])}<section class="panel resource"><div class="tabs">${tabs.map((t) => { const label = t === "All" || t === "Team" || t === "Solo" ? t : v === "payouts" ? payoutStatusLabel(t) : v === "disputes" ? disputeCaseStatusLabel(t) : v === "quests" ? questStateLabel(t) : v === "reports" || v === "conduct-reports" ? reportCaseStatusLabel(t) : v === "users" ? memberStatusLabel(t) : v === "wallets" ? walletStatusLabel(t) : t; return `<button class="tab ${state.tab === t.toLowerCase() ? "active" : ""}" data-tab="${t.toLowerCase()}" data-filter-value="${escapeActivityText(t)}">${escapeActivityText(label)}${t === "All" ? ` (${rows.length})` : ""}</button>`; }).join("")}</div><div class="toolbar"><div class="inline-search"><input id="resource-search" value="${state.query}" placeholder="⌕  Search ${v}…"></div><span class="count">${filtered.length} results</span></div>${filtered.length ? table(v, filtered) : '<div class="empty"><h3>No matching records</h3><p>Try changing your search or selected view.</p></div>'}</section>`;
  bind();
};
export function setRenderResource(renderer: (view: string) => void): void {
  renderResource = renderer;
}
function table(v: string, rows: LegacyRecord[]): string {
  if (v === "reports" || v === "conduct-reports") {
    const isConductReport = v === "conduct-reports";
    return `<div class="table-wrap"><table class="data report-table"><caption>${isConductReport ? "Conduct Reports" : "Report Cases"}</caption><thead><tr>${isConductReport ? "<th>Conduct report</th><th>Quest</th><th>Reported member</th><th>Reported by</th><th>Reason</th>" : "<th>Report</th><th>Reported user</th><th>Submitted by</th><th>Report type</th>"}<th>Status</th><th>Reported</th></tr></thead><tbody>${rows.map((r) => `<tr data-open="${v}:${recordsFor(v).indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong></td>${isConductReport ? `<td><strong>${escapeActivityText(String(r.relatedQuestTitle || r.title || "Quest not recorded"))}</strong></td><td><strong>${escapeActivityText(r.reportedUserName)}</strong><small>${escapeActivityText(r.reportedUserId)}</small></td><td><strong>${escapeActivityText(r.reporterName)}</strong><small>${escapeActivityText(r.reporterId)}</small></td><td>${escapeActivityText(r.category)}</td>` : `<td><strong>${escapeActivityText(r.reportedUserName)}</strong><small>${escapeActivityText(r.reportedUserId)}</small></td><td><strong>${escapeActivityText(r.reporterName)}</strong><small>${escapeActivityText(r.reporterId)}</small></td><td>${escapeActivityText(r.category)}</td>`}<td>${badge(statusForView(v, r), r.tone || "warning")}</td><td>${escapeActivityText(r.reportedAt)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  if (v === "users") {
    const collection = recordsFor(v);
    return `<div class="table-wrap"><table class="data"><caption>Users</caption><thead><tr><th scope="col">Student ID</th><th scope="col">User</th><th scope="col">Email</th><th scope="col">Academic profile</th><th scope="col">Status</th></tr></thead><tbody>${rows.map((r) => `<tr data-open="${v}:${collection.indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong></td><td><strong>${escapeActivityText(r.title)}</strong></td><td>${escapeActivityText(r.person)}</td><td>${escapeActivityText(r.other)}</td><td>${statusBadgeForView(v, r)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  if (v === "wallets") {
    const collection = recordsFor(v);
    return `<div class="table-wrap"><table class="data"><caption>Wallets</caption><thead><tr><th scope="col">Wallet / Member ID</th><th scope="col">Member</th><th scope="col">Email</th><th scope="col">Wallet status</th><th scope="col">Created</th></tr></thead><tbody>${rows.map((r) => `<tr data-open="${v}:${collection.indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong></td><td><strong>${escapeActivityText(r.title)}</strong></td><td>${escapeActivityText(r.person)}</td><td>${statusBadgeForView(v, r)}</td><td>${escapeActivityText(String(r.accountCreatedAt || "—"))}</td></tr>`).join("")}</tbody></table></div>`;
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
  return `<div class="table-wrap"><table class="data"><thead><tr>${h.map((x) => `<th>${escapeActivityText(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr data-open="${v}:${collection.indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong></td><td><strong>${escapeActivityText(r.title)}</strong>${v === "disputes" ? `<small>${escapeActivityText(r.detail).slice(0, 45)}…</small>` : ""}</td>${v === "disputes" ? "" : `<td><strong>${escapeActivityText(r.person)}</strong></td>`}${v === "disputes" || v === "payouts" ? "" : `<td>${escapeActivityText(r.other)}</td>`}${v === "disputes" ? `<td class="money">${disputeAmountCell(r)}</td>` : r.amount !== null ? `<td class="money">฿${fmt(r.amount)}</td>` : ""}<td>${statusBadgeForView(v, r)}${v === "quests" && hasHiddenQuestOverlay(r) ? '<span class="badge neutral quest-hidden-overlay">Hidden</span>' : ""}</td>${v === "disputes" ? `<td>${escapeActivityText(r.disputeDate || "—")}</td><td><strong>${escapeActivityText(disputeTypeLabel(r))}</strong></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

function disputeAmountText(record: LegacyRecord): string {
  if (typeof record.amount === "number") return `฿${fmt(record.amount)}`;
  if (record.mockDisputeData) return `฿${fmt(record.mockDisputeData.amountBaht)} · Mock data`;
  return "Not provided by the Admin API";
}

function disputeAmountCell(record: LegacyRecord): string {
  return escapeActivityText(disputeAmountText(record));
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
let activityRequestId = 0;

type ActivityLogFilters = {
  action: string;
  resourceType: string;
  resourceId: string;
  adminId: string;
  sort: "newest" | "oldest";
};

function emptyActivityLogFilters(): ActivityLogFilters {
  return { action: "", resourceType: "", resourceId: "", adminId: "", sort: "newest" };
}

let activityLogEntries: ActivityLogEntry[] = [];
let activityLogNextCursor: string | null = null;
let activityLogLoading = false;
let activityLogError = "";
let activityLogSearch = "";
let activityLogFilters = emptyActivityLogFilters();

function activityLogDisplayValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
}

function activityLogMainValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function activityLogTimestampAttribute(value: string | null): string {
  return value ? ` datetime="${escapeActivityText(value)}"` : "";
}

function activityLogEntriesForDisplay(): ActivityLogEntry[] {
  return activityLogEntries.filter((entry) => activityLogMatchesSearch(entry, activityLogSearch));
}

function activityLogTargetLabel(entry: ActivityLogEntry): string {
  const resourceType = activityLogMainValue(entry.resourceType);
  const resourceId = activityLogMainValue(entry.resourceId);
  return !resourceType && !resourceId
    ? ""
    : [resourceType, resourceId].filter(Boolean).join(" · ");
}

function activityLogTable(): string {
  const entries = activityLogEntriesForDisplay();
  if (activityLogError) return "";
  if (activityLogLoading && !entries.length) {
    return '<div class="empty activity-log-empty"><h3>Loading activity</h3><p>Reading the Admin API.</p></div>';
  }
  if (!entries.length) {
    return '<div class="empty activity-log-empty"><h3>No activity recorded</h3><p>Administrative activity will appear here as actions are taken.</p></div>';
  }
  return `<div class="table-wrap activity-log-table-wrap"><table class="data activity-log-table"><caption>Activity Log records</caption><thead><tr><th scope="col">Timestamp</th><th scope="col">Actor</th><th scope="col">Activity</th><th scope="col">Target</th><th scope="col">Reason</th><th scope="col">Details</th></tr></thead><tbody>${entries.map((entry) => {
    const targetHref = activityTargetHref(entry.resourceType, entry.resourceId);
    const target = activityLogTargetLabel(entry);
    const targetMarkup = targetHref
      ? `<a class="activity-log-target" href="${escapeActivityText(targetHref)}">${escapeActivityText(target)}</a>`
      : `<span class="activity-log-target">${escapeActivityText(target)}</span>`;
    const timestamp = activityLogMainValue(entry.createdAt);
    const timestampMarkup = timestamp ? `<time${activityLogTimestampAttribute(entry.createdAt)}>${escapeActivityText(formatActivityLogTimestamp(entry.createdAt))}<small>${escapeActivityText(formatActivityLogRelativeTime(entry.createdAt))}</small></time>` : "";
    const adminIdMarkup = entry.adminId ? `<small>${escapeActivityText(entry.adminId)}</small>` : "";
    return `<tr><td>${timestampMarkup}</td><td><span class="activity-log-actor"><span class="avatar">${escapeActivityText(entry.adminInitials)}</span><span><strong>${escapeActivityText(entry.adminName)}</strong>${adminIdMarkup}</span></span></td><td><strong class="activity-log-action">${escapeActivityText(activityLogMainValue(entry.action))}</strong></td><td>${targetMarkup}</td><td>${escapeActivityText(activityLogMainValue(entry.reasonCode))}</td><td><button class="btn activity-log-detail-button" type="button" data-activity-open="${escapeActivityText(entry.id)}" aria-label="View activity details">View</button></td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function activityLogStatus(): string {
  if (activityLogLoading) return '<p class="activity-log-status" role="status" aria-live="polite">Loading activity</p>';
  if (activityLogError) return `<div class="activity-log-error" role="alert"><strong>Activity log is not available</strong><p>${escapeActivityText(activityLogError)}</p>${isAdminApiEnabled() ? '<button class="btn" type="button" id="activity-retry">Try again</button>' : ""}</div>`;
  return `<p class="activity-log-status" role="status" aria-live="polite">${activityLogEntriesForDisplay().length} loaded entries</p>`;
}

function activityLogPagination(): string {
  if (!activityLogNextCursor) return "";
  return `<div class="activity-log-pagination"><button class="btn" type="button" id="activity-load-more"${activityLogLoading ? " disabled" : ""}>Load more</button></div>`;
}

function renderActivityLogRecords(): void {
  const records = main.querySelector<HTMLElement>("#activity-records");
  const status = main.querySelector<HTMLElement>("#activity-status");
  const pagination = main.querySelector<HTMLElement>("#activity-pagination");
  const count = main.querySelector<HTMLElement>("#activity-count");
  if (records) records.innerHTML = activityLogTable();
  if (status) status.innerHTML = activityLogStatus();
  if (pagination) pagination.innerHTML = activityLogPagination();
  if (count) count.textContent = `${activityLogEntriesForDisplay().length} loaded entries`;
  main.querySelectorAll<HTMLButtonElement>("[data-activity-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = activityLogEntries.find((candidate) => candidate.id === button.dataset.activityOpen);
      if (entry) openActivityLogEntry(entry);
    });
  });
  main.querySelector<HTMLButtonElement>("#activity-load-more")?.addEventListener("click", () => {
    void loadActivityLogPage(true);
  });
  main.querySelector<HTMLButtonElement>("#activity-retry")?.addEventListener("click", () => {
    void loadActivityLogPage(Boolean(activityLogEntries.length));
  });
}

function activityLogDetailField(label: string, value: string | number | null | undefined): string {
  return `<div class="fact"><span>${escapeActivityText(label)}</span><strong>${escapeActivityText(activityLogDisplayValue(value))}</strong></div>`;
}

function openActivityLogEntry(entry: ActivityLogEntry): void {
  showDrawerLayer();
  const targetHref = activityTargetHref(entry.resourceType, entry.resourceId);
  const target = activityLogDisplayValue(activityLogTargetLabel(entry));
  const targetMarkup = targetHref
    ? `<a href="${escapeActivityText(targetHref)}">${escapeActivityText(target)}</a>`
    : escapeActivityText(target);
  drawer.innerHTML = `<div class="drawer-top"><div><strong>Activity log entry</strong><small>${escapeActivityText(activityLogDisplayValue(entry.action))}</small></div><button class="icon" id="close" aria-label="Close">×</button></div><div class="drawer-body activity-log-detail"><div class="drawer-title"><span class="att-icon neutral">${ico("history")}</span><div><h2>${escapeActivityText(activityLogDisplayValue(entry.action))}</h2><p>${targetMarkup}</p></div></div><div class="facts">${activityLogDetailField("Timestamp", formatActivityLogTimestamp(entry.createdAt))}${activityLogDetailField("Actor", entry.adminName)}${activityLogDetailField("Admin ID", entry.adminId)}${activityLogDetailField("Admin first name", entry.admin.firstName)}${activityLogDetailField("Admin last name", entry.admin.lastName)}${activityLogDetailField("Action", entry.action)}${activityLogDetailField("Target", target)}${activityLogDetailField("Reason code", entry.reasonCode)}</div><section class="section"><h3>Technical details</h3><div class="facts">${activityLogDetailField("Activity ID", entry.id)}${activityLogDetailField("Resource type", entry.resourceType)}${activityLogDetailField("Resource ID", entry.resourceId)}${activityLogDetailField("Reason catalog version", entry.reasonCatalogVersion)}${activityLogDetailField("Result version", entry.resultVersion)}${activityLogDetailField("Result timestamp", entry.resultTimestamp)}${activityLogDetailField("Created timestamp", entry.createdAt)}</div></section></div><div class="drawer-actions"><button class="btn" type="button" id="close-activity-log">Close</button></div>`;
  drawer.querySelector<LegacyDomElement>("#close")?.addEventListener("click", closeDrawer);
  drawer.querySelector<LegacyDomElement>("#close-activity-log")?.addEventListener("click", closeDrawer);
  scrim.onclick = closeDrawer;
}

function activityLogQuery(): Parameters<typeof adminApi.listActivityLogs>[0] {
  const query: Parameters<typeof adminApi.listActivityLogs>[0] = {
    limit: 50,
    sort: activityLogFilters.sort,
  };
  if (activityLogFilters.action) query.action = activityLogFilters.action;
  if (activityLogFilters.resourceType) query.resourceType = activityLogFilters.resourceType;
  if (activityLogFilters.resourceId) query.resourceId = activityLogFilters.resourceId;
  if (activityLogFilters.adminId) query.adminId = activityLogFilters.adminId;
  if (activityLogNextCursor) query.cursor = activityLogNextCursor;
  return query;
}

async function loadActivityLogPage(append: boolean): Promise<void> {
  const requestId = ++activityRequestId;
  activityLogLoading = true;
  activityLogError = "";
  renderActivityLogRecords();
  try {
    const page = await adminApi.listActivityLogs(activityLogQuery());
    if (requestId !== activityRequestId || state.view !== "activity") return;
    const entries = page.items.map(activityLogEntryFromApi);
    activityLogEntries = append ? [...activityLogEntries, ...entries] : entries;
    activityLogNextCursor = page.nextCursor;
    activityLogLoading = false;
    renderActivityLogRecords();
  } catch (error: unknown) {
    if (requestId !== activityRequestId || state.view !== "activity") return;
    activityLogLoading = false;
    activityLogError = error instanceof Error ? error.message : "The Admin API is unavailable.";
    renderActivityLogRecords();
  }
}

export function renderActivity() {
  const useApi = isAdminApiEnabled();
  activityRequestId += 1;
  activityLogEntries = [];
  activityLogNextCursor = null;
  activityLogLoading = useApi;
  activityLogError = useApi ? "" : "The Admin API is required to display this read-only log.";
  activityLogSearch = "";
  activityLogFilters = emptyActivityLogFilters();
  main.innerHTML = `${pageHead(...heads.activity, '<button class="btn">Export CSV</button>')}<section class="panel resource activity-log-panel"><form class="activity-log-filters" id="activity-log-filters"><div class="activity-filter-grid"><label for="activity-action-filter">Action filter<input id="activity-action-filter" type="search"></label><label for="activity-resource-type-filter">Resource type filter<input id="activity-resource-type-filter" type="search"></label><label for="activity-resource-id-filter">Resource ID filter<input id="activity-resource-id-filter" type="search"></label><label for="activity-admin-id-filter">Admin ID filter<input id="activity-admin-id-filter" type="search"></label><label for="activity-sort">Sort activity<select id="activity-sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div><div class="activity-filter-actions"><button class="btn primary" type="submit">Apply filters</button><button class="btn" type="button" id="activity-clear-filters">Clear filters</button></div></form><div class="toolbar"><div class="inline-search"><label class="visually-hidden" for="activity-search">Search loaded activity</label><input id="activity-search" type="search" placeholder="Search loaded activity"></div><span class="count" id="activity-count"></span></div><div id="activity-status"></div><div id="activity-records"></div><div id="activity-pagination"></div></section>`;
  bind();
  const filterForm = main.querySelector<HTMLFormElement>("#activity-log-filters");
  const activitySearch = main.querySelector<HTMLInputElement>("#activity-search");
  const count = main.querySelector<HTMLElement>("#activity-count");
  const syncSearch = (): void => {
    activityLogSearch = activitySearch?.value || "";
    if (count) count.textContent = `${activityLogEntriesForDisplay().length} loaded entries`;
    renderActivityLogRecords();
  };
  activitySearch?.addEventListener("input", syncSearch);
  filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    activityLogFilters = {
      action: main.querySelector<HTMLInputElement>("#activity-action-filter")?.value.trim() || "",
      resourceType: main.querySelector<HTMLInputElement>("#activity-resource-type-filter")?.value.trim() || "",
      resourceId: main.querySelector<HTMLInputElement>("#activity-resource-id-filter")?.value.trim() || "",
      adminId: main.querySelector<HTMLInputElement>("#activity-admin-id-filter")?.value.trim() || "",
      sort: main.querySelector<HTMLSelectElement>("#activity-sort")?.value === "oldest" ? "oldest" : "newest",
    };
    activityLogNextCursor = null;
    activityLogEntries = [];
    activityLogSearch = activitySearch?.value || "";
    if (useApi) void loadActivityLogPage(false);
    else {
      activityLogLoading = false;
      renderActivityLogRecords();
    }
  });
  main.querySelector<HTMLButtonElement>("#activity-clear-filters")?.addEventListener("click", () => {
    activityLogFilters = emptyActivityLogFilters();
    filterForm?.reset();
    activityLogNextCursor = null;
    activityLogEntries = [];
    if (useApi) void loadActivityLogPage(false);
    else renderActivityLogRecords();
  });
  activityLogEntries = [];
  renderActivityLogRecords();
  if (useApi) void loadActivityLogPage(false);
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
  if (v === "home") {
    state.view = "home";
    setActiveNavigation(state.view);
    if (window.__KUQUEST_NEXT_NAVIGATE__) {
      window.__KUQUEST_NEXT_NAVIGATE__(nextUrl);
      return;
    }
    location.assign(nextUrl);
    return;
  }
  history.replaceState(null, "", nextUrl);
  state.view = v;
  state.tab = "all";
  state.query = "";
  if (isAdminApiEnabled() && ["payouts", "quests", "disputes", "users", "wallets"].includes(v)) {
    const refresh = v === "quests"
      ? refreshLiveQuests()
      : v === "payouts"
        ? refreshLivePayouts()
        : v === "disputes"
          ? refreshLiveDisputes()
        : v === "users"
          ? refreshLiveMembers()
          : refreshLiveWallets();
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
  return `<div class="payout-previous-list">${previous.map((payout) => `<div class="payout-previous-row"><span><strong>${escapeActivityText(payout.id)}</strong><small>${escapeActivityText(payout.requestedAt || "Date not recorded")}</small></span><span><strong>฿${fmt(payout.amount)}</strong>${payoutBadge(payout.payoutStatus ?? payout.status, payout.tone)}</span></div>`).join("")}</div>`;
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
  return `<section class="section user-moderation"><h3>Moderation</h3><div class="user-context-list"><div><span>Wallet Status</span>${badge(walletStatusFor(user.walletStatus ?? user.status), user.tone)}</div><div><span>Confirmed violations</span><strong>${confirmedViolations}</strong></div><div><span>Next outcome</span><strong>${escapeActivityText(penaltyOutcomeLabel(nextOutcome))}</strong></div>${exemption ? `<div><span>Red Flag exemption</span><strong>${exemption.remaining} remaining (${escapeActivityText(exemption.label)})</strong></div>` : ""}<div><span>Reason</span><strong>${escapeActivityText(reason)}</strong></div>${activeModeration ? `<div><span>Applied</span><strong>${escapeActivityText(appliedAt)}</strong></div><div><span>By</span><strong>${escapeActivityText(appliedBy)}</strong></div>${(penaltyLabel === "Temporary ban" || penaltyLabel === "Red Flag") && expiresAt ? `<div><span>Expires</span><strong>${escapeActivityText(expiresAt)}</strong></div>` : ""}` : ""}</div></section>`;
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
function openReportDrawer(index: number, view: "reports" | "conduct-reports" = "reports"): void {
  const report = recordsFor(view)[index];
  if (!report) return;
  const isConductReport = view === "conduct-reports";
  showDrawerLayer();
  const status = reportCaseStatusFor(report.reportCaseStatus ?? report.conductReportStatus ?? report.status, report.decision),
    isClosed = !isReportCasePending(status);
  drawer.innerHTML = `<div class="drawer-top"><div><strong>${report.id}</strong><small>${isConductReport ? "Conduct report" : "Report Case"}</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body report-record ${isClosed ? "closed-record" : "open-record"}"><div class="drawer-title"><span class="att-icon ${isClosed ? "neutral" : "warning"}">${ico("flag")}</span><div><h2>${isConductReport ? escapeActivityText(report.category) : `Report against ${escapeActivityText(report.reportedUserName)}`}</h2><p>${isConductReport ? `Quest: ${escapeActivityText(String(report.relatedQuestTitle || report.title || "Not recorded"))}` : `Submitted by ${escapeActivityText(report.reporterName)}`}</p></div></div><div class="case-alert"><span>${ico("flag")}</span><div><strong>${isClosed ? `${isConductReport ? "Conduct report" : "Report"} decision recorded` : `${isConductReport ? "Open conduct report" : "Open report"} — review is required`}</strong><p>${isClosed ? "This record is retained as a read-only audit record." : "Review the submitted details and evidence before closing this record."}</p></div></div><section class="section"><h3>${isConductReport ? "Conduct report overview" : "Report overview"}</h3><div class="facts"><div class="fact"><span>Status</span>${badge(status, report.tone || (isClosed ? "neutral" : "warning"))}</div><div class="fact"><span>${isConductReport ? "Reason" : "Report type"}</span><strong>${escapeActivityText(report.category)}</strong></div><div class="fact"><span>Reported</span><strong>${escapeActivityText(report.reportedAt)}</strong></div></div></section><section class="section"><h3>Report detail</h3><p>${escapeActivityText(report.details)}</p></section><section class="section"><h3>People involved</h3><div class="facts"><div class="fact"><span>${isConductReport ? "Reported member" : "Reported user"}</span><strong>${escapeActivityText(report.reportedUserName)}</strong><small>${escapeActivityText(report.reportedUserId)}</small></div><div class="fact"><span>Reported by</span><strong>${escapeActivityText(report.reporterName)}</strong><small>${escapeActivityText(report.reporterId)}</small></div></div></section><section class="section"><h3>Evidence</h3>${report.evidence?.[0] && report.evidenceRefs?.[0] ? `<button class="evidence-item" data-report-evidence data-evidence-ref="${escapeActivityText(report.evidenceRefs[0])}"><span class="evidence-state">${ico("check")}</span><span><strong>${escapeActivityText(report.evidence[0])}</strong><small>Attached by ${escapeActivityText(report.reporterName)}</small></span><span>Open</span></button>` : '<p class="audit-note">No Evidence Reference was provided.</p>'}</section>${isClosed && report.decisionReason ? `<section class="section"><h3>Closing note</h3><p>${escapeActivityText(report.decisionReason)}</p></section>` : ""}</div><div class="drawer-actions"><a class="btn" href="/reports/${encodeURIComponent(report.id)}">Full report detail</a><button class="btn" id="close-report-record">Close record</button>${isClosed ? "" : '<a class="btn primary" href="/reports/' + encodeURIComponent(report.id) + '">Review report</a>'}</div>`;
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

function walletAmount(value: unknown): string {
  return typeof value === "number" ? `฿${fmt(value / 100)}` : "Not provided by the Admin API";
}

function walletHistorySection(wallet: LegacyRecord): string {
  const history = Array.isArray(wallet.walletStatusHistory)
    ? wallet.walletStatusHistory as LegacyHistoryEntry[]
    : [];
  if (!history.length) return "";
  return `<section class="section"><h3>Status history</h3><div class="payout-audit-list">${history.map((entry) => `<div><span>${escapeActivityText(entry.at)}</span><strong>${escapeActivityText(entry.newStatus || entry.event || "Not recorded")}</strong>${entry.previousStatus ? `<small>${escapeActivityText(entry.previousStatus)} → ${escapeActivityText(entry.newStatus || "Not recorded")}</small>` : ""}${entry.reason ? `<small>${escapeActivityText(entry.reason)}</small>` : ""}</div>`).join("")}</div></section>`;
}

function walletVerificationSection(wallet: LegacyRecord): string {
  const verification = wallet.walletVerification;
  if (!verification) return "";
  const snapshot = (label: string, balance: typeof verification.projected): string =>
    `<div><strong>${escapeActivityText(label)}</strong><span>Spending ${walletAmount(balance.spendingBalanceSatang)} · Earnings ${walletAmount(balance.earningsBalanceSatang)} · Funding reserved ${walletAmount(balance.fundingReservedSatang)} · Payout reserved ${walletAmount(balance.reservedForPayoutsSatang)}</span></div>`;
  return `<section class="section"><h3>Ledger verification</h3><p>${verification.matches ? "Wallet projection matches the Ledger." : "Wallet projection does not match the Ledger."}</p><p>${verification.activityCountMatches ? "Wallet activity count matches." : "Wallet activity count does not match."}</p><div class="user-context-list">${snapshot("Projected balance", verification.projected)}${snapshot("Ledger balance", verification.ledger)}</div></section>`;
}

type WalletStatementViewState = {
  transactions: WalletStatementTransaction[];
  balanceTransactions: WalletStatementTransaction[];
  balanceNextCursor: string | null;
  nextCursor: string | null;
  visibleCount: number;
  loading: boolean;
  error: string;
  filters: WalletStatementFilters;
  requestId: number;
};

function walletStatementMoney(value: number): string {
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}฿${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value) / 100)}`;
}

function walletStatementBalance(value: number): string {
  return `฿${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)}`;
}

function walletBalancesFromRecord(wallet: LegacyRecord): WalletBalances {
  const numberOrZero = (value: unknown): number => typeof value === "number" ? value : 0;
  return {
    spendingBalanceSatang: numberOrZero(wallet.walletSpendingBalanceSatang),
    earningsBalanceSatang: numberOrZero(wallet.walletEarningsBalanceSatang),
    fundingReservedSatang: numberOrZero(wallet.walletFundingReservedSatang),
    reservedForPayoutsSatang: numberOrZero(wallet.walletReservedForPayoutsSatang),
  };
}

function walletStatementDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })} ICT`;
}

function walletStatementApiDate(value: string, endOfDay: boolean): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`;
}

function walletCompartmentLabel(accountType: string): string {
  const labels: Record<string, string> = {
    SPENDING: "Spending Balance",
    EARNINGS: "Earnings Balance",
    FUNDING_RESERVED: "Funding Reserved",
    RESERVED_FOR_PAYOUTS: "Reserved For Payouts",
  };
  return labels[accountType] || accountType;
}

function walletStatementRowsFor(
  wallet: LegacyRecord,
  statementState: WalletStatementViewState,
): WalletStatementRow[] {
  const visibleTransactions = filterWalletStatementTransactions(
    statementState.transactions,
    statementState.filters,
  );
  const visibleIds = new Set(visibleTransactions.map((transaction) => transaction.id));
  return walletStatementRows(
    statementState.balanceTransactions,
    typeof wallet.walletId === "string" ? wallet.walletId : wallet.id,
    walletBalancesFromRecord(wallet),
  ).filter((row) => visibleIds.has(row.transaction.id)).slice(0, statementState.visibleCount);
}

function walletStatementTable(rows: WalletStatementRow[]): string {
  if (!rows.length) {
    return '<div class="empty"><h4>No Ledger Transactions</h4><p>No sealed Ledger Transactions match these filters.</p></div>';
  }
  return `<div class="table-wrap" role="region" aria-label="Wallet Statement table"><table class="data wallet-statement-table"><caption>Wallet Statement</caption><thead><tr><th scope="col">Date</th><th scope="col">Event type</th><th scope="col">Signed amount</th><th scope="col">Compartment movement</th><th scope="col">Resulting Wallet balance</th></tr></thead><tbody>${rows.map((row) => {
    const dateLabel = walletStatementDateTime(row.transaction.createdAt);
    const movement = row.movement.map((item) => `<span>${escapeActivityText(walletCompartmentLabel(item.accountType))}: ${escapeActivityText(walletStatementMoney(item.amountSatang))}</span>`).join("");
    return `<tr><td><time datetime="${escapeActivityText(row.transaction.createdAt)}">${escapeActivityText(dateLabel)}</time>${row.transaction.description ? `<small>${escapeActivityText(row.transaction.description)}</small>` : ""}</td><td><strong>${escapeActivityText(row.transaction.eventType)}</strong>${row.transaction.businessReference ? `<small>${escapeActivityText(row.transaction.businessReference)}</small>` : ""}</td><td class="money">${escapeActivityText(walletStatementMoney(row.signedAmountSatang))}</td><td class="wallet-statement-movement">${movement}</td><td class="money">${escapeActivityText(walletStatementBalance(row.resultingWalletBalanceSatang))}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function walletStatementHasBalanceCoverage(
  transactions: readonly WalletStatementTransaction[],
  oldestCreatedAt: string,
): boolean {
  const cutoff = Date.parse(oldestCreatedAt);
  return !Number.isFinite(cutoff) || transactions.some((transaction) => {
    const timestamp = Date.parse(transaction.createdAt);
    return Number.isFinite(timestamp) && timestamp <= cutoff;
  });
}

async function loadWalletStatementBalanceCoverage(
  walletId: string,
  statementState: WalletStatementViewState,
  oldestCreatedAt: string | undefined,
  requestId: number,
): Promise<void> {
  if (!oldestCreatedAt || walletStatementHasBalanceCoverage(statementState.balanceTransactions, oldestCreatedAt)) return;
  while (statementState.balanceNextCursor && requestId === statementState.requestId) {
    const page = await loadLiveWalletStatement(walletId, {
      limit: 25,
      cursor: statementState.balanceNextCursor,
    });
    if (requestId !== statementState.requestId) return;
    const unique = new Map([...statementState.balanceTransactions, ...page.items].map((transaction) => [transaction.id, transaction]));
    statementState.balanceTransactions = [...unique.values()];
    statementState.balanceNextCursor = page.nextCursor;
    if (walletStatementHasBalanceCoverage(statementState.balanceTransactions, oldestCreatedAt)) return;
  }
}

function walletStatementSection(
  wallet: LegacyRecord,
  statementState: WalletStatementViewState,
): string {
  const rows = walletStatementRowsFor(wallet, statementState);
  const eventOptions = ADMIN_LEDGER_EVENT_TYPES.map((eventType) => `<option value="${eventType}"${statementState.filters.eventType === eventType ? " selected" : ""}>${eventType}</option>`).join("");
  const canLoadMore = wallet.apiBacked
    ? Boolean(statementState.nextCursor)
    : filterWalletStatementTransactions(statementState.transactions, statementState.filters).length > statementState.visibleCount;
  return `<section class="section wallet-statement" data-wallet-statement><h3>Wallet Statement</h3><p>Committed and sealed Ledger Transactions, newest first.</p><form class="wallet-statement-filters" data-wallet-statement-filter><label>Event type<select name="eventType"><option value="">All event types</option>${eventOptions}</select></label><label>From ICT date<input name="from" type="date" value="${escapeActivityText(statementState.filters.from)}"></label><label>To ICT date<input name="to" type="date" value="${escapeActivityText(statementState.filters.to)}"></label><button class="btn primary" type="submit">Apply filters</button><button class="btn" type="button" data-wallet-statement-action="clear">Clear</button></form><div aria-live="polite" data-wallet-statement-content>${statementState.loading ? '<div class="empty"><h4>Loading Wallet Statement</h4><p>Reading sealed Ledger Transactions.</p></div>' : walletStatementTable(rows)}${statementState.error ? `<p class="audit-note">${escapeActivityText(statementState.error)}</p>` : ""}</div>${canLoadMore ? `<button class="btn wallet-statement-load-more" type="button" data-wallet-statement-action="load-more"${statementState.loading ? " disabled" : ""}>Load more</button>` : ""}</section>`;
}

function bindWalletStatement(
  wallet: LegacyRecord,
  statementState: WalletStatementViewState,
): (append: boolean) => Promise<void> {
  const renderStatement = (): void => {
    const current = drawer.querySelector<LegacyDomElement>("[data-wallet-statement]");
    if (!current) return;
    current.outerHTML = walletStatementSection(wallet, statementState);
    bindWalletStatement(wallet, statementState);
  };
  const loadPage = async (append: boolean): Promise<void> => {
    if (!wallet.apiBacked) return;
    const requestId = ++statementState.requestId;
    statementState.loading = true;
    statementState.error = "";
    wallet.walletStatementLoading = true;
    renderStatement();
    try {
      const page = await loadLiveWalletStatement(wallet.walletId || wallet.id, {
        eventType: statementState.filters.eventType
          ? statementState.filters.eventType as AdminLedgerEventType
          : undefined,
        from: walletStatementApiDate(statementState.filters.from, false),
        to: walletStatementApiDate(statementState.filters.to, true),
        limit: 25,
        cursor: append ? statementState.nextCursor || undefined : undefined,
      });
      if (requestId !== statementState.requestId) return;
      const existing = append ? statementState.transactions : [];
      const unique = new Map([...existing, ...page.items].map((transaction) => [transaction.id, transaction]));
      statementState.transactions = [...unique.values()];
      const balanceUnique = new Map([...statementState.balanceTransactions, ...page.items].map((transaction) => [transaction.id, transaction]));
      statementState.balanceTransactions = [...balanceUnique.values()];
      const unfiltered = !statementState.filters.eventType && !statementState.filters.from && !statementState.filters.to;
      if (unfiltered) statementState.balanceNextCursor = page.nextCursor;
      const oldestCreatedAt = statementState.transactions
        .toSorted((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt))
        .at(0)?.createdAt;
      if (!unfiltered) {
        await loadWalletStatementBalanceCoverage(
          wallet.walletId || wallet.id,
          statementState,
          oldestCreatedAt,
          requestId,
        );
      }
      statementState.nextCursor = page.nextCursor;
      statementState.loading = false;
      wallet.walletStatement = statementState.transactions;
      wallet.walletStatementBalanceTransactions = statementState.balanceTransactions;
      wallet.walletStatementBalanceNextCursor = statementState.balanceNextCursor;
      wallet.walletStatementNextCursor = statementState.nextCursor;
      wallet.walletStatementLoaded = true;
      delete wallet.walletStatementError;
      if (!wallet.walletLatestTransactionAt
        && !statementState.filters.eventType
        && !statementState.filters.from
        && !statementState.filters.to) {
        wallet.walletLatestTransactionAt = latestWalletTransactionDate(statementState.transactions);
      }
    } catch (error: unknown) {
      if (requestId !== statementState.requestId) return;
      statementState.loading = false;
      statementState.error = error instanceof Error ? error.message : "Wallet Statement is not available.";
      wallet.walletStatementError = statementState.error;
    } finally {
      if (requestId === statementState.requestId) {
        wallet.walletStatementLoading = false;
        renderStatement();
      }
    }
  };
  const section = drawer.querySelector<LegacyDomElement>("[data-wallet-statement]");
  const form = section?.querySelector<HTMLFormElement>("[data-wallet-statement-filter]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    statementState.filters = {
      eventType: String(formData.get("eventType") || ""),
      from: String(formData.get("from") || ""),
      to: String(formData.get("to") || ""),
    };
    statementState.visibleCount = 25;
    statementState.error = "";
    if (wallet.apiBacked) {
      statementState.transactions = [];
      statementState.nextCursor = null;
      wallet.walletStatementLoaded = false;
      void loadPage(false);
    } else {
      renderStatement();
    }
  });
  section?.querySelector<LegacyDomElement>('[data-wallet-statement-action="clear"]')?.addEventListener("click", () => {
    statementState.filters = { eventType: "", from: "", to: "" };
    statementState.visibleCount = 25;
    statementState.error = "";
    if (wallet.apiBacked) {
      statementState.transactions = [];
      statementState.nextCursor = null;
      wallet.walletStatementLoaded = false;
      void loadPage(false);
    } else {
      renderStatement();
    }
  });
  section?.querySelector<LegacyDomElement>('[data-wallet-statement-action="load-more"]')?.addEventListener("click", () => {
    statementState.visibleCount += 25;
    if (wallet.apiBacked) void loadPage(true);
    else renderStatement();
  });
  return loadPage;
}

function openWalletDrawer(index: number): void {
  const wallet = recordsFor("wallets")[index];
  if (!wallet) return;
  showDrawerLayer();
  const walletActions = wallet.apiBacked
    ? `<button class="btn" data-wallet-action="verify">Verify Ledger</button><button class="btn primary" data-wallet-action="rebuild">Rebuild projection</button>`
    : "";
  const statementState: WalletStatementViewState = {
    transactions: Array.isArray(wallet.walletStatement) ? wallet.walletStatement : [],
    balanceTransactions: Array.isArray(wallet.walletStatementBalanceTransactions)
      ? wallet.walletStatementBalanceTransactions
      : Array.isArray(wallet.walletStatement)
        ? wallet.walletStatement
        : [],
    balanceNextCursor: wallet.walletStatementBalanceNextCursor || null,
    nextCursor: wallet.walletStatementNextCursor || null,
    visibleCount: 25,
    loading: Boolean(wallet.walletStatementLoading),
    error: wallet.walletStatementError || "",
    filters: { eventType: "", from: "", to: "" },
    requestId: 0,
  };
  drawer.innerHTML = `<div class="drawer-top"><strong>${escapeActivityText(wallet.id)}</strong><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body"><div class="drawer-title"><span class="att-icon ${toneClass(wallet.tone)}">${ico("wallet")}</span><div><h2>${escapeActivityText(wallet.title)}</h2><p>${escapeActivityText(wallet.person)} · ${escapeActivityText(wallet.other)}</p></div></div><div class="facts"><div class="fact"><span>Status</span>${statusBadgeForView("wallets", wallet)}</div><div class="fact"><span>Total balance</span><strong>${walletAmount(wallet.walletTotalBalanceSatang ?? (wallet.amount === null ? undefined : Number(wallet.amount) * 100))}</strong></div><div class="fact"><span>Wallet record</span><strong>${escapeActivityText(wallet.id)}</strong></div></div><section class="section"><h3>Wallet balances</h3><div class="user-context-list"><div><span>Spending Balance</span><strong>${walletAmount(wallet.walletSpendingBalanceSatang)}</strong></div><div><span>Earnings Balance</span><strong>${walletAmount(wallet.walletEarningsBalanceSatang)}</strong></div><div><span>Funding Reserved</span><strong>${walletAmount(wallet.walletFundingReservedSatang)}</strong></div><div><span>Reserved For Payouts</span><strong>${walletAmount(wallet.walletReservedForPayoutsSatang)}</strong></div></div></section>${typeof wallet.walletProjectionMatchesLedger === "boolean" ? `<section class="section"><h3>Ledger check</h3><p>${wallet.walletProjectionMatchesLedger ? "Wallet projection matches the Ledger." : "Wallet projection does not match the Ledger."}</p></section>` : ""}${walletVerificationSection(wallet)}${walletHistorySection(wallet)}</div><div class="drawer-actions">${walletActions}<a class="btn" href="/users/${encodeURIComponent(String(wallet.memberId || ""))}">See full Member profile</a><button class="btn" id="close-wallet-record">Close record</button></div>`;
  const currentBalances = walletBalancesFromRecord(wallet);
  const currentBalanceSatang = currentWalletBalance(currentBalances);
  const currentBalanceFact = [...drawer.querySelectorAll<LegacyDomElement>(".fact")].find((fact) => fact.querySelector("span")?.textContent === "Total balance");
  if (currentBalanceFact) {
    const label = currentBalanceFact.querySelector("span");
    const value = currentBalanceFact.querySelector("strong");
    if (label) label.textContent = "Current Wallet Balance";
    if (value) value.textContent = walletStatementBalance(currentBalanceSatang);
  }
  const statementHost = document.createElement("div");
  statementHost.innerHTML = walletStatementSection(wallet, statementState);
  const statementSection = statementHost.firstElementChild;
  if (statementSection) drawer.querySelector<LegacyDomElement>(".drawer-body")?.append(statementSection);
  const loadStatementPage = bindWalletStatement(wallet, statementState);
  if (wallet.apiBacked && !wallet.walletStatementLoaded && !wallet.walletStatementLoading) void loadStatementPage(false);
  drawer.querySelector<LegacyDomElement>("#close")?.addEventListener("click", closeDrawer);
  scrim.onclick = closeDrawer;
  drawer.querySelector<LegacyDomElement>("#close-wallet-record")?.addEventListener("click", closeDrawer);
  drawer.querySelector<LegacyDomElement>('[data-wallet-action="verify"]')?.addEventListener("click", () => {
    const button = drawer.querySelector<HTMLButtonElement>('[data-wallet-action="verify"]');
    if (button) button.disabled = true;
    void verifyLiveWallet(wallet).then(() => {
      if (drawer.classList.contains("open") && recordsFor("wallets")[index] === wallet) openWalletDrawer(index);
      toast(`Ledger verification completed for ${wallet.id}.`);
    }).catch((error: unknown) => {
      wallet.walletVerificationError = error instanceof Error ? error.message : "Request failed.";
      toast(`Ledger verification failed: ${wallet.walletVerificationError}`);
      if (button) button.disabled = false;
    });
  });
  drawer.querySelector<LegacyDomElement>('[data-wallet-action="rebuild"]')?.addEventListener("click", () => {
    const walletId = typeof wallet.walletId === "string" ? wallet.walletId : wallet.id;
    confirmAction("Rebuild wallet projection", wallet, "Rebuild this Wallet projection from the Ledger source of truth.", () => {
      void adminCommands.rebuildWalletProjection(walletId).then(() => {
        persistAdminData();
        render();
        openWalletDrawer(index);
        toast(`Wallet projection rebuilt for ${wallet.id}.`);
      }).catch((error: unknown) => {
        toast(`Wallet projection rebuild failed: ${error instanceof Error ? error.message : "Request failed."}`);
      });
    });
  });
  if (wallet.apiBacked && !wallet.walletDetailLoaded) {
    void hydrateLiveWallet(wallet).then(() => {
      if (drawer.classList.contains("open") && recordsFor("wallets")[index] === wallet) openWalletDrawer(index);
    });
  }
}

export function openDrawer(v: string, i: number): void {
  if (v === "reports") return openReportDrawer(i);
  if (v === "conduct-reports") return openReportDrawer(i, "conduct-reports");
  if (v === "wallets") return openWalletDrawer(i);
  if (v === "quests" || v === "disputes") return ensureDetailDrawer(v, i);
  const r = recordsFor(v)[i],
    isP = v === "payouts",
    isD = v === "disputes";
  showDrawerLayer();
  const payoutContext = isP ? payoutDecisionContext(r) : null,
    payoutNeedsDecision = isP && payoutStatusFor(r.payoutStatus ?? r.status) === "PENDING_ADMIN_APPROVAL",
    payoutCanReconcile = isP && r.apiBacked && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(payoutStatusFor(r.payoutStatus ?? r.status)),
    drawerContent =
      v === "users"
        ? `${userAccountSection(r)}${userModerationSection(r)}${userReportsSection(r)}${userActivitySection(r)}${userPayoutSection(r)}${userHistorySection(r)}${userNotesSection(r)}`
        : isD
          ? `<section class="section"><h3>Issue summary</h3><p>${escapeActivityText(r.detail)}</p></section><section class="section"><h3>Evidence on record</h3>${(r.evidence || []).map((e, evidenceIndex) => { const parts = String(e).split(" · "); const reference = r.evidenceRefs?.[evidenceIndex]; const disputeCaseAttribute = r.apiBacked && r.id ? ` data-dispute-case-id="${escapeActivityText(r.id)}"` : ""; return reference ? `<button class="evidence-item" data-evidence-ref="${escapeActivityText(reference)}"${disputeCaseAttribute}><strong>${escapeActivityText(parts[0])}</strong><small>${escapeActivityText(parts.slice(1).join(" · "))}</small><span>Open</span></button>` : `<div class="evidence"><strong>${escapeActivityText(parts[0])}</strong><small>Evidence Reference not available</small></div>`; }).join("")}</section>`
          : isP
          ? `<section class="section"><h3>${escapeActivityText(payoutContext?.heading || "Payout")}</h3><p>${escapeActivityText(payoutContext?.copy || "")}</p><p class="audit-note">${escapeActivityText(payoutContext?.next || "")}</p></section>`
            : `<section class="section"><h3>Audit trail</h3>${timeline([statusForView(v, r), "Record created"])}</section>`;
  const drawerActions = isP
      ? payoutNeedsDecision
        ? '<button class="btn" data-action="Reject payout">Reject payout</button><button class="btn primary" data-action="Approve payout">Approve payout</button>'
        : payoutCanReconcile
          ? '<button class="btn" data-action="Reconcile payout">Reconcile with provider</button><button class="btn" id="close-payout-record">Close record</button>'
        : '<button class="btn" id="close-payout-record">Close record</button>'
      : v === "users"
        ? `${userDrawerActions(r)}<a class="btn" href="/users/${encodeURIComponent(r.id)}">See full user profile</a>`
        : `<button class="btn" data-action="${hasHiddenQuestOverlay(r) ? "Restore quest" : "Hide quest"}">${hasHiddenQuestOverlay(r) ? "Restore quest" : "Hide quest"}</button>`;
  drawer.innerHTML = `<div class="drawer-top"><strong>${escapeActivityText(r.id)}</strong><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body"><div class="drawer-title"><span class="att-icon ${toneClass(r.tone)}">${ico(v === "payouts" ? "wallet" : v === "users" ? "user" : v === "quests" ? "quest" : "scale")}</span><div><h2>${escapeActivityText(r.title)}</h2><p>${escapeActivityText(r.person)} · ${escapeActivityText(r.other)}</p></div></div><div class="facts"><div class="fact"><span>Status</span>${statusBadgeForView(v, r)}${v === "quests" && hasHiddenQuestOverlay(r) ? '<span class="badge neutral quest-hidden-overlay">Hidden</span>' : ""}</div>${r.amount ? `<div class="fact"><span>${isP ? "Payout amount" : "Amount held"}</span><strong>฿${fmt(r.amount)}</strong></div>` : ""}<div class="fact"><span>Record</span><strong>${escapeActivityText(r.id)}</strong></div>${!isP && v !== "users" ? `<div class="fact"><span>Last activity</span><strong>${escapeActivityText(r.age)}</strong></div>` : ""}</div>${drawerContent}</div><div class="drawer-actions">${drawerActions}</div>`;
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
        if (action === "Reconcile payout") {
          const button = b;
          button.disabled = true;
          void reconcileLivePayout(r).then(() => {
            render();
            openDrawer("payouts", data.payouts.indexOf(r));
            toast(`Payout ${r.id} reconciled with the provider.`);
          }).catch((error: unknown) => {
            button.disabled = false;
            toast(`Payout reconciliation failed: ${error instanceof Error ? error.message : "Request failed."}`);
          });
          return;
        }
        confirmAction(action, r, "", (reason, reasonCode) => {
          void runAdminAction(r, action, reason, reasonCode as AdminQuestReasonCode | undefined).then(() => {
            persistAdminData();
            if (state.view === "home") renderHome();
            else render();
            if (isAdminApiEnabled() && isQuestModerationAction(action)) toast(`${action} completed for ${r.id}.`);
            return undefined;
          }).catch((error: unknown) => {
            toast(`${action} failed: ${error instanceof Error ? error.message : "Request failed."}`);
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
  if (v === "users" && r.apiBacked && !r.memberDetailLoaded) {
    void hydrateLiveMember(r).then(() => {
      if (drawer.classList.contains("open") && data.users[i] === r) openDrawer(v, i);
    });
  }
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
export async function refreshNavigationCounts(): Promise<void> {
  if (isAdminApiEnabled()) {
    try {
      const apiCounts = adminNavigationCountsFromOverview(await adminApi.getOverview());
      const mockCounts = adminNavigationCountsFromMockData(data);
      setNavigationCounts(apiCounts);
      setMockNavigationCounts(mockCounts);
    } catch (error: unknown) {
      removeNavigationCount("disputes");
      removeNavigationCount("payouts");
      setMockNavigationCounts(adminNavigationCountsFromMockData(data));
      console.error("Admin navigation counts failed", error);
    }
    return;
  }

  const counts = {
    disputes: data.disputes.filter((record) => disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) === "DISPUTE_CASE_PENDING").length,
    payouts: data.payouts.filter((record) => payoutStatusFor(record.payoutStatus ?? record.status) === "PENDING_ADMIN_APPROVAL").length,
  };
  setNavigationCount("disputes", counts.disputes);
  setNavigationCount("payouts", counts.payouts);
  setMockNavigationCounts(adminNavigationCountsFromMockData(data));
}
export function ensureDetailDrawer(view: string, index: number): void {
  if (view !== "quests" && view !== "disputes") return;
  const opener = view === "quests" ? "openQuestDrawer" : "openDisputeDrawer";
  const open = window[opener];
  if (open) open(index);
}
const dialog = document.querySelector<LegacyDomElement>("#confirm");
export function confirmAction(a: string, r: LegacyRecord, decisionDetail = "", onConfirm?: (reason: string, reasonCode?: AdminReasonCode) => void, options: ConfirmActionOptions = {}): void {
  if (!dialog) return;
  const form = requiredQuery<LegacyForm>(document, "#confirm-form"),
    reason = requiredQuery<LegacyDomElement>(document, "#confirm-reason"),
    error = requiredQuery<LegacyDomElement>(document, "#confirm-reason-error"),
    count = requiredQuery<LegacyDomElement>(document, "#confirm-reason-count"),
    confirmButton = requiredQuery<LegacyDomElement>(document, "#confirm-btn");
  resetConfirmationDialog();
  const reasonCode = setupQuestReasonCode(document, a, isAdminApiEnabled());
  reason.required = !reasonCode;
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
    const reasonValid = !reasonCode || !reasonCode.required || reasonCode.value.length > 0;
    const valid = reasonCode ? reasonValid : reason.value.trim().length >= 8;
    confirmButton.disabled = !valid;
    reason.setAttribute(
      "aria-invalid",
      String(!valid && reason.value.length > 0),
    );
    error.hidden = true;
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
  dialog.addEventListener(
    "close",
    () => {
      if (dialog.returnValue === "confirm") {
        if (!options.keepDrawerOpen && drawer?.classList.contains("open"))
          closeDrawer();
        const decisionReason = reason.value.trim();
        onConfirm?.(decisionReason, reasonCode?.value as AdminReasonCode | undefined);
        const localAudit = !isAdminApiEnabled() || !isQuestModerationAction(a) && a !== "Confirm dispute resolution";
        if (localAudit) {
          recordActivity(
            a,
            `${r.id} · ${r.title || r.reportedUserName || "Record"}${decisionReason ? ` · ${decisionReason}` : ""}`,
          );
          toast(`${a} recorded for ${r.id}. Audit reason saved.`);
        }
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
function payoutReasonCodeField(action: "approve" | "cancel"): string {
  const options = action === "approve"
    ? '<option value="PAYOUT_POLICY_REVIEW">Policy review</option><option value="PAYOUT_RISK_REVIEW">Risk review</option>'
    : '<option value="PAYOUT_POLICY_REVIEW">Policy review</option><option value="PAYOUT_RISK_REVIEW">Risk review</option><option value="PAYOUT_INVALID_DESTINATION">Invalid destination</option>';
  return `<div class="payout-reason-code-fields" id="payout-reason-code-field"><label for="payout-reason-code">Reason code <span aria-hidden="true">*</span></label><select id="payout-reason-code"><option value="">Choose a reason</option>${options}</select></div>`;
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
  document.querySelector<HTMLElement>("#quest-reason-code-field")?.remove();
  document.querySelector<HTMLElement>("#dispute-reason-code-field")?.remove();
  document.querySelector<HTMLElement>("#payout-reason-code-field")?.remove();
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
  context.innerHTML = `${payoutConfirmationSummary(record)}${payoutReasonCodeField("approve")}`;
  reasonLabel.hidden = false;
  reason.required = true;
  reason.disabled = false;
  help.hidden = false;
  confirmButton.textContent = "Approve payout";
  confirmButton.className = "btn primary";
  confirmButton.disabled = true;
  const reasonCode = requiredQuery<LegacyDomElement>(context, "#payout-reason-code");
  const validate = () => {
    const valid = reason.value.trim().length >= 8 && Boolean(reasonCode.value);
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
  reasonCode.onchange = validate;
  form.onsubmit = (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value !== "confirm") return;
    if (!validate()) {
      event.preventDefault();
      reason.setAttribute("aria-invalid", "true");
      error.hidden = false;
      (reasonCode.value ? reason : reasonCode).focus();
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
        expectedVersion: record.version ?? 1,
        reasonCode: reasonCode.value as "PAYOUT_POLICY_REVIEW" | "PAYOUT_RISK_REVIEW",
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
  requestAnimationFrame(() => reasonCode.focus());
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
  context.innerHTML = payoutReasonCodeField("cancel");
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
  const choice = requiredQuery<LegacyDomElement>(context, "#payout-reason-code");
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
        expectedVersion: record.version ?? 1,
        reasonCode: choice.value as "PAYOUT_POLICY_REVIEW" | "PAYOUT_RISK_REVIEW" | "PAYOUT_INVALID_DESTINATION",
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
