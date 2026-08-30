import type {
  QuestDetailDependencies,
  QuestDetailModule,
  QuestDispute,
  QuestRecord,
  TimelineItem,
} from "./quest-detail";

export type QuestPageDependencies = QuestDetailDependencies & {
  main: HTMLElement;
  recordId?: string;
  locationSearch?: string;
  detail: QuestDetailModule;
  applyDemoAction: (action: string, record: QuestRecord) => void;
  persistAdminData: () => void;
  setActiveNavigation: (view: string) => void;
};

export type QuestPageModule = {
  questId: string;
  questRecord: QuestRecord | undefined;
  questActivityTimeline: (activity: string[]) => TimelineItem[];
  renderQuestPage: () => void;
};

function questActivityTimeline(activity: string[]): TimelineItem[] {
  return activity.map((event) => {
    const parts = String(event).split(" · ");
    return {
      title: parts.shift() ?? "Quest activity",
      time: parts.shift() ?? "",
      detail: parts.join(" · "),
      showDetails: false,
    };
  });
}
export function createQuestPageModule(
  dependencies: QuestPageDependencies,
): QuestPageModule {
  const {
    main,
    data,
    disputeCases,
    locationSearch = "",
    recordId,
    detail,
    badge,
    fmt,
    escapeActivityText,
    ico,
    timeline,
    disputeTypeLabel,
    confirmAction,
    applyDemoAction,
    persistAdminData,
    setActiveNavigation,
  } = dependencies;
  const questId = recordId ?? new URLSearchParams(locationSearch).get("id") ?? "QST-12001";
  const questRecord = data.quests.find((quest) => quest.id === questId);

  const relatedDisputeFor = (record: QuestRecord): QuestDispute | undefined =>
    data.disputes.find((dispute) => (disputeCases[dispute.id]?.questId ?? "") === record.id);

  const renderQuestPage = (): void => {
    if (!questRecord) {
      main.innerHTML = `<div class="full-page-empty"><h1>Quest not found</h1><p>No synthetic quest matches <strong>${questId}</strong>.</p><a class="btn primary" href="/">Return to quests</a></div>`;
      return;
    }
    const quest = questRecord;
    const questDetail = detail.questDetails(quest);
    const participants = detail.participantsForQuest(quest, questDetail);
    const started = detail.questHasStarted(quest);
    const relatedDispute = relatedDisputeFor(quest);
    const isBlocked = relatedDispute?.status === "Active" || quest.status === "Disputed";
    main.innerHTML = `<div class="record-breadcrumb"><a href="/">Quests</a><span>›</span><span>${quest.id}</span></div><div class="full-record-head"><div><div class="record-id">${quest.id}</div><h1>${quest.title}</h1><p>${quest.teamQuest ? "Team quest · " : ""}${quest.other} · created by ${quest.person}</p></div><div class="full-record-actions"><a class="btn" href="/">Back to list</a><button class="btn">More actions</button><button class="btn primary" data-page-action="Approve quest">Approve quest</button></div></div><div class="record-status-bar"><div><span>Status</span>${badge(quest.status, quest.tone)}</div><div><span>Funded wage</span><strong>฿${fmt(quest.amount)}</strong></div><div><span>Participant mode</span><strong>${quest.teamQuest ? "Team" : "Single"}</strong></div><div><span>Candidate mode</span><strong>${quest.candidateMode ?? (quest.status === "Open" ? "FCFS" : "CANDIDATE")}</strong></div><div><span>Proof</span><strong>${questDetail.proof.length ? `${questDetail.proof.length} ${questDetail.proof.length === 1 ? "file" : "files"}` : "No submission"}</strong></div></div><div class="full-record-grid"><div class="record-primary"><section class="record-panel"><div class="record-panel-head"><h2>Quest description</h2></div><p class="record-description">${questDetail.description}</p><div class="requirement-box"><strong>Completion requirements</strong><ul><li>Submit work before the recorded deadline</li><li>Attach verifiable proof files</li><li>Keep communication and payment inside KuQuest</li></ul></div></section>${detail.giverAttachmentsPanel(questDetail.giverAttachments)}<section class="record-panel"><div class="record-panel-head"><h2>${detail.participantSectionTitle(quest, participants, started)}</h2><span class="section-count">${participants.length}</span></div>${detail.relatedRows(participants)}</section>${detail.proofSubmissionsPanel(questDetail.proof, quest)}${detail.renderQuestEditHistory(quest)}<section class="record-panel"><div class="record-panel-head"><h2>Overall quest timeline</h2><button class="link">Export log</button></div>${timeline(questActivityTimeline(questDetail.activity))}</section></div><aside class="record-side"><section class="record-panel"><h2>Hirer</h2>${detail.giverProfile(questDetail)}${detail.giverProfileLink(questDetail)}</section><section class="record-panel"><h2>Schedule and location</h2><div class="side-facts"><div><span>Starts</span><strong>${questDetail.schedule[0]}</strong></div><div><span>Due</span><strong>${questDetail.schedule[1]}</strong></div><div><span>Application window</span><strong>${questDetail.schedule[2]}</strong></div><div><span>Location</span><strong>${questDetail.location[0]}</strong><small>${questDetail.location[1]}</small></div></div></section><section class="record-panel"><h2>Financial record</h2><div class="financial-line"><span>Funded by hirer</span><strong>฿${fmt(quest.amount)}</strong></div><div class="financial-line"><span>Platform fee</span><strong>฿${fmt(Math.round(quest.amount * 0.05))}</strong></div><div class="financial-line total"><span>${quest.teamQuest ? "Team receives (total)" : "Worker receives"}</span><strong>฿${fmt(Math.round(quest.amount * 0.95))}</strong></div><p class="audit-note">Funds remain held until submitted proof is accepted or a dispute is resolved.</p></section><section class="record-panel dispute-summary ${relatedDispute ? "has-dispute" : ""}"><div class="record-panel-head"><h2>Dispute and risk</h2>${relatedDispute ? badge(relatedDispute.status, relatedDispute.tone) : badge("Clear", "success")}</div>${relatedDispute ? `<p><strong>${relatedDispute.id}</strong> · ${relatedDispute.detail}</p><div class="dispute-money"><span>Amount held</span><strong>฿${fmt(relatedDispute.amount)}</strong></div><a class="btn primary full-width" href="/disputes/${encodeURIComponent(relatedDispute.id)}">Open full dispute</a>` : '<div class="no-dispute">No dispute or active moderation hold is connected to this quest.</div>'}</section></aside></div>`;
    main.querySelector<HTMLElement>(".record-primary .record-panel:last-child .link")?.setAttribute("data-functional-action", "export-log");
    main.querySelector<HTMLElement>(".full-record-actions button:not([data-page-action])")?.remove();
    const canTerminate = !["Completed", "Cancelled", "Hidden", "Disputed"].includes(quest.status);
    const canApprove = ["Open", "Assigned", "In progress", "Submitted"].includes(quest.status);
    if (canTerminate) {
      const terminateButton = main.ownerDocument.createElement("button");
      terminateButton.className = "btn danger";
      terminateButton.dataset.pageAction = "Terminate quest";
      terminateButton.textContent = "Terminate quest";
      main.querySelector(".full-record-actions")?.append(terminateButton);
    }
    const defaultFinancialNote = [...main.querySelectorAll<HTMLElement>(".record-panel")]
      .find((panel) => panel.querySelector("h2")?.textContent === "Financial record")
      ?.querySelector<HTMLElement>(".audit-note");
    if (defaultFinancialNote) defaultFinancialNote.textContent = "Funds remain held until submitted proof is accepted or a dispute is resolved.";
    if (quest.status === "Cancelled") {
      if (defaultFinancialNote) defaultFinancialNote.textContent = "This quest was cancelled. Any held funds require separate settlement review.";
      const terminationNote = main.ownerDocument.createElement("div");
      terminationNote.className = "decision-block";
      terminationNote.innerHTML = `<span>${ico("history")}</span><div class="decision-block-content"><strong>Quest terminated</strong><p></p></div>`;
      const note = terminationNote.querySelector("p");
      if (note) note.textContent = quest.terminationReason ?? "This quest was cancelled by an administrator.";
      main.querySelector(".record-status-bar")?.before(terminationNote);
    }
    if (relatedDispute?.status === "Closed") main.querySelector(".dispute-summary")?.classList.remove("has-dispute");
    if (!isBlocked && !canApprove) main.querySelector('[data-page-action="Approve quest"]')?.remove();
    if (isBlocked) {
      const approveButton = main.querySelector<HTMLElement>('[data-page-action="Approve quest"]');
      const disputeUrl = `/disputes/${encodeURIComponent(relatedDispute?.id ?? "")}`;
      const blocker = main.ownerDocument.createElement("div");
      if (approveButton) {
        const resolveLink = main.ownerDocument.createElement("a");
        resolveLink.className = "btn primary";
        resolveLink.href = disputeUrl;
        resolveLink.textContent = "Resolve blocking dispute";
        approveButton.replaceWith(resolveLink);
      }
      blocker.className = "decision-block";
      blocker.innerHTML = `<span>${ico("scale")}</span><div class="decision-block-content"><strong>Quest progression is blocked by ${relatedDispute?.id ?? "an active dispute"}</strong><dl class="dispute-context"><div><dt>Category</dt><dd>${relatedDispute ? disputeTypeLabel(relatedDispute) : "Other"}</dd></div><div><dt>Description</dt><dd>${relatedDispute?.detail ?? "A dispute is active for this quest. Open the case to review its description and evidence."}</dd></div></dl></div><a class="btn" href="${disputeUrl}">Review case</a>`;
      main.querySelector(".record-status-bar")?.before(blocker);
      const disputeSummary = main.querySelector<HTMLElement>(".dispute-summary.has-dispute");
      if (disputeSummary && relatedDispute) {
        const context = main.ownerDocument.createElement("dl");
        context.className = "dispute-summary-context";
        context.innerHTML = `<div><dt>Category</dt><dd>${disputeTypeLabel(relatedDispute)}</dd></div><div><dt>Description</dt><dd>${relatedDispute.detail}</dd></div>`;
        disputeSummary.querySelector(".record-panel-head")?.after(context);
        disputeSummary.querySelector("p")?.remove();
      }
    }
    main.querySelectorAll<HTMLElement>("[data-page-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.pageAction;
        if (action === "Terminate quest") {
          confirmAction(action, quest, "This will cancel the quest, stop further progression, and preserve the record in the admin audit trail.", (reason) => {
            applyDemoAction(action, quest);
            quest.terminationReason = reason;
            persistAdminData();
            renderQuestPage();
          });
          return;
        }
        if (action === "Approve quest") {
          confirmAction(action, quest, "This will approve the quest and add the decision to the permanent admin audit trail.", () => {
            applyDemoAction(action, quest);
            persistAdminData();
            renderQuestPage();
          });
          return;
        }
        confirmAction(action ?? "", quest);
      });
    });
    setActiveNavigation("quests");
  };

  return { questId, questRecord, questActivityTimeline, renderQuestPage };
}
