const userPageId =
  window.__KUQUEST_RECORD_ID__ || new URLSearchParams(location.search).get("id") || "";
const userPageState = {
  tab: "overview",
  reviewFilter: "all",
  reviewQuery: "",
  reviewSort: "latest",
  reviewRating: null,
};
const userPageTableState = {
  reviews: { page: 1, size: 10, sortKey: "date", direction: "desc" },
  reports: { page: 1, size: 10, sortKey: "reportedAt", direction: "desc" },
  penalties: { page: 1, size: 10, sortKey: "at", direction: "desc" },
};

const userProfileFixtures = {
  "66100428": {
    about: "Environmental science student who helps teams turn field observations into clear, useful records.",
    tags: ["Field work", "Research", "Accessibility"],
  },
  "66100817": {
    about: "Communication Arts student with experience preparing clear, accessible content for campus projects.",
    tags: ["Writing", "Research", "Content"],
  },
  "65020314": {
    about: "Architecture student who contributes practical research and visual documentation to campus projects.",
    tags: ["Design", "Field work", "Documentation"],
  },
  "66031246": {
    about: "Engineering student focused on structured field research and practical improvements to campus access.",
    tags: ["Accessibility", "Research", "Operations"],
  },
  "65017652": {
    about: "Agriculture student who supports careful data collection and clear project handoffs.",
    tags: ["Data", "Field work", "Research"],
  },
  "66022508": {
    about: "Liberal Arts student who brings thoughtful communication and dependable project support.",
    tags: ["Writing", "Content", "Research"],
  },
  "65011409": {
    about: "Digital Media student with experience creating visual assets for university communities.",
    tags: ["Design", "Video", "Content"],
  },
};

function userPageEscape(value) {
  return escapeActivityText(value ?? "");
}

function userPageDate(value) {
  return userPageEscape(String(value || "Date not recorded").replace(/\s+ICT$/, ""));
}

function userPageActivityDate(value, index = 0) {
  const clean = String(value || "").replace(/\s+ICT$/, "").trim();
  const absolute = clean.match(/^(.+?)\s+·\s+(\d{1,2}):(\d{2})$/);
  if (absolute) {
    const hour = String(absolute[2]).padStart(2, "0");
    const timestamp = Date.parse(`${absolute[1]} ${hour}:${absolute[3]}`);
    return { text: `${absolute[1]} · ${hour}:${absolute[3]}`, timestamp: Number.isNaN(timestamp) ? 0 : timestamp };
  }
  if (/^\d{1,2} [A-Za-z]{3} \d{4}$/.test(clean)) {
    const timestamp = Date.parse(`${clean} 00:00`);
    return { text: `${clean} · 00:00`, timestamp: Number.isNaN(timestamp) ? 0 : timestamp };
  }
  const relative = clean.toLowerCase();
  const amount = Number(relative.match(/\d+/)?.[0] || 0);
  const daysAgo = relative === "yesterday"
    ? 1
    : relative.includes("week")
      ? amount * 7
      : relative.includes("month")
        ? amount * 30
        : amount;
  const date = new Date(Date.UTC(2026, 7, 27, 8 + ((index * 3) % 11), (index * 17) % 60));
  date.setUTCDate(date.getUTCDate() - daysAgo);
  const text = `${date.getUTCDate()} ${date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })} ${date.getUTCFullYear()} · ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return { text, timestamp: date.getTime() };
}

function userPageTableSortHeader(table, key, label) {
  const state = userPageTableState[table];
  const active = state.sortKey === key;
  const direction = active ? state.direction : "none";
  return `<th scope="col" aria-sort="${direction === "none" ? "none" : direction === "asc" ? "ascending" : "descending"}"><button class="table-sort${active ? " is-active" : ""}" type="button" data-user-table-sort="${table}:${key}">${label}<span class="sort-indicator" aria-hidden="true">${active ? (state.direction === "asc" ? "↑" : "↓") : "↕"}</span></button></th>`;
}

function userPageTableSortValue(table, row, index, key) {
  if (table === "reviews" && key === "date") return -index;
  if (key === "relatedReport") return String(row.reason || row.note || "").match(/RPT-\d+/)?.[0] || "";
  if (key === "reportedAt" || key === "at") return Date.parse(String(row[key] || "").replace(" · ", " ").replace(/\s+ICT$/, "")) || 0;
  return row[key] ?? "";
}

function userPageSortedTableRows(table, rows) {
  const state = userPageTableState[table];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((first, second) => {
      const firstValue = userPageTableSortValue(table, first.row, first.index, state.sortKey);
      const secondValue = userPageTableSortValue(table, second.row, second.index, state.sortKey);
      let result = 0;
      if (typeof firstValue === "number" && typeof secondValue === "number") result = firstValue - secondValue;
      else result = String(firstValue).localeCompare(String(secondValue), undefined, { numeric: true, sensitivity: "base" });
      return (result || first.index - second.index) * (state.direction === "asc" ? 1 : -1);
    })
    .map(({ row }) => row);
}

function userPagePaginateTable(table, rows) {
  const state = userPageTableState[table];
  const pageCount = Math.max(1, Math.ceil(rows.length / state.size));
  state.page = Math.min(Math.max(1, state.page), pageCount);
  const startIndex = (state.page - 1) * state.size;
  return {
    rows: rows.slice(startIndex, startIndex + state.size),
    page: state.page,
    pageCount,
    start: rows.length ? startIndex + 1 : 0,
    end: Math.min(startIndex + state.size, rows.length),
    total: rows.length,
  };
}

function userPageTablePagination(table, pagination) {
  const label = table === "penalties" ? "penalty history" : table;
  return `<div class="table-pagination" aria-label="${label} pagination"><span class="page-indicator">Showing ${pagination.start}–${pagination.end} of ${pagination.total}</span><button class="page-nav" type="button" data-user-table-page="${table}:${pagination.page - 1}"${pagination.page === 1 ? " disabled" : ""}>Previous</button><span class="page-indicator">Page ${pagination.page} of ${pagination.pageCount}</span><button class="page-nav" type="button" data-user-table-page="${table}:${pagination.page + 1}"${pagination.page === pagination.pageCount ? " disabled" : ""}>Next</button></div>`;
}

function userPageInitials(name) {
  return String(name || "User")
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function userPageStatus(user) {
  return user.status === "Normal" ? "Active" : user.status;
}

function userPageFaculty(user) {
  return String(user.other || "Student").split(" · ")[0];
}

function userPageProfile(user) {
  return userProfileFixtures[user.id] || {
    about: "KuQuest participant contributing to university marketplace projects.",
    tags: ["Student", "Marketplace", "University"],
  };
}

function userPageReviewRows(user) {
  const reported = userReportsFor(user).length > 0;
  return [
    {
      reviewer: "Alex Smith",
      rating: 5,
      review: "Reliable, thoughtful, and clear throughout the project.",
      date: "2 weeks ago",
      reports: 0,
      status: "Visible",
      tone: "success",
    },
    {
      reviewer: "Mayuree Nopparat",
      rating: 5,
      review: "Delivered careful work and responded quickly to feedback.",
      date: "1 month ago",
      reports: reported ? 1 : 0,
      status: reported ? "Reported" : "Visible",
      tone: reported ? "warning" : "success",
    },
    {
      reviewer: "Kittipong Manee",
      rating: 4,
      review: "Strong result with useful notes for the team.",
      date: "2 months ago",
      reports: 0,
      status: "Visible",
      tone: "success",
    },
    {
      reviewer: "Saran Jindapol",
      rating: 4,
      review: "Good communication and a well-organized delivery.",
      date: "3 months ago",
      reports: 0,
      status: "Visible",
      tone: "success",
    },
    {
      reviewer: "Ratchanon Srisai",
      rating: 5,
      review: "Careful work that matched the agreed project requirements.",
      date: "4 months ago",
      reports: 0,
      status: "Visible",
      tone: "success",
    },
  ];
}

function userPageHistory(user) {
  const history = (Array.isArray(user.moderationHistory) ? user.moderationHistory : [])
    .filter((entry) => /flag|warning|ban|penalty/i.test(String(entry.event || "")));
  return history.length
    ? history
    : [];
}

function userPageActionButtons(user) {
  if (user.status === "Temp ban") {
    return '<button class="btn" data-user-page-penalty="modify">Modify ban</button><button class="btn" data-user-page-lift>Lift ban</button>';
  }
  if (user.status === "Perm ban") {
    return '<button class="btn" data-user-page-lift>Lift ban</button>';
  }
  if (user.status === "Flag") {
    return '<button class="btn" data-user-page-clear>Clear flag</button><button class="btn primary" data-user-page-penalty="apply">Apply penalty</button>';
  }
  return '<button class="btn primary" data-user-page-penalty="apply">Apply penalty</button>';
}

function userPageAbout(user) {
  const profile = userPageProfile(user);
  return `<section class="user-detail-panel"><h2>About Me</h2><p class="user-about-copy">${userPageEscape(profile.about)}</p></section>`;
}

function userPageExperience(user) {
  const faculty = userPageFaculty(user);
  return `<section class="user-detail-panel"><h2>Experience</h2><div class="user-simple-list"><article><strong>Student project contributor</strong><span>${userPageEscape(faculty)} · ${userPageEscape(String(user.other || "").split(" · ")[1] || "Current")}</span><p>Contributes reliable research, documentation, and project support through KuQuest.</p></article><article><strong>University marketplace participant</strong><span>KuQuest · ${userPageEscape(user.accountCreatedAt || "Current")}</span><p>Works with hirers and workers to complete university-focused assignments.</p></article></div></section>`;
}

function userPageWorks(user) {
  const quests = userQuestRecords(user).filter((quest) => quest.status === "Completed").slice(0, 2);
  const works = quests.length
    ? quests
    : [{ id: "—", title: "Marketplace contribution", other: "University project" }];
  return `<section class="user-detail-panel"><div class="user-panel-heading"><h2>My Works</h2><span class="section-count">${works.length}</span></div><div class="user-work-grid">${works.map((work, index) => `<article class="user-work-item"><span class="user-work-thumb" aria-hidden="true">${index === 0 ? "▦" : "◈"}</span><strong>${userPageEscape(work.title)}</strong><span>${userPageEscape(work.other || "University project")} · ${userPageEscape(work.teamQuest ? "Team quest" : "Individual quest")}</span></article>`).join("")}</div></section>`;
}

function userPagePayoutRecords(user) {
  return data.payouts
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.title === user.title)
    .sort((first, second) => payoutTimestamp(second.record) - payoutTimestamp(first.record));
}

function userPagePayoutHistory(user, compact = false) {
  const payoutRecords = userPagePayoutRecords(user),
    completed = payoutRecords.filter(({ record }) => record.status === "Completed"),
    inFlight = payoutRecords.filter(({ record }) => ["Needs approval", "Processing"].includes(record.status)),
    shownRecords = compact ? payoutRecords.slice(0, 5) : payoutRecords,
    headingAction = compact && payoutRecords.length > shownRecords.length
      ? '<button class="link" type="button" data-user-tab="payouts">View all</button>'
      : "";
  return `<section class="user-detail-panel${compact ? " user-payout-preview" : " user-tab-panel"}"><div class="user-panel-heading"><div><h2>Payout history</h2>${compact ? '<p>Recent requests and transfer outcomes for this account.</p>' : `<p>${payoutRecords.length} payout records · ${completed.length} completed.</p>`}</div><div class="user-panel-heading-actions">${headingAction}<span class="section-count">${payoutRecords.length}</span></div></div>${!compact && payoutRecords.length ? `<div class="user-payout-stat-list"><div><strong>฿${fmt(completed.reduce((total, entry) => total + Number(entry.record.amount || 0), 0))}</strong><span>Paid out</span></div><div><strong>฿${fmt(inFlight.reduce((total, entry) => total + Number(entry.record.amount || 0), 0))}</strong><span>In progress</span></div><div><strong>${payoutRecords.length}</strong><span>Total requests</span></div></div>` : ""}${shownRecords.length ? `<div class="user-payout-list">${shownRecords.map(({ record, index }) => `<button class="user-payout-row" type="button" data-user-payout="${index}" aria-label="Open payout ${userPageEscape(record.id)}"><span class="user-payout-primary"><strong>${userPageEscape(record.id)}</strong><small>${userPageDate(record.requestedAt)}</small><small>${userPageEscape(record.questId || record.other || "Quest")}</small></span><span class="user-payout-secondary"><strong>฿${fmt(record.amount)}</strong>${badge(record.status, record.tone)}</span></button>`).join("")}</div>` : '<div class="empty"><h3>No payout history</h3><p>This account has no payout records.</p></div>'}</section>`;
}

function userPageCertificates(user) {
  const faculty = userPageFaculty(user);
  return `<section class="user-detail-panel"><h2>Certificates</h2><div class="user-certificate-list"><div><strong>University marketplace orientation</strong><span>KuQuest · ${userPageEscape(user.accountCreatedAt || "2026")}</span></div><div><strong>${userPageEscape(faculty)} project fundamentals</strong><span>University learning centre · 2025</span></div></div></section>`;
}

function userPageReviewSummary() {
  return `<div class="user-review-summary"><strong>4.9 ★</strong><span class="user-review-count">(15)</span><span class="user-review-rating-links" role="group" aria-label="Filter reviews by rating">${[5, 4, 3, 2, 1].map((rating) => `<button class="user-review-rating-link${userPageState.reviewRating === rating ? " active" : ""}" type="button" data-review-rating="${rating}" aria-pressed="${userPageState.reviewRating === rating}">${rating} star</button>`).join("")}</span></div>`;
}

function userPageReviewPreview(user) {
  return `<section class="user-detail-panel"><div class="user-panel-heading"><div><h2>Reviews</h2>${userPageReviewSummary()}</div><button class="link" type="button" data-user-tab="reviews">View all</button></div><div class="user-review-preview">${userPageReviewRows(user).slice(0, 5).map((review) => `<div><span><strong>${userPageEscape(review.reviewer)}</strong><small>${"★".repeat(review.rating)} · ${userPageEscape(review.date)}</small></span>${badge(review.status, review.tone)}</div>`).join("")}</div></section>`;
}

function userPageOverview(user) {
  return `<div class="user-detail-main-column">${userPageAbout(user)}${userPageExperience(user)}${userPageWorks(user)}${userPagePayoutHistory(user, true)}${userPageCertificates(user)}${userPageReviewPreview(user)}</div><aside class="user-detail-side-column">${userPageAccountInfo(user)}${userPageModerationSummary(user)}${userPageRecentReports(user)}${userPageAdminNotes(user)}${userPageAccountActions(user)}</aside>`;
}

function userPageAccountInfo(user) {
  const [faculty, year] = String(user.other || "Student").split(" · ");
  return `<section class="user-detail-panel"><h2>Account Information</h2><dl class="user-facts"><div><dt>Account status</dt><dd>${badge(userPageStatus(user), user.tone)}</dd></div><div><dt>Email verified</dt><dd>Yes</dd></div><div><dt>Created</dt><dd>${userPageDate(user.accountCreatedAt)}</dd></div><div><dt>Last active</dt><dd>${userPageDate(user.lastActiveAt)}</dd></div><div><dt>Role</dt><dd>Student</dd></div><div><dt>University</dt><dd>Kasetsart University</dd></div><div><dt>Faculty</dt><dd>${userPageEscape(faculty || "Not recorded")}${year ? ` · ${userPageEscape(year)}` : ""}</dd></div></dl></section>`;
}

function userPageModerationSummary(user) {
  const reports = userReportsFor(user);
  const activeWarnings = user.status === "Flag" ? 1 : 0;
  const suspensions = ["Temp ban", "Perm ban"].includes(user.status) ? 1 : 0;
  return `<section class="user-detail-panel"><h2>Moderation Summary</h2><div class="user-counter-list"><div><strong>${reports.length}</strong><span>Reports received</span></div><div><strong>${activeWarnings}</strong><span>Active warnings</span></div><div><strong>${suspensions}</strong><span>Suspensions</span></div></div><button class="btn full-width" type="button" data-user-tab="reports">View reports</button></section>`;
}

function userPageRecentReports(user) {
  const reports = userReportsFor(user).slice(0, 3);
  return `<section class="user-detail-panel"><div class="user-panel-heading"><h2>Recent Reports</h2><span class="section-count">${reports.length}</span></div>${reports.length ? `<div class="user-recent-reports">${reports.map((report) => `<a href="/reports/${encodeURIComponent(report.id)}"><span><strong>${userPageEscape(report.id)}</strong><small>${userPageEscape(report.category)}</small></span>${badge(report.status, report.tone)}</a>`).join("")}</div>` : '<p class="audit-note">No reports have been filed against this account.</p>'}</section>`;
}

function userPageAdminNotes(user) {
  const notes = Array.isArray(user.adminNotes) ? user.adminNotes : [];
  return `<section class="user-detail-panel"><div class="user-panel-heading"><h2>Admin Notes</h2><span class="admin-only-label">Admin only</span></div>${notes.length ? `<div class="user-admin-notes">${notes.slice(0, 2).map((note) => `<article><strong>${userPageDate(note.at)}</strong><small>${userPageEscape(note.by || "Admin")}</small><p>${userPageEscape(note.note)}</p></article>`).join("")}</div>` : '<p class="audit-note">No internal notes recorded.</p>'}<textarea data-user-note-input rows="3" maxlength="500" placeholder="Add an internal note about this user…"></textarea><button class="btn" type="button" data-save-user-note>Save note</button></section>`;
}

function userPageAccountActions(user) {
  return `<section class="user-detail-panel user-account-actions"><h2>Account Actions</h2><div class="user-action-stack">${userPageActionButtons(user)}<button class="btn" type="button" data-user-page-history>View penalty history</button></div></section>`;
}

function userPageActivity(user) {
  const questRecords = userQuestRecords(user);
  const completedQuests = questRecords.filter((quest) => quest.status === "Completed").length;
  const quests = questRecords.map((quest, index) => {
    const activityDate = userPageActivityDate(quest.activityAt || quest.age, index);
    return {
      at: activityDate.text,
      timestamp: activityDate.timestamp,
      title: quest.status === "Completed" ? "Quest completed" : quest.person === user.title ? "Quest created" : "Quest joined",
      detail: `${quest.id} · ${quest.title}`,
    };
  });
  const events = quests.sort((first, second) => second.timestamp - first.timestamp);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Quest history</h2><p>All ${questRecords.length} quest records · ${completedQuests} completed.</p></div></div>${events.length ? `<div class="user-activity-list">${events.map((event) => `<article><span class="user-activity-dot" aria-hidden="true"></span><div><strong>${userPageEscape(event.title)}</strong><time>${userPageEscape(event.at)}</time><p>${userPageEscape(event.detail)}</p></div></article>`).join("")}</div>` : '<div class="empty"><h3>No quest history</h3><p>This account has no linked quest records.</p></div>'}</section>`;
}

function userPageReviews(user) {
  const reviews = userPageReviewsData(user);
  const query = userPageState.reviewQuery.trim().toLowerCase();
  const filtered = reviews.filter((review) => {
    const matchesFilter = userPageState.reviewFilter === "all" || review.status.toLowerCase() === userPageState.reviewFilter;
    const matchesRating = userPageState.reviewRating === null || review.rating === userPageState.reviewRating;
    const searchable = `${review.reviewer} ${review.review} ${review.status}`.toLowerCase();
    return matchesFilter && matchesRating && (!query || searchable.includes(query));
  });
  const sorted = userPageSortedTableRows("reviews", filtered);
  const pagination = userPagePaginateTable("reviews", sorted);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Reviews</h2>${userPageReviewSummary()}</div></div><div class="user-review-toolbar"><div class="inline-search search-field">${ico("search")}<input type="search" data-review-search value="${userPageEscape(userPageState.reviewQuery)}" placeholder="Search reviews…" aria-label="Search reviews"></div><div class="user-review-sort"><label for="review-sort">Sort</label><select id="review-sort" data-review-sort aria-label="Sort reviews"><option value="latest" ${userPageState.reviewSort === "latest" ? "selected" : ""}>Latest</option><option value="rating-desc" ${userPageState.reviewSort === "rating-desc" ? "selected" : ""}>Rating: 5 → 1</option><option value="rating-asc" ${userPageState.reviewSort === "rating-asc" ? "selected" : ""}>Rating: 1 → 5</option><option value="custom" ${userPageState.reviewSort === "custom" ? "selected" : ""}>Column selected</option></select></div><div class="user-review-filters" role="group" aria-label="Review filters">${["all", "reported", "hidden"].map((filter) => `<button class="tab ${userPageState.reviewFilter === filter ? "active" : ""}" type="button" data-review-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join("")}</div></div>${pagination.total ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr>${userPageTableSortHeader("reviews", "reviewer", "Reviewer")}${userPageTableSortHeader("reviews", "rating", "Rating")}${userPageTableSortHeader("reviews", "review", "Review")}${userPageTableSortHeader("reviews", "date", "Date")}${userPageTableSortHeader("reviews", "reports", "Reports")}${userPageTableSortHeader("reviews", "status", "Status")}<th scope="col">Action</th></tr></thead><tbody>${pagination.rows.map((review) => `<tr><td><strong>${userPageEscape(review.reviewer)}</strong></td><td>${"★".repeat(review.rating)}</td><td>${userPageEscape(review.review)}</td><td>${userPageEscape(review.date)}</td><td>${review.reports}</td><td>${badge(review.status, review.tone)}</td><td><button class="link" type="button" data-review-action="View" data-review-name="${userPageEscape(review.reviewer)}">View</button> <button class="link" type="button" data-review-action="Hide" data-review-name="${userPageEscape(review.reviewer)}">Hide</button> <button class="link danger-link" type="button" data-review-action="Remove" data-review-name="${userPageEscape(review.reviewer)}">Remove</button></td></tr>`).join("")}</tbody></table></div>${userPageTablePagination("reviews", pagination)}` : '<div class="empty"><h3>No matching reviews</h3><p>Try another filter or search term.</p></div>'}</section>`;
}

function userPageReviewsData(user) {
  return userPageReviewsFixtures(user);
}

function userPageReviewsFixtures(user) {
  return [
    { reviewer: "Alex Smith", rating: 5, review: "Reliable, thoughtful, and clear throughout the project.", date: "2 weeks ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Mayuree Nopparat", rating: 5, review: "Delivered careful work and responded quickly to feedback.", date: "1 month ago", reports: userReportsFor(user).length ? 1 : 0, status: userReportsFor(user).length ? "Reported" : "Visible", tone: userReportsFor(user).length ? "warning" : "success" },
    { reviewer: "Kittipong Manee", rating: 4, review: "Strong result with useful notes for the team.", date: "2 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Saran Jindapol", rating: 4, review: "Good communication and a well-organized delivery.", date: "3 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Ratchanon Srisai", rating: 5, review: "Careful work that matched the agreed project requirements.", date: "4 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Pimchanok Insee", rating: 5, review: "Clear updates and dependable delivery from start to finish.", date: "5 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Worawut Inthanon", rating: 5, review: "The final work was accurate and easy for our team to use.", date: "6 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Chalida Wongthong", rating: 5, review: "Thoughtful questions helped us clarify the project early.", date: "7 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Pakorn Sittichai", rating: 5, review: "A careful contributor who kept every handoff organized.", date: "8 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Arisa Chaisiri", rating: 5, review: "Responsive, precise, and professional throughout the quest.", date: "9 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Nawin Sukkasem", rating: 5, review: "Delivered useful evidence and communicated any blockers quickly.", date: "10 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Manita Sombat", rating: 5, review: "The result followed the accepted brief closely.", date: "11 months ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Kanchana Niyom", rating: 5, review: "Well prepared and easy to collaborate with.", date: "1 year ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Teerapong Phromma", rating: 5, review: "Reliable work with clear supporting notes.", date: "1 year ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Mayuree Nopparat", rating: 3, review: "The result was usable, but the first delivery needed several clarifications.", date: "1 year ago", reports: 0, status: "Visible", tone: "success" },
  ];
}

function userPageReports(user) {
  const reports = userReportsFor(user);
  const sorted = userPageSortedTableRows("reports", reports);
  const pagination = userPagePaginateTable("reports", sorted);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Reports</h2><p>Reports filed against this account.</p></div><span class="section-count">${reports.length}</span></div>${pagination.total ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr>${userPageTableSortHeader("reports", "id", "Report")}${userPageTableSortHeader("reports", "category", "Type")}${userPageTableSortHeader("reports", "reporterName", "Reported by")}${userPageTableSortHeader("reports", "details", "Reason")}${userPageTableSortHeader("reports", "status", "Status")}${userPageTableSortHeader("reports", "reportedAt", "Reported")}<th scope="col">Action</th></tr></thead><tbody>${pagination.rows.map((report) => `<tr><td><strong>${userPageEscape(report.id)}</strong></td><td>${userPageEscape(report.category)}</td><td>${userPageEscape(report.reporterName)}</td><td>${userPageEscape(report.details)}</td><td>${badge(report.status, report.tone)}</td><td>${userPageDate(report.reportedAt)}</td><td><a class="link" href="/reports/${encodeURIComponent(report.id)}">View</a></td></tr>`).join("")}</tbody></table></div>${userPageTablePagination("reports", pagination)}` : '<div class="empty"><h3>No reports received</h3><p>This account has no report records.</p></div>'}</section>`;
}

function userPagePenaltyHistory(user) {
  const history = userPageHistory(user);
  const sorted = userPageSortedTableRows("penalties", history);
  const pagination = userPagePaginateTable("penalties", sorted);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Penalty History</h2><p>Penalty and moderation events recorded for this account.</p></div></div>${pagination.total ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr>${userPageTableSortHeader("penalties", "at", "Date")}${userPageTableSortHeader("penalties", "by", "Admin")}${userPageTableSortHeader("penalties", "event", "Action")}${userPageTableSortHeader("penalties", "reason", "Reason")}${userPageTableSortHeader("penalties", "relatedReport", "Related report")}</tr></thead><tbody>${pagination.rows.map((entry) => `<tr><td>${userPageDate(entry.at)}</td><td>${userPageEscape(entry.by || "System")}</td><td><strong>${userPageEscape(entry.event)}</strong></td><td>${userPageEscape(entry.reason || entry.note || "—")}</td><td>${userPageEscape((entry.reason || entry.note || "").match(/RPT-\d+/)?.[0] || "—")}</td></tr>`).join("")}</tbody></table></div>${userPageTablePagination("penalties", pagination)}` : '<div class="empty"><h3>No penalty history</h3><p>No penalty or moderation events have been recorded for this account.</p></div>'}</section>`;
}

function userPageTabContent(user) {
  if (userPageState.tab === "activity") return userPageActivity(user);
  if (userPageState.tab === "payouts") return userPagePayoutHistory(user);
  if (userPageState.tab === "reviews") return userPageReviews(user);
  if (userPageState.tab === "reports") return userPageReports(user);
  if (userPageState.tab === "penalty-history") return userPagePenaltyHistory(user);
  return userPageOverview(user);
}

function userPageSummary(user) {
  const profile = userPageProfile(user);
  const quests = userQuestRecords(user);
  const completed = quests.filter((quest) => quest.status === "Completed").length;
  return `<section class="user-summary-panel"><div class="user-summary-grid"><div class="user-summary-identity"><span class="user-profile-avatar">${userPageInitials(user.title)}</span><div><div class="user-summary-name"><h2>${userPageEscape(user.title)}</h2>${badge(userPageStatus(user), user.tone)}</div><p>${userPageEscape(userPageFaculty(user))}</p><p>Kasetsart University</p><a href="mailto:${userPageEscape(user.person)}">${userPageEscape(user.person)}</a><div class="user-detail-tags">${profile.tags.map((tag) => `<span>${userPageEscape(tag)}</span>`).join("")}</div></div></div><div class="user-summary-stats"><div><strong>4.9</strong><span>Rating</span></div><div><strong>15</strong><span>Reviews</span></div><div><strong>${completed}</strong><span>Completed</span></div></div></div></section>`;
}

function renderUserPage() {
  const user = data.users.find((candidate) => candidate.id === userPageId);
  if (!user) {
    window.__KUQUEST_USER_DETAIL__.user = null;
    main.innerHTML = `<div class="full-page-empty"><h1>User not found</h1><p>No user record matches <strong>${userPageEscape(userPageId)}</strong>.</p><a class="btn primary" href="/?view=users">Return to users</a></div>`;
    return;
  }
  window.__KUQUEST_USER_DETAIL__.user = user;
  setActiveNavigation("users");
  main.innerHTML = `<div class="user-detail-breadcrumb"><a href="/?view=users">Users</a><span>›</span><span>${userPageEscape(user.title)}</span></div><div class="page-head user-detail-page-head"><div><h1>${userPageEscape(user.title)}</h1><p>Review user information, activity, payouts, and penalty history.</p></div></div>${userPageSummary(user)}<nav class="user-detail-tabs" aria-label="User detail sections">${[["overview", "Overview"], ["activity", "Activity"], ["payouts", "Payouts"], ["reviews", "Reviews"], ["reports", "Reports"], ["penalty-history", "Penalty History"]].map(([value, label]) => `<button class="${userPageState.tab === value ? "active" : ""}" type="button" data-user-tab="${value}" aria-current="${userPageState.tab === value ? "page" : "false"}">${label}</button>`).join("")}</nav><div class="user-detail-layout">${userPageTabContent(user)}</div>`;
  bindUserPage(user);
}

function bindUserPage(user) {
  document.querySelectorAll("[data-user-tab]").forEach((button) => {
    button.onclick = () => {
      userPageState.tab = button.dataset.userTab;
      renderUserPage();
    };
  });
  document.querySelectorAll("[data-user-page-penalty]").forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.userPagePenalty;
      openPenaltyDialog(user, { mode: action === "modify" ? "modify" : "apply", initialAction: action === "warning" ? "warning" : action === "temporary-ban" ? "temporary-ban" : undefined });
    };
  });
  document.querySelectorAll("[data-user-page-lift]").forEach((button) => (button.onclick = () => confirmUserStatusChange(user, "Lift ban")));
  document.querySelectorAll("[data-user-page-clear]").forEach((button) => (button.onclick = () => confirmUserStatusChange(user, "Clear flag")));
  document.querySelectorAll("[data-user-page-history]").forEach((button) => (button.onclick = () => {
    userPageState.tab = "penalty-history";
    renderUserPage();
  }));
  document.querySelectorAll("[data-user-payout]").forEach((button) => (button.onclick = () => {
    openDrawer("payouts", Number(button.dataset.userPayout));
  }));
  const saveNote = document.querySelector("[data-save-user-note]");
  const noteInput = document.querySelector("[data-user-note-input]");
  if (saveNote && noteInput) saveNote.onclick = () => {
    const note = noteInput.value.trim();
    if (note.length < 4) {
      toast("Enter at least 4 characters for the admin note.");
      noteInput.focus();
      return;
    }
    const entry = { at: adminDateTime(), by: currentAdminName(), note };
    user.adminNotes = [entry, ...(user.adminNotes || [])];
    persistAdminData();
    recordActivity("Admin note added", `${user.id} · ${user.title}`);
    renderUserPage();
    toast(`Admin note saved for ${user.title}.`);
  };
  const reviewSearch = document.querySelector("[data-review-search]");
  if (reviewSearch) reviewSearch.oninput = (event) => {
    userPageState.reviewQuery = event.target.value;
    userPageTableState.reviews.page = 1;
    renderUserPage();
    document.querySelector("[data-review-search]")?.focus();
  };
  const reviewSort = document.querySelector("[data-review-sort]");
  if (reviewSort) reviewSort.onchange = (event) => {
    const value = event.target.value;
    userPageState.reviewSort = value;
    userPageTableState.reviews.sortKey = value === "latest" ? "date" : "rating";
    userPageTableState.reviews.direction = value === "rating-asc" ? "asc" : "desc";
    userPageTableState.reviews.page = 1;
    renderUserPage();
  };
  document.querySelectorAll("[data-review-filter]").forEach((button) => (button.onclick = () => {
    userPageState.reviewFilter = button.dataset.reviewFilter;
    userPageTableState.reviews.page = 1;
    renderUserPage();
  }));
  document.querySelectorAll("[data-review-rating]").forEach((button) => (button.onclick = () => {
    const rating = Number(button.dataset.reviewRating);
    const isSelected = userPageState.reviewRating === rating;
    userPageState.reviewRating = isSelected ? null : rating;
    userPageState.reviewSort = isSelected ? "latest" : "rating-desc";
    userPageTableState.reviews.sortKey = isSelected ? "date" : "rating";
    userPageTableState.reviews.direction = "desc";
    userPageTableState.reviews.page = 1;
    userPageState.tab = "reviews";
    renderUserPage();
  }));
  document.querySelectorAll("[data-user-table-sort]").forEach((button) => (button.onclick = () => {
    const [table, key] = button.dataset.userTableSort.split(":");
    const state = userPageTableState[table];
    const sameColumn = state.sortKey === key;
    state.sortKey = key;
    state.direction = sameColumn && state.direction === "asc" ? "desc" : "asc";
    state.page = 1;
    if (table === "reviews") {
      userPageState.reviewSort = key === "rating" ? (state.direction === "asc" ? "rating-asc" : "rating-desc") : key === "date" ? "latest" : "custom";
    }
    renderUserPage();
  }));
  document.querySelectorAll("[data-user-table-page]").forEach((button) => (button.onclick = () => {
    const [table, page] = button.dataset.userTablePage.split(":");
    userPageTableState[table].page = Number(page) || 1;
    renderUserPage();
  }));
  document.querySelectorAll("[data-review-action]").forEach((button) => (button.onclick = () => toast(`${button.dataset.reviewAction} review by ${button.dataset.reviewName}.`)));
}

window.__KUQUEST_USER_DETAIL__ = {
  user: null,
  render: renderUserPage,
};

if (typeof setActiveNavigation === "function") renderUserPage();
