const questId = window.__KUQUEST_RECORD_ID__ || new URLSearchParams(location.search).get("id") || "QST-12001",
  questRecord = data.quests.find((quest) => quest.id === questId);
function questActivityTimeline(activity) {
  return activity.map((event) => {
    const parts = String(event).split(" · ");
    return {
      title: parts.shift() || "Quest activity",
      time: parts.shift() || "",
      detail: parts.join(" · "),
      showDetails: false,
    };
  });
}
function renderQuestPage() {
  if (!questRecord) {
    main.innerHTML = `<div class="full-page-empty"><h1>Quest not found</h1><p>No synthetic quest matches <strong>${questId}</strong>.</p><a class="btn primary" href="/">Return to quests</a></div>`;
    return;
  }
  const detail = questDetails(questRecord),
    participants = participantsForQuest(questRecord, detail),
    started = questHasStarted(questRecord),
    relatedDispute = data.disputes.find(
      (dispute) => (disputeCases[dispute.id]?.questId || "") === questRecord.id,
    ),
    isBlocked =
      relatedDispute?.status === "Active" || questRecord.status === "Disputed";
  main.innerHTML = `<div class="record-breadcrumb"><a href="/">Quests</a><span>›</span><span>${questRecord.id}</span></div><div class="full-record-head"><div><div class="record-id">${questRecord.id}</div><h1>${questRecord.title}</h1><p>${questRecord.teamQuest ? "Team quest · " : ""}${questRecord.other} · created by ${questRecord.person}</p></div><div class="full-record-actions"><a class="btn" href="/">Back to list</a><button class="btn">More actions</button></div></div><div class="record-status-bar"><div><span>Status</span>${badge(questRecord.status, questRecord.tone)}</div><div><span>Funded wage</span><strong>฿${fmt(questRecord.amount)}</strong></div><div><span>Participant mode</span><strong>${questRecord.teamQuest ? "Team" : "Single"}</strong></div><div><span>Candidate mode</span><strong>${questRecord.candidateMode || (questRecord.status === "Open" ? "FCFS" : "CANDIDATE")}</strong></div><div><span>Proof</span><strong>${detail.proof.length ? `${detail.proof.length} ${detail.proof.length === 1 ? "file" : "files"}` : "No submission"}</strong></div></div><div class="full-record-grid"><div class="record-primary"><section class="record-panel"><div class="record-panel-head"><h2>Quest description</h2></div><p class="record-description">${detail.description}</p><div class="requirement-box"><strong>Completion requirements</strong><ul><li>Submit work before the recorded deadline</li><li>Attach verifiable proof files</li><li>Keep communication and payment inside KuQuest</li></ul></div></section>${giverAttachmentsPanel(detail.giverAttachments)}<section class="record-panel"><div class="record-panel-head"><h2>${participantSectionTitle(questRecord, participants, started)}</h2><span class="section-count">${participants.length}</span></div>${relatedRows(participants)}</section>${proofSubmissionsPanel(detail.proof, questRecord)}${renderQuestEditHistory(questRecord)}<section class="record-panel"><div class="record-panel-head"><h2>Overall quest timeline</h2><button class="link">Export log</button></div>${timeline(questActivityTimeline(detail.activity))}</section></div><aside class="record-side"><section class="record-panel"><h2>Hirer</h2>${giverProfile(detail)}${giverProfileLink(detail)}</section><section class="record-panel"><h2>Schedule and location</h2><div class="side-facts"><div><span>Starts</span><strong>${detail.schedule[0]}</strong></div><div><span>Due</span><strong>${detail.schedule[1]}</strong></div><div><span>Application window</span><strong>${detail.schedule[2]}</strong></div><div><span>Location</span><strong>${detail.location[0]}</strong><small>${detail.location[1]}</small></div></div></section><section class="record-panel"><h2>Financial record</h2><div class="financial-line"><span>Funded by hirer</span><strong>฿${fmt(questRecord.amount)}</strong></div><div class="financial-line"><span>Platform fee</span><strong>฿${fmt(Math.round(questRecord.amount * 0.05))}</strong></div><div class="financial-line total"><span>${questRecord.teamQuest ? "Team receives (total)" : "Worker receives"}</span><strong>฿${fmt(Math.round(questRecord.amount * 0.95))}</strong></div><p class="audit-note">Funds remain held until submitted proof is accepted or a dispute is resolved.</p></section><section class="record-panel dispute-summary ${relatedDispute ? "has-dispute" : ""}"><div class="record-panel-head"><h2>Dispute and risk</h2>${relatedDispute ? badge(relatedDispute.status, relatedDispute.tone) : badge("Clear", "success")}</div>${relatedDispute ? `<p><strong>${relatedDispute.id}</strong> · ${relatedDispute.detail}</p><div class="dispute-money"><span>Amount held</span><strong>฿${fmt(relatedDispute.amount)}</strong></div><a class="btn primary full-width" href="/disputes/${encodeURIComponent(relatedDispute.id)}">Open full dispute</a>` : '<div class="no-dispute">No dispute or active moderation hold is connected to this quest.</div>'}</section></aside></div>`;
  main.querySelector(".record-primary .record-panel:last-child .link")?.setAttribute(
    "data-functional-action",
    "export-log",
  );
  main
    .querySelector(".full-record-actions button:not([data-page-action])")
    ?.remove();
  const canTerminate = !["Completed", "Cancelled", "Hidden", "Disputed"].includes(
    questRecord.status,
  );
  if (canTerminate) {
    const terminateButton = document.createElement("button");
    terminateButton.className = "btn danger";
    terminateButton.dataset.pageAction = "Terminate quest";
    terminateButton.textContent = "Terminate quest";
    main.querySelector(".full-record-actions")?.append(terminateButton);
  }
  const defaultFinancialNote = [...main.querySelectorAll(".record-panel")]
    .find((panel) => panel.querySelector("h2")?.textContent === "Financial record")
    ?.querySelector(".audit-note");
  if (defaultFinancialNote)
    defaultFinancialNote.textContent =
      "Funds remain held until submitted proof is accepted or a dispute is resolved.";
  if (questRecord.status === "Cancelled") {
    if (defaultFinancialNote)
      defaultFinancialNote.textContent =
        "This quest was cancelled. Any held funds require separate settlement review.";
    const terminationNote = document.createElement("div");
    terminationNote.className = "decision-block";
    terminationNote.innerHTML = `<span>${ico("history")}</span><div class="decision-block-content"><strong>Quest terminated</strong><p></p></div>`;
    terminationNote.querySelector("p").textContent =
      questRecord.terminationReason ||
      "This quest was cancelled by an administrator.";
    main.querySelector(".record-status-bar")?.before(terminationNote);
  }
  if (relatedDispute?.status === "Closed") {
    main.querySelector(".dispute-summary")?.classList.remove("has-dispute");
  }
  if (isBlocked) {
    const disputeUrl = `/disputes/${encodeURIComponent(relatedDispute?.id || "")}`,
      blocker = document.createElement("div");
    const resolveLink = document.createElement("a");
    resolveLink.className = "btn primary";
    resolveLink.href = disputeUrl;
    resolveLink.textContent = "Resolve blocking dispute";
    main.querySelector(".full-record-actions")?.append(resolveLink);
    blocker.className = "decision-block";
    blocker.innerHTML = `<span>${ico("scale")}</span><div class="decision-block-content"><strong>Quest progression is blocked by ${relatedDispute?.id || "an active dispute"}</strong><dl class="dispute-context"><div><dt>Category</dt><dd>${relatedDispute ? disputeTypeLabel(relatedDispute) : "Other"}</dd></div><div><dt>Description</dt><dd>${relatedDispute?.detail || "A dispute is active for this quest. Open the case to review its description and evidence."}</dd></div></dl></div><a class="btn" href="${disputeUrl}">Review case</a>`;
    main.querySelector(".record-status-bar")?.before(blocker);
    const disputeSummary = main.querySelector(".dispute-summary.has-dispute");
    if (disputeSummary && relatedDispute) {
      const context = document.createElement("dl");
      context.className = "dispute-summary-context";
      context.innerHTML = `<div><dt>Category</dt><dd>${disputeTypeLabel(relatedDispute)}</dd></div><div><dt>Description</dt><dd>${relatedDispute.detail}</dd></div>`;
      disputeSummary.querySelector(".record-panel-head")?.after(context);
      disputeSummary.querySelector("p")?.remove();
    }
  }
  main
    .querySelectorAll("[data-page-action]")
    .forEach(
      (button) =>
        (button.onclick = () => {
          const action = button.dataset.pageAction;
          if (action === "Terminate quest") {
            confirmAction(
              action,
              questRecord,
              "This will cancel the quest, stop further progression, and preserve the record in the admin audit trail.",
              (reason) => {
                applyDemoAction(action, questRecord);
                questRecord.terminationReason = reason;
                persistAdminData();
                renderQuestPage();
              },
            );
            return;
          }
          confirmAction(action, questRecord);
        }),
    );
  setActiveNavigation("quests");
}
renderQuestPage();
