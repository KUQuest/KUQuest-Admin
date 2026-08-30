import type {
  QuestDetailModule,
  QuestRecord,
} from "./quest-detail";

export type QuestChangeReviewDependencies = {
  document: Document;
  main: HTMLElement;
  questRecord?: QuestRecord;
  detail: QuestDetailModule;
  badge: (status: string, tone: string) => string;
  ico: (name: string) => string;
};

export type QuestChangeReviewModule = {
  renderQuestChangeReview: () => void;
};

export function createQuestChangeReviewModule(
  dependencies: QuestChangeReviewDependencies,
): QuestChangeReviewModule {
  const {
    document: documentRef,
    main,
    questRecord,
    detail,
    badge,
    ico,
  } = dependencies;

  const renderQuestChangeReview = (): void => {
    if (!questRecord) return;
    const request = detail.pendingQuestChanges[questRecord.id];
    if (!request) return;
    const panel = documentRef.createElement("section");
    panel.className = "record-panel change-review";
    panel.innerHTML = `<div class="record-panel-head"><div><h2>Pending hirer changes</h2><p>${request.id} · requested ${request.requestedAt ?? ""}</p></div>${badge(request.status, request.status.includes("Blocked") ? "danger" : "warning")}</div><div class="change-warning">${ico("history")}<div><strong>Current accepted terms remain active</strong><p>The proposal does not change the participant’s agreement until all required responses and administrative checks are complete.</p></div></div><div class="change-meta"><div><span>Requested by</span><strong>${request.requestedBy}</strong></div><div><span>Reason</span><strong>${request.reason}</strong></div></div><div class="change-table"><div class="change-row change-head"><span>Field</span><span>Accepted value</span><span>Proposed value</span></div>${request.changes.map((change) => `<div class="change-row"><strong>${change[0]}</strong><span>${change[1]}</span><span>${change[2]}</span></div>`).join("")}</div><div class="response-block"><h3>Participant responses</h3>${detail.participantConsentRows(request.responses)}</div><div class="change-actions"><button class="btn reject-change">Reject change</button><button class="btn">Request clarification</button><button class="btn primary" ${request.status.includes("Blocked") ? "disabled" : ""}>Approve after consent</button></div>`;
    const warning = panel.querySelector<HTMLParagraphElement>(".change-warning p");
    if (warning) warning.textContent = "The proposal does not change the agreement until both the hirer and participant consent. KuQuest applies the change automatically after all required consent is recorded.";
    const responseHeading = panel.querySelector<HTMLHeadingElement>(".response-block h3");
    if (responseHeading) responseHeading.textContent = "Participant consent";
    const oversight = panel.querySelector<HTMLElement>(".change-actions");
    if (oversight) {
      oversight.className = "change-oversight";
      oversight.innerHTML = "<strong>Admin oversight only</strong><p>No admin approval is required. Intervene only when a participant files a dispute or the proposed terms violate marketplace policy.</p>";
    }
    const primary = main.querySelector<HTMLElement>(".record-primary");
    const applications = primary?.children[1] ?? null;
    primary?.insertBefore(panel, applications);
  };

  return { renderQuestChangeReview };
}
