const paths = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 6h6L5 7Zm14 0-3 6h6l-3-6ZM8 21h8"/>',
  quest:
    '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 9h8M8 13h8M8 17h5"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.8"/>',
  wallet:
    '<path d="M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 0 12-3v3"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/>',
  settings:
    '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  paperclip: '<path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flag: '<path d="M5 21V4m0 0h12l-2 4 2 4H5"/>',
};
const ico = (n) =>
  `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[n] || paths.quest}</svg>`;
const allowedTones = [
  "warning",
  "danger",
  "success",
  "info",
  "neutral",
  "assigned",
  "cancelled",
];
function toneClass(tone) {
  return allowedTones.includes(tone) ? tone : "neutral";
}
const navItems = [
  ["home", "home", "Overview", ""],
  ["quests", "quest", "Quests", ""],
  ["disputes", "scale", "Disputes", "7"],
  ["reports", "flag", "Reports", "0"],
  ["payouts", "wallet", "Payouts", "4"],
  ["users", "users", "Users", ""],
];
const disputeCases = {};
const data = { disputes: [], quests: [], users: [], payouts: [], reports: [] };
const requestedView = new URLSearchParams(location.search).get("view"),
  initialView = [
    "home",
    "disputes",
    "quests",
    "users",
    "payouts",
    "reports",
    "policies",
    "activity",
  ].includes(requestedView)
    ? requestedView
    : "home",
  state = { view: initialView, tab: "all", query: "", questFilters: { mode: "all", status: "all" } },
  main = document.querySelector("main"),
  fmt = (n) => new Intl.NumberFormat("en-US").format(n),
  questStatusClass = (status) => {
    const slug = String(status ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return [
      "open",
      "assigned",
      "in-progress",
      "submitted",
      "change-pending",
      "approved",
      "disputed",
      "completed",
      "hidden",
      "draft",
      "cancelled",
    ].includes(slug)
      ? ` quest-status-${slug}`
      : "";
  },
  badge = (s, t) =>
    `<span class="badge ${toneClass(t)}${questStatusClass(s)}">${escapeActivityText(s)}</span>`;
document.querySelector("#nav").innerHTML = navItems
  .map(
    ([v, i, l, c]) =>
      `<button data-view="${v}"><span>${ico(i)}</span>${l}${c ? `<b>${c}</b>` : ""}</button>`,
  )
  .join("");
document
  .querySelectorAll("[data-static-icon]")
  .forEach((x) => (x.innerHTML = ico(x.dataset.staticIcon)));
const heads = {
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
const pageHead = (t, p, a = "") =>
  `<div class="page-head"><div><h1>${t}</h1><p>${p}</p></div>${a}</div>`;
function homeDecisions() {
  const decisions = [
    ...data.disputes
      .filter((record) => record.status === "Active")
      .map((record) => ({
        view: "disputes",
        record,
        priority: 500 + record.amount,
        icon: "⚖",
        title: `Resolve ${disputeTypeLabel(record)} dispute`,
        detail: `${record.id} · ${record.title}`,
        metric: `฿${fmt(record.amount)} held`,
        age: record.disputeDate,
      })),
    ...data.payouts
      .filter((record) => record.status === "Needs approval")
      .map((record) => ({
        view: "payouts",
        record,
        priority: 300 + record.amount,
        icon: "฿",
        title: `${record.status} payout`,
        detail: `${record.id} · ${record.title}`,
        metric: `฿${fmt(record.amount)}`,
      })),
    ...data.users
      .filter((record) => ["Red Flag", "Temp ban", "Perm ban"].includes(record.status))
      .map((record) => ({
        view: "users",
        record,
        priority: record.status === "Perm ban" ? 400 : record.status === "Temp ban" ? 350 : 250,
        icon: "♙",
        title: `${record.status} account`,
        detail: `${record.title} · ${record.age}`,
        metric: "Open review",
      })),
    ...data.reports
      .filter((record) => record.status === "Active")
      .map((record) => ({
        view: "reports",
        record,
        priority: 450,
        icon: "flag",
        title: "New user report",
        detail: `${record.id} · ${record.reportedUserName}`,
        metric: "Active report",
        age: record.reportedAt,
      })),
    ...data.quests
      .filter((record) => record.status === "Change pending")
      .map((record) => ({
        view: "quests",
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
function reviewTimestamp(record) {
  const value = String(record.reportedAt || record.disputeDate || "")
    .replace(" · ", " ")
    .replace(" ICT", "");
  return Date.parse(value) || 0;
}

function renderHome() {
  const decisions = homeDecisions();
  const activeDisputes = data.disputes.filter((record) => record.status === "Active"),
    pendingPayouts = data.payouts.filter((record) => record.status === "Needs approval"),
    reviewUsers = data.users.filter((record) => ["Red Flag", "Temp ban", "Perm ban"].includes(record.status)),
    openReports = data.reports.filter((record) => record.status === "Active"),
    workLeft = [
      ...activeDisputes,
      ...openReports,
      ...pendingPayouts,
    ],
    statusCounts = ["Draft", "Open", "Assigned", "In progress", "Submitted", "Change pending", "Approved", "Disputed", "Completed", "Cancelled"].map((status) => [status, data.quests.filter((record) => record.status === status).length]);
  main.innerHTML = `${pageHead("Overview", "A live snapshot of marketplace risk, money, and work in progress.", '<button class="btn primary" data-jump="disputes">Open review queue</button>')}<section class="dashboard-stats"><div class="stat"><span>Total work left</span><strong>${workLeft.length}</strong><small>Items requiring admin action</small></div></section><div class="grid dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Needs a decision</h2><p>Showing ${decisions.length} latest dispute/report records</p></div><button class="link" data-jump="activity">View activity</button></div>${decisions.length ? decisions.map((item) => attention(item.view, data[item.view].indexOf(item.record), item.record.tone, item.icon, item.title, item.detail, item.metric, item.age || item.record.age)).join("") : '<div class="empty"><h3>No decisions waiting</h3><p>All current records are clear or processing normally.</p></div>'}</section><aside><section class="panel"><div class="panel-head"><div><h2>Quest flow</h2><p>Current marketplace distribution</p></div><button class="link" data-jump="quests">Open quests</button></div><div class="dashboard-status-list">${statusCounts.map(([status, count]) => `<div><span>${badge(status, status === "Disputed" ? "danger" : ["Submitted", "Change pending"].includes(status) ? "warning" : status === "In progress" ? "info" : "success")}</span><strong>${count}</strong></div>`).join("")}</div></section><section class="panel dashboard-activity"><div class="panel-head"><div><h2>Recent activity</h2><p>Latest administrative trail</p></div></div>${activityList().slice(0, 3).join("")}</section></aside></div><div class="dashboard-lower"><section class="panel"><div class="panel-head"><div><h2>Payout watch</h2><p>Money movement requiring a closer look</p></div><button class="link" data-jump="payouts">Open payouts</button></div>${pendingPayouts.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="payouts:${data.payouts.indexOf(record)}"><span><strong>${record.id}</strong><small>${record.title} · ${record.status}</small></span><strong>฿${fmt(record.amount)}</strong><span>${badge(record.status, record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No payouts need review</h3><p>Processing and completed payouts are moving normally.</p></div>'}</section><section class="panel"><div class="panel-head"><div><h2>User watch</h2><p>Accounts that may need a moderator</p></div><button class="link" data-jump="users">Open users</button></div>${reviewUsers.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="users:${data.users.indexOf(record)}"><span><strong>${record.title}</strong><small>${record.id} · ${record.age}</small></span><span>${badge(record.status, record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No user reviews</h3><p>All accounts are currently in good standing.</p></div>'}</section></div>`;
  main.querySelector(".page-head > div > p")?.remove();
  const dashboardStats = main.querySelector(".dashboard-stats");
  if (dashboardStats) {
    dashboardStats.innerHTML = `<div class="stat"><span>Active disputes</span><strong>${activeDisputes.length}</strong></div><div class="stat"><span>Payouts needing review</span><strong>${pendingPayouts.length}</strong></div><div class="stat"><span>Open report</span><strong>${openReports.length}</strong></div><div class="stat"><span>Total work left</span><strong>${workLeft.length}</strong></div>`;
    dashboardStats.querySelector(".stat:last-child")?.classList.add(
      "dashboard-stat-work-left",
    );
  }
  const decisionsHeading = main.querySelector(".dashboard-grid > .panel h2");
  if (decisionsHeading) decisionsHeading.textContent = "Latest dispute/report";
  const lowerHeadings = main.querySelectorAll(".dashboard-lower .panel h2");
  if (lowerHeadings[0]) lowerHeadings[0].textContent = "Recent Payout Request";
  if (lowerHeadings[1]) lowerHeadings[1].textContent = "Recent User penalty";
  const recentActivity = main.querySelector(".dashboard-activity"),
    dashboardLower = main.querySelector(".dashboard-lower");
  if (recentActivity && dashboardLower) dashboardLower.after(recentActivity);
  bind();
}
function attention(v, i, t, ic, title, sub, x, y) {
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
function activityList() {
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
function escapeActivityText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
function chatTimeLabel(date = new Date()) {
  return `Today · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
function reportDateTime(date = new Date()) {
  const datePart = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    }),
    timePart = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    });
  return `${datePart} · ${timePart}`;
}
function adminDateTime(date = new Date()) {
  return reportDateTime(date).replace(/\s+ICT$/, "");
}
function currentAdminName() {
  return "Nicha P.";
}
function disputeTypeLabel(record) {
  return record.disputeType || "Other";
}
function chatMessage(sender, time, message, variant) {
  return `<article class="chat-message ${variant}"><div class="chat-message-meta"><strong>${escapeActivityText(sender)}</strong><time>${escapeActivityText(time)}</time></div><p>${escapeActivityText(message)}</p></article>`;
}
function bindChatAttachment(form) {
  const input = form.querySelector("[data-chat-attachment]"),
    label = form.querySelector("[data-chat-attachment-name]");
  if (!input || !label) return;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    label.textContent = file?.name || "No file attached";
    label.title = file?.name || "";
  });
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
function readActivityEvents() {
  try {
    const events = JSON.parse(localStorage.getItem(activityStorageKey) || "[]");
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}
function activityTimestamp(value, fallback) {
  const timestamp = Date.parse(String(value ?? "").replace(" · ", " "));
  return Number.isFinite(timestamp) ? timestamp : fallback;
}
function activityInitials(name, fallback) {
  const initials = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || fallback;
}
function seedGeneratedActivity(records) {
  if (readActivityEvents().length) return;
  const events = [];
  const now = Date.now();
  const add = (actor, title, detail, at, fallback) => {
    events.push({
      actor,
      title,
      detail,
      timestamp: activityTimestamp(at, fallback),
    });
  };

  (records.reports || []).slice(0, 14).forEach((record, index) => {
    const fallback = now - (index + 1) * 38 * 60 * 1000;
    add(
      activityInitials(record.reporterName, "US"),
      "User report received",
      `${record.id} · ${record.reporterName} reported ${record.reportedUserName}`,
      record.reportedAt,
      fallback,
    );
    if (record.status === "Closed") {
      add(
        "NP",
        "Report resolved",
        `${record.id} · ${record.decisionLabel || "Report closed"}`,
        record.resolutionAt || record.closedAt,
        fallback + 47 * 60 * 1000,
      );
    }
  });

  (records.disputes || []).slice(0, 12).forEach((record, index) => {
    const fallback = now - (index + 2) * 17 * 60 * 60 * 1000;
    add(
      "SYS",
      "Dispute opened",
      `${record.id} · ${record.title}`,
      record.disputeDate,
      fallback,
    );
    if (record.status === "Closed") {
      add(
        "NP",
        "Dispute resolved",
        `${record.id} · ${record.resolution || "Resolution recorded"}`,
        record.disputeDate,
        fallback + 3 * 60 * 60 * 1000,
      );
    }
  });

  (records.payouts || []).slice(0, 12).forEach((record, index) => {
    const fallback = now - (index + 1) * 21 * 60 * 60 * 1000;
    add(
      "SYS",
      "Payout requested",
      `${record.id} · ${record.title} · ฿${fmt(record.amount)}`,
      record.requestedAt,
      fallback,
    );
    if (record.status === "Processing" || record.status === "Completed") {
      add(
        "NP",
        "Payout approved",
        `${record.id} · ${record.title}`,
        record.approvedAt,
        fallback + 2 * 60 * 60 * 1000,
      );
    } else if (record.status === "Rejected") {
      add(
        "NP",
        "Payout rejected",
        `${record.id} · ${record.rejectionReason}`,
        record.rejectedAt,
        fallback + 2 * 60 * 60 * 1000,
      );
    }
  });

  (records.users || []).slice(0, 16).forEach((user, index) => {
    (user.moderationHistory || []).slice(0, 2).forEach((entry, entryIndex) => {
      add(
        activityInitials(entry.by, entry.by === "System" ? "SYS" : "NP"),
        entry.event,
        `${user.id} · ${user.title}${entry.reason || entry.note ? ` · ${entry.reason || entry.note}` : ""}`,
        entry.at,
        now - (index * 2 + entryIndex + 1) * 29 * 60 * 60 * 1000,
      );
    });
  });

  events.sort((first, second) => second.timestamp - first.timestamp);
  try {
    localStorage.setItem(activityStorageKey, JSON.stringify(events.slice(0, 40)));
  } catch {
    // Keep activity empty if browser storage is blocked.
  }
}
function recordActivity(title, detail, actor = "NP") {
  const event = {
    actor,
    title: String(title),
    detail: String(detail),
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(
      activityStorageKey,
      JSON.stringify([event, ...readActivityEvents()].slice(0, 40)),
    );
  } catch {
    // Ignore activity writes if browser storage is blocked.
  }
}
function formatActivityTime(timestamp) {
  const age = Math.max(0, Date.now() - Number(timestamp || 0));
  const minutes = Math.floor(age / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function renderResource(v) {
  if (v === "policies") return renderPolicies();
  if (v === "activity") return renderActivity();
  const rows = data[v],
    tabs =
      v === "disputes"
        ? ["All", "Active", "Closed"]
        : v === "payouts"
          ? ["All", "Needs approval", "Processing", "Completed", "Rejected"]
          : v === "quests"
            ? ["All", "Draft", "Open", "Assigned", "In progress", "Submitted", "Change pending", "Approved", "Disputed", "Completed", "Cancelled", "Hidden"]
            : v === "reports"
              ? ["All", "Active", "Closed"]
              : ["All", "Normal", "Red Flag", "Temp ban", "Perm ban"];
  const filtered = rows.filter(
    (r) =>
      `${r.id} ${r.title || ""} ${r.person || ""} ${r.reportedUserName || ""} ${r.reporterName || ""} ${r.category || ""}`
        .toLowerCase()
        .includes(state.query.toLowerCase()) &&
      (state.tab === "all" || r.status.toLowerCase().includes(state.tab)),
  );
  main.innerHTML = `${pageHead(...heads[v])}<section class="panel resource"><div class="tabs">${tabs.map((t) => `<button class="tab ${state.tab === t.toLowerCase() ? "active" : ""}" data-tab="${t.toLowerCase()}">${t}${t === "All" ? ` (${rows.length})` : ""}</button>`).join("")}</div><div class="toolbar"><div class="inline-search"><input id="resource-search" value="${state.query}" placeholder="⌕  Search ${v}…"></div><span class="count">${filtered.length} results</span></div>${filtered.length ? table(v, filtered) : '<div class="empty"><h3>No matching records</h3><p>Try changing your search or selected view.</p></div>'}</section>`;
  bind();
}
function table(v, rows) {
  if (v === "reports") {
    return `<div class="table-wrap"><table class="data report-table"><thead><tr><th>Report</th><th>Reported user</th><th>Submitted by</th><th>Report type</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr data-open="reports:${data.reports.indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong><small>${escapeActivityText(r.reportedAt)}</small></td><td><strong>${escapeActivityText(r.reportedUserName)}</strong><small>${escapeActivityText(r.reportedUserId)}</small></td><td><strong>${escapeActivityText(r.reporterName)}</strong><small>${escapeActivityText(r.reporterId)}</small></td><td>${escapeActivityText(r.category)}</td><td>${badge(r.status, r.tone || (r.status === "Closed" ? "neutral" : "warning"))}</td></tr>`).join("")}</tbody></table></div>`;
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
  return `<div class="table-wrap"><table class="data"><thead><tr>${h.map((x) => `<th>${escapeActivityText(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr data-open="${v}:${data[v].indexOf(r)}"><td><strong>${escapeActivityText(r.id)}</strong></td><td><strong>${escapeActivityText(r.title)}</strong>${v === "disputes" ? `<small>${escapeActivityText(r.detail).slice(0, 45)}…</small>` : ""}</td>${v === "disputes" ? "" : `<td><strong>${escapeActivityText(r.person)}</strong></td>`}${v === "disputes" || v === "payouts" ? "" : `<td>${escapeActivityText(r.other)}</td>`}${r.amount !== null ? `<td class="money">฿${fmt(r.amount)}</td>` : ""}<td>${badge(r.status, r.tone)}</td>${v === "disputes" ? `<td>${escapeActivityText(r.disputeDate || "—")}</td><td><strong>${escapeActivityText(disputeTypeLabel(r))}</strong></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}
function renderPolicies() {
  main.innerHTML = `${pageHead(...heads.policies, '<button class="btn">Revision history</button>')}<section class="panel"><div class="panel-head"><div><h2>Current policy · Revision 12</h2><p>Effective 18 July 2026 · authored by Nicha P.</p></div>${badge("Active", "success")}</div><div class="health"><div class="stat"><span>Platform fee</span><strong>5.0%</strong><small>500 basis points</small></div><div class="stat"><span>Funded quest range</span><strong>฿100–50k</strong><small>Per quest</small></div><div class="stat"><span>Payout range</span><strong>฿200–30k</strong><small>Per request</small></div></div><div class="drawer-body"><div class="facts">${[
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
function renderActivity() {
  main.innerHTML = `${pageHead(...heads.activity, '<button class="btn">Export CSV</button>')}<section class="panel resource"><div class="toolbar"><div class="inline-search"><input id="activity-search" type="search" placeholder="Search activity…" aria-label="Search activity"></div></div>${activityList().join("")}</section>`;
  bind();
}
function render() {
  state.view === "home" ? renderHome() : renderResource(state.view);
  setActiveNavigation(state.view);
}
function setActiveNavigation(view) {
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => {
      const active = b.dataset.view === view;
      b.classList.toggle("active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
}
function bind() {
  document.querySelectorAll(".filter").forEach((b) => {
    b.innerHTML =
      ico(b.textContent.includes("Columns") ? "settings" : "filter") +
      b.textContent.replace("☷", "").trim();
  });
  document
    .querySelectorAll(".queue>span:last-child")
    .forEach((x) => x.lastChild?.remove());
  document
    .querySelectorAll("[data-jump]")
    .forEach((b) => (b.onclick = () => navigate(b.dataset.jump)));
  document.querySelectorAll("[data-open]").forEach(
    (b) =>
      (b.onclick = (event) => {
        if (b.matches("button, a")) event.stopPropagation();
        const [v, i] = b.dataset.open.split(":");
        openDrawer(v, +i);
      }),
  );
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        if (state.view === "quests" && b.dataset.filterKind) {
          const filters = state.questFilters || (state.questFilters = { mode: "all", status: "all" });
          if (b.dataset.filterKind === "mode") {
            filters.mode = filters.mode === b.dataset.tab ? "all" : b.dataset.tab;
          } else if (b.dataset.filterKind === "status") {
            const status = b.dataset.filterValue || b.dataset.tab;
            filters.status = filters.status === status ? "all" : status;
          } else {
            filters.mode = "all";
            filters.status = "all";
          }
          state.tab = "all";
        } else {
          state.tab = b.dataset.tab;
        }
        if (state.pagination?.[state.view]) state.pagination[state.view].page = 1;
        render();
      }),
  );
  const s = document.querySelector("#resource-search");
  if (s) {
    s.placeholder = s.placeholder.replace("⌕  ", "");
    s.oninput = (e) => {
      state.query = e.target.value;
      renderResource(state.view);
      document.querySelector("#resource-search")?.focus();
    };
  }
}
function navigate(v) {
  const nextUrl = v === "home" ? "/" : `/?view=${encodeURIComponent(v)}`;
  if (typeof resetResourceState === "function") resetResourceState();
  else {
    state.tab = "all";
    state.query = "";
    state.questFilters = { mode: "all", status: "all" };
  }
  if (/^\/(quests|disputes|reports)\//.test(location.pathname)) {
    location.assign(nextUrl);
    return;
  }
  history.replaceState(null, "", nextUrl);
  state.view = v;
  state.tab = "all";
  state.query = "";
  render();
  setMobileNavigation(false);
}
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => navigate(b.dataset.view)));
const drawer = document.querySelector("#drawer"),
  scrim = document.querySelector("#scrim");
const shell = document.querySelector(".shell"),
  focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
let drawerTrigger = null,
  drawerKeydown = null,
  activeCustomLayerClose = null;

function visibleFocusable(root) {
  return [...root.querySelectorAll(focusableSelector)].filter(
    (element) => element.getClientRects().length && !element.closest("[hidden]"),
  );
}

function trapFocus(event, layer) {
  if (event.key !== "Tab") return;
  const focusable = visibleFocusable(layer);
  if (!focusable.length) {
    event.preventDefault();
    layer.focus();
    return;
  }
  const first = focusable[0],
    last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function showDrawerLayer() {
  drawerTrigger = document.activeElement;
  shell.inert = true;
  drawer.inert = false;
  scrim.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  drawerKeydown = (event) => trapFocus(event, drawer);
  drawer.addEventListener("keydown", drawerKeydown);
  requestAnimationFrame(() => {
    drawer.classList.add("open");
    const title = drawer.querySelector("h2")?.textContent?.trim();
    drawer.setAttribute("aria-label", title ? `Record details: ${title}` : "Record details");
    drawer.querySelector("#close")?.focus();
  });
}

function showModalLayer(layer, options = {}) {
  activeCustomLayerClose?.();
  const trigger = document.activeElement,
    removeOnClose = options.removeOnClose !== false;
  if (!layer.isConnected) document.body.append(layer);
  const siblings = [...document.body.children]
    .filter((element) => element !== layer)
    .map((element) => ({ element, inert: element.inert }));
  siblings.forEach(({ element }) => (element.inert = true));
  const onKeydown = (event) => {
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
    if (trigger?.isConnected) trigger.focus();
    if (activeCustomLayerClose === close) activeCustomLayerClose = null;
  };
  activeCustomLayerClose = close;
  layer.addEventListener("keydown", onKeydown);
  requestAnimationFrame(() => {
    const preferred =
      typeof options.initialFocus === "string"
        ? layer.querySelector(options.initialFocus)
        : options.initialFocus;
    (preferred || visibleFocusable(layer)[0] || layer).focus();
  });
  return close;
}
function payoutDecisionContext(record) {
  const contexts = {
    "Needs approval": {
      heading: "Why your approval is needed",
      copy: "This payout is ready for release, but it cannot move to the bank until an admin approves it.",
      next: "Approve payout → status changes to Processing. Funds are not yet transferred.",
    },
    Processing: {
      heading: "Transfer in progress",
      copy: "The payout has been approved and is moving to the recipient’s bank. No action is needed unless the transfer fails.",
      next: "The record will become Completed after the bank confirms the transfer.",
    },
    Completed: {
      heading: "Transfer completed",
      copy: "The recipient’s bank transfer completed successfully. This record is retained for audit.",
      next: "No further admin action is available.",
    },
    Rejected: {
      heading: "Payout rejected",
      copy: "This payout was rejected before funds were released. Review the recorded reason before creating a new payout request.",
      next: "No retry is available from this record.",
    },
    Failed: {
      heading: "Transfer failed",
      copy: "The payment provider could not complete this transfer.",
      next: "Review the failure reason before creating a new payout request.",
    },
  };
  return contexts[record.status] || contexts["Needs approval"];
}
function payoutPreviousRecords(record) {
  const currentTimestamp = payoutTimestamp(record);
  return data.payouts
    .filter((payout) => {
      if (payout.title !== record.title || payout.id === record.id) return false;
      const timestamp = payoutTimestamp(payout);
      return timestamp < currentTimestamp || (!timestamp && !currentTimestamp);
    })
    .sort((first, second) => payoutTimestamp(second) - payoutTimestamp(first));
}
function payoutTimestamp(record) {
  return Date.parse(String(record.requestedAt || "").replace(" · ", " ")) || 0;
}
function payoutEarningForQuest(quest) {
  if (!quest.teamQuest) return Number(quest.amount || 0);
  const workerCount = quest.teamParticipants?.length || Number(quest.teamSize) || 1;
  return Math.round(Number(quest.amount || 0) / workerCount);
}
function payoutFinancials(record) {
  const previousPayouts = payoutPreviousRecords(record),
    processingReserved = previousPayouts
      .filter((payout) => payout.status === "Processing")
      .reduce((total, payout) => total + Number(payout.amount || 0), 0),
    pendingReserved = previousPayouts
      .filter((payout) => payout.status === "Needs approval")
      .reduce((total, payout) => total + Number(payout.amount || 0), 0);
  const previousPaidOut =
      record.previouslyPaidOut ??
      previousPayouts
        .filter((payout) => payout.status === "Completed")
        .reduce((total, payout) => total + Number(payout.amount || 0), 0),
    earned = completedPayoutQuests(record).reduce(
      (total, quest) => total + payoutEarningForQuest(quest),
      0,
    ),
    balanceBeforeRequest = Math.max(
      0,
      earned - previousPaidOut - processingReserved - pendingReserved,
    ),
    available = balanceBeforeRequest,
    remaining = ["Rejected", "Failed"].includes(record.status)
      ? balanceBeforeRequest
      : Math.max(0, balanceBeforeRequest - Number(record.amount || 0));
  return { available, remaining, previousPaidOut };
}
function payoutSummarySection(record) {
  const financials = payoutFinancials(record);
  return `<section class="section payout-summary"><h3>Payout summary</h3><div class="payout-summary-grid"><div><span>Available to withdraw</span><strong>฿${fmt(financials.available)}</strong></div><div><span>Payout amount</span><strong>฿${fmt(record.amount)}</strong></div><div><span>Remaining after payout</span><strong>฿${fmt(financials.remaining)}</strong></div><div><span>Previously paid out</span><strong>฿${fmt(financials.previousPaidOut)}</strong></div></div></section>`;
}
function autoRejectUnavailablePayout(record) {
  if (record.status !== "Needs approval") return false;
  const available = payoutFinancials(record).available;
  if (available >= Number(record.amount || 0)) return false;
  record.status = "Rejected";
  record.tone = "danger";
  record.rejectedAt = payoutDateTime();
  record.rejectedBy = payoutAdminName();
  record.rejectionReason = "Insufficient withdrawable balance.";
  record.rejectionNote = "Automatically rejected before admin review because the available balance did not cover the request.";
  return true;
}
function payoutTimingSection(record) {
  const events = [["Requested", record.requestedAt || "Not recorded"]];
  if (record.approvedAt) {
    events.push(["Approved", record.approvedAt], ["By", record.approvedBy || "Admin"]);
    if (record.approvalReason) events.push(["Approval reason", record.approvalReason]);
  }
  if (record.rejectedAt) events.push(["Rejected", record.rejectedAt], ["By", record.rejectedBy || "Admin"]);
  return `<section class="section payout-timing"><h3>Payout timing</h3><div class="payout-audit-list">${events.map(([label, value]) => `<div><span>${escapeActivityText(label)}</span><strong>${escapeActivityText(value)}</strong></div>`).join("")}</div></section>`;
}
function payoutOutcomeSection(record) {
  const reason = record.rejectionReason || record.failureReason;
  if (!reason || !["Rejected", "Failed"].includes(record.status)) return "";
  return `<section class="section payout-outcome"><h3>${record.status === "Failed" ? "Transfer failure reason" : "Rejection reason"}</h3><p>${escapeActivityText(reason)}</p>${record.rejectionNote ? `<p class="payout-admin-note"><strong>Admin note:</strong> ${escapeActivityText(record.rejectionNote)}</p>` : ""}</section>`;
}
function payoutQuestId(record) {
  return record.questId || record.other?.match(/QST-\d+/)?.[0] || "";
}
function completedPayoutQuests(record) {
  return data.quests.filter(
    (quest) =>
      quest.status === "Completed" &&
      (quest.selectedParticipant === record.title ||
        quest.teamParticipants?.some(([name]) => name === record.title)),
  );
}
function payoutQuestHistory(record) {
  const quests = completedPayoutQuests(record);
  if (!quests.length)
    return '<p class="audit-note">No completed quests are connected to this recipient yet.</p>';
  return `<div class="payout-quest-history-list">${quests
    .map(
      (quest) =>
        `<a class="payout-quest-history-row" href="/quests/${encodeURIComponent(quest.id)}"><span><strong>${escapeActivityText(quest.id)} · ${escapeActivityText(quest.title)}</strong><small>${quest.teamQuest ? "Team quest" : "Individual quest"} · Completion status: Completed</small></span><span class="payout-earning-amount"><small>Amount earned</small><strong>฿${fmt(payoutEarningForQuest(quest))}</strong></span></a>`,
    )
    .join("")}</div>`;
}
function payoutPreviousHistory(record) {
  const previous = payoutPreviousRecords(record);
  if (!previous.length)
    return '<p class="audit-note">No previous payouts are connected to this recipient.</p>';
  return `<div class="payout-previous-list">${previous.map((payout) => `<div class="payout-previous-row"><span><strong>${escapeActivityText(payout.id)}</strong><small>${escapeActivityText(payout.requestedAt || "Date not recorded")}</small></span><span><strong>฿${fmt(payout.amount)}</strong>${badge(payout.status, payout.tone)}</span></div>`).join("")}</div>`;
}
function reportStatusLabel(report) {
  if (report.status === "Active") return "Open";
  return "Closed";
}
function reportStatusTone(report) {
  const label = reportStatusLabel(report);
  return label === "Open" ? "warning" : "neutral";
}
function userReportsFor(user) {
  return (data.reports || [])
    .filter((report) => report.reportedUserId === user.id)
    .sort((first, second) => {
      const parseReportedAt = (value) =>
        Date.parse(String(value || "").replace(" · ", " ").replace(/\s+ICT$/, "")) || 0;
      return parseReportedAt(second.reportedAt) - parseReportedAt(first.reportedAt);
    });
}
function userReportCounts(reports) {
  return reports.reduce(
    (counts, report) => {
      const label = reportStatusLabel(report).toLowerCase();
      counts[label] += 1;
      return counts;
    },
    { open: 0, closed: 0 },
  );
}
function userQuestRecords(user) {
  return data.quests.filter(
    (quest) =>
      quest.person === user.title ||
      quest.selectedParticipant === user.title ||
      quest.teamParticipants?.some(([name]) => name === user.title),
  );
}
function userAccountSection(user) {
  return `<section class="section user-account"><h3>Account</h3><div class="user-context-list"><div><span>Student ID</span><strong>${escapeActivityText(user.id)}</strong></div><div><span>Created</span><strong>${escapeActivityText(user.accountCreatedAt || "Not recorded")}</strong></div><div><span>Last active</span><strong>${escapeActivityText(user.lastActiveAt || "Not recorded")}</strong></div></div></section>`;
}
function userModerationSection(user) {
  const reason = user.statusReason || user.penalty?.reason || "No reason recorded.";
  const appliedAt = user.statusAppliedAt || user.penalty?.recordedAt || "Not recorded";
  const appliedBy = user.statusAppliedBy || user.penalty?.appliedBy || "Not recorded";
  const expiresAt = user.banExpiresAt || user.penalty?.expiresAt;
  const activeModeration = user.status !== "Normal";
  const confirmedViolations = confirmedViolationCount(user);
  const nextOutcome = penaltyOutcomeFor(user);
  const exemption = redFlagExemptionFor(user);
  return `<section class="section user-moderation"><h3>Moderation</h3><div class="user-context-list"><div><span>Status</span>${badge(user.status, user.tone)}</div><div><span>Confirmed violations</span><strong>${confirmedViolations}</strong></div><div><span>Next outcome</span><strong>${escapeActivityText(penaltyOutcomeLabel(nextOutcome))}</strong></div>${exemption ? `<div><span>Red Flag exemption</span><strong>${exemption.remaining} remaining (${escapeActivityText(exemption.label)})</strong></div>` : ""}<div><span>Reason</span><strong>${escapeActivityText(reason)}</strong></div>${activeModeration ? `<div><span>Applied</span><strong>${escapeActivityText(appliedAt)}</strong></div><div><span>By</span><strong>${escapeActivityText(appliedBy)}</strong></div>${(user.status === "Temp ban" || user.status === "Red Flag") && expiresAt ? `<div><span>Expires</span><strong>${escapeActivityText(expiresAt)}</strong></div>` : ""}` : ""}</div></section>`;
}
function userReportsSection(user) {
  const reports = userReportsFor(user);
  const counts = userReportCounts(reports);
  const summary = `Open ${counts.open} · Closed ${counts.closed}`;
  return `<section class="section user-reports"><div class="section-title"><h3>Reports · ${reports.length}</h3><span class="section-count">${reports.length}</span></div><p class="user-report-summary">${summary}</p>${reports.length ? `<div class="user-report-list">${reports.map((report) => `<button type="button" class="user-report-card" data-user-report="${data.reports.indexOf(report)}"><span><strong>${escapeActivityText(report.category)}</strong><small>Reported by ${escapeActivityText(report.reporterName)} · ${escapeActivityText(report.reportedAt || "Date not recorded").replace(/\s+ICT$/, "")}</small></span><span>${badge(reportStatusLabel(report), reportStatusTone(report))}</span></button>`).join("")}</div>` : '<p class="audit-note">No reports have been filed against this account.</p>'}</section>`;
}
function userActivitySection(user) {
  const quests = userQuestRecords(user);
  const count = (status) => quests.filter((quest) => quest.status === status).length;
  return `<section class="section user-activity"><h3>Activity summary</h3><div class="user-activity-list"><div><span>Completed quests</span><strong>${count("Completed")}</strong></div><div><span>Cancelled quests</span><strong>${count("Cancelled")}</strong></div><div><span>Disputed quests</span><strong>${count("Disputed")}</strong></div><div><span>Reports received</span><strong>${userReportsFor(user).length}</strong></div></div></section>`;
}
function userPayoutSection(user) {
  const pending = data.payouts.filter(
    (payout) => payout.title === user.title && ["Needs approval", "Processing"].includes(payout.status),
  );
  if (!pending.length) return "";
  const amount = pending.reduce((total, payout) => total + Number(payout.amount || 0), 0);
  return `<section class="section user-payout"><h3>Payout status</h3><div class="user-payout-summary"><span>Pending payout</span><strong>฿${fmt(amount)}</strong></div><p class="audit-note">Financial details remain in the dedicated payout review.</p><a class="btn full-width" href="/?view=payouts">View payouts</a></section>`;
}
function userHistorySection(user) {
  const history = Array.isArray(user.moderationHistory) && user.moderationHistory.length
    ? user.moderationHistory
    : [{ event: "Account created", at: user.accountCreatedAt || "Not recorded", by: "System", note: "Account created." }];
  return `<section class="section user-history"><h3>History</h3><div class="user-history-list">${history.map((entry) => `<article class="user-history-entry"><div><strong>${escapeActivityText(entry.event)}</strong><time>${escapeActivityText(entry.at || "Date not recorded")}</time></div>${entry.by ? `<small>By ${escapeActivityText(entry.by)}</small>` : ""}${entry.previousStatus || entry.newStatus ? `<small>Status: ${escapeActivityText(entry.previousStatus || "—")} → ${escapeActivityText(entry.newStatus || "—")}</small>` : ""}${entry.reason ? `<p>Reason: ${escapeActivityText(entry.reason)}</p>` : entry.note ? `<p>${escapeActivityText(entry.note)}</p>` : ""}</article>`).join("")}</div></section>`;
}
function userNotesSection(user) {
  const notes = Array.isArray(user.adminNotes) ? user.adminNotes : [];
  return `<section class="section user-notes"><div class="section-title"><h3>Admin notes</h3><button type="button" class="link" data-add-admin-note>Add note</button></div>${notes.length ? `<div class="user-notes-list">${notes.map((note) => `<article><div><strong>${escapeActivityText(note.at || "Date not recorded")}</strong><small>${escapeActivityText(note.by || "Admin")}</small></div><p>${escapeActivityText(note.note)}</p></article>`).join("")}</div>` : '<p class="audit-note">No internal notes recorded.</p>'}</section>`;
}
function userDrawerActions(user) {
  const reportButton = '<button class="btn" type="button" data-report-user>Report user</button>';
  if (["Temp ban", "Perm ban"].includes(user.status)) return reportButton;
  return `${reportButton}<button class="btn primary" data-penalty-user>Record violation</button>`;
}
function userReportDetailStatus(report) {
  return badge(reportStatusLabel(report), reportStatusTone(report));
}
function reportPenaltySummary(report) {
  if (report.status === "Active") return "Pending moderator resolution";
  if (report.decision === "no-violation" || report.decision === "do-nothing") return "No penalty applied";
  const label = report.decisionLabel || "Penalty applied";
  return report.decisionDays ? `${label} · ${report.decisionDays} days` : label;
}
function openUserReportDetails(user, report) {
  const isOpen = reportStatusLabel(report) === "Open";
  drawer.innerHTML = `<div class="drawer-top"><div><strong>${escapeActivityText(report.id)}</strong><small>Report details</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body user-report-detail"><div class="drawer-title"><span class="att-icon ${isOpen ? "warning" : "neutral"}">${ico("flag")}</span><div><h2>${escapeActivityText(report.category)}</h2><p>Reported user: ${escapeActivityText(user.title)}</p></div></div><section class="section"><h3>Report overview</h3><div class="user-context-list"><div><span>Status</span>${userReportDetailStatus(report)}</div><div><span>Reporter</span><strong>${escapeActivityText(report.reporterName)}</strong></div><div><span>Reported</span><strong>${escapeActivityText(report.reportedAt || "Date not recorded").replace(/\s+ICT$/, "")}</strong></div><div><span>Category</span><strong>${escapeActivityText(report.category)}</strong></div></div></section><section class="section"><h3>Description</h3><p>${escapeActivityText(report.details)}</p></section><section class="section"><h3>Evidence</h3>${report.evidence ? `<button class="evidence-item" data-report-evidence><span class="evidence-state">${ico("check")}</span><span><strong>${escapeActivityText(report.evidence)}</strong><small>Attached by ${escapeActivityText(report.reporterName)}</small></span><span>Open</span></button>` : '<p class="audit-note">No evidence or attachment was provided.</p>'}</section><section class="section"><h3>Resolution</h3>${isOpen ? '<div class="user-context-list"><div><span>Penalty</span><strong>Pending moderator resolution</strong></div></div>' : `<div class="user-context-list"><div><span>Outcome</span><strong>${escapeActivityText(report.resolution || report.decisionLabel || "Closed")}</strong></div><div><span>Penalty applied</span><strong>${escapeActivityText(reportPenaltySummary(report))}</strong></div><div><span>Resolved by</span><strong>${escapeActivityText(report.resolvedBy || "Admin")}</strong></div><div><span>Resolved</span><strong>${escapeActivityText(report.resolutionAt || report.closedAt || "Date not recorded").replace(/\s+ICT$/, "")}</strong></div></div>`}</section></div><div class="drawer-actions"><button class="btn" id="back-to-user">Back to user</button><a class="btn" href="/users/${encodeURIComponent(user.id)}">See full user profile</a><a class="btn primary" href="/reports/${encodeURIComponent(report.id)}">Open full report</a><button class="btn" id="close-user-report">Close record</button></div>`;
  drawer.querySelector("#close").onclick = closeDrawer;
  drawer.querySelector("#close-user-report").onclick = closeDrawer;
  drawer.querySelector("#back-to-user").onclick = () => {
    const trigger = drawerTrigger;
    openDrawer("users", data.users.indexOf(user));
    drawerTrigger = trigger;
  };
}
function openReportDrawer(index) {
  const report = data.reports[index];
  if (!report) return;
  showDrawerLayer();
  const isClosed = report.status === "Closed";
  drawer.innerHTML = `<div class="drawer-top"><div><strong>${report.id}</strong><small>User report</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body report-record ${isClosed ? "closed-record" : "open-record"}"><div class="drawer-title"><span class="att-icon ${isClosed ? "neutral" : "warning"}">${ico("flag")}</span><div><h2>Report against ${escapeActivityText(report.reportedUserName)}</h2><p>Submitted by ${escapeActivityText(report.reporterName)}</p></div></div><div class="case-alert"><span>${ico("flag")}</span><div><strong>${isClosed ? "Report closed — record retained" : "Open report — review is required"}</strong><p>${isClosed ? "This report is closed and retained as a read-only audit record." : "Review the submitted details and evidence before closing this report."}</p></div></div><section class="section"><h3>Report overview</h3><div class="facts"><div class="fact"><span>Status</span>${badge(report.status, report.tone || (isClosed ? "neutral" : "warning"))}</div><div class="fact"><span>Report type</span><strong>${escapeActivityText(report.category)}</strong></div><div class="fact"><span>Reported</span><strong>${escapeActivityText(report.reportedAt)}</strong></div></div></section><section class="section"><h3>Report detail</h3><p>${escapeActivityText(report.details)}</p></section><section class="section"><h3>People involved</h3><div class="facts"><div class="fact"><span>Reported user</span><strong>${escapeActivityText(report.reportedUserName)}</strong><small>${escapeActivityText(report.reportedUserId)}</small></div><div class="fact"><span>Reporting user</span><strong>${escapeActivityText(report.reporterName)}</strong><small>${escapeActivityText(report.reporterId)}</small></div></div></section><section class="section"><h3>Evidence</h3>${report.evidence ? `<button class="evidence-item" data-report-evidence><span class="evidence-state">${ico("check")}</span><span><strong>${escapeActivityText(report.evidence)}</strong><small>Attached by ${escapeActivityText(report.reporterName)}</small></span><span>Open</span></button>` : '<p class="audit-note">No evidence file attached.</p>'}</section>${isClosed && report.decisionReason ? `<section class="section"><h3>Closing note</h3><p>${escapeActivityText(report.decisionReason)}</p></section>` : ""}</div><div class="drawer-actions"><a class="btn" href="/reports/${encodeURIComponent(report.id)}">Full report detail</a><button class="btn" id="close-report-record">Close record</button>${isClosed ? "" : '<a class="btn primary" href="/reports/' + encodeURIComponent(report.id) + '">Review report</a>'}</div>`;
  if (!isClosed)
    drawer.querySelector(".case-alert strong").textContent =
      "Active report — review is required";
  if (!isClosed) {
    drawer.querySelector('.drawer-actions a[href^="/reports/"]')?.remove();
  }
  drawer.querySelector("#close").onclick = closeDrawer;
  scrim.onclick = closeDrawer;
  drawer.querySelector("#close-report-record").onclick = closeDrawer;
}
function openDrawer(v, i) {
  if (v === "reports") return openReportDrawer(i);
  if (v === "quests" || v === "disputes") return ensureDetailDrawer(v, i);
  const r = data[v][i],
    isP = v === "payouts",
    isD = v === "disputes";
  showDrawerLayer();
  const payoutContext = isP ? payoutDecisionContext(r) : null,
    payoutNeedsDecision = isP && r.status === "Needs approval",
    drawerContent =
      v === "users"
        ? `${userAccountSection(r)}${userModerationSection(r)}${userReportsSection(r)}${userActivitySection(r)}${userPayoutSection(r)}${userHistorySection(r)}${userNotesSection(r)}`
        : isD
          ? `<section class="section"><h3>Issue summary</h3><p>${escapeActivityText(r.detail)}</p></section><section class="section"><h3>Evidence on record</h3>${r.evidence.map((e) => { const parts = String(e).split(" · "); return `<div class="evidence"><strong>${escapeActivityText(parts[0])}</strong><small>${escapeActivityText(parts.slice(1).join(" · "))}</small></div>`; }).join("")}</section>`
          : isP
            ? `<section class="section"><h3>${escapeActivityText(payoutContext.heading)}</h3><p>${escapeActivityText(payoutContext.copy)}</p><p class="audit-note">${escapeActivityText(payoutContext.next)}</p></section>`
            : `<section class="section"><h3>Audit trail</h3>${timeline([r.status, "Record created"])}</section>`;
  const drawerActions = isP
      ? payoutNeedsDecision
        ? '<button class="btn" data-action="Reject payout">Reject payout</button><button class="btn primary" data-action="Approve payout">Approve payout</button>'
        : '<button class="btn" id="close-payout-record">Close record</button>'
      : v === "users"
        ? `${userDrawerActions(r)}<a class="btn" href="/users/${encodeURIComponent(r.id)}">See full user profile</a>`
        : '<button class="btn" data-action="Hide quest">Hide quest</button>';
  drawer.innerHTML = `<div class="drawer-top"><strong>${escapeActivityText(r.id)}</strong><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body"><div class="drawer-title"><span class="att-icon ${toneClass(r.tone)}">${ico(v === "payouts" ? "wallet" : v === "users" ? "user" : v === "quests" ? "quest" : "scale")}</span><div><h2>${escapeActivityText(r.title)}</h2><p>${escapeActivityText(r.person)} · ${escapeActivityText(r.other)}</p></div></div><div class="facts"><div class="fact"><span>Status</span>${badge(r.status, r.tone)}</div>${r.amount ? `<div class="fact"><span>${isP ? "Payout amount" : "Amount held"}</span><strong>฿${fmt(r.amount)}</strong></div>` : ""}<div class="fact"><span>Record</span><strong>${escapeActivityText(r.id)}</strong></div>${!isP && v !== "users" ? `<div class="fact"><span>Last activity</span><strong>${escapeActivityText(r.age)}</strong></div>` : ""}</div>${drawerContent}</div><div class="drawer-actions">${drawerActions}</div>`;
  if (isP) {
    drawer.querySelector(".facts")?.insertAdjacentHTML(
      "afterend",
      `${payoutTimingSection(r)}${payoutSummarySection(r)}`,
    );
    const historySection = document.createElement("section");
    historySection.className = "section payout-history";
    historySection.innerHTML = `<h3>Earning sources · ${completedPayoutQuests(r).length}</h3>${payoutQuestHistory(r)}`;
    const existingHistory = [...drawer.querySelectorAll(".section")].find(
      (section) => ["Quest history", "Earning sources"].some((title) => section.querySelector("h3")?.textContent.startsWith(title)),
    );
    const decisionSection = [...drawer.querySelectorAll(".section")].find(
      (section) => section.querySelector("h3")?.textContent === payoutContext.heading,
    );
    if (existingHistory) existingHistory.replaceWith(historySection);
    else decisionSection?.before(historySection);
    [
      `<section class="section payout-previous"><h3>Previous payouts</h3>${payoutPreviousHistory(r)}</section>`,
      payoutOutcomeSection(r),
    ].forEach((section) => decisionSection?.insertAdjacentHTML("beforebegin", section));
  }
  document.querySelector("#close").onclick = closeDrawer;
  scrim.onclick = closeDrawer;
  drawer.querySelector("#close-payout-record")?.addEventListener("click", closeDrawer);
  drawer.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.action === "Approve payout")
          return confirmPayoutApproval(r);
        if (b.dataset.action === "Reject payout")
          return confirmPayoutRejection(r);
        confirmAction(b.dataset.action, r, "", () => {
          applyDemoAction(b.dataset.action, r);
          persistAdminData();
          if (state.view === "home") renderHome();
          else render();
        });
      }),
  );
  drawer
    .querySelectorAll("[data-user-report]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const report = data.reports[Number(button.dataset.userReport)];
        if (report) openUserReportDetails(r, report);
      });
    });
  drawer
    .querySelector("[data-add-admin-note]")
    ?.addEventListener("click", () => openAdminNoteDialog(r));
  drawer
    .querySelector("[data-penalty-user]")
    ?.addEventListener("click", () => openPenaltyDialog(r));
  drawer
    .querySelector("[data-report-user]")
    ?.addEventListener("click", () => openUserReportDialog(r));
}

function openUserChat(user) {
  activeCustomLayerClose?.();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal" role="dialog" aria-modal="true" aria-label="Chat with ${user.title}"><div class="chat-modal-head"><div><strong>Chat with ${user.title}</strong><small>${user.id} · ${user.person}</small></div><button class="icon close-party-chat" aria-label="Close chat"><span class="close-lines"></span></button></div><div class="chat-thread">${chatMessage(user.title, "Today · 09:42", "Hello, I am available to clarify the information on my account.", "received")}${chatMessage("You", "Today · 09:47", "Please keep messages relevant to this marketplace review.", "sent")}</div><form class="chat-compose"><textarea rows="3" maxlength="500" placeholder="Message ${user.title}…" aria-label="Message ${user.title}"></textarea><div class="chat-compose-actions"><div class="chat-compose-tools"><label class="chat-attach btn" for="user-chat-attachment">${ico("paperclip")}<span>Attach file</span></label><input class="chat-attachment-input visually-hidden" id="user-chat-attachment" data-chat-attachment type="file"><span class="chat-attachment-name" data-chat-attachment-name aria-live="polite">No file attached</span></div><button class="btn primary" type="submit">Send message</button></div></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "textarea" });
  overlay.querySelector(".close-party-chat").onclick = close;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector("form");
  bindChatAttachment(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = overlay.querySelector("textarea"),
      message = input.value.trim();
    if (!message) return;
    overlay
      .querySelector(".chat-thread")
      .insertAdjacentHTML("beforeend", chatMessage("You", chatTimeLabel(), message, "sent"));
    input.value = "";
    recordActivity("Message sent", `${user.id} · ${user.title}`);
    toast(`Message saved to ${user.id}`);
  });
}

function openUserReportDialog(user) {
  activeCustomLayerClose?.();
  const reporters = data.users.filter((candidate) => candidate.id !== user.id);
  const reporterOptions = reporters
    .map((reporter) => `<option value="${reporter.id}">${reporter.title} · ${reporter.id}</option>`)
    .join("");
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal report-modal" role="dialog" aria-modal="true" aria-label="Report ${user.title}"><div class="chat-modal-head"><div><strong>Report user</strong><small>${user.title} · ${user.id}</small></div><button class="icon close-party-chat" aria-label="Close report form"><span class="close-lines"></span></button></div><form class="report-form"><p class="chat-intro">Record a report submitted by one KuQuest user about another. This report does not apply a penalty automatically.</p><label for="report-reporter">Reporting user<select id="report-reporter" name="reporter" required>${reporterOptions}</select></label><label for="report-category">Report type<select id="report-category" name="category" required><option>Harassment or abuse</option><option>Fraud or payment issue</option><option>Misleading quest activity</option><option>Other</option></select></label><label for="report-details">What happened?<textarea id="report-details" name="details" rows="5" minlength="20" maxlength="500" required placeholder="Describe what happened and what evidence supports the report…"></textarea></label><label class="report-file" for="report-attachment"><span>Evidence file (optional)</span><input id="report-attachment" type="file" data-report-attachment><small data-report-attachment-name>No file attached</small></label><p class="login-error report-error" role="alert" hidden></p><button class="btn danger" type="submit">Submit report</button></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "select[name=reporter]" });
  overlay.querySelector(".close-party-chat").onclick = close;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector("form"),
    attachmentInput = form.querySelector("[data-report-attachment]"),
    attachmentName = form.querySelector("[data-report-attachment-name]"),
    error = form.querySelector(".report-error");
  attachmentInput.addEventListener("change", () => {
    attachmentName.textContent = attachmentInput.files?.[0]?.name || "No file attached";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const details = form.elements.details.value.trim();
    if (details.length < 20) {
      error.textContent = "Describe the report in at least 20 characters.";
      error.hidden = false;
      form.elements.details.focus();
      return;
    }
    const reporter = reporters.find((candidate) => candidate.id === form.elements.reporter.value);
    if (!reporter) return;
    const report = {
      id: `RPT-${String(Date.now()).slice(-6)}`,
      reporterId: reporter.id,
      reporterName: reporter.title,
      reportedUserId: user.id,
      reportedUserName: user.title,
      category: form.elements.category.value,
      details,
      evidence: attachmentInput.files?.[0]?.name || "",
      status: "Active",
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

function addUserHistory(user, entry) {
  user.moderationHistory = [entry, ...(user.moderationHistory || [])];
}
function refreshUserAfterMutation(user) {
  if (window.__KUQUEST_USER_DETAIL__?.user === user) {
    window.__KUQUEST_USER_DETAIL__.render();
    return true;
  }
  if (state.view === "home") renderHome();
  else if (state.view === "users") render();
  return false;
}
const penaltyPolicy = Object.freeze({
  redFlagDays: 7,
  temporaryBanDays: 7,
  newUserExemptionCount: 10,
  postBanExemptionCount: 3,
});
function confirmedViolationCount(user) {
  const fallback = user.status === "Red Flag" ? 1 : user.status === "Temp ban" ? 2 : user.status === "Perm ban" ? 3 : 0;
  return Math.max(0, Number(user.confirmedViolationCount ?? fallback) || 0);
}
function redFlagExemptionFor(user) {
  const newUserRemaining = Math.max(0, Number(user.newUserExemptionRemaining) || 0);
  if (newUserRemaining) return { field: "newUserExemptionRemaining", remaining: newUserRemaining, label: "new user (PC-12)" };
  const postBanRemaining = Math.max(0, Number(user.postBanExemptionRemaining) || 0);
  if (postBanRemaining) return { field: "postBanExemptionRemaining", remaining: postBanRemaining, label: "post-ban (PC-13)" };
  return null;
}
function penaltyOutcomeFor(user) {
  const violationNumber = confirmedViolationCount(user) + 1;
  if (violationNumber === 1) {
    return { key: "red-flag", label: "Red Flag", status: "Red Flag", tone: "warning", durationDays: penaltyPolicy.redFlagDays };
  }
  if (violationNumber === 2) {
    return { key: "temporary-ban", label: "Temporary ban", status: "Temp ban", tone: "danger", durationDays: penaltyPolicy.temporaryBanDays };
  }
  return { key: "permanent-ban", label: "Permanent ban", status: "Perm ban", tone: "danger" };
}
function penaltyOutcomeLabel(outcome) {
  if (!outcome) return "No penalty determined";
  if (outcome.key === "red-flag-exempted") return "Red Flag exempted";
  return `${outcome.label}${outcome.durationDays ? ` · ${outcome.durationDays} days` : ""}`;
}
function consumeRedFlagExemption(user, exemption) {
  if (!exemption) return;
  user[exemption.field] = Math.max(0, exemption.remaining - 1);
}
function recordConfirmedViolation(user, reason, note) {
  const previousStatus = user.status;
  const appliedAt = adminDateTime();
  const appliedBy = currentAdminName();
  const violationNumber = confirmedViolationCount(user) + 1;
  const nextOutcome = penaltyOutcomeFor(user);
  const exemption = nextOutcome.key === "red-flag" ? redFlagExemptionFor(user) : null;
  const outcome = exemption
    ? { ...nextOutcome, key: "red-flag-exempted", status: "Normal", tone: "success", durationDays: null }
    : nextOutcome;
  user.confirmedViolationCount = violationNumber;
  consumeRedFlagExemption(user, exemption);
  let expiresAt = "";
  if (outcome.durationDays) {
    const expires = new Date();
    expires.setDate(expires.getDate() + outcome.durationDays);
    expiresAt = adminDateTime(expires);
  }
  const event = outcome.key === "red-flag-exempted"
    ? "Violation recorded (Red Flag exempted)"
    : `${outcome.label} applied`;
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
    user.penalty = {
      label: outcome.label,
      reason,
      recordedAt: appliedAt,
      appliedBy,
      ...(outcome.durationDays ? { durationDays: outcome.durationDays } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    };
  }
  user.age = outcome.key === "red-flag-exempted"
    ? "Violation recorded · Red Flag exempted"
    : expiresAt
      ? `${outcome.status} · expires ${expiresAt}`
      : outcome.status;
  addUserHistory(user, {
    event,
    at: appliedAt,
    by: appliedBy,
    reason,
    previousStatus,
    newStatus: outcome.status,
    violationNumber,
    outcome: penaltyOutcomeLabel(outcome),
  });
  if (note) user.adminNotes = [{ at: appliedAt, by: appliedBy, note }, ...(user.adminNotes || [])];
  refreshNavigationCounts();
  return outcome;
}
function openPenaltyDialog(user) {
  activeCustomLayerClose?.();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal" role="dialog" aria-modal="true" aria-label="Confirm violation for ${escapeActivityText(user.title)}"><div class="chat-modal-head"><div><strong>Confirm violation</strong><small>${escapeActivityText(user.title)} · ${escapeActivityText(user.id)}</small></div><button class="icon close-party-chat" aria-label="Close penalty form"><span class="close-lines"></span></button></div><form class="penalty-form"><p class="chat-intro">Confirm that this account committed an actual policy violation. The SRS penalty ladder applies the next consequence automatically.</p><section class="penalty-policy-note" aria-label="Penalty ladder"><strong>Penalty ladder</strong><span>1st violation: Red Flag · 7 days</span><span>2nd violation: Temporary ban · 7 days</span><span>3rd violation: Permanent ban</span></section><section class="penalty-preview" data-penalty-preview aria-live="polite"></section><label for="penalty-reason">Reason for confirmed violation<textarea id="penalty-reason" name="reason" rows="3" minlength="8" maxlength="500" required aria-describedby="penalty-reason-help penalty-error" placeholder="State the evidence and policy behind this violation…"></textarea><small id="penalty-reason-help">Enter 8–500 characters explaining the evidence and policy.</small></label><label for="penalty-note">Internal admin note (optional)<textarea id="penalty-note" name="note" rows="2" maxlength="500" placeholder="Add context for authorized moderators…"></textarea></label><p class="login-error penalty-error" id="penalty-error" role="alert" hidden></p><button class="btn danger" type="submit">Confirm violation</button></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "#penalty-reason" });
  overlay.querySelector(".close-party-chat").onclick = close;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector("form");
  const preview = form.querySelector("[data-penalty-preview]");
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
    const error = form.querySelector(".penalty-error");
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
    if (!refreshUserAfterMutation(user)) openDrawer("users", data.users.indexOf(user));
    toast(`${penaltyOutcomeLabel(outcome)} recorded for ${user.title}.`);
  });
  updateFields();
}
function openAdminNoteDialog(user) {
  activeCustomLayerClose?.();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal" role="dialog" aria-modal="true" aria-label="Add admin note for ${escapeActivityText(user.title)}"><div class="chat-modal-head"><div><strong>Add admin note</strong><small>${escapeActivityText(user.title)} · ${escapeActivityText(user.id)}</small></div><button class="icon close-party-chat" aria-label="Close admin note form"><span class="close-lines"></span></button></div><form class="penalty-form admin-note-form"><p class="chat-intro">This note is visible only to authorized moderation staff.</p><label>Internal note<textarea name="note" rows="5" minlength="4" maxlength="500" required placeholder="Record useful moderation context…"></textarea></label><p class="login-error penalty-error" role="alert" hidden></p><button class="btn primary" type="submit">Save note</button></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "textarea" });
  overlay.querySelector(".close-party-chat").onclick = close;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector("form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = form.elements.note.value.trim();
    const error = form.querySelector(".penalty-error");
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
function applyDemoAction(action, record) {
  const transitions = {
    "Restrict user": ["Temp ban", "danger"],
    "Set normal": ["Normal", "success"],
    "Lift penalty": ["Normal", "success"],
    "Hide quest": ["Hidden", "neutral"],
    "Approve quest": ["Approved", "success"],
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
function refreshNavigationCounts() {
  const counts = {
    disputes: data.disputes.filter((record) => record.status === "Active").length,
    payouts: data.payouts.filter((record) => record.status === "Needs approval").length,
    reports: data.reports.filter((record) => record.status === "Active").length,
  };
  Object.entries(counts).forEach(([view, count]) => {
    const counter = document.querySelector(`[data-view="${view}"] b`);
    if (counter) counter.textContent = count;
  });
}
function applyReportDecision(report, decision, reason) {
  const user = data.users.find((candidate) => candidate.id === report.reportedUserId),
    resolvedAt = adminDateTime(),
    resolvedBy = currentAdminName();
  const outcome = decision === "confirmed-violation" && user
    ? recordConfirmedViolation(user, reason, "")
    : null;
  report.status = "Closed";
  report.tone = "neutral";
  report.closedAt = reportDateTime();
  report.decision = decision;
  report.decisionLabel = decision === "no-violation"
    ? "No violation"
    : `Violation confirmed · ${penaltyOutcomeLabel(outcome)}`;
  report.decisionDays = outcome?.durationDays || null;
  report.decisionReason = reason;
  report.resolution = decision === "no-violation"
    ? "Report dismissed; no policy violation found."
    : `${report.decisionLabel}.`;
  report.resolvedBy = resolvedBy;
  report.resolutionAt = resolvedAt;
  if (!user) {
    refreshNavigationCounts();
    return;
  }
  if (decision === "no-violation") {
    addUserHistory(user, { event: "Report dismissed", at: resolvedAt, by: resolvedBy, reason, previousStatus: user.status, newStatus: user.status });
  }
  refreshNavigationCounts();
}
function timelineDetail(title, index) {
  if (index === 0) return "Current state recorded in the audit trail";
  if (/^Quest published/i.test(title)) {
    return "The quest became available under its published terms";
  }
  if (/Applications received/i.test(title)) {
    return "Applicants were recorded for review against the quest requirements";
  }
  if (/Applications closed/i.test(title)) {
    return "The application window closed and no further applications were accepted";
  }
  if (/selected|accepted the terms/i.test(title)) {
    return "Participant selection and acceptance were recorded for this quest";
  }
  if (/proposed terms change|change pending/i.test(title)) {
    return "A proposed change is waiting for participant consent";
  }
  if (/submitted|evidence/i.test(title)) {
    return "Submitted evidence was added to the record for review";
  }
  if (/field work started|work started/i.test(title)) {
    return "The assigned participant began work on the quest";
  }
  if (/identity matched/i.test(title)) {
    return "The account identity check was completed";
  }
  if (/account ownership verified/i.test(title)) {
    return "The payout account was confirmed for the participant";
  }
  if (/quest funds reserved/i.test(title)) {
    return "Quest funds were reserved for this payout";
  }
  if (/record created/i.test(title)) {
    return "This record was added to the audit trail";
  }
  return "This event was recorded in the audit trail";
}
function timeline(items, options = {}) {
  return `<ul class="timeline">${items
    .map((item, index) => {
      const rawParts = typeof item === "string" ? String(item).split(" · ") : [];
      const entry =
        typeof item === "string"
          ? {
              title: rawParts.shift() || "Quest activity",
              detail: rawParts.join(" · "),
            }
          : item,
        parts = String(entry.detail || "").split(" · "),
        timeParts = entry.time ? 0 : parts.length > 2 ? 2 : parts.length > 1 ? 1 : 0,
        time = (entry.time || parts.slice(0, timeParts).join(" · ")).replace(/\s+ICT$/, ""),
        detail = entry.time
          ? entry.detail
          : parts.slice(timeParts).join(" · ") || timelineDetail(entry.title, index);
      return `<li><strong>${escapeActivityText(entry.title)}</strong>${time ? `<time>${escapeActivityText(time)}</time>` : ""}${options.showDetails === false || entry.showDetails === false ? "" : `<span>${escapeActivityText(detail)}</span>`}</li>`;
    })
    .join("")}</ul>`;
}
function closeDrawer() {
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
    if (restore?.isConnected) restore.focus();
  }, 220);
}
const deferredDrawerScripts = {
  quests: ["/legacy/quest-detail.js?v=39"],
  disputes: [
    "/legacy/dispute-detail.js?v=33",
    "/legacy/dispute-interactions.js?v=10",
  ],
};
const deferredDrawerLoads = new Map();
function loadDeferredLegacyScript(src) {
  if (deferredDrawerLoads.has(src)) return deferredDrawerLoads.get(src);
  const existing = [...document.scripts].find((script) => script.src.includes(src));
  const load = existing
    ? new Promise((resolve, reject) => {
        if (existing.dataset.kuquestLegacyLoaded === "true") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      })
    : new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.dataset.kuquestLegacy = "true";
        script.addEventListener("load", () => {
          script.dataset.kuquestLegacyLoaded = "true";
          resolve();
        }, { once: true });
        script.addEventListener("error", reject, { once: true });
        document.body.append(script);
      });
  deferredDrawerLoads.set(src, load);
  return load;
}
function ensureDetailDrawer(view, index) {
  const opener = view === "quests" ? "openQuestDrawer" : "openDisputeDrawer";
  if (typeof window[opener] === "function") {
    window[opener](index);
    return;
  }
  const scripts = deferredDrawerScripts[view] || [];
  scripts
    .reduce((promise, src) => promise.then(() => loadDeferredLegacyScript(src)), Promise.resolve())
    .then(() => window[opener]?.(index))
    .catch((error) => console.error(`Could not open ${view} details`, error));
}
const dialog = document.querySelector("#confirm");
function confirmAction(a, r, decisionDetail = "", onConfirm, options = {}) {
  if (!dialog) return;
  const form = document.querySelector("#confirm-form"),
    reason = document.querySelector("#confirm-reason"),
    error = document.querySelector("#confirm-reason-error"),
    count = document.querySelector("#confirm-reason-count"),
    confirmButton = document.querySelector("#confirm-btn");
  resetConfirmationDialog();
  document.querySelector("#confirm-title").textContent = a;
  document.querySelector("#confirm-copy").textContent =
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
    if (event.submitter?.value === "confirm" && !validate()) {
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
function payoutDateTime(date = new Date()) {
  return reportDateTime(date).replace(/\s+ICT$/, "");
}
function payoutAdminName() {
  return "Nicha P.";
}
function payoutConfirmationSummary(record) {
  const financials = payoutFinancials(record);
  return `<div class="payout-confirm-summary"><div><span>Recipient</span><strong>${escapeActivityText(record.title)}</strong></div><div><span>Payout amount</span><strong>฿${fmt(record.amount)}</strong></div><div><span>Bank / payout destination</span><strong>${escapeActivityText(record.person)}</strong></div><div><span>Available balance</span><strong>฿${fmt(financials.available)}</strong></div><div><span>Remaining after payout</span><strong>฿${fmt(financials.remaining)}</strong></div></div><p class="payout-confirm-note">Approving this payout changes its status to Processing. Funds are not transferred immediately.</p>`;
}
function resetConfirmationDialog() {
  const context = document.querySelector("#confirm-context"),
    reason = document.querySelector("#confirm-reason"),
    reasonLabel = reason?.closest("label"),
    help = document.querySelector("#confirm-reason-help"),
    error = document.querySelector("#confirm-reason-error"),
    count = document.querySelector("#confirm-reason-count"),
    confirmButton = document.querySelector("#confirm-btn");
  if (context) {
    context.hidden = true;
    context.innerHTML = "";
  }
  if (reasonLabel) {
    reasonLabel.hidden = false;
    if (reasonLabel.firstChild) reasonLabel.firstChild.textContent = "Reason for this decision ";
    if (!reasonLabel.querySelector('span[aria-hidden="true"]')) {
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
function finishPayoutAction(record, action, onComplete) {
  persistAdminData();
  closeDrawer();
  if (state.view === "home") renderHome();
  else render();
  onComplete?.();
  recordActivity(action, `${record.id} · ${record.title}`);
  toast(`${action} recorded for ${record.id}.`);
}
function confirmPayoutApproval(record) {
  if (!dialog) return;
  if (autoRejectUnavailablePayout(record)) {
    finishPayoutAction(record, "Auto-reject payout");
    return;
  }
  const form = document.querySelector("#confirm-form"),
    reason = document.querySelector("#confirm-reason"),
    reasonLabel = reason?.closest("label"),
    help = document.querySelector("#confirm-reason-help"),
    error = document.querySelector("#confirm-reason-error"),
    count = document.querySelector("#confirm-reason-count"),
    context = document.querySelector("#confirm-context"),
    confirmButton = document.querySelector("#confirm-btn");
  resetConfirmationDialog();
  document.querySelector("#confirm-title").textContent = "Approve payout";
  document.querySelector("#confirm-copy").textContent =
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
    if (event.submitter?.value !== "confirm") return;
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
      record.status = "Processing";
      record.tone = "info";
      record.approvedAt = payoutDateTime();
      record.approvedBy = payoutAdminName();
      record.approvalReason = approvalReason;
      finishPayoutAction(record, "Approve payout", () => {
        recordActivity("Payout approval reason", `${record.id} · ${approvalReason}`);
      });
    },
    { once: true },
  );
  dialog.showModal();
  requestAnimationFrame(() => reason.focus());
}
function confirmPayoutRejection(record) {
  if (!dialog) return;
  const form = document.querySelector("#confirm-form"),
    reason = document.querySelector("#confirm-reason"),
    reasonLabel = reason?.closest("label"),
    help = document.querySelector("#confirm-reason-help"),
    error = document.querySelector("#confirm-reason-error"),
    count = document.querySelector("#confirm-reason-count"),
    context = document.querySelector("#confirm-context"),
    confirmButton = document.querySelector("#confirm-btn");
  resetConfirmationDialog();
  document.querySelector("#confirm-title").textContent = "Reject payout";
  document.querySelector("#confirm-copy").textContent =
    "Choose a reason for rejecting this payout. An admin note is optional.";
  context.hidden = false;
  context.innerHTML = `<div class="payout-rejection-fields"><label for="payout-rejection-reason">Rejection reason <span aria-hidden="true">*</span></label><select id="payout-rejection-reason"><option value="">Choose a reason</option><option>Bank account name does not match the verified account holder.</option><option>Recipient account could not be verified.</option><option>Insufficient withdrawable balance.</option><option>Duplicate payout request.</option></select></div>`;
  reasonLabel.firstChild.textContent = "Admin note (optional)";
  reasonLabel.querySelector("span")?.remove();
  reason.required = false;
  reason.placeholder = "Add context for the rejection (optional)…";
  help.hidden = true;
  error.hidden = true;
  count.textContent = "0 / 500";
  confirmButton.textContent = "Reject payout";
  confirmButton.className = "btn danger";
  confirmButton.disabled = true;
  const choice = context.querySelector("#payout-rejection-reason");
  const validate = () => {
    const valid = Boolean(choice.value);
    confirmButton.disabled = !valid;
    error.hidden = true;
    return valid;
  };
  choice.addEventListener("change", validate);
  form.onsubmit = (event) => {
    if (event.submitter?.value !== "confirm") return;
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
      record.status = "Rejected";
      record.tone = "danger";
      record.rejectedAt = payoutDateTime();
      record.rejectedBy = payoutAdminName();
      record.rejectionReason = choice.value;
      record.rejectionNote = adminNote;
      record.remainingBalance = payoutFinancials(record).available;
      finishPayoutAction(record, "Reject payout", () => {
        recordActivity("Payout rejection reason", `${record.id} · ${choice.value}${adminNote ? ` · ${adminNote}` : ""}`);
      });
    },
    { once: true },
  );
  dialog.showModal();
  requestAnimationFrame(() => choice.focus());
}
function toast(s) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `${ico("check")}<span>${escapeActivityText(s)}</span>`;
  document.querySelector("#toasts")?.append(t);
  setTimeout(() => t.remove(), 3500);
}
const command = document.querySelector("#command"),
  g = document.querySelector("#global-search"),
  results = document.querySelector("#results");
let closeCommandLayer = null;
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
function search(q) {
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
  results.querySelectorAll("[data-result]").forEach(
    (b) =>
      (b.onclick = () => {
        const [v, i] = b.dataset.result.split(":");
        closeSearch();
        openDrawer(v, +i);
      }),
  );
}
document.querySelector("#open-search")?.addEventListener("click", openSearch);
if (g) g.oninput = (e) => search(e.target.value);
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
    if (document.querySelector(".sidebar.open")) setMobileNavigation(false);
  }
});
const sidebar = document.querySelector(".sidebar"),
  menuButton = document.querySelector("#menu"),
  closeMenuButton = document.querySelector("#close-menu"),
  mobileNavigationQuery = matchMedia("(max-width: 900px)");
function setMobileNavigation(open) {
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
  if (expanded) sidebar.querySelector("button")?.focus();
  else if (open === false && menuButton) menuButton.focus();
}
menuButton?.addEventListener("click", () =>
  setMobileNavigation(!sidebar?.classList.contains("open")),
);
closeMenuButton?.addEventListener("click", () => setMobileNavigation(false));
mobileNavigationQuery.addEventListener("change", () => setMobileNavigation(false));
setMobileNavigation(false);
render();
