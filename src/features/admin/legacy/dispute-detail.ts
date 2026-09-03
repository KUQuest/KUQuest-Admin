import type { LegacyRecord, LegacyRuntimeData } from "./runtime";
import { disputeCaseStatusFor } from "../domain/rulebook";
import type { AdminCommandPort } from "../api/admin-api";
import { newAdminIdempotencyKey } from "./admin-command-port";

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
  confirmAction: (
    title: string,
    record: LegacyRecord,
    detail: string,
    onConfirm: (reason: string) => void,
    options?: { keepDrawerOpen?: boolean },
  ) => void;
  adminCommands: AdminCommandPort;
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
    showDrawerLayer,
    closeDrawer,
    state,
    icon: ico,
    escapeActivityText,
    fmt,
    badge,
    disputeTypeLabel,
    timeline,
    confirmAction,
    adminCommands,
    persistAdminData,
    toast,
    renderHome,
    render,
    renderDisputePage,
  } = context;

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
        [
          "Response state",
          disputeCaseStatusFor(record.disputeCaseStatus ?? record.status),
          record.tone,
        ],
      ],
      recommended:
        "Review the submitted evidence and request any missing record before resolving funds.",
    }
  );
}

function questTimelineFor(record: ModerationRecord, caseData: DisputeCase, relatedQuest?: ModerationQuest): TimelineEntry[] {
  const dateBefore = (daysBefore: number, time: string): string => {
    const disputeDay = String(record.disputeDate || "").split(" · ")[0];
    const date = new Date(`${disputeDay} 12:00:00 UTC`);
    if (Number.isNaN(date.getTime())) return `Date not recorded · ${time}`;
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
    disputeCaseStatusFor(record.disputeCaseStatus ?? record.status) !== "DISPUTE_CASE_PENDING"
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

function evidenceRows(record: ModerationRecord): string {
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
      const outcome: "REFUND_HIRER" | "RELEASE_TO_WORKER" = selected === "hirer" ? "REFUND_HIRER" : "RELEASE_TO_WORKER";
      const workerId = record.workerId;
      const amountSatang = record.amountSatang;
      let allocations: Array<{ workerId: string; amountSatang: number }> | undefined;
      if (outcome === "RELEASE_TO_WORKER") {
        if (!workerId || !amountSatang || amountSatang <= 0) {
          toast("This Dispute Case has no positive Worker allocation from the Admin API.");
          return;
        }
        allocations = [{ workerId, amountSatang }];
      }
      const resolution = {
        outcome,
        reason,
        idempotencyKey: newAdminIdempotencyKey("resolve-dispute", record.id),
        ...(typeof record.version === "number" ? { expectedVersion: record.version } : {}),
        ...(allocations ? { allocations } : {}),
      };
      void adminCommands.resolveDispute(caseData.questId, resolution).then(() => {
        persistAdminData();
        if (state.view === "home") renderHome();
        else if (state.view === "disputes") render();
        if (root === drawer) openDisputeDrawer(data.disputes.indexOf(record));
        else if (root === main && typeof renderDisputePage === "function")
          renderDisputePage();
        toast(`Dispute Case ${record.id} resolved.`);
        return undefined;
      }).catch((error: unknown) => {
        toast(`Dispute Case resolution failed: ${error instanceof Error ? error.message : "Request failed."}`);
      });
    }, { keepDrawerOpen: root === drawer });
  });
}

function openDisputeDrawer(index: number): void {
  const record = data.disputes[index],
    caseStatus = disputeCaseStatusFor(record.disputeCaseStatus ?? record.status),
    isClosed = caseStatus !== "DISPUTE_CASE_PENDING",
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
 <div class="case-heading"><div><h2>${escapeActivityText(record.title)}</h2><p>${escapeActivityText(disputeTypeLabel(record))} · disputed ${escapeActivityText(record.disputeDate)}</p></div>${badge(caseStatus, record.tone)}</div>
 <div class="case-alert"><span>${ico("scale")}</span><div><strong>${isClosed ? "Dispute decision recorded" : `฿${fmt(record.amount)} is held`}</strong><p>${isClosed ? "This case is closed and retained as a read-only audit record." : "No payout can settle until this case is resolved."}</p></div></div>
 <section class="section"><h3>Dispute overview</h3><div class="facts"><div class="fact"><span>Category</span><strong>${escapeActivityText(disputeTypeLabel(record))}</strong></div><div class="fact"><span>Dispute date</span><strong>${escapeActivityText(record.disputeDate)}</strong></div><div class="fact"><span>Amount at risk</span><strong>฿${fmt(record.amount)}</strong></div></div></section>
 <section class="section"><h3>Description</h3><p>${escapeActivityText(disputeDescriptionFor(record, caseData))}</p></section>
 <section class="section"><h3>Participants</h3><div class="party-grid"><div><span>Opened by</span><strong>${escapeActivityText(caseData.openedBy)}</strong></div><div><span>Respondent</span><strong>${escapeActivityText(caseData.respondent)}</strong></div></div></section>
 <section class="section"><div class="section-title"><h3>Related files</h3><span class="section-count">${record.evidence.length}</span></div><div class="evidence-stack">${evidenceRows(record)}</div></section>
 <section class="section"><div class="section-title"><h3>Related quest</h3>${questIndex >= 0 ? `<a class="link open-related-quest" href="/quests/${encodeURIComponent(caseData.questId)}">Open full quest</a>` : ""}</div><a class="quest-reference" href="/quests/${encodeURIComponent(caseData.questId)}"><span class="file-icon">${ico("quest")}</span><span><strong>${escapeActivityText(caseData.questId)} · ${escapeActivityText(record.title)}</strong><small>View conditions, assignment, proof, and edit history</small></span><span>›</span></a></section>
 ${isClosed ? closedDecisionSummary(record) : `<section class="section"><h3>Resolution decision</h3><div class="allocation"><button data-allocation="hirer"><span>Refund hirer</span><strong>฿${fmt(record.amount)}</strong></button><button data-allocation="worker"><span>Release to worker</span><strong>฿${fmt(record.amount)}</strong></button></div><p class="audit-note">Choose the outcome before resolving.</p></section>`}
 <section class="section"><h3>Overall quest timeline</h3>${timeline(questTimeline, { showDetails: false })}</section>
</div>
${isClosed ? `<div class="drawer-actions case-actions"><a class="btn" href="/disputes/${encodeURIComponent(record.id)}">Full dispute detail</a><button class="btn" id="close-case-record">Close record</button></div>` : `<div class="drawer-actions case-actions"><a class="btn" href="/disputes/${encodeURIComponent(record.id)}">Full dispute detail</a><button class="btn primary resolve-case">Resolve dispute</button></div>`}`;
  const closeButton = query<InteractiveElement>(document, "#close");
  if (closeButton) closeButton.onclick = closeDrawer;
  scrim.onclick = closeDrawer;
  drawer.querySelector(".signal-list")?.closest(".section")?.remove();
  if (!isClosed) bindResolutionControls(drawer, record);
  drawer
    .querySelector("#close-case-record")
    ?.addEventListener("click", closeDrawer);
}


  return {
    disputeCaseFor,
    questTimelineFor,
    disputeDescriptionFor,
    bindResolutionControls,
    openDisputeDrawer,
  };
}
