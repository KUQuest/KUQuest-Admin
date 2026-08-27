const resourceColumns = {
  disputes: [
    ["id", "Case"],
    ["title", "Quest"],
    ["amount", "Amount"],
    ["status", "Status"],
    ["disputeDate", "Dispute date"],
    ["disputeType", "Category"],
  ],
  quests: [
    ["id", "Quest"],
    ["title", "Title"],
    ["person", "Hirer"],
    ["other", "Tag"],
    ["amount", "Wage"],
    ["status", "Status"],
  ],
  users: [
    ["id", "Student ID"],
    ["title", "User"],
    ["person", "Email"],
    ["other", "Academic profile"],
    ["status", "Status"],
  ],
  payouts: [
    ["id", "Payout"],
    ["title", "Recipient"],
    ["person", "Account"],
    ["amount", "Amount"],
    ["requestedAt", "Requested"],
    ["status", "Status"],
  ],
  reports: [
    ["id", "Report"],
    ["reportedUserName", "Reported user"],
    ["reporterName", "Reported by"],
    ["category", "Type"],
    ["status", "Status"],
    ["reportedAt", "Reported"],
  ],
};
const resourceTabs = {
  disputes: ["All", "Active", "Closed"],
  payouts: ["All", "Needs approval", "Processing", "Completed", "Rejected"],
  quests: ["All", "Team", "Open", "Assigned", "In progress", "Submitted", "Change pending", "Rework", "Disputed", "Completed", "Cancelled", "Hidden"],
  users: ["All", "Normal", "Flag", "Temp ban", "Perm ban"],
  reports: ["All", "Active", "Closed"],
};
state.filters = {};
state.orderBy = {
  disputes: "newest",
  quests: "quest-id-desc",
  users: "title",
  payouts: "amount-high",
  reports: "id-desc",
};
state.visibleColumns = Object.fromEntries(
  Object.entries(resourceColumns).map(([view, cols]) => [
    view,
    cols.map((col) => col[0]),
  ]),
);

function matchingRows(view) {
  const query = state.query.trim().toLowerCase(),
    statuses = state.filters[view] || [];
  const rows = data[view].filter((record) => {
    const searchable = [
      record.id,
      record.title,
      record.person,
      record.other,
      record.status,
      record.disputeDate || "",
      record.disputeType || "",
      record.reporterName || "",
      record.reportedUserName || "",
      record.category || "",
      record.details || "",
      record.reportedAt || "",
      record.requestedAt || "",
      record.detail || "",
    ]
      .join(" ")
      .toLowerCase();
    const matchesTab =
      state.tab === "all" ||
      (view === "quests" && state.tab === "team"
        ? Boolean(record.teamQuest)
        : record.status.toLowerCase().includes(state.tab));
    return (
      (!query || searchable.includes(query)) &&
      matchesTab &&
      (!statuses.length || statuses.includes(record.status))
    );
  });
  const order = state.orderBy[view],
    { key, direction } = sortSpec(view, order),
    compareText = (a, b) =>
      String(a ?? "").localeCompare(String(b ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
  return rows.sort((a, b) => {
    const left = sortValue(view, a, key), right = sortValue(view, b, key);
    const difference =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : compareText(left, right);
    return direction === "desc" ? -difference : difference;
  });
}

function sortSpec(view, order) {
  const aliases = {
    newest: { key: "disputeDate", direction: "desc" },
    oldest: { key: "disputeDate", direction: "asc" },
    "quest-id-desc": { key: "id", direction: "desc" },
    "quest-id-asc": { key: "id", direction: "asc" },
    "amount-high": { key: "amount", direction: "desc" },
    "amount-low": { key: "amount", direction: "asc" },
    title: { key: "title", direction: "asc" },
    "title-desc": { key: "title", direction: "desc" },
    status: { key: "status", direction: "asc" },
    id: { key: "id", direction: "asc" },
  };
  if (aliases[order]) return aliases[order];
  const generic = /^(.*)-(asc|desc)$/.exec(order || "");
  if (generic && resourceColumns[view].some(([column]) => column === generic[1]))
    return { key: generic[1], direction: generic[2] };
  return { key: resourceColumns[view][0][0], direction: "asc" };
}

function sortValue(view, record, key) {
  if (key === "amount") return Number(record.amount || 0);
  if (key === "disputeDate") return new Date(record.disputeDate || 0).getTime();
  if (key === "requestedAt")
    return Date.parse(String(record.requestedAt || "").replace(" · ", " ")) || 0;
  if (key === "reportedAt") return record.id || "";
  return record[key] || "";
}

renderResource = function (view) {
  if (view === "policies") return renderPolicies();
  if (view === "activity") return renderActivity();
  const rows = matchingRows(view),
    tabs = resourceTabs[view],
    hasQuery = Boolean(state.query);
  main.innerHTML = `${pageHead(...heads[view])}<section class="panel resource"><div class="tabs" aria-label="Filter ${view} records">${tabs.map((tab) => `<button class="tab ${state.tab === tab.toLowerCase() ? "active" : ""}" data-tab="${tab.toLowerCase()}" aria-pressed="${state.tab === tab.toLowerCase()}">${escapeActivityText(tab)}${tab === "All" ? ` (${data[view].length})` : ""}</button>`).join("")}</div><div class="toolbar resource-toolbar"><div class="inline-search search-field">${ico("search")}<input id="resource-search" value="${escapeActivityText(state.query)}" placeholder="Search ${view}…" aria-label="Search ${view}" autocomplete="off">${hasQuery ? '<button class="clear-search" aria-label="Clear search"><span class="close-lines"></span></button>' : ""}</div><span class="sort-help">Click a column to sort</span><span class="count" aria-live="polite">${rows.length} ${rows.length === 1 ? "result" : "results"}</span></div>${rows.length ? controlledTable(view, rows) : `<div class="empty"><h3>No matching records</h3><p>${hasQuery ? "Clear your search to see more results." : "There are no records in this view."}</p><button class="btn reset-results">Reset view</button></div>`}</section>`;
  bind();
};

function controlledTable(view, rows) {
  const visible = state.visibleColumns[view],
    columns = resourceColumns[view].filter(([key]) => visible.includes(key));
  const activeSort = sortSpec(view, state.orderBy[view]);
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${view} table"><table class="data"><thead><tr>${columns.map(([key, label]) => { const active = activeSort.key === key; const nextDirection = active && activeSort.direction === "asc" ? "descending" : "ascending"; return `<th scope="col" aria-sort="${active ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}"><button class="table-sort${active ? " is-active" : ""}" data-sort-key="${key}" aria-label="Sort by ${label}, next ${nextDirection}">${label}<span class="sort-indicator" aria-hidden="true">${active ? (activeSort.direction === "asc" ? "↑" : "↓") : "↕"}</span></button></th>`; }).join("")}</tr></thead><tbody>${rows.map((record) => {
    const target = `${view}:${data[view].indexOf(record)}`;
    return `<tr class="${view === "disputes" && record.status === "Active" ? "dispute-active-row" : ""}" data-open="${target}">${columns.map(([key]) => tableCell(view, record, key, target)).join("")}</tr>`;
  }).join("")}</tbody></table></div>`;
}
function tableCell(view, record, key, target) {
  if (key === "id")
    return `<td><button class="row-record-button" data-open="${target}" aria-label="Open ${view.slice(0, -1)} ${escapeActivityText(record.id)}">${escapeActivityText(record.id)}</button></td>`;
  if (key === "title") {
    const title = `<strong>${escapeActivityText(record.title)}</strong>${view === "disputes" ? `<small>${escapeActivityText(record.detail).slice(0, 45)}…</small>` : view === "quests" && record.teamQuest ? `<small>${record.teamSize} selected participants · Team quest</small>` : ""}`;
    return view === "users" ? `<td><a class="user-record-link" href="/users/${encodeURIComponent(record.id)}">${title}</a></td>` : `<td>${title}</td>`;
  }
  if (key === "person") return `<td><strong>${escapeActivityText(record.person)}</strong></td>`;
  if (key === "other") return `<td>${escapeActivityText(record.other)}</td>`;
  if (key === "amount") return `<td class="money">฿${fmt(record.amount)}</td>`;
  if (key === "requestedAt") return `<td>${escapeActivityText(record.requestedAt || "—")}</td>`;
  if (key === "status") return `<td>${badge(record.status, record.tone)}</td>`;
  if (key === "disputeDate") return `<td>${escapeActivityText(record.disputeDate || "—")}</td>`;
  if (key === "disputeType")
    return `<td><strong>${escapeActivityText(disputeTypeLabel(record))}</strong></td>`;
  if (key === "reportedUserName")
    return `<td><a class="user-record-link" href="/users/${encodeURIComponent(record.reportedUserId)}"><strong>${escapeActivityText(record.reportedUserName)}</strong></a></td>`;
  if (key === "reporterName")
    return `<td><a class="user-record-link" href="/users/${encodeURIComponent(record.reporterId)}">${escapeActivityText(record.reporterName)}</a></td>`;
  if (key === "category") return `<td>${escapeActivityText(record.category)}</td>`;
  if (key === "reportedAt") return `<td>${escapeActivityText(record.reportedAt)}</td>`;
  if (key === "age") return `<td>${escapeActivityText(record.age)}</td>`;
  return "<td>—</td>";
}

const originalBind = bind;
let resourceSearchTimer;
bind = function () {
  originalBind();
  const search = document.querySelector("#resource-search");
  if (search)
    search.oninput = (event) => {
      const start = event.target.selectionStart;
      state.query = event.target.value;
      clearTimeout(resourceSearchTimer);
      resourceSearchTimer = setTimeout(() => {
        renderResource(state.view);
        const next = document.querySelector("#resource-search");
        next?.focus();
        next?.setSelectionRange(start, start);
      }, 160);
    };
  document.querySelector(".clear-search")?.addEventListener("click", () => {
    state.query = "";
    renderResource(state.view);
  });
  document.querySelectorAll(".table-sort").forEach((button) => button.addEventListener("click", () => {
      const key = button.dataset.sortKey;
      const current = sortSpec(state.view, state.orderBy[state.view]);
      const direction = current.key === key && current.direction === "asc" ? "desc" : "asc";
      state.orderBy[state.view] = `${key}-${direction}`;
      renderResource(state.view);
    }));
  document.querySelector(".reset-results")?.addEventListener("click", () => {
    state.query = "";
    state.tab = "all";
    renderResource(state.view);
  });
};
if (state.view !== "home") renderResource(state.view);
