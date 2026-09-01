import type {
  DisputeDetailApi,
  ModerationPageContext,
} from "./dispute-detail";
import { disputeCaseStatusFor, questStateFor } from "../domain/rulebook";

export type DisputePageContext = ModerationPageContext & {
  recordId?: string;
  search: string;
  setActiveNavigation: (view: string) => void;
};

function evidenceRows(
  record: { evidence: string[]; evidenceRefs?: string[] },
  ico: (name: string) => string,
  escapeActivityText: (value: unknown) => string,
): string {
  return record.evidence
    .map((evidence, index) => {
      const parts = String(evidence).split(" · ");
      const reference = record.evidenceRefs?.[index];
      const referenceAvailable = typeof reference === "string" && reference.trim().length > 0;
      const content = `<span class="evidence-state ${referenceAvailable ? "complete" : "unavailable"}">${ico(referenceAvailable ? "check" : "history")}</span><span><strong>${escapeActivityText(parts[0])}</strong><small>${escapeActivityText(parts.slice(1).join(" · ") || "Verified record")}</small></span>`;
      return referenceAvailable
        ? `<button class="evidence-item" data-evidence-ref="${escapeActivityText(reference)}">${content}<span>Open</span></button>`
        : `<div class="evidence-item evidence-unavailable">${content}<span>Evidence Reference not available</span></div>`;
    })
    .join("");
}

export function initializeDisputePage(
  context: DisputePageContext,
  detail: DisputeDetailApi,
): () => void {
  const {
    data,
    main,
    escapeActivityText,
    fmt,
    badge,
    icon: ico,
    toneClass,
    disputeTypeLabel,
    timeline,
    setActiveNavigation,
  } = context;
  const {
    disputeCaseFor,
    questTimelineFor,
    disputeDescriptionFor,
    bindResolutionControls,
  } = detail;
  const disputeId =
    context.recordId ||
    new URLSearchParams(context.search).get("id") ||
    "DSP-5201";
  const disputeRecord = data.disputes.find(
    (dispute) => dispute.id === disputeId,
  );

function renderDisputePage(): void {
  if (!disputeRecord) {
    main.innerHTML = `<div class="full-page-empty"><h1>Dispute not found</h1><p>No synthetic dispute matches <strong>${escapeActivityText(disputeId)}</strong>.</p><a class="btn primary" href="/">Return to disputes</a></div>`;
    return;
  }
  const caseData = disputeCaseFor(disputeRecord),
    caseStatus = disputeCaseStatusFor(disputeRecord.disputeCaseStatus ?? disputeRecord.status),
    isClosed = caseStatus !== "DISPUTE_CASE_PENDING",
    relatedQuest = data.quests.find((quest) => quest.id === caseData.questId),
    questTimeline = questTimelineFor(disputeRecord, caseData, relatedQuest);
  main.innerHTML = `<div class="record-breadcrumb"><a href="/">Disputes</a><span>›</span><span>${disputeRecord.id}</span></div>
  <div class="full-record-head"><div><div class="record-id">${escapeActivityText(disputeRecord.id)}</div><h1>${escapeActivityText(disputeRecord.title)}</h1><p>${escapeActivityText(disputeTypeLabel(disputeRecord))} · filed ${escapeActivityText(disputeRecord.disputeDate)}</p></div><div class="full-record-actions"><a class="btn" href="/">Back to list</a><a class="btn" href="/quests/${encodeURIComponent(caseData.questId)}">Full quest detail</a>${isClosed ? "" : '<button class="btn danger" data-dispute-action="Resolve dispute">Resolve dispute</button>'}</div></div>
  <div class="dispute-page-alert ${isClosed ? "closed" : "active"}"><span>${ico("scale")}</span><div><strong>${isClosed ? "Closed dispute — decision recorded" : "Active dispute — funds and quest progression are blocked"}</strong><p>${escapeActivityText(disputeRecord.detail)}</p></div>${badge(caseStatus, disputeRecord.tone)}</div>
  <div class="record-status-bar"><div><span>Status</span>${badge(caseStatus, disputeRecord.tone)}</div><div><span>Category</span><strong>${escapeActivityText(disputeTypeLabel(disputeRecord))}</strong></div><div><span>Dispute date</span><strong>${escapeActivityText(disputeRecord.disputeDate)}</strong></div><div><span>Amount at risk</span><strong>฿${fmt(disputeRecord.amount)}</strong></div><div><span>Evidence</span><strong>${disputeRecord.evidence.length} records</strong></div></div>
  <div class="full-record-grid"><div class="record-primary">
    <section class="record-panel"><div class="record-panel-head"><h2>Reason for dispute</h2>${badge(disputeTypeLabel(disputeRecord), "danger")}</div><p class="record-description dispute-description">${escapeActivityText(disputeRecord.detail)}</p></section>
    <section class="record-panel"><h2>Participant positions</h2><article class="position"><header><span class="avatar">GV</span><div><strong>Opening claim</strong><small>${escapeActivityText(caseData.openedBy)}</small></div></header><p>${escapeActivityText(caseData.claim)}</p></article><article class="position response"><header><span class="avatar">HN</span><div><strong>Response</strong><small>${escapeActivityText(caseData.respondent)}</small></div></header><p>${escapeActivityText(caseData.response)}</p></article></section>
    <section class="record-panel"><div class="record-panel-head"><h2>Evidence</h2><span class="section-count">${disputeRecord.evidence.length}</span></div><div class="evidence-stack">${evidenceRows(disputeRecord, ico, escapeActivityText)}</div></section>
    <section class="record-panel"><h2>Decision signals</h2><div class="signal-list">${(caseData.signals || []).map((signal) => `<div><span>${escapeActivityText(signal[0])}</span><strong class="signal-${toneClass(signal[2])}">${escapeActivityText(signal[1])}</strong></div>`).join("")}</div><div class="recommendation"><span>${ico("scale")}</span><div><strong>Review guidance</strong><p>${escapeActivityText(caseData.recommended)}</p></div></div></section>
    <section class="record-panel"><h2>Overall quest timeline</h2>${timeline(questTimeline, { showDetails: false })}</section>
  </div><aside class="record-side">
    <section class="record-panel"><h2>Participants</h2><div class="side-facts"><div><span>Opened by</span><strong>${escapeActivityText(caseData.openedBy)}</strong></div><div><span>Respondent</span><strong>${escapeActivityText(caseData.respondent)}</strong></div></div></section>
    <section class="record-panel"><div class="record-panel-head"><h2>Related quest</h2>${relatedQuest ? badge(questStateFor(relatedQuest.questState ?? relatedQuest.status), relatedQuest.tone) : ""}</div><p><strong>${escapeActivityText(caseData.questId)}</strong> · ${escapeActivityText(relatedQuest?.title || disputeRecord.title)}</p><a class="btn full-width" href="/quests/${encodeURIComponent(caseData.questId)}">Open full quest</a></section>
    <section class="record-panel"><h2>Applicable policy</h2><ul class="policy-list">${(caseData.policy || []).map((item) => `<li>${ico("check")}<span>${escapeActivityText(item)}</span></li>`).join("")}</ul></section>
    <section class="record-panel"><h2>${isClosed ? "Recorded outcome" : "Resolution decision"}</h2>${isClosed ? `<p class="audit-note">${escapeActivityText(disputeRecord.resolution || "The final allocation was recorded and the case is now read-only.")}</p><div class="overview-group"><span>Reason for this decision</span><p>${escapeActivityText(disputeRecord.decisionReason || "No written reason was recorded for this legacy demo case.")}</p></div>${disputeRecord.penaltyOutcome ? `<div class="overview-group"><span>Additional enforcement</span><p>${escapeActivityText(disputeRecord.penaltyOutcome)}</p></div>` : ""}` : `<div class="allocation dispute-page-allocation"><button data-allocation="hirer"><span>Refund hirer</span><strong>฿${fmt(disputeRecord.amount)}</strong></button><button data-allocation="worker"><span>Release to worker</span><strong>฿${fmt(disputeRecord.amount)}</strong></button></div><p class="audit-note">Choose the outcome before resolving.</p>`}</section>
  </aside></div>`;
  const primaryPanels = main.querySelectorAll(
      ".record-primary > .record-panel",
    ),
    reasonPanel = primaryPanels[0],
    positionsPanel = primaryPanels[1],
    evidencePanel = primaryPanels[2],
    partyPanel = main.querySelector(".record-side > .record-panel"),
    overview = document.createElement("section");
  overview.className = "record-panel dispute-overview";
  overview.innerHTML = `<div class="record-panel-head"><h2>Dispute overview</h2></div><dl class="overview-meta"><div><dt>Category</dt><dd>${escapeActivityText(disputeTypeLabel(disputeRecord))}</dd></div><div><dt>Dispute date</dt><dd>${escapeActivityText(disputeRecord.disputeDate)}</dd></div><div><dt>Amount at risk</dt><dd>฿${fmt(disputeRecord.amount)}</dd></div></dl><div class="overview-group"><span>Description</span><p>${escapeActivityText(disputeDescriptionFor(disputeRecord, caseData))}</p></div><div class="overview-group"><span>Participants</span><div class="party-grid"><div><span>Opened by</span><strong>${escapeActivityText(caseData.openedBy)}</strong></div><div><span>Respondent</span><strong>${escapeActivityText(caseData.respondent)}</strong></div></div></div><div class="overview-group"><div class="record-panel-head"><h3>Related files</h3><span class="section-count">${disputeRecord.evidence.length}</span></div><div class="evidence-stack">${evidenceRows(disputeRecord, ico, escapeActivityText)}</div></div>`;
  reasonPanel.replaceWith(overview);
  const summaryTable = main.querySelector(".record-status-bar");
  summaryTable?.remove();
  positionsPanel.remove();
  evidencePanel.remove();
  partyPanel?.remove();
  const timelinePanel = [
    ...main.querySelectorAll(".record-primary > .record-panel"),
  ].find(
    (panel) =>
      panel.querySelector("h2")?.textContent === "Overall quest timeline",
  );
  main.querySelectorAll(".record-side > .record-panel").forEach((panel) => {
    if (panel.querySelector("h2")?.textContent === "Applicable policy")
      panel.remove();
  });
  const resolutionPanel = [
    ...main.querySelectorAll(".record-side > .record-panel"),
  ].find((panel) =>
    panel.querySelector("h2")?.textContent.includes("Resolution decision"),
  );
  const resolveButton = main.querySelector("[data-dispute-action]");
  if (resolveButton && resolutionPanel) {
    resolveButton.classList.add("full-width");
    resolutionPanel.append(resolveButton);
  }
  if (timelinePanel) main.querySelector(".record-primary")?.append(timelinePanel);
  main.querySelector(".signal-list")?.closest(".record-panel")?.remove();
  if (!isClosed) bindResolutionControls(main, disputeRecord);
  setActiveNavigation("disputes");
}



  return renderDisputePage;
}
