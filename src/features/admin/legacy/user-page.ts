import type {
  LegacyHistoryEntry,
  LegacyRecord,
} from "./runtime";
import type { ModerationPageContext } from "./dispute-detail";
import { payoutStatusFor, questStateFor, reportCaseStatusFor, walletStatusFor } from "../domain/rulebook";

export type UserReview = {
  reviewer: string;
  rating: number;
  review: string;
  date: string;
  reports: number;
  status: string;
  tone: string;
  statusBeforeHidden?: string;
  toneBeforeHidden?: string;
  [key: string]: unknown;
};

type UserNote = Omit<LegacyHistoryEntry, "event"> & { event?: string };

export type UserRecord = LegacyRecord & {
  about?: string;
  tags?: string[];
  accountCreatedAt?: string;
  lastActiveAt?: string;
  banExpiresAt?: string;
  redFlagExpiresAt?: string;
  confirmedViolationCount?: number;
  reviews?: UserReview[];
  adminNotes?: UserNote[];
};

export type UserTable = "reviews" | "reports" | "penalties";
export type UserRow = UserReview | LegacyRecord | LegacyHistoryEntry;
export type UserTableState = {
  page: number;
  size: number;
  sortKey: string;
  direction: "asc" | "desc";
};
export type UserPagination<T extends UserRow = UserRow> = {
  rows: T[];
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
};

export type UserPageContext = Omit<ModerationPageContext, "data"> & {
  data: Omit<ModerationPageContext["data"], "users"> & {
    users: UserRecord[];
  };
  recordId?: string;
  search: string;
  setActiveNavigation: (view: string) => void;
  openDrawer: (view: string, index: number) => void;
  openPenaltyDialog: (user: UserRecord) => void;
  userQuestRecords: (user: UserRecord) => LegacyRecord[];
  userReportsFor: (user: UserRecord) => LegacyRecord[];
  completedPayoutQuests: (user: UserRecord) => LegacyRecord[];
  payoutEarningForQuest: (quest: LegacyRecord) => number;
  payoutTimestamp: (record: LegacyRecord) => number;
  penaltyOutcomeFor: (user: UserRecord) => { key: string; label: string } | null;
  penaltyOutcomeLabel: (
    outcome: { key: string; label: string } | null,
  ) => string;
  redFlagExemptionFor: (
    user: UserRecord,
  ) => { key: string; remaining: number } | null;
  confirmedViolationCount: (user: UserRecord) => number;
  adminDateTime: () => string;
  currentAdminName: () => string;
  recordActivity: (title: string, detail: string, actor?: string) => void;
};

declare global {
  interface Window {
    __KUQUEST_USER_DETAIL__?: {
      user: UserRecord | null;
      render: () => void;
    };
  }
}

function query<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

function queryAll<T extends Element>(
  root: ParentNode,
  selector: string,
): NodeListOf<T> {
  return root.querySelectorAll<T>(selector);
}

function isUserTable(value: string | undefined): value is UserTable {
  return value === "reviews" || value === "reports" || value === "penalties";
}

export type UserPageApi = {
  renderUserPage: () => void;
};

export function initializeUserPage(context: UserPageContext): UserPageApi {
  const {
    data,
    main,
    openDrawer,
    icon: ico,
    escapeActivityText,
    fmt,
    badge,
    persistAdminData,
    recordActivity,
    toast,
    setActiveNavigation,
    openPenaltyDialog,
    userQuestRecords,
    userReportsFor,
    completedPayoutQuests,
    payoutEarningForQuest,
    payoutTimestamp,
    penaltyOutcomeFor,
    penaltyOutcomeLabel,
    redFlagExemptionFor,
    confirmedViolationCount,
    adminDateTime,
    currentAdminName,
  } = context;
  const userPageId =
    context.recordId ||
    new URLSearchParams(context.search).get("id") ||
    "";
  const userPageState: {
    tab: "overview" | "activity" | "payouts" | "reviews" | "reports" | "penalty-history";
    reviewFilter: string;
    reviewQuery: string;
    reviewRating: number | null;
  } = {
    tab: "overview",
    reviewFilter: "all",
    reviewQuery: "",
    reviewRating: null,
  };
  const userPageTableState: Record<UserTable, UserTableState> = {
    reviews: { page: 1, size: 10, sortKey: "date", direction: "desc" },
    reports: { page: 1, size: 10, sortKey: "reportedAt", direction: "desc" },
    penalties: { page: 1, size: 10, sortKey: "at", direction: "desc" },
  };

function userPageEscape(value: unknown): string {
  return escapeActivityText(value ?? "");
}

function userPageDate(value: unknown): string {
  return userPageEscape(String(value || "Date not recorded").replace(/\s+ICT$/, ""));
}

function userPageActivityDate(value: unknown, index = 0): { text: string; timestamp: number } {
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

function userPageTableSortHeader(table: UserTable, key: string, label: string): string {
  const state = userPageTableState[table];
  const active = state.sortKey === key;
  const direction = active ? state.direction : "none";
  return `<th scope="col" aria-sort="${direction === "none" ? "none" : direction === "asc" ? "ascending" : "descending"}"><button class="table-sort${active ? " is-active" : ""}" type="button" data-user-table-sort="${table}:${key}">${label}<span class="sort-indicator" aria-hidden="true">${active ? (state.direction === "asc" ? "↑" : "↓") : "↕"}</span></button></th>`;
}

function userPageTableSortValue(table: UserTable, row: UserRow, index: number, key: string): string | number {
  if (table === "reviews" && key === "date") return -index;
  if (key === "relatedReport") return String(row.reason || row.note || "").match(/RPT-\d+/)?.[0] || "";
  if (key === "reportedAt" || key === "at") return Date.parse(String(row[key] || "").replace(" · ", " ").replace(/\s+ICT$/, "")) || 0;
  const value = row[key];
  return typeof value === "string" || typeof value === "number" ? value : "";
}

function userPageSortedTableRows<T extends UserRow>(table: UserTable, rows: T[]): T[] {
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

function userPagePaginateTable<T extends UserRow>(table: UserTable, rows: T[]): UserPagination<T> {
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

function userPageTablePagination<T extends UserRow>(table: UserTable, pagination: UserPagination<T>): string {
  const label = table === "penalties" ? "penalty history" : table;
  return `<div class="table-pagination" aria-label="${label} pagination"><span class="page-indicator">Showing ${pagination.start}–${pagination.end} of ${pagination.total}</span><button class="page-nav" type="button" data-user-table-page="${table}:${pagination.page - 1}"${pagination.page === 1 ? " disabled" : ""}>Previous</button><span class="page-indicator">Page ${pagination.page} of ${pagination.pageCount}</span><button class="page-nav" type="button" data-user-table-page="${table}:${pagination.page + 1}"${pagination.page === pagination.pageCount ? " disabled" : ""}>Next</button></div>`;
}

function userPageInitials(name: unknown): string {
  return String(name || "User")
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function userPageStatus(user: UserRecord): string {
  return walletStatusFor(user.walletStatus ?? user.status);
}

function userPageFaculty(user: UserRecord): string {
  return String(user.other || "Student").split(" · ")[0];
}

function userPageProfile(user: UserRecord): { about: string; tags: string[] } {
  return {
    about: user.about ||
      "KuQuest participant contributing to university marketplace projects.",
    tags: user.tags || ["Student", "Marketplace", "University"],
  };
}

function userPageReviewRows(user: UserRecord): UserReview[] {
  return Array.isArray(user.reviews) ? user.reviews : [];
}

function userPageHistory(user: UserRecord): LegacyHistoryEntry[] {
  const history = (Array.isArray(user.moderationHistory) ? user.moderationHistory : []) as LegacyHistoryEntry[];
  const relevant = history
    .filter((entry) => /flag|violation|warning|ban|penalty/i.test(String(entry.event || "")));
  return relevant.length
    ? relevant
    : [];
}

function userPageActionButtons(user: UserRecord): string {
  if (["FROZEN", "SUSPENDED", "CLOSED"].includes(userPageStatus(user))) return '<p class="audit-note">No manual penalty override is available. The SRS duration or permanent ban rule applies.</p>';
  return '<button class="btn primary" data-user-page-penalty="apply">Record violation</button>';
}

function userPageAbout(user: UserRecord): string {
  const profile = userPageProfile(user);
  return `<section class="user-detail-panel"><h2>About Me</h2><p class="user-about-copy">${userPageEscape(profile.about)}</p></section>`;
}

function userPageExperience(user: UserRecord): string {
  const faculty = userPageFaculty(user);
  return `<section class="user-detail-panel"><h2>Experience</h2><div class="user-simple-list"><article><strong>Student project contributor</strong><span>${userPageEscape(faculty)} · ${userPageEscape(String(user.other || "").split(" · ")[1] || "Current")}</span><p>Contributes reliable research, documentation, and project support through KuQuest.</p></article><article><strong>University marketplace participant</strong><span>KuQuest · ${userPageEscape(user.accountCreatedAt || "Current")}</span><p>Works with hirers and workers to complete university-focused assignments.</p></article></div></section>`;
}

function userPageWorks(user: UserRecord): string {
  const quests = userQuestRecords(user).filter((quest) => questStateFor(quest.questState ?? quest.status) === "QUEST_COMPLETED").slice(0, 2);
  const works: LegacyRecord[] = quests.length
    ? quests
    : [{ id: "—", title: "Marketplace contribution", person: "", other: "University project", status: "QUEST_COMPLETED", tone: "success", amount: null, age: "" }];
  return `<section class="user-detail-panel"><div class="user-panel-heading"><h2>My Works</h2><span class="section-count">${works.length}</span></div><div class="user-work-grid">${works.map((work, index) => `<article class="user-work-item"><span class="user-work-thumb" aria-hidden="true">${index === 0 ? "▦" : "◈"}</span><strong>${userPageEscape(work.title)}</strong><span>${userPageEscape(work.other || "University project")} · ${userPageEscape(work.teamQuest ? "Team quest" : "Individual quest")}</span></article>`).join("")}</div></section>`;
}

function userPagePayoutRecords(user: UserRecord): Array<{ record: LegacyRecord; index: number }> {
  return data.payouts
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.title === user.title)
    .sort((first, second) => payoutTimestamp(second.record) - payoutTimestamp(first.record));
}

function userPagePayoutHistory(user: UserRecord, compact = false): string {
  const payoutRecords = userPagePayoutRecords(user),
    totalEarned = completedPayoutQuests(user).reduce((total, quest) => total + payoutEarningForQuest(quest), 0),
    completed = payoutRecords.filter(({ record }) => payoutStatusFor(record.payoutStatus ?? record.status) === "SUCCEEDED"),
    inFlight = payoutRecords.filter(({ record }) => ["PENDING_ADMIN_APPROVAL", "SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING"].includes(payoutStatusFor(record.payoutStatus ?? record.status))),
    shownRecords = compact ? payoutRecords.slice(0, 5) : payoutRecords,
    headingAction = compact && payoutRecords.length > shownRecords.length
      ? '<button class="link" type="button" data-user-tab="payouts">View all</button>'
      : "";
  return `<section class="user-detail-panel${compact ? " user-payout-preview" : " user-tab-panel"}"><div class="user-panel-heading"><div><h2>Payout history</h2>${compact ? `<p>Total earned ฿${fmt(totalEarned)} · Recent requests and transfer outcomes for this account.</p>` : `<p>${payoutRecords.length} payout records · ${completed.length} completed.</p>`}</div><div class="user-panel-heading-actions">${headingAction}<span class="section-count">${payoutRecords.length}</span></div></div>${!compact && payoutRecords.length ? `<div class="user-payout-stat-list"><div><strong>฿${fmt(totalEarned)}</strong><span>Total earned</span></div><div><strong>฿${fmt(completed.reduce((total, entry) => total + Number(entry.record.amount || 0), 0))}</strong><span>Paid out</span></div><div><strong>฿${fmt(inFlight.reduce((total, entry) => total + Number(entry.record.amount || 0), 0))}</strong><span>In progress</span></div><div><strong>${payoutRecords.length}</strong><span>Total requests</span></div></div>` : ""}${shownRecords.length ? `<div class="user-payout-list">${shownRecords.map(({ record, index }) => `<button class="user-payout-row" type="button" data-user-payout="${index}" aria-label="Open payout ${userPageEscape(record.id)}"><span class="user-payout-primary"><strong>${userPageEscape(record.id)}</strong><small>${userPageDate(record.requestedAt)}</small><small>${userPageEscape(record.questId || record.other || "Quest")}</small></span><span class="user-payout-secondary"><strong>฿${fmt(record.amount)}</strong>${badge(payoutStatusFor(record.payoutStatus ?? record.status), record.tone)}</span></button>`).join("")}</div>` : '<div class="empty"><h3>No payout history</h3><p>This account has no payout records.</p></div>'}</section>`;
}

function userPageCertificates(user: UserRecord): string {
  const faculty = userPageFaculty(user);
  return `<section class="user-detail-panel"><h2>Certificates</h2><div class="user-certificate-list"><div><strong>University marketplace orientation</strong><span>KuQuest · ${userPageEscape(user.accountCreatedAt || "2026")}</span></div><div><strong>${userPageEscape(faculty)} project fundamentals</strong><span>University learning centre · 2025</span></div></div></section>`;
}

function userPageReviewSummary(user: UserRecord): string {
  const reviews = userPageReviewsData(user);
  const average = reviews.length
    ? (reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : "—";
  return `<div class="user-review-summary"><strong>${average} ★</strong><span class="user-review-count">(${reviews.length})</span><span class="user-review-rating-links" role="group" aria-label="Filter reviews by rating"><button class="user-review-rating-link${userPageState.reviewRating === null ? " active" : ""}" type="button" data-review-rating="all" aria-pressed="${userPageState.reviewRating === null}">All</button>${[5, 4, 3, 2, 1].map((rating) => `<button class="user-review-rating-link${userPageState.reviewRating === rating ? " active" : ""}" type="button" data-review-rating="${rating}" aria-pressed="${userPageState.reviewRating === rating}">${rating} star</button>`).join("")}</span></div>`;
}

function userPageReviewPreview(user: UserRecord): string {
  return `<section class="user-detail-panel"><div class="user-panel-heading"><div><h2>Reviews</h2>${userPageReviewSummary(user)}</div><button class="link" type="button" data-user-tab="reviews">View all</button></div><div class="user-review-preview">${userPageReviewRows(user).slice(0, 5).map((review) => `<div><span><strong>${userPageEscape(review.reviewer)}</strong><small>${"★".repeat(review.rating)} · ${userPageEscape(review.date)}</small></span>${badge(review.status, review.tone)}</div>`).join("")}</div></section>`;
}

function userPageOverview(user: UserRecord): string {
  return `<div class="user-detail-main-column">${userPageAbout(user)}${userPageExperience(user)}${userPageWorks(user)}${userPagePayoutHistory(user, true)}${userPageCertificates(user)}${userPageReviewPreview(user)}</div><aside class="user-detail-side-column">${userPageAccountInfo(user)}${userPageModerationSummary(user)}${userPageRecentReports(user)}${userPageAdminNotes(user)}${userPageAccountActions(user)}</aside>`;
}

function userPageAccountInfo(user: UserRecord): string {
  const [faculty, year] = String(user.other || "Student").split(" · ");
  return `<section class="user-detail-panel"><h2>Account Information</h2><dl class="user-facts"><div><dt>Account status</dt><dd>${badge(userPageStatus(user), String(user.tone))}</dd></div><div><dt>Email verified</dt><dd>Yes</dd></div><div><dt>Created</dt><dd>${userPageDate(user.accountCreatedAt)}</dd></div><div><dt>Last active</dt><dd>${userPageDate(user.lastActiveAt)}</dd></div><div><dt>Role</dt><dd>Student</dd></div><div><dt>University</dt><dd>Kasetsart University</dd></div><div><dt>Faculty</dt><dd>${userPageEscape(faculty || "Not recorded")}${year ? ` · ${userPageEscape(year)}` : ""}</dd></div></dl></section>`;
}

function userPageModerationSummary(user: UserRecord): string {
  const reports = userReportsFor(user);
  const penaltyLabel = user.penalty?.label || "";
  const activeWarnings = penaltyLabel === "Red Flag" ? 1 : 0;
  const suspensions = ["Temporary ban", "Permanent ban"].includes(penaltyLabel) ? 1 : 0;
  const confirmedViolations = confirmedViolationCount(user);
  const nextOutcome = penaltyOutcomeFor(user);
  const exemption = redFlagExemptionFor(user);
  const expiresAt = penaltyLabel === "Temporary ban" ? user.banExpiresAt : penaltyLabel === "Red Flag" ? user.redFlagExpiresAt : "";
  return `<section class="user-detail-panel"><h2>Moderation Summary</h2><div class="user-counter-list"><div><strong>${reports.length}</strong><span>Reports received</span></div><div><strong>${confirmedViolations}</strong><span>Confirmed violations</span></div><div><strong>${activeWarnings}</strong><span>Active Red Flags</span></div><div><strong>${suspensions}</strong><span>Suspensions</span></div></div><p class="audit-note">Next outcome: <strong>${userPageEscape(penaltyOutcomeLabel(nextOutcome))}</strong>${exemption ? ` · ${exemption.remaining} Red Flag exemption${exemption.remaining === 1 ? "" : "s"} remaining` : ""}${expiresAt ? ` · ${penaltyLabel === "Temporary ban" ? "Temporary ban" : "Red Flag"} expires ${userPageDate(expiresAt)}` : ""}.</p><button class="btn full-width" type="button" data-user-tab="reports">View reports</button></section>`;
}

function userPageRecentReports(user: UserRecord): string {
  const reports = userReportsFor(user).slice(0, 3);
  return `<section class="user-detail-panel"><div class="user-panel-heading"><h2>Recent Reports</h2><span class="section-count">${reports.length}</span></div>${reports.length ? `<div class="user-recent-reports">${reports.map((report) => `<a href="/reports/${encodeURIComponent(report.id)}"><span><strong>${userPageEscape(report.id)}</strong><small>${userPageEscape(report.category)}</small></span>${badge(reportCaseStatusFor(report.reportCaseStatus ?? report.conductReportStatus ?? report.status, report.decision), report.tone)}</a>`).join("")}</div>` : '<p class="audit-note">No reports have been filed against this account.</p>'}</section>`;
}

function userPageAdminNotes(user: UserRecord): string {
  const notes = Array.isArray(user.adminNotes) ? user.adminNotes : [];
  return `<section class="user-detail-panel"><div class="user-panel-heading"><h2>Admin Notes</h2><span class="admin-only-label">Admin only</span></div>${notes.length ? `<div class="user-admin-notes">${notes.slice(0, 2).map((note) => `<article><strong>${userPageDate(note.at)}</strong><small>${userPageEscape(note.by || "Admin")}</small><p>${userPageEscape(note.note)}</p></article>`).join("")}</div>` : '<p class="audit-note">No internal notes recorded.</p>'}<label class="user-note-label" for="user-note-input">Internal note</label><textarea id="user-note-input" data-user-note-input rows="3" maxlength="500" placeholder="Add an internal note about this user…"></textarea><button class="btn" type="button" data-save-user-note>Save note</button></section>`;
}

function userPageAccountActions(user: UserRecord): string {
  return `<section class="user-detail-panel user-account-actions"><h2>Account Actions</h2><div class="user-action-stack">${userPageActionButtons(user)}<button class="btn" type="button" data-user-page-history>View penalty history</button></div></section>`;
}

function userPageQuestRole(quest: LegacyRecord, user: UserRecord): { label: string; isHirer: boolean } {
  if (quest.person === user.title) {
    return { label: "Hirer", isHirer: true };
  }
  return { label: "Worker", isHirer: false };
}

function userPageQuestStatus(quest: LegacyRecord): { label: string; tone: string } {
  return { label: questStateFor(quest.questState ?? quest.status), tone: quest.tone || "neutral" };
}

function userPageQuestDates(quest: LegacyRecord, index: number): { created: string; starts: string; due: string; timestamp: number } {
  const created = userPageActivityDate(quest.createdAt || quest.activityAt || quest.age, index);
  const starts = userPageActivityDate(quest.startsAt || quest.createdAt || quest.age, index);
  const due = userPageActivityDate(quest.dueAt || quest.createdAt || quest.age, index);
  return { created: created.text, starts: starts.text, due: due.text, timestamp: created.timestamp };
}

function userPageQuestAmount(quest: LegacyRecord, role: { isHirer: boolean }): { label: string; amount: number } {
  if (role.isHirer) return { label: "Amount funded", amount: Number(quest.amount || 0) };
  const workerAmount = typeof payoutEarningForQuest === "function"
    ? payoutEarningForQuest(quest)
    : Math.round(Number(quest.amount || 0) / (quest.teamParticipants?.length || Number(quest.teamSize) || 1));
  return { label: "Amount earned", amount: workerAmount };
}

function userPageActivity(user: UserRecord): string {
  const questRecords = userQuestRecords(user);
  const completedQuests = questRecords.filter((quest) => questStateFor(quest.questState ?? quest.status) === "QUEST_COMPLETED").length;
  const quests = questRecords.map((quest, index) => {
    const role = userPageQuestRole(quest, user);
    const status = userPageQuestStatus(quest);
    const dates = userPageQuestDates(quest, index);
    const amount = userPageQuestAmount(quest, role);
    return {
      quest,
      role,
      status,
      dates,
      amount,
    };
  });
  const events = quests.sort((first, second) => second.dates.timestamp - first.dates.timestamp);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Quest history</h2><p>All ${questRecords.length} connected quests · ${completedQuests} completed.</p></div><span class="section-count">${questRecords.length}</span></div>${events.length ? `<div class="user-quest-history-list">${events.map((event) => `<a class="user-quest-history-row" href="/quests/${encodeURIComponent(event.quest.id)}"><div class="user-quest-history-primary"><div class="user-quest-history-title"><strong>${userPageEscape(event.quest.title)}</strong><span>${userPageEscape(event.quest.id)}</span></div><div class="user-quest-history-fields"><div class="user-quest-history-field"><span>Role</span><strong>${userPageEscape(event.role.label)}</strong></div><div class="user-quest-history-field"><span>Quest status</span>${badge(event.status.label, event.status.tone)}</div><div class="user-quest-history-field user-quest-history-dates"><span>Dates</span><strong>Created ${userPageEscape(event.dates.created)}</strong><small>Starts ${userPageEscape(event.dates.starts)}</small><small>Due ${userPageEscape(event.dates.due)}</small></div><div class="user-quest-history-field"><span>${userPageEscape(event.amount.label)}</span><strong>฿${fmt(event.amount.amount)}</strong></div></div></div><span class="user-quest-history-action">View full quest <span aria-hidden="true">→</span></span></a>`).join("")}</div>` : '<div class="empty"><h3>No quest history</h3><p>This account has no linked quest records.</p></div>'}</section>`;
}

function userPageReviews(user: UserRecord): string {
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
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Reviews</h2>${userPageReviewSummary(user)}</div></div><div class="user-review-toolbar"><div class="inline-search search-field">${ico("search")}<input type="search" data-review-search value="${userPageEscape(userPageState.reviewQuery)}" placeholder="Search reviews…" aria-label="Search reviews"></div><div class="user-review-filters" role="group" aria-label="Review filters">${["all", "reported", "hidden"].map((filter) => `<button class="tab ${userPageState.reviewFilter === filter ? "active" : ""}" type="button" data-review-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join("")}</div></div>${pagination.total ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr>${userPageTableSortHeader("reviews", "reviewer", "Reviewer")}${userPageTableSortHeader("reviews", "rating", "Rating")}${userPageTableSortHeader("reviews", "review", "Review")}${userPageTableSortHeader("reviews", "date", "Date")}${userPageTableSortHeader("reviews", "reports", "Reports")}${userPageTableSortHeader("reviews", "status", "Status")}<th scope="col">Action</th></tr></thead><tbody>${pagination.rows.map((review) => `<tr><td><strong>${userPageEscape(review.reviewer)}</strong></td><td>${"★".repeat(review.rating)}</td><td>${userPageEscape(review.review)}</td><td>${userPageEscape(review.date)}</td><td>${review.reports}</td><td>${badge(review.status, review.tone)}</td><td><button class="link" type="button" data-review-action="View" data-review-name="${userPageEscape(review.reviewer)}">View</button> <button class="link" type="button" data-review-action="${review.status === "Hidden" ? "Unhide" : "Hide"}" data-review-index="${reviews.indexOf(review)}" data-review-name="${userPageEscape(review.reviewer)}">${review.status === "Hidden" ? "Unhide" : "Hide"}</button></td></tr>`).join("")}</tbody></table></div>${userPageTablePagination("reviews", pagination)}` : '<div class="empty"><h3>No matching reviews</h3><p>Try another filter or search term.</p></div>'}</section>`;
}

function userPageReviewsData(user: UserRecord): UserReview[] {
  return Array.isArray(user.reviews) ? user.reviews : [];
}

function toggleReviewVisibility(user: UserRecord, reviewIndex: number): void {
  const review = userPageReviewsData(user)[reviewIndex];
  if (!review) return;
  const isHidden = review.status === "Hidden";
  if (isHidden) {
    review.status = review.statusBeforeHidden || "Visible";
    review.tone = review.toneBeforeHidden || "success";
    delete review.statusBeforeHidden;
    delete review.toneBeforeHidden;
  } else {
    review.statusBeforeHidden = review.status;
    review.toneBeforeHidden = review.tone;
    review.status = "Hidden";
    review.tone = "neutral";
  }
  persistAdminData();
  recordActivity(isHidden ? "Review unhidden" : "Review hidden", `${user.id} · ${user.title} · ${review.reviewer}`);
  renderUserPage();
  toast(isHidden ? "Review unhidden" : "Review hidden");
}

function userPageReports(user: UserRecord): string {
  const reports = userReportsFor(user);
  const sorted = userPageSortedTableRows("reports", reports);
  const pagination = userPagePaginateTable("reports", sorted);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Reports</h2><p>Reports filed against this account.</p></div><span class="section-count">${reports.length}</span></div>${pagination.total ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr>${userPageTableSortHeader("reports", "id", "Report")}${userPageTableSortHeader("reports", "category", "Type")}${userPageTableSortHeader("reports", "reporterName", "Reported by")}${userPageTableSortHeader("reports", "details", "Reason")}${userPageTableSortHeader("reports", "status", "Status")}${userPageTableSortHeader("reports", "reportedAt", "Reported")}<th scope="col">Action</th></tr></thead><tbody>${pagination.rows.map((report) => `<tr><td><strong>${userPageEscape(report.id)}</strong></td><td>${userPageEscape(report.category)}</td><td>${userPageEscape(report.reporterName)}</td><td>${userPageEscape(report.details)}</td><td>${badge(reportCaseStatusFor(report.reportCaseStatus ?? report.conductReportStatus ?? report.status, report.decision), report.tone)}</td><td>${userPageDate(report.reportedAt)}</td><td><a class="link" href="/reports/${encodeURIComponent(report.id)}">View</a></td></tr>`).join("")}</tbody></table></div>${userPageTablePagination("reports", pagination)}` : '<div class="empty"><h3>No reports received</h3><p>This account has no report records.</p></div>'}</section>`;
}

function userPagePenaltyHistory(user: UserRecord): string {
  const history = userPageHistory(user);
  const sorted = userPageSortedTableRows("penalties", history);
  const pagination = userPagePaginateTable("penalties", sorted);
  return `<section class="user-detail-panel user-tab-panel"><div class="user-panel-heading"><div><h2>Penalty History</h2><p>Penalty and moderation events recorded for this account.</p></div></div>${pagination.total ? `<div class="table-wrap"><table class="data user-detail-table"><thead><tr>${userPageTableSortHeader("penalties", "at", "Date")}${userPageTableSortHeader("penalties", "by", "Admin")}${userPageTableSortHeader("penalties", "event", "Action")}${userPageTableSortHeader("penalties", "reason", "Reason")}${userPageTableSortHeader("penalties", "relatedReport", "Related report")}</tr></thead><tbody>${pagination.rows.map((entry) => `<tr><td>${userPageDate(entry.at)}</td><td>${userPageEscape(entry.by || "System")}</td><td><strong>${userPageEscape(entry.event)}</strong></td><td>${userPageEscape(entry.reason || entry.note || "—")}</td><td>${userPageEscape((entry.reason || entry.note || "").match(/RPT-\d+/)?.[0] || "—")}</td></tr>`).join("")}</tbody></table></div>${userPageTablePagination("penalties", pagination)}` : '<div class="empty"><h3>No penalty history</h3><p>No penalty or moderation events have been recorded for this account.</p></div>'}</section>`;
}

function userPageTabContent(user: UserRecord): string {
  if (userPageState.tab === "activity") return userPageActivity(user);
  if (userPageState.tab === "payouts") return userPagePayoutHistory(user);
  if (userPageState.tab === "reviews") return userPageReviews(user);
  if (userPageState.tab === "reports") return userPageReports(user);
  if (userPageState.tab === "penalty-history") return userPagePenaltyHistory(user);
  return userPageOverview(user);
}

function userPageSummary(user: UserRecord): string {
  const profile = userPageProfile(user);
  const quests = userQuestRecords(user);
  const completed = quests.filter((quest) => questStateFor(quest.questState ?? quest.status) === "QUEST_COMPLETED").length;
  const reviews = userPageReviewsData(user);
  const rating = reviews.length
    ? (reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : "—";
  return `<section class="user-summary-panel"><div class="user-summary-grid"><div class="user-summary-identity"><span class="user-profile-avatar">${userPageInitials(user.title)}</span><div><div class="user-summary-name"><h2>${userPageEscape(user.title)}</h2>${badge(userPageStatus(user), String(user.tone))}</div><p>${userPageEscape(userPageFaculty(user))}</p><p>Kasetsart University</p><a href="mailto:${userPageEscape(user.person)}">${userPageEscape(user.person)}</a><div class="user-detail-tags">${profile.tags.map((tag) => `<span>${userPageEscape(tag)}</span>`).join("")}</div></div></div><div class="user-summary-stats"><div><strong>${rating}</strong><span>Rating</span></div><div><strong>${reviews.length}</strong><span>Reviews</span></div><div><strong>${completed}</strong><span>Completed</span></div></div></div></section>`;
}

function renderUserPage(): void {
  const user = data.users.find((candidate) => candidate.id === userPageId);
  const detail = window.__KUQUEST_USER_DETAIL__;
  if (!user) {
    if (detail) detail.user = null;
    main.innerHTML = `<div class="full-page-empty"><h1>User not found</h1><p>No user record matches <strong>${userPageEscape(userPageId)}</strong>.</p><a class="btn primary" href="/?view=users">Return to users</a></div>`;
    return;
  }
  if (detail) detail.user = user;
  setActiveNavigation("users");
  main.innerHTML = `<div class="user-detail-breadcrumb"><a href="/?view=users">Users</a><span>›</span><span>${userPageEscape(user.title)}</span></div><div class="page-head user-detail-page-head"><div><h1>${userPageEscape(user.title)}</h1><p>Review user information, activity, payouts, and penalty history.</p></div></div>${userPageSummary(user)}<nav class="user-detail-tabs" aria-label="User detail sections">${[["overview", "Overview"], ["activity", "Activity"], ["payouts", "Payouts"], ["reviews", "Reviews"], ["reports", "Reports"], ["penalty-history", "Penalty History"]].map(([value, label]) => `<button class="${userPageState.tab === value ? "active" : ""}" type="button" data-user-tab="${value}" aria-current="${userPageState.tab === value ? "page" : "false"}">${label}</button>`).join("")}</nav><div class="user-detail-layout">${userPageTabContent(user)}</div>`;
  bindUserPage(user);
}

function bindUserPage(user: UserRecord): void {
  queryAll<HTMLElement>(document, "[data-user-tab]").forEach((button) => {
    button.onclick = () => {
      const tab = button.dataset.userTab;
      if (tab === "overview" || tab === "activity" || tab === "payouts" || tab === "reviews" || tab === "reports" || tab === "penalty-history") userPageState.tab = tab;
      renderUserPage();
    };
  });
  queryAll<HTMLElement>(document, "[data-user-page-penalty]").forEach((button) => {
    button.onclick = () => {
      openPenaltyDialog(user);
    };
  });
  queryAll<HTMLElement>(document, "[data-user-page-history]").forEach((button) => (button.onclick = () => {
    userPageState.tab = "penalty-history";
    renderUserPage();
  }));
  queryAll<HTMLElement>(document, "[data-user-payout]").forEach((button) => (button.onclick = () => {
    openDrawer("payouts", Number(button.dataset.userPayout));
  }));
  const saveNote = query<HTMLElement>(document, "[data-save-user-note]");
  const noteInput = query<HTMLTextAreaElement>(document, "[data-user-note-input]");
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
  const reviewSearch = query<HTMLInputElement>(document, "[data-review-search]");
  if (reviewSearch) reviewSearch.oninput = (event: Event) => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    userPageState.reviewQuery = target.value;
    userPageTableState.reviews.page = 1;
    renderUserPage();
    query<HTMLInputElement>(document, "[data-review-search]")?.focus();
  };
  queryAll<HTMLElement>(document, "[data-review-filter]").forEach((button) => (button.onclick = () => {
    userPageState.reviewFilter = button.dataset.reviewFilter || "all";
    userPageTableState.reviews.page = 1;
    renderUserPage();
  }));
  queryAll<HTMLElement>(document, "[data-review-rating]").forEach((button) => (button.onclick = () => {
    const rating = button.dataset.reviewRating === "all" ? null : Number(button.dataset.reviewRating);
    const isSelected = userPageState.reviewRating === rating;
    userPageState.reviewRating = rating === null || isSelected ? null : rating;
    userPageTableState.reviews.sortKey = userPageState.reviewRating === null ? "date" : "rating";
    userPageTableState.reviews.direction = "desc";
    userPageTableState.reviews.page = 1;
    userPageState.tab = "reviews";
    renderUserPage();
  }));
  queryAll<HTMLElement>(document, "[data-user-table-sort]").forEach((button) => (button.onclick = () => {
    const [tableValue, key = ""] = (button.dataset.userTableSort || "").split(":");
    if (!isUserTable(tableValue)) return;
    const table = tableValue;
    const state = userPageTableState[table];
    const sameColumn = state.sortKey === key;
    state.sortKey = key;
    state.direction = sameColumn && state.direction === "asc" ? "desc" : "asc";
    state.page = 1;
    renderUserPage();
  }));
  queryAll<HTMLElement>(document, "[data-user-table-page]").forEach((button) => (button.onclick = () => {
    const [tableValue, page] = (button.dataset.userTablePage || "").split(":");
    if (!isUserTable(tableValue)) return;
    const table = tableValue;
    userPageTableState[table].page = Number(page) || 1;
    renderUserPage();
  }));
  queryAll<HTMLElement>(document, "[data-review-action]").forEach((button) => (button.onclick = () => {
    if (["Hide", "Unhide"].includes(button.dataset.reviewAction || "")) {
      toggleReviewVisibility(user, Number(button.dataset.reviewIndex));
      return;
    }
    toast(`${button.dataset.reviewAction} review by ${button.dataset.reviewName}.`);
  }));
}



  return { renderUserPage };
}
