const questChangeRequests = {
  ...(typeof pendingQuestChanges === "undefined" ? {} : pendingQuestChanges),
};
function renderQuestChangeReview() {
  if (typeof questRecord === "undefined" || !questRecord) return;
  const request = questChangeRequests[questRecord.id];
  if (!request) return;
  const panel = document.createElement("section");
  panel.className = "record-panel change-review";
  panel.innerHTML = `<div class="record-panel-head"><div><h2>Pending giver changes</h2><p>${request.id} · requested ${request.requestedAt}</p></div>${badge(request.status, request.status.includes("Blocked") ? "danger" : "warning")}</div><div class="change-warning">${ico("history")}<div><strong>${request.status.includes("Blocked") ? "Editing is locked while this quest is disputed" : "Current accepted terms remain active"}</strong><p>The proposal does not change the participant’s agreement until all required responses and administrative checks are complete.</p></div></div><div class="change-meta"><div><span>Requested by</span><strong>${request.requestedBy}</strong></div><div><span>Reason</span><strong>${request.reason}</strong></div></div><div class="change-table"><div class="change-row change-head"><span>Field</span><span>Accepted value</span><span>Proposed value</span><span>Impact</span></div>${request.changes.map((change) => `<div class="change-row"><strong>${change[0]}</strong><span>${change[1]}</span><span>${change[2]}</span><span class="impact ${change[3].includes("increase") || change[3].includes("New") ? "material" : "safe"}">${change[3]}</span></div>`).join("")}</div><div class="response-block"><h3>Participant responses</h3>${request.responses.map((response) => `<div><span><strong>${response[0]}</strong><small>${response[2]}</small></span>${badge(response[1], response[1] === "Approved" ? "success" : "warning")}</div>`).join("")}</div><div class="change-actions"><button class="btn reject-change">Reject change</button><button class="btn">Request clarification</button><button class="btn primary" ${request.status.includes("Blocked") ? "disabled" : ""}>Approve after consent</button></div>`;
  panel.querySelector(".change-warning p").textContent =
    "The proposal does not change the agreement until both the giver and participant consent. KuQuest applies the change automatically after all required consent is recorded.";
  panel.querySelector(".response-block h3").textContent = "Participant consent";
  const oversight = panel.querySelector(".change-actions");
  oversight.className = "change-oversight";
  oversight.innerHTML =
    "<strong>Admin oversight only</strong><p>No admin approval is required. Intervene only when a participant files a dispute or the proposed terms violate marketplace policy.</p>";
  const primary = document.querySelector(".record-primary"),
    applications = primary?.children[1];
  primary?.insertBefore(panel, applications);
}
renderQuestChangeReview();
