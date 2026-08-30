import type { LegacyRecord } from "./runtime";
import type {
  ModerationPageContext,
  TimelineEntry,
} from "./dispute-detail";

export type ReportPageContext = ModerationPageContext & {
  recordId?: string;
  search: string;
  setActiveNavigation: (view: string) => void;
  penaltyOutcomeFor: (user: LegacyRecord) => { key: string; label: string } | null;
  penaltyOutcomeLabel: (
    outcome: { key: string; label: string } | null,
  ) => string;
  redFlagExemptionFor: (
    user: LegacyRecord,
  ) => { key: string; remaining: number } | null;
  confirmedViolationCount: (user: LegacyRecord) => number;
  applyReportDecision: (
    report: LegacyRecord,
    decision: string,
    reason: string,
  ) => void;
};

function query<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

function queryAll<T extends Element>(
  root: ParentNode,
  selector: string,
): NodeListOf<T> {
  return root.querySelectorAll<T>(selector);
}

export function initializeReportPage(
  context: ReportPageContext,
): () => void {
  const {
    data,
    main,
    closeActiveLayer,
    showModalLayer,
    icon: ico,
    escapeActivityText,
    badge,
    timeline,
    chatMessage,
    chatTimeLabel,
    bindChatAttachment,
    confirmAction,
    persistAdminData,
    toast,
    setActiveNavigation,
    penaltyOutcomeFor,
    penaltyOutcomeLabel,
    redFlagExemptionFor,
    confirmedViolationCount,
    applyReportDecision,
  } = context;
  const activeCustomLayerClose = closeActiveLayer;
  const reportId =
    context.recordId ||
    new URLSearchParams(context.search).get("id") ||
    "RPT-8201";
  const reportRecord = data.reports.find((report) => report.id === reportId);

function reportTone(report: LegacyRecord): string {
  return report.tone || (report.status === "Closed" ? "neutral" : "warning");
}

function reportEvidence(report: LegacyRecord): string {
  if (!report.evidence) return '<p class="audit-note">No evidence file attached.</p>';
  return `<button class="evidence-item" data-report-evidence><span class="evidence-state">${ico("check")}</span><span><strong>${escapeActivityText(report.evidence)}</strong><small>Attached by ${escapeActivityText(report.reporterName)}</small></span><span>Open</span></button>`;
}

function reportChatInitials(name: unknown): string {
  return String(name || "User")
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function reportPartyChats(report: LegacyRecord): string {
  return `<section class="record-panel report-party-chats"><div class="record-panel-head"><h2>Private report messages</h2><span class="section-count">2</span></div><p class="chat-intro">Open a separate conversation with either side to review their messages and follow up.</p><div class="chat-launches"><button class="party-chat-button" data-report-chat-role="reporter"><span class="avatar">${reportChatInitials(report.reporterName)}</span><span><strong>Chat with reporter</strong><small>${escapeActivityText(report.reporterName)}</small></span><span>Open</span></button><button class="party-chat-button" data-report-chat-role="reported"><span class="avatar">${reportChatInitials(report.reportedUserName)}</span><span><strong>Chat with reported user</strong><small>${escapeActivityText(report.reportedUserName)}</small></span><span>Open</span></button></div></section>`;
}

function reportUserProfileLink(userId: string | undefined): string {
  return `<a class="btn full-width" href="/users/${encodeURIComponent(userId || "")}">See full user profile</a>`;
}

function openReportPartyChat(report: LegacyRecord, role: string | undefined): void {
  activeCustomLayerClose?.();
  const isReporter = role === "reporter",
    participantName = isReporter ? report.reporterName : report.reportedUserName,
    participantRole = isReporter ? "Reporter" : "Reported user",
    initial = isReporter
      ? "I submitted this report and attached the evidence for review."
      : "I would like to provide context about this report and its evidence.",
    messageId = `${report.id}-${role}`,
    overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  const participant = String(participantName || "User");
  overlay.innerHTML = `<section class="party-chat-modal" role="dialog" aria-modal="true" aria-label="Chat with ${escapeActivityText(participant)}"><div class="chat-modal-head"><div><strong>Chat with ${escapeActivityText(participant)}</strong><small>${escapeActivityText(participantRole)} · ${escapeActivityText(report.id)}</small></div><button class="icon close-party-chat" aria-label="Close chat"><span class="close-lines"></span></button></div><div class="chat-thread">${chatMessage(participant, escapeActivityText(report.reportedAt || "Submitted"), initial, "received")}${chatMessage("You", "Admin review", "Please keep any further context in this report.", "sent")}</div><form class="chat-compose"><label class="visually-hidden" for="report-message-${messageId}">Message ${escapeActivityText(participant)}</label><textarea id="report-message-${messageId}" rows="3" maxlength="500" placeholder="Message ${escapeActivityText(participant)}…"></textarea><div class="chat-compose-actions"><div class="chat-compose-tools"><label class="chat-attach btn" for="report-chat-attachment-${messageId}">${ico("paperclip")}<span>Attach file</span></label><input class="chat-attachment-input visually-hidden" id="report-chat-attachment-${messageId}" data-chat-attachment type="file"><span class="chat-attachment-name" data-chat-attachment-name aria-live="polite">No file attached</span></div><button class="btn primary" type="submit">Send message</button></div></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "textarea" });
  const closeButton = query<HTMLElement>(overlay, ".close-party-chat");
  if (closeButton) closeButton.onclick = close;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  const form = query<HTMLFormElement>(overlay, "form");
  if (!form) return;
  bindChatAttachment(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = query<HTMLTextAreaElement>(overlay, "textarea");
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;
    const thread = query<HTMLElement>(overlay, ".chat-thread");
    if (!thread) return;
    thread.insertAdjacentHTML("beforeend", chatMessage("You", chatTimeLabel(), message, "sent"));
    input.value = "";
    toast(`Message saved to ${report.id}`);
  });
}

function reportTimeline(report: LegacyRecord): TimelineEntry[] {
  const events = [
    {
      title: "Report submitted",
      detail: `${report.reportedAt} · ${report.reporterName} reported ${report.reportedUserName}`,
    },
  ];
  if (report.status === "Closed") {
    events.push({
      title: "Report closed by admin",
      detail: `${report.closedAt || "Just now"} · Record retained for audit`,
    });
  } else {
    events.push({
      title: "Awaiting admin decision",
      detail: "Open · Review the submitted details and evidence",
    });
  }
  return events;
}

function reportDecisionPanel(report: LegacyRecord): string {
  if (report.status === "Closed") {
    return `<p class="audit-note">Decision recorded: <strong>${escapeActivityText(report.decisionLabel || "No violation")}</strong>${report.decisionDays ? ` · ${report.decisionDays} days` : ""}.</p>${report.decisionReason ? `<div class="overview-group"><span>Reason for decision</span><p>${escapeActivityText(report.decisionReason)}</p></div>` : ""}`;
  }
  const user = data.users.find((candidate) => candidate.id === report.reportedUserId);
  const outcome = user ? penaltyOutcomeFor(user) : null;
  const exemption = outcome?.key === "red-flag" && user ? redFlagExemptionFor(user) : null;
  const outcomeLabel = exemption ? "Red Flag exempted" : penaltyOutcomeLabel(outcome);
  const nextViolationNumber = user ? confirmedViolationCount(user) + 1 : "the next";
  return `<p class="audit-note">Decide whether the evidence confirms an actual policy violation. The next penalty is calculated from the account history.</p><fieldset class="report-decision-options"><legend class="visually-hidden">Report decision</legend><label class="report-decision-option"><input type="radio" name="report-decision" value="no-violation" data-report-decision="no-violation"><span><strong>No violation</strong><small>Close the report without changing the reported user’s account or violation count.</small></span></label><label class="report-decision-option"><input type="radio" name="report-decision" value="confirmed-violation" data-report-decision="confirmed-violation"><span><strong>Confirm violation</strong><small>Record violation #${nextViolationNumber}; apply ${escapeActivityText(outcomeLabel)} automatically.</small></span></label></fieldset>`;
}

function renderReportPage(): void {
  if (!reportRecord) {
    main.innerHTML = `<div class="full-page-empty"><h1>Report not found</h1><p>No synthetic report matches <strong>${escapeActivityText(reportId)}</strong>.</p><a class="btn primary" href="/?view=reports">Return to reports</a></div>`;
    return;
  }

  const isClosed = reportRecord.status === "Closed",
    tone = reportTone(reportRecord);
  main.innerHTML = `<div class="record-breadcrumb"><a href="/?view=reports">Reports</a><span>›</span><span>${escapeActivityText(reportRecord.id)}</span></div>
  <div class="full-record-head"><div><div class="record-id">${escapeActivityText(reportRecord.id)}</div><h1>Report against ${escapeActivityText(reportRecord.reportedUserName)}</h1><p>${escapeActivityText(reportRecord.category || "General report")} · submitted ${escapeActivityText(reportRecord.reportedAt)}</p></div><div class="full-record-actions"><a class="btn" href="/?view=reports">Back to reports</a>${isClosed ? "" : '<button class="btn danger" data-report-close="Close report">Close report</button>'}</div></div>
  <div class="dispute-page-alert report-page-alert ${isClosed ? "closed" : "open"}"><span>${ico("flag")}</span><div><strong>${isClosed ? "Closed report — record retained" : "Active report — review is required"}</strong><p>${isClosed ? "This report is closed and retained as a read-only audit record." : "Review the submitted details and evidence before closing this report."}</p></div></div>
  <div class="record-status-bar"><div><span>Status</span>${badge(reportRecord.status, tone)}</div><div><span>Report type</span><strong>${escapeActivityText(reportRecord.category || "General report")}</strong></div><div><span>Submitted</span><strong>${escapeActivityText(reportRecord.reportedAt)}</strong></div><div><span>Reported user</span><strong>${escapeActivityText(reportRecord.reportedUserName)}</strong></div><div><span>Evidence</span><strong>${reportRecord.evidence ? "1 record" : "None attached"}</strong></div></div>
  <div class="full-record-grid"><div class="record-primary">
    <section class="record-panel report-overview"><div class="record-panel-head"><h2>Report detail</h2></div><p class="record-description">${escapeActivityText(reportRecord.details)}</p><dl class="overview-meta"><div><dt>Report type</dt><dd>${escapeActivityText(reportRecord.category || "General report")}</dd></div><div><dt>Submitted by</dt><dd>${escapeActivityText(reportRecord.reporterName)}</dd></div><div><dt>Reported user</dt><dd>${escapeActivityText(reportRecord.reportedUserName)}</dd></div></dl></section>
    <section class="record-panel"><h2>People involved</h2><div class="party-grid report-parties"><div><span>Reporting user</span><strong>${escapeActivityText(reportRecord.reporterName)}</strong><small>${escapeActivityText(reportRecord.reporterId)}</small></div><div><span>Reported user</span><strong>${escapeActivityText(reportRecord.reportedUserName)}</strong><small>${escapeActivityText(reportRecord.reportedUserId)}</small></div></div></section>
    ${reportPartyChats(reportRecord)}
    <section class="record-panel"><div class="record-panel-head"><h2>Evidence</h2><span class="section-count">${reportRecord.evidence ? "1" : "0"}</span></div><div class="evidence-stack">${reportEvidence(reportRecord)}</div></section>
    <section class="record-panel"><h2>Report timeline</h2>${timeline(reportTimeline(reportRecord), { showDetails: false })}</section>
  </div><aside class="record-side">
    <section class="record-panel"><h2>Reported account</h2><div class="side-facts"><div><span>Name</span><strong>${escapeActivityText(reportRecord.reportedUserName)}</strong></div><div><span>Student ID</span><strong>${escapeActivityText(reportRecord.reportedUserId)}</strong></div></div>${reportUserProfileLink(reportRecord.reportedUserId)}</section>
    <section class="record-panel"><h2>Submitted by</h2><div class="side-facts"><div><span>Name</span><strong>${escapeActivityText(reportRecord.reporterName)}</strong></div><div><span>Student ID</span><strong>${escapeActivityText(reportRecord.reporterId)}</strong></div></div>${reportUserProfileLink(reportRecord.reporterId)}</section>
    <section class="record-panel report-decision-panel"><h2>${isClosed ? "Recorded outcome" : "Report decision"}</h2>${reportDecisionPanel(reportRecord)}${isClosed ? "" : '<button class="btn danger full-width" data-report-close="Close report">Close report</button>'}</section>
  </aside></div>`;

  if (!isClosed) {
    const alertTitle = query<HTMLElement>(main, ".report-page-alert strong");
    if (alertTitle) alertTitle.textContent = "Active report — review is required";
  }

  if (!isClosed) {
    let selectedDecision = "";
    queryAll<HTMLInputElement>(main, "[data-report-decision]").forEach((input) =>
      input.addEventListener("change", () => {
        selectedDecision = input.value;
        main
          .querySelectorAll(".report-decision-option")
          .forEach((option) => option.classList.toggle("selected", option === input.closest(".report-decision-option")));
      }),
    );
    queryAll<HTMLElement>(main, "[data-report-close]").forEach((button) =>
      button.addEventListener("click", () => {
        if (!selectedDecision) {
          toast("Choose No violation or Confirm violation before closing.");
          return;
        }
        const decisionLabel = selectedDecision === "no-violation" ? "No violation" : "Confirm violation";
        confirmAction(
          "Close report",
          reportRecord,
          `This will close ${reportRecord.id} with the decision: ${decisionLabel}.`,
          (reason) => {
            applyReportDecision(reportRecord, selectedDecision, reason);
            persistAdminData();
            renderReportPage();
          },
        );
      }),
    );
  }
  main.querySelector("[data-report-evidence]")?.addEventListener("click", () =>
    toast(`Evidence opened for ${reportRecord.id}`),
  );
  queryAll<HTMLElement>(main, "[data-report-chat-role]").forEach((button) =>
    button.addEventListener("click", () =>
      openReportPartyChat(reportRecord, button.dataset.reportChatRole),
    ),
  );
  setActiveNavigation("reports");
}



  return renderReportPage;
}
