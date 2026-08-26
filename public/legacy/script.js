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
  state = { view: initialView, tab: "all", query: "" },
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
      "disputed",
      "completed",
      "hidden",
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
      .filter((record) => ["Flag", "Temp ban", "Perm ban"].includes(record.status))
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
    .slice(0, 5);
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
    heldAmount = activeDisputes.reduce((total, record) => total + (record.amount || 0), 0),
    pendingPayouts = data.payouts.filter((record) => record.status === "Needs approval"),
    pendingAmount = pendingPayouts.reduce((total, record) => total + (record.amount || 0), 0),
    reviewUsers = data.users.filter((record) => ["Flag", "Temp ban", "Perm ban"].includes(record.status)),
    openReports = data.reports.filter((record) => record.status === "Active"),
    workLeft = [
      ...activeDisputes,
      ...openReports,
      ...pendingPayouts,
    ],
    statusCounts = ["Open", "Assigned", "In progress", "Submitted", "Change pending", "Rework", "Disputed", "Completed", "Cancelled"].map((status) => [status, data.quests.filter((record) => record.status === status).length]);
  main.innerHTML = `${pageHead("Overview", "A live snapshot of marketplace risk, money, and work in progress.", '<button class="btn primary" data-jump="disputes">Open review queue</button>')}<section class="dashboard-stats"><div class="stat"><span>Active disputes</span><strong>${activeDisputes.length}</strong><small>฿${fmt(heldAmount)} currently held</small></div><div class="stat"><span>Payouts needing review</span><strong>${pendingPayouts.length}</strong><small>฿${fmt(pendingAmount)} awaiting action</small></div><div class="stat"><span>Users needing attention</span><strong>${reviewUsers.length}</strong><small>Review or restricted accounts</small></div><div class="stat"><span>Total work left</span><strong>${workLeft.length}</strong><small>Not completed, cancelled, or hidden</small></div></section><div class="grid dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Needs a decision</h2><p>Showing ${decisions.length} latest dispute/report records</p></div><button class="link" data-jump="activity">View activity</button></div>${decisions.length ? decisions.map((item) => attention(item.view, data[item.view].indexOf(item.record), item.record.tone, item.icon, item.title, item.detail, item.metric, item.age || item.record.age)).join("") : '<div class="empty"><h3>No decisions waiting</h3><p>All current records are clear or processing normally.</p></div>'}</section><aside><section class="panel"><div class="panel-head"><div><h2>Quest flow</h2><p>Current marketplace distribution</p></div><button class="link" data-jump="quests">Open quests</button></div><div class="dashboard-status-list">${statusCounts.map(([status, count]) => `<div><span>${badge(status, status === "Disputed" ? "danger" : ["Submitted", "Change pending"].includes(status) ? "warning" : status === "In progress" ? "info" : "success")}</span><strong>${count}</strong></div>`).join("")}</div></section><section class="panel dashboard-activity"><div class="panel-head"><div><h2>Recent activity</h2><p>Latest administrative trail</p></div></div>${activityList().slice(0, 3).join("")}</section></aside></div><div class="dashboard-lower"><section class="panel"><div class="panel-head"><div><h2>Payout watch</h2><p>Money movement requiring a closer look</p></div><button class="link" data-jump="payouts">Open payouts</button></div>${pendingPayouts.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="payouts:${data.payouts.indexOf(record)}"><span><strong>${record.id}</strong><small>${record.title} · ${record.status}</small></span><strong>฿${fmt(record.amount)}</strong><span>${badge(record.status, record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No payouts need review</h3><p>Processing and completed payouts are moving normally.</p></div>'}</section><section class="panel"><div class="panel-head"><div><h2>User watch</h2><p>Accounts that may need a moderator</p></div><button class="link" data-jump="users">Open users</button></div>${reviewUsers.slice(0, 3).map((record) => `<button class="dashboard-row" data-open="users:${data.users.indexOf(record)}"><span><strong>${record.title}</strong><small>${record.id} · ${record.age}</small></span><span>${badge(record.status, record.tone)}</span></button>`).join("") || '<div class="empty"><h3>No user reviews</h3><p>All accounts are currently in good standing.</p></div>'}</section></div>`;
  main.querySelector(".page-head > div > p")?.remove();
  main.querySelectorAll(".dashboard-stats .stat:nth-child(-n + 2) small").forEach((node) => node.remove());
  const decisionsHeading = main.querySelector(".dashboard-grid > .panel h2");
  if (decisionsHeading) decisionsHeading.textContent = "Latest dispute/report";
  const lowerHeadings = main.querySelectorAll(".dashboard-lower .panel h2");
  if (lowerHeadings[0]) lowerHeadings[0].textContent = "Recent Payout Request";
  if (lowerHeadings[1]) lowerHeadings[1].textContent = "Recent User penalty";
  const workLeftStat = main.querySelector(".dashboard-stats .stat:nth-child(4)");
  if (workLeftStat) {
    workLeftStat.querySelector("small").textContent =
      "Active disputes, active reports, and pending payouts";
    workLeftStat.classList.add("dashboard-stat-work-left");
  }
  const openReportStat = main.querySelector(".dashboard-stats .stat:nth-child(3)");
  if (openReportStat) {
    openReportStat.querySelector("span").textContent = "Active report";
    openReportStat.querySelector("strong").textContent = openReports.length;
    openReportStat.querySelector("small").textContent = "Reports awaiting review";
  }
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
  const seeded = [
    [
      "RS",
      "You reviewed DSP-4106",
      "Dorm lighting audit · nighttime evidence requested",
      "24 minutes ago",
    ],
    ["TP", "Thanida approved PAY-8611", "฿2,800 payout for transport survey", "1 hour ago"],
    [
      "NL",
      "Nicha reviewed Kittipong Manee",
      "Translation case · restriction remains active",
      "3 hours ago",
    ],
    [
      "RS",
      "You changed QST-9407",
      "Participant consent is pending",
      "Yesterday, 16:42",
    ],
  ];
  const saved = readActivityEvents().map((event) => [
    event.actor || "NP",
    event.title,
    event.detail,
    formatActivityTime(event.timestamp),
  ]);
  return [...saved, ...seeded].map(
    (a) =>
      `<ul class="activity"><li><span class="avatar">${escapeActivityText(a[0])}</span><span><strong>${escapeActivityText(a[1])}</strong><p>${escapeActivityText(a[2])}</p><time>${escapeActivityText(a[3])}</time></span></li></ul>`,
  );
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
  return `${datePart} · ${timePart} ICT`;
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
function readActivityEvents() {
  try {
    const events = JSON.parse(localStorage.getItem(activityStorageKey) || "[]");
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
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
    // Keep the seeded audit trail available if browser storage is blocked.
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
            ? ["All", "Open", "Assigned", "In progress", "Submitted", "Change pending", "Rework", "Disputed", "Completed", "Cancelled", "Hidden"]
            : v === "reports"
              ? ["All", "Active", "Closed"]
              : ["All", "Normal", "Flag", "Temp ban", "Perm ban"];
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
        ? ["Quest", "Title", "Giver", "Tag", "Wage", "Status"]
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
        state.tab = b.dataset.tab;
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
      copy: "The bank transfer did not complete. Verify the payout details before creating a new payout request.",
      next: "No retry is available from this record.",
    },
  };
  return contexts[record.status] || contexts["Needs approval"];
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
        `<a class="payout-quest-history-row" href="/quests/${encodeURIComponent(quest.id)}"><span><strong>${escapeActivityText(quest.id)} · ${escapeActivityText(quest.title)}</strong><small>${quest.teamQuest ? "Team quest" : "Individual quest"} · Completed</small></span><strong>฿${fmt(quest.amount)}</strong></a>`,
    )
    .join("")}</div>`;
}
function openReportDrawer(index) {
  const report = data.reports[index];
  if (!report) return;
  showDrawerLayer();
  const isClosed = report.status === "Closed",
    nextAction = isClosed ? "Reopen report" : "Review report";
  drawer.innerHTML = `<div class="drawer-top"><div><strong>${report.id}</strong><small>User report</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body report-record ${isClosed ? "closed-record" : "open-record"}"><div class="drawer-title"><span class="att-icon ${isClosed ? "neutral" : "warning"}">${ico("flag")}</span><div><h2>Report against ${escapeActivityText(report.reportedUserName)}</h2><p>Submitted by ${escapeActivityText(report.reporterName)}</p></div></div><div class="case-alert"><span>${ico("flag")}</span><div><strong>${isClosed ? "Report closed — record retained" : "Open report — review is required"}</strong><p>${isClosed ? "This report is closed and retained as a read-only audit record." : "Review the submitted details and evidence before closing this report."}</p></div></div><section class="section"><h3>Report overview</h3><div class="facts"><div class="fact"><span>Status</span>${badge(report.status, report.tone || (isClosed ? "neutral" : "warning"))}</div><div class="fact"><span>Report type</span><strong>${escapeActivityText(report.category)}</strong></div><div class="fact"><span>Reported</span><strong>${escapeActivityText(report.reportedAt)}</strong></div></div></section><section class="section"><h3>What was reported</h3><p>${escapeActivityText(report.details)}</p></section><section class="section"><h3>People involved</h3><div class="facts"><div class="fact"><span>Reported user</span><strong>${escapeActivityText(report.reportedUserName)}</strong><small>${escapeActivityText(report.reportedUserId)}</small></div><div class="fact"><span>Reporting user</span><strong>${escapeActivityText(report.reporterName)}</strong><small>${escapeActivityText(report.reporterId)}</small></div></div></section><section class="section"><h3>Evidence</h3>${report.evidence ? `<div class="evidence"><strong>${escapeActivityText(report.evidence)}</strong><small>Attached by ${escapeActivityText(report.reporterName)}</small></div>` : '<p class="audit-note">No evidence file attached.</p>'}</section>${isClosed && report.decisionReason ? `<section class="section"><h3>Closing note</h3><p>${escapeActivityText(report.decisionReason)}</p></section>` : ""}</div><div class="drawer-actions"><a class="btn" href="/reports/${encodeURIComponent(report.id)}">Full report detail</a><button class="btn" id="close-report-record">Close record</button><button class="btn primary" data-action="${nextAction}">${nextAction}</button></div>`;
  if (!isClosed)
    drawer.querySelector(".case-alert strong").textContent =
      "Active report — review is required";
  if (!isClosed) {
    const reviewButton = drawer.querySelector("[data-action]");
    const reviewLink = document.createElement("a");
    reviewLink.className = "btn primary";
    reviewLink.href = `/reports/${encodeURIComponent(report.id)}`;
    reviewLink.textContent = nextAction;
    reviewButton?.replaceWith(reviewLink);
  }
  drawer.querySelector("#close").onclick = closeDrawer;
  scrim.onclick = closeDrawer;
  drawer.querySelector("#close-report-record").onclick = closeDrawer;
  drawer.querySelector("[data-action]")?.addEventListener("click", (button) => {
    const action = button.currentTarget.dataset.action;
    confirmAction(action, report, `This will update ${report.id} and keep the submitted report record available to admins.`, () => {
      applyDemoAction(action, report);
      persistAdminData();
      render();
    });
  });
}
function openDrawer(v, i) {
  if (v === "reports") return openReportDrawer(i);
  if (v === "quests" || v === "disputes") return ensureDetailDrawer(v, i);
  const r = data[v][i],
    isP = v === "payouts",
    isD = v === "disputes",
    hasPenalty =
      v === "users" &&
      (Boolean(r.penalty) || ["Flag", "Temp ban", "Perm ban"].includes(r.status));
  showDrawerLayer();
  const payoutContext = isP ? payoutDecisionContext(r) : null,
    payoutQuest = isP
      ? data.quests.find((quest) => quest.id === payoutQuestId(r))
      : null,
    payoutQuestLink = payoutQuest
      ? `<a class="btn" href="/quests/${encodeURIComponent(payoutQuest.id)}">See quest</a>`
      : "",
    payoutNeedsDecision = isP && r.status === "Needs approval",
    drawerActions = isP
      ? payoutNeedsDecision
        ? `${payoutQuestLink}<button class="btn" data-action="Reject payout">Reject payout</button><button class="btn primary" data-action="Approve payout">Approve payout</button>`
        : `${payoutQuestLink}<button class="btn" id="close-payout-record">Close record</button>`
      : v === "users"
        ? `<button class="btn" data-chat-user>Chat with user</button><button class="btn" data-penalty-user>Apply penalty</button>${hasPenalty ? '<button class="btn primary" data-action="Lift penalty">Lift penalty</button>' : '<button class="btn primary" data-action="Set normal">Set normal</button>'}`
        : '<button class="btn" data-action="Hide quest">Hide quest</button>';
  drawer.innerHTML = `<div class="drawer-top"><strong>${escapeActivityText(r.id)}</strong><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div><div class="drawer-body"><div class="drawer-title"><span class="att-icon ${toneClass(r.tone)}">${ico(v === "payouts" ? "wallet" : v === "users" ? "user" : v === "quests" ? "quest" : "scale")}</span><div><h2>${escapeActivityText(r.title)}</h2><p>${escapeActivityText(r.person)} · ${escapeActivityText(r.other)}</p></div></div><div class="facts"><div class="fact"><span>Status</span>${badge(r.status, r.tone)}</div>${r.amount ? `<div class="fact"><span>${isP ? "Payout amount" : "Amount held"}</span><strong>฿${fmt(r.amount)}</strong></div>` : ""}<div class="fact"><span>Record</span><strong>${escapeActivityText(r.id)}</strong></div>${!isP && v !== "users" ? `<div class="fact"><span>Last activity</span><strong>${escapeActivityText(r.age)}</strong></div>` : ""}</div>${isD ? `<section class="section"><h3>Issue summary</h3><p>${escapeActivityText(r.detail)}</p></section><section class="section"><h3>Evidence on record</h3>${r.evidence.map((e) => { const parts = String(e).split(" · "); return `<div class="evidence"><strong>${escapeActivityText(parts[0])}</strong><small>${escapeActivityText(parts.slice(1).join(" · "))}</small></div>`; }).join("")}</section>` : ""}${isP ? `<section class="section"><h3>${escapeActivityText(payoutContext.heading)}</h3><p>${escapeActivityText(payoutContext.copy)}</p><p class="audit-note">${escapeActivityText(payoutContext.next)}</p></section>` : ""}${!isP ? `<section class="section"><h3>${v === "users" ? "History" : "Audit trail"}</h3>${timeline([r.status, "Record created"])}</section>` : ""}</div><div class="drawer-actions">${drawerActions}</div>`;
  if (isP) {
    const historySection = document.createElement("section");
    historySection.className = "section payout-history";
    historySection.innerHTML = `<h3>Completed quest history · ${completedPayoutQuests(r).length}</h3>${payoutQuestHistory(r)}`;
    const existingHistory = [...drawer.querySelectorAll(".section")].find(
      (section) => section.querySelector("h3")?.textContent === "Quest history",
    );
    const decisionSection = [...drawer.querySelectorAll(".section")].find(
      (section) => section.querySelector("h3")?.textContent === payoutContext.heading,
    );
    if (existingHistory) existingHistory.replaceWith(historySection);
    else decisionSection?.before(historySection);
  }
  if (v === "users") {
    drawer.querySelector("[data-chat-user]")?.remove();
    const reportButton = document.createElement("button");
    reportButton.className = "btn";
    reportButton.dataset.reportUser = "";
    reportButton.textContent = "Report user";
    drawer.querySelector(".drawer-actions")?.prepend(reportButton);
  }
  const userReports =
    v === "users"
      ? (data.reports || []).filter((report) => report.reportedUserId === r.id)
      : [];
  if (userReports.length) {
    const reportSection = document.createElement("section");
    reportSection.className = "section report-list";
    reportSection.innerHTML = `<div class="section-title"><h3>Reports</h3><span class="section-count">${userReports.length}</span></div>${userReports.map((report) => `<div class="evidence"><strong>${escapeActivityText(report.category)}</strong><small>Reported by ${escapeActivityText(report.reporterName)} · ${escapeActivityText(report.status)}</small></div>`).join("")}`;
    drawer.querySelector(".drawer-body")?.append(reportSection);
  }
  if (v === "users" && r.penalty) {
    const enforcement = document.createElement("section");
    enforcement.className = "section enforcement-record";
    enforcement.innerHTML = `<h3>Current enforcement</h3><strong>${escapeActivityText(r.penalty.label)}</strong><p>${escapeActivityText(r.penalty.reason)}</p><small>Recorded ${escapeActivityText(r.penalty.recordedAt)}</small>`;
    drawer.querySelector(".drawer-body .section")?.before(enforcement);
  }
  document.querySelector("#close").onclick = closeDrawer;
  scrim.onclick = closeDrawer;
  drawer.querySelector("#close-payout-record")?.addEventListener("click", closeDrawer);
  drawer.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmAction(b.dataset.action, r, "", () => {
          applyDemoAction(b.dataset.action, r);
          persistAdminData();
          if (state.view === "home") renderHome();
          else render();
        })),
  );
  drawer
    .querySelector("[data-chat-user]")
    ?.addEventListener("click", () => openUserChat(r));
  drawer
    .querySelector("[data-report-user]")
    ?.addEventListener("click", () => openUserReportDialog(r));
  drawer
    .querySelector("[data-penalty-user]")
    ?.addEventListener("click", () => openPenaltyDialog(r));
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
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal report-modal" role="dialog" aria-modal="true" aria-label="Report ${user.title}"><div class="chat-modal-head"><div><strong>Report user</strong><small>${user.title} · ${user.id}</small></div><button class="icon close-party-chat" aria-label="Close report form"><span class="close-lines"></span></button></div><form class="report-form"><p class="chat-intro">Record a report submitted by one KuQuest user about another. This report does not apply a penalty automatically.</p><label>Reporting user<select name="reporter" required>${reporterOptions}</select></label><label>Report type<select name="category" required><option>Harassment or abuse</option><option>Fraud or payment issue</option><option>Misleading quest activity</option><option>Other</option></select></label><label>What happened?<textarea name="details" rows="5" minlength="20" maxlength="500" required placeholder="Describe what happened and what evidence supports the report…"></textarea></label><label class="report-file"><span>Evidence file (optional)</span><input type="file" data-report-attachment><small data-report-attachment-name>No file attached</small></label><p class="login-error report-error" role="alert" hidden></p><button class="btn danger" type="submit">Submit report</button></form></section>`;
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
    if (state.view === "home") renderHome();
    else if (state.view === "users") render();
    openDrawer("users", data.users.indexOf(user));
    toast(`Report submitted against ${user.title}.`);
  });
}

function openPenaltyDialog(user) {
  activeCustomLayerClose?.();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal penalty-modal" role="dialog" aria-modal="true" aria-label="Apply penalty to ${user.title}"><div class="chat-modal-head"><div><strong>Apply penalty</strong><small>${user.title} · ${user.id}</small></div><button class="icon close-party-chat" aria-label="Close penalty form"><span class="close-lines"></span></button></div><form class="penalty-form"><p class="chat-intro">Choose one enforcement action and record why it is necessary. A flag does not restrict account access.</p><fieldset><legend>Enforcement action</legend><label class="penalty-choice"><input type="radio" name="penalty" value="warning" checked><span><strong>Flag account</strong><small>Records the violation; account access stays unchanged.</small></span></label><label class="penalty-choice"><input type="radio" name="penalty" value="temporary-team-ban"><span><strong>Ban from joining team quests for a period</strong><small>Stops this user from joining team-based quests until the selected end date.</small></span></label><label class="penalty-choice"><input type="radio" name="penalty" value="team-ban"><span><strong>Permanently ban from joining team quests</strong><small>Stops this user from joining any future team-based quest.</small></span></label><label class="penalty-choice"><input type="radio" name="penalty" value="temporary-ban"><span><strong>Temporary ban from all quests</strong><small>Stops the user from taking any quest until the selected end date.</small></span></label><label class="penalty-choice"><input type="radio" name="penalty" value="ban"><span><strong>Permanent ban from all quests</strong><small>Stops the user from taking any quest until an admin reverses it.</small></span></label></fieldset><label class="penalty-extra" data-ban-days hidden>Ban duration<input name="days" type="number" min="1" max="365" value="7" inputmode="numeric"><small>Days the user cannot create, apply for, or join any quest.</small></label><label>Reason for this penalty<textarea name="reason" rows="3" minlength="8" maxlength="500" required placeholder="State the evidence and policy behind this penalty…"></textarea></label><p class="login-error penalty-error" role="alert" hidden></p><button class="btn danger" type="submit">Confirm penalty</button></form></section>`;
  const close = showModalLayer(overlay, {
    initialFocus: 'input[name="penalty"]',
  });
  overlay.querySelector(".close-party-chat").onclick = close;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = overlay.querySelector("form");
  const updateFields = () => {
    const action = form.elements.penalty.value;
    form.querySelector("[data-ban-days]").hidden =
      !["temporary-team-ban", "temporary-ban"].includes(action);
  };
  form.querySelectorAll('input[name="penalty"]').forEach((input) =>
    input.addEventListener("change", updateFields),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const action = form.elements.penalty.value;
    const reason = form.elements.reason.value.trim();
    const error = form.querySelector(".penalty-error");
    if (reason.length < 8) {
      error.textContent = "Enter at least 8 characters explaining this penalty.";
      error.hidden = false;
      form.elements.reason.focus();
      return;
    }
    let label;
    if (action === "warning") {
      label = "Flag issued";
      user.status = "Flag";
      user.tone = "warning";
    } else if (action === "temporary-team-ban") {
      const days = Number(form.elements.days.value);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        error.textContent = "Choose a ban duration from 1 to 365 days.";
        error.hidden = false;
        form.elements.days.focus();
        return;
      }
      const until = new Date();
      until.setDate(until.getDate() + days);
      label = `Banned from joining team quests for ${days} days · until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
      user.status = "Temp ban";
      user.tone = "warning";
    } else if (action === "team-ban") {
      label = "Permanently banned from joining team quests";
      user.status = "Perm ban";
      user.tone = "warning";
    } else if (action === "temporary-ban") {
      const days = Number(form.elements.days.value);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        error.textContent = "Choose a ban duration from 1 to 365 days.";
        error.hidden = false;
        form.elements.days.focus();
        return;
      }
      const until = new Date();
      until.setDate(until.getDate() + days);
      label = `Banned from all quests for ${days} days · until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
      user.status = "Temp ban";
      user.tone = "danger";
    } else {
      label = "Permanently banned from all quests";
      user.status = "Perm ban";
      user.tone = "danger";
    }
    user.penalty = { label, reason, recordedAt: "Just now" };
    user.age = label;
    persistAdminData();
    recordActivity(label, `${user.id} · ${user.title} · ${reason}`);
    close();
    if (state.view === "home") renderHome();
    else if (state.view === "users") render();
    openDrawer("users", data.users.indexOf(user));
    toast(`${label} for ${user.title}.`);
  });
  updateFields();
}

function applyDemoAction(action, record) {
  const transitions = {
    "Restrict user": ["Temp ban", "danger"],
    "Set normal": ["Normal", "success"],
    "Lift penalty": ["Normal", "success"],
    "Hide quest": ["Hidden", "neutral"],
    "Reject payout": ["Rejected", "danger"],
    "Approve payout": ["Processing", "info"],
    "Close report": ["Closed", "neutral"],
    "Reopen report": ["Active", "warning"],
    "Terminate quest": ["Cancelled", "cancelled"],
  };
  const next = transitions[action];
  if (!next) return;
  [record.status, record.tone] = next;
  if (action === "Lift penalty") delete record.penalty;
  record.age = "Just now";
  if (action === "Close report") record.closedAt = reportDateTime();
  if (action === "Reopen report") delete record.closedAt;
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
function applyReportDecision(report, decision, reason, days) {
  const user = data.users.find((candidate) => candidate.id === report.reportedUserId),
    duration = Number(days) || null;
  report.status = "Closed";
  report.tone = "neutral";
  report.closedAt = reportDateTime();
  report.decision = decision;
  report.decisionLabel = decision === "flag" ? "Flag only" : decision === "temporary-ban" ? "Temporary ban" : "Permanent ban";
  report.decisionDays = decision === "temporary-ban" ? duration : null;
  report.decisionReason = reason;
  if (!user) {
    refreshNavigationCounts();
    return;
  }
  if (decision === "flag") {
    user.status = "Flag";
    user.tone = "warning";
    user.penalty = { label: "Account flagged from report", reason, recordedAt: "Just now" };
    user.age = "Flagged from report · Just now";
  } else if (decision === "temporary-ban") {
    const until = new Date();
    until.setDate(until.getDate() + duration);
    user.status = "Temp ban";
    user.tone = "danger";
    user.penalty = { label: `Banned from all quests for ${duration} days · until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, reason, recordedAt: "Just now" };
    user.age = user.penalty.label;
  } else {
    user.status = "Perm ban";
    user.tone = "danger";
    user.penalty = { label: "Permanently banned from all quests", reason, recordedAt: "Just now" };
    user.age = user.penalty.label;
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
function timeline(items) {
  return `<ul class="timeline">${items
    .map((item, index) => {
      const entry =
        typeof item === "string"
          ? {
              title: item,
              detail: timelineDetail(item, index),
            }
          : item,
        parts = String(entry.detail || "").split(" · "),
        timeParts = entry.time ? 0 : parts.length > 2 ? 2 : parts.length > 1 ? 1 : 0,
        time = entry.time || parts.slice(0, timeParts).join(" · "),
        detail = entry.time ? entry.detail : parts.slice(timeParts).join(" · ");
      return `<li><strong>${escapeActivityText(entry.title)}</strong>${time ? `<time>${escapeActivityText(time)}</time>` : ""}<span>${escapeActivityText(detail)}</span></li>`;
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
  quests: ["/legacy/quest-detail.js?v=32"],
  disputes: [
    "/legacy/dispute-detail.js?v=32",
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
