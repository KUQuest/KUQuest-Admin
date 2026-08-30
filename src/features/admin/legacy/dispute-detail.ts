import type { LegacyRecord, LegacyRuntimeData } from "./runtime";

export type ModerationRecord = LegacyRecord & {
  evidence: string[];
  decisionReason?: string;
  penaltyOutcome?: string;
  resolution?: string;
};

export type ModerationQuest = LegacyRecord;

export type DisputeCase = {
  questId: string;
  category: string;
  openedBy: string;
  respondent: string;
  requested: string;
  claim: string;
  response: string;
  policy: string[];
  signals: Array<[string, string, string]>;
  recommended: string;
};

export type TimelineEntry = {
  title: string;
  detail: string;
};

type ModalClose = () => void;
type ModalOptions = { initialFocus?: string; keepDrawerOpen?: boolean };
type InteractiveElement = HTMLElement & {
  value: string;
  disabled: boolean;
  files: FileList | null;
};

export type ModerationPageContext = {
  data: Omit<LegacyRuntimeData, "disputes" | "quests"> & {
    disputes: ModerationRecord[];
    quests: ModerationQuest[];
  };
  disputeCases: Record<string, DisputeCase>;
  main: HTMLElement;
  drawer: HTMLElement;
  scrim: HTMLElement;
  closeActiveLayer: () => void;
  showDrawerLayer: () => void;
  showModalLayer: (layer: HTMLElement, options?: ModalOptions) => ModalClose;
  closeDrawer: () => void;
  state: { view: string };
  icon: (name: string) => string;
  escapeActivityText: (value: unknown) => string;
  fmt: (value: number | null | undefined) => string;
  badge: (status: string, tone: string) => string;
  toneClass: (tone: string) => string;
  disputeTypeLabel: (record: LegacyRecord) => string;
  timeline: (items: TimelineEntry[], options?: { showDetails?: boolean }) => string;
  chatMessage: (sender: string, time: string, message: string, variant: string) => string;
  chatTimeLabel: () => string;
  bindChatAttachment: (form: HTMLFormElement) => void;
  confirmAction: (
    title: string,
    record: LegacyRecord,
    detail: string,
    onConfirm: (reason: string) => void,
    options?: { keepDrawerOpen?: boolean },
  ) => void;
  persistAdminData: () => void;
  toast: (message: string) => void;
  renderHome: () => void;
  render: () => void;
  renderDisputePage?: () => void;
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

export type DisputeDetailApi = {
  disputeCaseFor: (record: ModerationRecord) => DisputeCase;
  questTimelineFor: (
    record: ModerationRecord,
    caseData: DisputeCase,
    relatedQuest?: ModerationQuest,
  ) => TimelineEntry[];
  disputeDescriptionFor: (
    record: ModerationRecord,
    caseData: DisputeCase,
  ) => string;
  partyChats: (caseData: DisputeCase) => string;
  bindPartyChats: (root: HTMLElement, record: ModerationRecord) => void;
  bindResolutionControls: (root: HTMLElement, record: ModerationRecord) => void;
  openDisputeDrawer: (index: number) => void;
};

export function initializeDisputeDetail(
  context: ModerationPageContext,
): DisputeDetailApi {
  const {
    data,
    disputeCases,
    main,
    drawer,
    scrim,
    closeActiveLayer,
    showDrawerLayer,
    showModalLayer,
    closeDrawer,
    state,
    icon: ico,
    escapeActivityText,
    fmt,
    badge,
    toneClass,
    disputeTypeLabel,
    timeline,
    chatMessage,
    chatTimeLabel,
    bindChatAttachment,
    confirmAction,
    persistAdminData,
    toast,
    renderHome,
    render,
    renderDisputePage,
  } = context;
  const activeCustomLayerClose = closeActiveLayer;

function disputeCaseFor(record: ModerationRecord): DisputeCase {
  return (
    disputeCases[record.id] || {
      questId: record.questId || "",
      category: `${record.disputeType || "Service outcome"} review`,
      openedBy: `${record.person} · Hirer`,
      respondent: `${record.other} · Worker`,
      requested: "Admin review",
      claim: record.detail,
      response:
        "The responding party has acknowledged the case and is preparing supporting evidence.",
      policy: [
        "Published quest condition controls scope",
        "Evidence timestamps are authoritative",
        "Administrative reason required",
      ],
      signals: [
        ["Evidence coverage", "61%", "warning"],
        ["Account risk", "Low", "success"],
        ["Response state", record.status, record.tone],
      ],
      recommended:
        "Review the submitted evidence and request any missing record before resolving funds.",
    }
  );
}

function questTimelineFor(record: ModerationRecord, caseData: DisputeCase, relatedQuest?: ModerationQuest): TimelineEntry[] {
  const dateBefore = (daysBefore: number, time: string): string => {
    const date = new Date(`${record.disputeDate} 12:00:00 UTC`);
    date.setUTCDate(date.getUTCDate() - daysBefore);
    return `${date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })} · ${time}`;
  };
  return [
    {
      title: `${relatedQuest?.person || "The hirer"} published this quest`,
      detail: `${dateBefore(5, "09:00")} · ${relatedQuest?.title || record.title}`,
    },
    {
      title: "A worker team was selected and accepted the terms",
      detail: `${dateBefore(4, "16:40")} · Scope, payment, and attendance requirements locked`,
    },
    {
      title: "Work and completion evidence were submitted",
      detail: `${dateBefore(1, "17:20")} · ${record.evidence.map((evidence) => evidence.split(" · ")[0]).join(" and ")}`,
    },
    {
      title: `${caseData.openedBy.split(" · ")[0]} opened the dispute`,
      detail: `${record.disputeDate} · 09:14 · ${disputeTypeLabel(record)}`,
    },
    {
      title: `KuQuest placed ฿${fmt(record.amount)} on hold`,
      detail: `${record.disputeDate} · 09:15 · Quest progression paused`,
    },
    record.status === "Closed"
      ? {
          title: "Admin recorded the final resolution",
          detail: `${record.disputeDate} · 14:35 · Case closed`,
        }
      : {
          title: "Case assigned to admin review",
          detail: `${record.disputeDate} · 10:08 · Awaiting resolution`,
        },
  ];
}

function disputeDescriptionFor(record: ModerationRecord, caseData: DisputeCase): string {
  const opener = caseData.openedBy.split(" · ")[0];
  const respondent = caseData.respondent.split(" · ")[0];
  return `${record.detail} ${opener} states: ${caseData.claim} ${respondent} responds: ${caseData.response}`;
}

function closedDecisionSummary(record: ModerationRecord): string {
  const reason = String(
    record.decisionReason ||
      "No written reason was recorded for this legacy demo case.",
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  return `<section class="section"><h3>Recorded outcome</h3><p class="audit-note">${escapeActivityText(record.resolution || "The final allocation was recorded and the case is now read-only.")}</p></section><section class="section"><h3>Reason for this decision</h3><p>${reason}</p></section>${record.penaltyOutcome ? `<section class="section"><h3>Additional enforcement</h3><p>${escapeActivityText(record.penaltyOutcome)}</p></section>` : ""}`;
}

function partyChats(caseData: DisputeCase): string {
  return `<section class="section party-chats"><h3>Private case messages</h3><p class="chat-intro">Messages are separate for each party and become part of the case audit trail.</p><div class="chat-launches"><button class="party-chat-button" data-chat-role="hirer"><span class="avatar">GV</span><span><strong>Chat with hirer</strong><small>${escapeActivityText(caseData.openedBy)}</small></span><span>Open</span></button><button class="party-chat-button" data-chat-role="worker"><span class="avatar">HN</span><span><strong>Chat with worker</strong><small>${escapeActivityText(caseData.respondent)}</small></span><span>Open</span></button></div></section>`;
}

function bindPartyChats(root: HTMLElement, record: ModerationRecord): void {
  const caseData = disputeCaseFor(record);
  root
    .querySelectorAll<InteractiveElement>("[data-chat-role]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openPartyChat(record, button.dataset.chatRole, caseData),
      ),
    );
}

function openPartyChat(record: ModerationRecord, role: string | undefined, caseData: DisputeCase): void {
  activeCustomLayerClose?.();
  const isGiver = role === "hirer",
    name = isGiver ? caseData.openedBy : caseData.respondent,
    senderName = name.split(" · ")[0],
    initial = isGiver
      ? "I have attached the records supporting my claim."
      : "I have added my response and supporting files.",
    overlay = document.createElement("div");
  overlay.className = "party-chat-overlay";
  overlay.innerHTML = `<section class="party-chat-modal" role="dialog" aria-modal="true" aria-label="Chat with ${isGiver ? "hirer" : "worker"}"><div class="chat-modal-head"><div><strong>Chat with ${isGiver ? "hirer" : "worker"}</strong><small>${name} · ${record.id}</small></div><button class="icon close-party-chat" aria-label="Close chat"><span class="close-lines"></span></button></div><div class="chat-thread">${chatMessage(senderName, isGiver ? "Today · 09:14" : "Today · 09:16", initial, "received")}${chatMessage("You", "Today · 09:20", "Please keep all further evidence in this case.", "sent")}</div><form class="chat-compose"><label class="visually-hidden" for="case-message-${record.id}-${role}">Message ${isGiver ? "hirer" : "worker"}</label><textarea id="case-message-${record.id}-${role}" rows="3" maxlength="500" placeholder="Message ${isGiver ? "hirer" : "worker"}…"></textarea><div class="chat-compose-actions"><div class="chat-compose-tools"><label class="chat-attach btn" for="case-chat-attachment-${record.id}-${role}">${ico("paperclip")}<span>Attach file</span></label><input class="chat-attachment-input visually-hidden" id="case-chat-attachment-${record.id}-${role}" data-chat-attachment type="file"><span class="chat-attachment-name" data-chat-attachment-name aria-live="polite">No file attached</span></div><button class="btn primary" type="submit">Send message</button></div></form></section>`;
  const close = showModalLayer(overlay, { initialFocus: "textarea" });
  const closeButton = query<InteractiveElement>(overlay, ".close-party-chat");
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
    overlay
    const thread = query<HTMLElement>(overlay, ".chat-thread");
    if (!thread) return;
    thread.insertAdjacentHTML("beforeend", chatMessage("You", chatTimeLabel(), message, "sent"));
    input.value = "";
    toast(`Message saved to ${record.id}`);
  });
}

function bindResolutionControls(root: HTMLElement, record: ModerationRecord): void {
  let selected = "";
  const caseData = disputeCaseFor(record),
    giverName = caseData.openedBy.split(" · ")[0],
    hunterName = caseData.respondent.split(" · ")[0],
    resolve = query<InteractiveElement>(root, ".resolve-case, [data-dispute-action]");
  const hirerAllocation = query<HTMLElement>(root, '[data-allocation="hirer"] span');
  const workerAllocation = query<HTMLElement>(root, '[data-allocation="worker"] span');
  if (hirerAllocation) hirerAllocation.textContent = `Hirer wins · ${giverName}`;
  if (workerAllocation) workerAllocation.textContent = `Worker wins · ${hunterName}`;
  queryAll<InteractiveElement>(root, "[data-allocation]").forEach((button) =>
    button.addEventListener("click", () => {
      selected = button.dataset.allocation || "";
      root
        .querySelectorAll("[data-allocation]")
        .forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    }),
  );
  resolve?.addEventListener("click", () => {
    if (!selected)
      return toast("Select a resolution before closing this dispute.");
    let detail = "";
    if (selected === "hirer")
      detail = `Confirm decision for ${record.id}: Hirer wins · ${giverName}; refund ฿${fmt(record.amount)} to the giver.`;
    if (selected === "worker")
      detail = `Confirm decision for ${record.id}: Worker wins · ${hunterName}; release ฿${fmt(record.amount)} to the hunter.`;
    confirmAction("Confirm dispute resolution", record, detail, (reason) => {
      record.status = "Closed";
      record.tone = "neutral";
      record.resolution = detail;
      record.decisionReason = reason;
      const quest = data.quests.find((item) => item.id === caseData.questId);
      if (quest) {
        if (selected === "hirer") {
          quest.status = "Cancelled";
          quest.tone = "neutral";
        } else {
          quest.status = "Completed";
          quest.tone = "success";
        }
      }
      persistAdminData();
      if (state.view === "home") renderHome();
      if (root === drawer) openDisputeDrawer(data.disputes.indexOf(record));
      else if (root === main && typeof renderDisputePage === "function")
        renderDisputePage();
      else if (state.view === "disputes") render();
    }, { keepDrawerOpen: root === drawer });
  });
}

function openDisputeDrawer(index: number): void {
  const record = data.disputes[index],
    isClosed = record.status === "Closed",
    caseData = disputeCaseFor(record),
    relatedQuest = data.quests.find((quest) => quest.id === caseData.questId),
    questIndex = data.quests.findIndex(
      (quest) => quest.id === caseData.questId,
    ),
    questTimeline = questTimelineFor(record, caseData, relatedQuest);
  showDrawerLayer();
  drawer.innerHTML = `
<div class="drawer-top"><div><strong>${escapeActivityText(record.id)}</strong><small>Dispute resolution case</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div>
<div class="drawer-body dispute-record ${isClosed ? "closed-case" : "active-case"}">
 <div class="case-heading"><div><h2>${escapeActivityText(record.title)}</h2><p>${escapeActivityText(disputeTypeLabel(record))} · disputed ${escapeActivityText(record.disputeDate)}</p></div>${badge(record.status, record.tone)}</div>
 <div class="case-alert"><span>${ico("scale")}</span><div><strong>${isClosed ? "Dispute decision recorded" : `฿${fmt(record.amount)} is held`}</strong><p>${isClosed ? "This case is closed and retained as a read-only audit record." : "No payout can settle until this case is resolved."}</p></div></div>
 <section class="section"><h3>Dispute overview</h3><div class="facts"><div class="fact"><span>Category</span><strong>${escapeActivityText(disputeTypeLabel(record))}</strong></div><div class="fact"><span>Dispute date</span><strong>${escapeActivityText(record.disputeDate)}</strong></div><div class="fact"><span>Amount at risk</span><strong>฿${fmt(record.amount)}</strong></div></div></section>
 <section class="section"><h3>Description</h3><p>${escapeActivityText(disputeDescriptionFor(record, caseData))}</p></section>
 <section class="section"><h3>Participants</h3><div class="party-grid"><div><span>Opened by</span><strong>${escapeActivityText(caseData.openedBy)}</strong></div><div><span>Respondent</span><strong>${escapeActivityText(caseData.respondent)}</strong></div></div></section>
 <section class="section"><div class="section-title"><h3>Related files</h3><span class="section-count">${record.evidence.length}</span></div><div class="evidence-stack">${record.evidence.map((evidence) => { const parts = String(evidence).split(" · "); return `<button class="evidence-item"><span class="evidence-state complete">${ico("check")}</span><span><strong>${escapeActivityText(parts[0])}</strong><small>${escapeActivityText(parts.slice(1).join(" · ") || "Verified record")}</small></span><span>Open</span></button>`; }).join("")}</div></section>
 <section class="section"><div class="section-title"><h3>Related quest</h3>${questIndex >= 0 ? `<a class="link open-related-quest" href="/quests/${encodeURIComponent(caseData.questId)}">Open full quest</a>` : ""}</div><a class="quest-reference" href="/quests/${encodeURIComponent(caseData.questId)}"><span class="file-icon">${ico("quest")}</span><span><strong>${escapeActivityText(caseData.questId)} · ${escapeActivityText(record.title)}</strong><small>View conditions, assignment, proof, and edit history</small></span><span>›</span></a></section>
 ${partyChats(caseData)}
 ${isClosed ? closedDecisionSummary(record) : `<section class="section"><h3>Resolution decision</h3><div class="allocation"><button data-allocation="hirer"><span>Refund hirer</span><strong>฿${fmt(record.amount)}</strong></button><button data-allocation="worker"><span>Release to worker</span><strong>฿${fmt(record.amount)}</strong></button></div><p class="audit-note">Choose the outcome before resolving.</p></section>`}
 <section class="section"><h3>Overall quest timeline</h3>${timeline(questTimeline, { showDetails: false })}</section>
</div>
${isClosed ? `<div class="drawer-actions case-actions"><a class="btn" href="/disputes/${encodeURIComponent(record.id)}">Full dispute detail</a><button class="btn" id="close-case-record">Close record</button></div>` : `<div class="drawer-actions case-actions"><a class="btn" href="/disputes/${encodeURIComponent(record.id)}">Full dispute detail</a><button class="btn primary resolve-case">Resolve dispute</button></div>`}`;
  const closeButton = query<InteractiveElement>(document, "#close");
  if (closeButton) closeButton.onclick = closeDrawer;
  scrim.onclick = closeDrawer;
  drawer.querySelector(".signal-list")?.closest(".section")?.remove();
  bindPartyChats(drawer, record);
  if (!isClosed) bindResolutionControls(drawer, record);
  drawer
    .querySelector("#close-case-record")
    ?.addEventListener("click", closeDrawer);
}


  return {
    disputeCaseFor,
    questTimelineFor,
    disputeDescriptionFor,
    partyChats,
    bindPartyChats,
    bindResolutionControls,
    openDisputeDrawer,
  };
}
