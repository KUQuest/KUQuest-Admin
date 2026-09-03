import {
  disputeCaseStatusFor,
  hasHiddenQuestOverlay,
  questStateFor,
  walletStatusFor,
} from "../domain/rulebook";
import type { AdminCommandPort } from "../api/admin-api";
import type { AdminQuestReasonCode } from "../api/admin-api";
import { newAdminIdempotencyKey } from "./admin-command-port";

export type QuestTone = string;

export type QuestParticipant = [name: string, status: string, role: string];
export type TeamParticipant = [name: string, role: string];

export type QuestAttachment = {
  name: string;
  detail: string;
  src?: string;
  alt?: string;
};

export type QuestFile = string | QuestAttachment;

export type QuestRecord = {
  id: string;
  title: string;
  person: string;
  other: string;
  status: string;
  tone: QuestTone;
  amount: number;
  age: string;
  version?: number;
  apiBacked?: boolean;
  questDetailLoaded?: boolean;
  questDetailError?: string;
  editRequestStatus?: string;
  questState?: string;
  hiddenAt?: string | null;
  hiddenByAdminId?: string | null;
  fundingTotalSatang?: number;
  questRewardSatang?: number;
  platformFeeSatang?: number;
  platformFeeBps?: number;
  feeRoundingMode?: "UP";
  createdAt?: string;
  dueAt?: string;
  description?: string;
  giver?: string[];
  location?: string[];
  schedule?: string[];
  activity?: string[];
  editHistory?: string[];
  applications?: QuestParticipant[];
  selectedParticipant?: string;
  teamQuest?: boolean;
  teamParticipants?: TeamParticipant[];
  candidateMode?: string;
  giverAttachments?: QuestAttachment[];
  proof?: QuestFile[];
  terminationReason?: string;
};

export type QuestUser = {
  id: string;
  title: string;
  status?: string;
  walletStatus?: string;
  tone?: string;
};

export type QuestDispute = {
  id: string;
  questId?: string;
  title: string;
  person: string;
  other: string;
  amount: number;
  status: string;
  tone: string;
  detail: string;
  disputeType?: string;
  disputeCaseStatus?: string;
};

export type QuestPayout = {
  id: string;
  title: string;
  amount: number;
  questId?: string;
  other?: string;
};

export type QuestData = {
  quests: QuestRecord[];
  disputes: QuestDispute[];
  users: QuestUser[];
  payouts: QuestPayout[];
};

export type DisputeCase = {
  questId?: string;
  respondent?: string;
};

export type ChangeResponse = [name: string, status: string, role: string];
export type QuestChange = [field: string, accepted: string, proposed: string, kind?: string];

export type PendingQuestChange = {
  id: string;
  status: string;
  requestedBy: string;
  requestedAt?: string;
  reason: string;
  responses: ChangeResponse[];
  changes: QuestChange[];
};

export type QuestEditEntry = {
  time?: string;
  title: string;
  actor: string;
  status: string;
  tone: QuestTone;
  effect: string;
  responses: ChangeResponse[];
  changes: Array<{ field: string; accepted: string; proposed: string }>;
};

export type TimelineItem =
  | string
  | {
      title: string;
      time?: string;
      detail?: string;
      showDetails?: boolean;
    };

export type TimelineOptions = { showDetails?: boolean };

export type QuestDetailDependencies = {
  document: Document;
  data: QuestData;
  disputeCases: Record<string, DisputeCase>;
  drawer: HTMLElement;
  scrim: HTMLElement;
  showDrawerLayer: () => void;
  closeDrawer: () => void;
  confirmAction: (
    action: string,
    record: QuestRecord,
    decisionDetail?: string,
    onConfirm?: (reason: string, reasonCode?: AdminQuestReasonCode) => void,
  ) => void;
  hydrateQuest?: (record: QuestRecord) => Promise<void>;
  adminCommands: AdminCommandPort;
  persistAdminData: () => void;
  toast: (message: string) => void;
  refresh: () => void;
  badge: (status: string, tone: string) => string;
  fmt: (amount: number | null | undefined) => string;
  escapeActivityText: (value: unknown) => string;
  ico: (name: string) => string;
  timeline: (items: TimelineItem[], options?: TimelineOptions) => string;
  disputeTypeLabel: (record: QuestDispute) => string;
  payoutQuestId: (record: QuestPayout) => string;
};

export type QuestDetails = {
  description: string;
  giver: string[];
  location: string[];
  schedule: string[];
  activity: string[];
  applications: QuestParticipant[];
  relation: string[];
  giverAttachments: QuestAttachment[];
  proof: QuestFile[];
};

export type QuestDetailModule = {
  pendingQuestChanges: Record<string, PendingQuestChange>;
  questDetails: (record: QuestRecord) => QuestDetails;
  questHasStarted: (record: QuestRecord) => boolean;
  participantsForQuest: (record: QuestRecord, detail: QuestDetails) => QuestParticipant[];
  participantSectionTitle: (
    record: QuestRecord,
    participants: QuestParticipant[],
    started: boolean,
  ) => string;
  giverProfile: (detail: QuestDetails) => string;
  giverProfileLink: (detail: QuestDetails, label?: string, className?: string) => string;
  relatedRows: (rows: QuestParticipant[]) => string;
  giverAttachmentsPanel: (files: QuestAttachment[]) => string;
  proofSubmissionsPanel: (files: QuestFile[], record: QuestRecord) => string;
  participantConsentRows: (responses: ChangeResponse[]) => string;
  renderQuestEditHistory: (record: QuestRecord) => string;
  openQuestDrawer: (index: number) => void;
};

export function questBahtLabel(value: unknown): string {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? `฿${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100)}`
    : "Not provided by the Admin API";
}

export function questPercentLabel(value: unknown): string {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value / 100)}%`
    : "Not provided by the Admin API";
}

function createPendingQuestChanges(
  dependencies: QuestDetailDependencies,
): Record<string, PendingQuestChange> {
  const { data } = dependencies;
  const pending: Record<string, PendingQuestChange> = {};
  data.quests
    .filter((record) => record.editRequestStatus === "EDIT_REQUEST_PENDING")
    .forEach((record, index) => {
      const participants: ChangeResponse[] = record.teamParticipants?.map(
        ([name, role]) => [name, "Pending", role],
      ) ?? (record.selectedParticipant
        ? [[record.selectedParticipant, "Pending", "Worker"]]
        : []);
      pending[record.id] = {
        id: `EDT-${String(5201 + index).padStart(3, "0")}`,
        status: "Awaiting participant consent",
        requestedBy: `${record.person} · Hirer`,
        requestedAt: record.createdAt,
        reason: "The hirer proposed updated scope and delivery details for moderator review.",
        responses: [...participants, [record.person, "Approved", "Hirer"]],
        changes: [
          [
            "Quest description",
            record.description ?? "",
            `${record.description ?? ""} Add the latest stakeholder notes.`,
            "Scope increase",
          ],
          [
            "Location",
            record.location?.[0] ?? "",
            `${record.location?.[0] ?? ""} · additional checkpoints`,
            "Scope increase",
          ],
          ["Due date", record.dueAt ?? "", `${record.dueAt ?? ""} · revised terms`, "Schedule update"],
        ],
      };
    });
  return pending;
}

export function createQuestDetailModule(
  dependencies: QuestDetailDependencies,
): QuestDetailModule {
  const {
    data,
    disputeCases,
    drawer,
    scrim,
    showDrawerLayer,
    closeDrawer,
    confirmAction,
    adminCommands,
    persistAdminData,
    toast,
    refresh,
    badge,
    fmt,
    escapeActivityText,
    ico,
    timeline,
    disputeTypeLabel,
    payoutQuestId,
  } = dependencies;
  const pendingQuestChanges = createPendingQuestChanges(dependencies);

  const submissionFilesFor = (record: QuestRecord): QuestFile[] => {
    if (!["QUEST_IN_PROGRESS", "QUEST_COMPLETED", "QUEST_FAILED"].includes(questStateFor(record.questState ?? record.status))) return [];
    return [`Completed work package · ZIP · submitted ${record.age.toLowerCase()}`];
  };

  const questActivityDate = (age: string): string => {
    const date = new Date("2026-08-27T12:00:00Z");
    const daysAgo = String(age).match(/^(\d+)\s+days?$/);
    if (age === "Yesterday") date.setUTCDate(date.getUTCDate() - 1);
    else if (daysAgo) date.setUTCDate(date.getUTCDate() - Number(daysAgo[1]));
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const defaultQuestActivity = (record: QuestRecord): string[] => {
    const date = questActivityDate(record.age);
    return [
      `Quest published · ${date}, 09:10 · The quest became available under its published terms`,
      `Applications received · ${date}, 12:30 · Applications were recorded for review`,
      `${questStateFor(record.questState ?? record.status)} · ${date}, 16:45 · The current quest state was recorded in the audit trail`,
    ];
  };

  const questDetails = (record: QuestRecord): QuestDetails => {
    const linkedCase = Object.values(disputeCases).find((caseData) => caseData.questId === record.id);
    const linkedPayout = data.payouts.find((payout) => payoutQuestId(payout) === record.id);
    const selectedParticipant =
      linkedCase?.respondent?.split(" · ")[0] ??
      linkedPayout?.title ??
      record.selectedParticipant ??
      "Selected worker";
    const giver = record.giver ?? [
      record.person,
      "Verified university account",
      record.other,
      "No unresolved account flags",
    ];
    const location = record.location ?? [
      "Kasetsart University, Bangkhen",
      "Campus location confirmed",
      "Map coordinates on file",
    ];
    const schedule = record.schedule ?? [
      "26 Aug 2026 · 09:00",
      "30 Aug 2026 · 18:00",
      "Applications closed · 25 Aug 2026 · 18:00",
    ];
    const applications = record.applications ?? (questStateFor(record.questState ?? record.status) === "QUEST_DRAFT"
      ? []
      : record.teamQuest && record.teamParticipants?.length
        ? record.teamParticipants.map(([name, role]) => [name, "Selected", role] as QuestParticipant)
        : [[selectedParticipant, "Selected", "Assignment on record"]]);
    return {
      description:
        record.description ??
        `Operational details for “${record.title},” including the full marketplace lifecycle and linked records.`,
      giver,
      location,
      schedule,
      activity: record.activity ?? defaultQuestActivity(record),
      applications,
      relation: ["No open dispute", "—", `฿${fmt(record.amount)} funded`],
      giverAttachments: record.giverAttachments ?? [
        {
          name: `${record.title} requirements`,
          detail: `PDF · reference brief · added by ${record.person}`,
        },
      ],
      proof: record.proof ?? submissionFilesFor(record),
    };
  };

  const questHasStarted = (record: QuestRecord): boolean =>
    ["QUEST_ASSIGNED", "QUEST_IN_PROGRESS", "QUEST_COMPLETED", "QUEST_FAILED"]
      .includes(questStateFor(record.questState ?? record.status));

  const participantsForQuest = (record: QuestRecord, detail: QuestDetails): QuestParticipant[] =>
    questHasStarted(record)
      ? detail.applications.filter((participant) => participant[1] === "Selected" || participant[1] === "APPLICATION_SELECTED")
      : detail.applications;

  const participantSectionTitle = (
    record: QuestRecord,
    participants: QuestParticipant[],
    started: boolean,
  ): string => {
    if (!started) return "Application";
    return record.teamQuest || participants.length > 1 ? "Selected participants" : "Selected participant";
  };

  const giverProfile = (detail: QuestDetails): string => {
    const hirer = data.users.find((user) => user.title === detail.giver[0]);
    const status = walletStatusFor(hirer?.walletStatus ?? hirer?.status);
    const statusTone = hirer?.tone ?? (status === "ACTIVE" ? "success" : status === "FROZEN" ? "warning" : "danger");
    return `<div class="hirer-profile"><div class="hirer-profile-summary"><strong>${escapeActivityText(detail.giver[0])}</strong>${badge(status, statusTone)}</div></div>`;
  };

  const giverProfileLink = (
    detail: QuestDetails,
    label = "Open user profile",
    className = "btn full-width",
  ): string => {
    const hirer = data.users.find((user) => user.title === detail.giver[0]);
    return hirer ? `<a class="${className}" href="/users/${encodeURIComponent(hirer.id)}">${label}</a>` : "";
  };

  const relatedRows = (rows: QuestParticipant[]): string =>
    `<div class="related-list">${rows.map((row) => {
      const user = data.users.find((candidate) => candidate.title === row[0]);
      const isSelected = row[1] === "Selected" || row[1] === "APPLICATION_SELECTED";
      const status = isSelected ? walletStatusFor(user?.walletStatus ?? user?.status) : row[1];
      const statusTone = isSelected ? user?.tone ?? "success" : row[1] === "Not selected" ? "neutral" : "warning";
      return `<div class="related-row"><strong>${escapeActivityText(row[0])}</strong><span>${badge(status, statusTone)}</span>${user ? `<a class="link related-profile-link" href="/users/${encodeURIComponent(user.id)}">View profile</a>` : ""}</div>`;
    }).join("")}</div>`;

  const fileRows = (files: QuestFile[]): string => files.map((file) => {
    const attachment: QuestAttachment = typeof file === "string"
      ? { name: file.split(" · ")[0], detail: file.split(" · ").slice(1).join(" · ") }
      : file;
    const preview = attachment.src
      ? `<img class="attachment-thumbnail" src="${attachment.src}" alt="${attachment.alt ?? ""}" loading="lazy">`
      : `<span class="file-icon">${ico("quest")}</span>`;
    return `<button class="file-row ${attachment.src ? "image-attachment" : ""}">${preview}<span><strong>${escapeActivityText(attachment.name)}</strong><small>${escapeActivityText(attachment.detail)}</small></span><span>Open</span></button>`;
  }).join("");

  const giverAttachmentsPanel = (files: QuestAttachment[]): string =>
    `<section class="record-panel"><div class="record-panel-head"><div><h2>Files from hirer</h2><p>Reference material supplied with the quest.</p></div><span class="section-count">${files.length}</span></div>${files.length ? fileRows(files) : '<div class="submission-empty"><strong>No files from hirer</strong><p>This quest was published using text details only.</p></div>'}</section>`;

  const proofEmptyState = (record: QuestRecord): string => record.teamQuest
    ? "The selected participants have not uploaded any proof files."
    : questHasStarted(record)
      ? "The selected participant has not uploaded any proof files."
      : "No participant has been selected, so no proof submission exists.";

  const proofSubmissionsPanel = (files: QuestFile[], record: QuestRecord): string =>
    `<section class="record-panel"><div class="record-panel-head"><div><h2>Proof submissions</h2><p>Files uploaded by the selected ${record.teamQuest ? "participants" : "participant"}.</p></div>${files.length ? '<button class="link" data-functional-action="download-all">Download all</button>' : ""}</div>${files.length ? fileRows(files) : `<div class="submission-empty"><strong>No submission yet</strong><p>${proofEmptyState(record)}</p></div>`}</section>`;

  const participantConsentRows = (responses: ChangeResponse[]): string =>
    `<div class="response-table"><div class="response-row response-head"><span>Participant</span><span>Status</span></div>${responses.map((response) => {
      const role = response[2] === "Hirer" ? "Hirer" : "Worker";
      return `<div class="response-row"><span><strong>${escapeActivityText(response[0])}</strong><small>Role: ${role}</small></span><span class="response-status">${badge(response[1], response[1] === "Approved" ? "success" : "warning")}</span></div>`;
    }).join("")}</div>`;

  const questEditHistory = (record: QuestRecord): QuestEditEntry[] => {
    const request = pendingQuestChanges[record.id];
    if (!request) return [];
    return [{
      time: request.requestedAt,
      title: `${request.changes.length} quest details proposed for change`,
      actor: request.requestedBy,
      status: request.status,
      tone: "warning",
      effect: "Not active. The currently accepted quest details remain in force until both parties consent.",
      responses: request.responses,
      changes: request.changes.map(([field, accepted, proposed]) => ({ field, accepted, proposed })),
    }];
  };

  const renderQuestEditHistory = (record: QuestRecord): string => {
    const entries = questEditHistory(record);
    if (!entries.length && record.editHistory?.length) {
      return `<section class="record-panel edit-history-panel"><div class="record-panel-head"><div><h2>Edit history</h2><p>Changes read from the Admin API.</p></div><span class="section-count">${record.editHistory.length}</span></div><ol class="edit-history-list">${record.editHistory.map((entry) => `<li class="edit-history-entry"><div class="edit-history-content"><strong>${escapeActivityText(entry.split(" · ")[0])}</strong><span>${escapeActivityText(entry.split(" · ").slice(1).join(" · "))}</span></div></li>`).join("")}</ol></section>`;
    }
    if (!entries.length) {
      return `<section class="record-panel edit-history-panel"><div class="record-panel-head"><div><h2>Edit history</h2><p>Changes to the quest description, wage, schedule, location, or deliverables appear here.</p></div></div><div class="edit-history-empty"><strong>No edits recorded</strong><p>${escapeActivityText(record.person)} has not changed the quest details since publication.</p></div></section>`;
    }
    return `<section class="record-panel edit-history-panel"><div class="record-panel-head"><div><h2>Edit history</h2><p>Shows proposed and accepted changes to the quest details.</p></div></div><ol class="edit-history-list">${entries.map((entry) => `<li class="edit-history-entry"><div class="edit-history-meta"><time>${escapeActivityText(entry.time)}</time></div><div class="edit-history-content"><div class="change-table"><div class="change-row change-head"><span>Field</span><span>Accepted value</span><span>Proposed value</span></div>${entry.changes.map((change) => `<div class="change-row"><strong>${escapeActivityText(change.field)}</strong><span>${escapeActivityText(change.accepted)}</span><span>${escapeActivityText(change.proposed)}</span></div>`).join("")}</div></div></li>`).join("")}</ol></section>`;
  };

  const openQuestDrawer = (index: number): void => {
    const record = data.quests[index];
    if (!record) return;
    const questState = questStateFor(record.questState ?? record.status);
    const hidden = hasHiddenQuestOverlay(record);
    const detail = questDetails(record);
    const participants = participantsForQuest(record, detail);
    const started = questHasStarted(record);
    const relatedDispute = data.disputes.find((dispute) => (disputeCases[dispute.id]?.questId ?? "") === record.id);
    showDrawerLayer();
    drawer.innerHTML = `
    <div class="drawer-top"><div><strong>${escapeActivityText(record.id)}</strong><small>Full quest record</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div>
    <div class="drawer-body quest-record">
      <div class="drawer-title"><span class="att-icon info">${ico("quest")}</span><div><h2>${escapeActivityText(record.title)}</h2><p>${record.teamQuest ? "Team quest · " : ""}created by ${escapeActivityText(record.person)}</p></div></div>
      <div class="facts quest-summary">
        <div class="fact"><span>Status</span>${badge(questState, record.tone)}${hidden ? '<span class="badge neutral quest-hidden-overlay">Hidden</span>' : ""}</div><div class="fact"><span>Quest Funding Total</span><strong>${questBahtLabel(record.fundingTotalSatang)}</strong></div>
        <div class="fact"><span>Participant mode</span><strong>${record.teamQuest ? "Team" : "Single"}</strong></div><div class="fact"><span>Candidate mode</span><strong>${escapeActivityText(record.candidateMode ?? (questState === "QUEST_OPEN" ? "FCFS" : "CANDIDATE"))}</strong></div><div class="fact"><span>Tag</span><strong>${escapeActivityText(record.other)}</strong></div>
      </div>
      ${questState === "QUEST_FAILED" ? `<section class="section quest-dispute-reason"><div class="section-title"><h3>Why this quest is failed</h3>${relatedDispute ? badge(disputeCaseStatusFor(relatedDispute.disputeCaseStatus ?? relatedDispute.status), relatedDispute.tone) : badge("DISPUTE_CASE_PENDING", "warning")}</div>${relatedDispute ? `<dl class="dispute-summary-context"><div><dt>Case</dt><dd>${escapeActivityText(relatedDispute.id)}</dd></div><div><dt>Category</dt><dd>${escapeActivityText(disputeTypeLabel(relatedDispute))}</dd></div><div><dt>Description</dt><dd>${escapeActivityText(relatedDispute.detail)}</dd></div></dl><a class="btn full-width" href="/disputes/${encodeURIComponent(relatedDispute.id)}">Open full dispute</a>` : '<p class="audit-note">This Quest is in QUEST_FAILED, but no Dispute Case record is linked. Review the record relationship before taking action.</p>'}</section>` : ""}
      <section class="section"><h3>Quest description</h3><p>${escapeActivityText(detail.description)}</p><div class="requirement-box"><strong>Completion requirements</strong><ul><li>Submit work before the recorded deadline</li><li>Attach verifiable proof files</li><li>Keep all payment inside KuQuest</li></ul></div></section>
      ${detail.giverAttachments.length ? `<section class="section"><div class="section-title"><h3>Files from hirer</h3><span class="section-count">${detail.giverAttachments.length}</span></div>${fileRows(detail.giverAttachments)}</section>` : ""}
      ${pendingQuestChanges[record.id] ? `<section class="section change-review"><div class="section-title"><h3>Pending hirer changes</h3>${badge("EDIT_REQUEST_PENDING", "warning")}</div><div class="change-warning">${ico("history")}<div><strong>Current accepted terms remain active</strong><p>This proposal does not change the participant’s agreement until both parties consent.</p></div></div><div class="change-meta"><div><span>Requested by</span><strong>${escapeActivityText(pendingQuestChanges[record.id].requestedBy)}</strong></div><div><span>Reason</span><strong>${escapeActivityText(pendingQuestChanges[record.id].reason)}</strong></div></div><div class="change-table"><div class="change-row change-head"><span>Field</span><span>Accepted value</span><span>Proposed value</span></div>${pendingQuestChanges[record.id].changes.map((change) => `<div class="change-row"><strong>${escapeActivityText(change[0])}</strong><span>${escapeActivityText(change[1])}</span><span>${escapeActivityText(change[2])}</span></div>`).join("")}</div><div class="response-block"><h3>Participant consent</h3>${participantConsentRows(pendingQuestChanges[record.id].responses)}</div><div class="change-oversight"><strong>Admin oversight only</strong><p>Do not approve or reject this edit. Intervene only if a participant files a dispute or the proposed terms violate marketplace policy.</p></div></section>` : ""}
      <section class="section"><div class="section-title"><h3>Hirer</h3>${giverProfileLink(detail, "View profile", "link")}</div>${giverProfile(detail)}</section>
      <section class="section"><h3>Schedule and location</h3><div class="facts"><div class="fact"><span>Starts</span><strong>${escapeActivityText(detail.schedule[0])}</strong></div><div class="fact"><span>Due</span><strong>${escapeActivityText(detail.schedule[1])}</strong></div><div class="fact"><span>Location</span><strong>${escapeActivityText(detail.location[0])}</strong><small>${escapeActivityText(detail.location[1])}</small></div></div></section>
      <section class="section"><div class="section-title"><h3>${participantSectionTitle(record, participants, started)}</h3><span class="section-count">${participants.length}</span></div>${relatedRows(participants)}</section>
      ${proofSubmissionsPanel(detail.proof, record)}
      <section class="section"><h3>Financial record</h3><div class="financial-line"><span>Quest Funding Total</span><strong>${questBahtLabel(record.fundingTotalSatang)}</strong></div><div class="financial-line"><span>Quest Reward</span><strong>${questBahtLabel(record.questRewardSatang)}</strong></div><div class="financial-line"><span>Platform Fee per Worker</span><strong>${questBahtLabel(record.platformFeeSatang)}</strong></div><div class="financial-line"><span>Platform Fee policy</span><strong>${typeof record.platformFeeBps === "number" ? questPercentLabel(record.platformFeeBps) : "Not provided by the Admin API"}</strong></div><p class="audit-note">Funds are held in the Funding Reservation until approval or Dispute Case resolution.</p></section>
      <section class="section"><h3>Overall quest timeline</h3>${timeline(detail.activity, { showDetails: false })}</section>
    </div>
    <div class="drawer-actions"><button class="btn" data-action="${hidden ? "Restore quest" : "Hide quest"}">${hidden ? "Restore quest" : "Hide quest"}</button><a class="btn" href="/quests/${encodeURIComponent(record.id)}">Full quest detail</a>${questState === "QUEST_FAILED" && relatedDispute ? `<a class="btn primary" href="/disputes/${encodeURIComponent(relatedDispute.id)}">Review dispute</a>` : ""}</div>`;
    const closeButton = drawer.querySelector<HTMLButtonElement>("#close");
    closeButton?.addEventListener("click", closeDrawer);
    scrim.addEventListener("click", closeDrawer, { once: true });
    const defaultFinancialNote = [...drawer.querySelectorAll<HTMLElement>(".section")]
      .find((section) => section.querySelector("h3")?.textContent === "Financial record")
      ?.querySelector<HTMLElement>(".audit-note");
    if (defaultFinancialNote) defaultFinancialNote.textContent = "Funds remain held until submitted proof is accepted or a dispute is resolved.";
    drawer.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action ?? "";
        confirmAction(action, record, "", (reason, reasonCode) => {
          const options = {
            idempotencyKey: newAdminIdempotencyKey(action, record.id),
            reason,
            reasonCode: reasonCode ?? "POLICY_REVIEW",
            ...(typeof record.version === "number" ? { expectedVersion: record.version } : {}),
          };
          const command = action === "Hide quest"
            ? adminCommands.hideQuest(record.id, options)
            : adminCommands.restoreQuest(record.id, {
              expectedVersion: options.expectedVersion,
              idempotencyKey: options.idempotencyKey,
              ...(reasonCode ? { reasonCode } : {}),
            });
          void command.then(() => {
            persistAdminData();
            refresh();
            toast(`${action} completed for ${record.id}.`);
            return undefined;
          }).catch((error: unknown) => {
            toast(`${action} failed: ${error instanceof Error ? error.message : "Request failed."}`);
          });
        });
      });
    });
    if (record.apiBacked && !record.questDetailLoaded && dependencies.hydrateQuest) {
      void dependencies.hydrateQuest(record).then(() => {
        if (drawer.classList.contains("open") && data.quests[index] === record) openQuestDrawer(index);
        return undefined;
      });
    }
  };

  return {
    pendingQuestChanges,
    questDetails,
    questHasStarted,
    participantsForQuest,
    participantSectionTitle,
    giverProfile,
    giverProfileLink,
    relatedRows,
    giverAttachmentsPanel,
    proofSubmissionsPanel,
    participantConsentRows,
    renderQuestEditHistory,
    openQuestDrawer,
  };
}
