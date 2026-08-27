const userPageId =
  window.__KUQUEST_RECORD_ID__ || new URLSearchParams(location.search).get("id") || "";
const userPageState = {
  tab: "overview",
  reviewFilter: "all",
  reviewQuery: "",
  reviewSort: "latest",
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
  ];
}

function userPageHistory(user) {
  const history = Array.isArray(user.moderationHistory) ? user.moderationHistory : [];
  return history.length
    ? history
    : [{ event: "Account created", at: user.accountCreatedAt, by: "System", note: "Account created." }];
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

function userPageCertificates(user) {
  const faculty = userPageFaculty(user);
  return `<section class="user-detail-panel"><h2>Certificates</h2><div class="user-certificate-list"><div><strong>University marketplace orientation</strong><span>KuQuest · ${userPageEscape(user.accountCreatedAt || "2026")}</span></div><div><strong>${userPageEscape(faculty)} project fundamentals</strong><span>University learning centre · 2025</span></div></div></section>`;
}

function userPageReviewSummary() {
  return '<div class="user-review-summary"><strong>4.9 ★</strong><span>15 Reviews</span><span>12 five-star · 2 four-star · 1 three-star</span></div>';
}

function userPageReviewPreview(user) {
  return `<section class="user-detail-panel"><div class="user-panel-heading"><div><h2>Reviews</h2>${userPageReviewSummary()}</div><button class="link" type="button" data-user-tab="reviews">View all</button></div><div class="user-review-preview">${userPageReviewRows(user).slice(0, 2).map((review) => `<div><span><strong>${userPageEscape(review.reviewer)}</strong><small>${"★".repeat(review.rating)} · ${userPageEscape(review.date)}</small></span>${badge(review.status, review.tone)}</div>`).join("")}</div></section>`;
}

function userPageOverview(user) {
  return `<div class="user-detail-main-column">${userPageAbout(user)}${userPageExperience(user)}${userPageWorks(user)}${userPageCertificates(user)}${userPageReviewPreview(user)}</div><aside class="user-detail-side-column">${userPageAccountInfo(user)}${userPageModerationSummary(user)}${userPageRecentReports(user)}${userPageAdminNotes(user)}${userPageAccountActions(user)}</aside>`;
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
  return `<section class="user-detail-panel user-account-actions"><h2>Account Actions</h2><div class="user-action-stack">${userPageActionButtons(user)}<button class="btn" type="button" data-user-page-history>View moderation history</button></div></section>`;
}

function userPageActivity(user) {
  const quests = userQuestRecords(user).slice(0, 8).map((quest) => ({
    at: quest.age || "Recent",
    title: quest.status === "Completed" ? "Quest completed" : quest.person === user.title ? "Quest created" : "Quest joined",
    detail: `${quest.id} · ${quest.title}`,
  }));
  const events = [
    { at: user.lastActiveAt, title: "Account activity", detail: "Last active in the admin record" },
    ...quests,
    { at: "2 weeks ago", title: "Review submitted", detail: "A marketplace review was recorded for this account" },
    ...userReportsFor(user).slice(0, 3).map((report) => ({ at: report.reportedAt, title: "Report received", detail: `${report.id} · ${report.category}` })),
    { at: user.accountCreatedAt, title: "Account created", detail: "User joined KuQuest" },
  ];
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Activity</h2><p>Recent marketplace activity and account events.</p></div></div><div class="user-activity-list">${events.map((event) => `<article><span class="user-activity-dot" aria-hidden="true"></span><div><strong>${userPageEscape(event.title)}</strong><time>${userPageDate(event.at)}</time><p>${userPageEscape(event.detail)}</p></div></article>`).join("")}</div></section>`;
}

function userPageReviews(user) {
  const reviews = userPageReviewsData(user);
  const query = userPageState.reviewQuery.trim().toLowerCase();
  const sorted = [...reviews].sort((first, second) => {
    if (userPageState.reviewSort === "rating-desc") return second.rating - first.rating;
    if (userPageState.reviewSort === "rating-asc") return first.rating - second.rating;
    return 0;
  });
  const filtered = sorted.filter((review) => {
    const matchesFilter = userPageState.reviewFilter === "all" || review.status.toLowerCase() === userPageState.reviewFilter;
    const searchable = `${review.reviewer} ${review.review} ${review.status}`.toLowerCase();
    return matchesFilter && (!query || searchable.includes(query));
  });
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Reviews</h2>${userPageReviewSummary()}</div></div><div class="user-review-toolbar"><div class="inline-search search-field">${ico("search")}<input type="search" data-review-search value="${userPageEscape(userPageState.reviewQuery)}" placeholder="Search reviews…" aria-label="Search reviews"></div><div class="user-review-sort"><label for="review-sort">Sort</label><select id="review-sort" data-review-sort aria-label="Sort reviews"><option value="latest" ${userPageState.reviewSort === "latest" ? "selected" : ""}>Latest</option><option value="rating-desc" ${userPageState.reviewSort === "rating-desc" ? "selected" : ""}>Rating: 5 → 1</option><option value="rating-asc" ${userPageState.reviewSort === "rating-asc" ? "selected" : ""}>Rating: 1 → 5</option></select></div><div class="user-review-filters" role="group" aria-label="Review filters">${["all", "reported", "hidden"].map((filter) => `<button class="tab ${userPageState.reviewFilter === filter ? "active" : ""}" type="button" data-review-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join("")}</div></div>${filtered.length ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr><th>Reviewer</th><th>Rating</th><th>Review</th><th>Date</th><th>Reports</th><th>Status</th><th>Action</th></tr></thead><tbody>${filtered.map((review) => `<tr><td><strong>${userPageEscape(review.reviewer)}</strong></td><td>${"★".repeat(review.rating)}</td><td>${userPageEscape(review.review)}</td><td>${userPageEscape(review.date)}</td><td>${review.reports}</td><td>${badge(review.status, review.tone)}</td><td><button class="link" type="button" data-review-action="View" data-review-name="${userPageEscape(review.reviewer)}">View</button> <button class="link" type="button" data-review-action="Hide" data-review-name="${userPageEscape(review.reviewer)}">Hide</button> <button class="link danger-link" type="button" data-review-action="Remove" data-review-name="${userPageEscape(review.reviewer)}">Remove</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty"><h3>No matching reviews</h3><p>Try another filter or search term.</p></div>'}</section>`;
}

function userPageReviewsData(user) {
  return userPageReviewsFixtures(user);
}

function userPageReviewsFixtures(user) {
  return [
    { reviewer: "Alex Smith", rating: 5, review: "Reliable, thoughtful, and clear throughout the project.", date: "2 weeks ago", reports: 0, status: "Visible", tone: "success" },
    { reviewer: "Mayuree Nopparat", rating: 5, review: "Delivered careful work and responded quickly to feedback.", date: "1 month ago", reports: userReportsFor(user).length ? 1 : 0, status: userReportsFor(user).length ? "Reported" : "Visible", tone: userReportsFor(user).length ? "warning" : "success" },
    { reviewer: "Kittipong Manee", rating: 4, review: "Strong result with useful notes for the team.", date: "2 months ago", reports: 0, status: "Visible", tone: "success" },
  ];
}

function userPageReports(user) {
  const reports = userReportsFor(user);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Reports</h2><p>Reports filed against this account.</p></div><span class="section-count">${reports.length}</span></div>${reports.length ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr><th>Report</th><th>Type</th><th>Reported by</th><th>Reason</th><th>Status</th><th>Reported</th><th>Action</th></tr></thead><tbody>${reports.map((report) => `<tr><td><strong>${userPageEscape(report.id)}</strong></td><td>${userPageEscape(report.category)}</td><td>${userPageEscape(report.reporterName)}</td><td>${userPageEscape(report.details)}</td><td>${badge(report.status, report.tone)}</td><td>${userPageDate(report.reportedAt)}</td><td><a class="link" href="/reports/${encodeURIComponent(report.id)}">View</a></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty"><h3>No reports received</h3><p>This account has no report records.</p></div>'}</section>`;
}

function userPageAdminHistory(user) {
  const history = userPageHistory(user);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Admin History</h2><p>Moderation events recorded for this account.</p></div></div><div class="table-wrap"><table class="data user-detail-table"><thead><tr><th>Date</th><th>Admin</th><th>Action</th><th>Reason</th><th>Related report</th></tr></thead><tbody>${history.map((entry) => `<tr><td>${userPageDate(entry.at)}</td><td>${userPageEscape(entry.by || "System")}</td><td><strong>${userPageEscape(entry.event)}</strong></td><td>${userPageEscape(entry.reason || entry.note || "—")}</td><td>${userPageEscape((entry.reason || entry.note || "").match(/RPT-\d+/)?.[0] || "—")}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function userPageTabContent(user) {
  if (userPageState.tab === "activity") return userPageActivity(user);
  if (userPageState.tab === "reviews") return userPageReviews(user);
  if (userPageState.tab === "reports") return userPageReports(user);
  if (userPageState.tab === "admin-history") return userPageAdminHistory(user);
  return userPageOverview(user);
}

function userPageSummary(user) {
  const profile = userPageProfile(user);
  const quests = userQuestRecords(user);
  const completed = quests.filter((quest) => quest.status === "Completed").length;
  return `<section class="user-summary-panel"><div class="user-summary-grid"><div class="user-summary-identity"><span class="user-profile-avatar">${userPageInitials(user.title)}</span><div><h2>${userPageEscape(user.title)}</h2><p>${userPageEscape(userPageFaculty(user))}</p><p>Kasetsart University</p><a href="mailto:${userPageEscape(user.person)}">${userPageEscape(user.person)}</a><div class="user-summary-badges">${badge(userPageStatus(user), user.tone)}${badge("Verified", "success")}</div><div class="user-detail-tags">${profile.tags.map((tag) => `<span>${userPageEscape(tag)}</span>`).join("")}</div></div></div><div class="user-summary-stats"><div><strong>4.9</strong><span>Rating</span></div><div><strong>15</strong><span>Reviews</span></div><div><strong>${quests.length}</strong><span>Quests</span></div><div><strong>${completed}</strong><span>Completed</span></div></div></div></section>`;
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
  main.innerHTML = `<div class="user-detail-breadcrumb"><a href="/?view=users">Users</a><span>›</span><span>${userPageEscape(user.title)}</span></div><div class="page-head user-detail-page-head"><div><h1>${userPageEscape(user.title)}</h1><p>Review user information, activity, and moderation history.</p></div></div>${userPageSummary(user)}<nav class="user-detail-tabs" aria-label="User detail sections">${[["overview", "Overview"], ["activity", "Activity"], ["reviews", "Reviews"], ["reports", "Reports"], ["admin-history", "Admin History"]].map(([value, label]) => `<button class="${userPageState.tab === value ? "active" : ""}" type="button" data-user-tab="${value}" aria-current="${userPageState.tab === value ? "page" : "false"}">${label}</button>`).join("")}</nav><div class="user-detail-layout">${userPageTabContent(user)}</div>`;
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
    userPageState.tab = "admin-history";
    renderUserPage();
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
    renderUserPage();
    document.querySelector("[data-review-search]")?.focus();
  };
  const reviewSort = document.querySelector("[data-review-sort]");
  if (reviewSort) reviewSort.onchange = (event) => {
    userPageState.reviewSort = event.target.value;
    renderUserPage();
  };
  document.querySelectorAll("[data-review-filter]").forEach((button) => (button.onclick = () => {
    userPageState.reviewFilter = button.dataset.reviewFilter;
    renderUserPage();
  }));
  document.querySelectorAll("[data-review-action]").forEach((button) => (button.onclick = () => toast(`${button.dataset.reviewAction} review by ${button.dataset.reviewName}.`)));
}

window.__KUQUEST_USER_DETAIL__ = {
  user: null,
  render: renderUserPage,
};

if (typeof setActiveNavigation === "function") renderUserPage();
