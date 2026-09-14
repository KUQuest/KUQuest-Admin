"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { ApiError } from "../../../lib/api/client";
import { disputeRoutes, questRoutes } from "../admin-routes";
import {
  adminApi,
  type AdminQuestReasonCode,
} from "../api/admin-api";
import { canHideQuest, isQuestTerminal, type QuestState } from "../domain/rulebook";
import {
  formatQuestDate,
  formatQuestMoney,
  pageQuestRows,
  QUEST_BOARD_TABS,
  questMatchesTab,
  questMemberName,
  questPageCount,
  questStatusClass,
  searchQuestRows,
  sortQuestRows,
  type QuestBoardPageSize,
  type QuestBoardRow,
  type QuestBoardTab,
  type QuestDetailView,
  type QuestFinanceView,
  type QuestSortDirection,
  type QuestSortKey,
} from "./quest-model";
import type { QuestBoardPageData, QuestDetailPageData } from "./quest-service";

type QuestPresentation = "page" | "drawer";
type QuestCommand = "hide" | "restore" | "terminate";
type QuestCommandSubmission = {
  command: QuestCommand;
  reason: string;
  reasonCode: AdminQuestReasonCode;
};

type QuestDetailPageProps = {
  questId: string;
  presentation?: QuestPresentation;
  initialData: QuestDetailPageData;
};

const reasonCodes: Array<{ value: AdminQuestReasonCode; label: string }> = [
  { value: "POLICY_REVIEW", label: "Policy review" },
  { value: "SAFETY_REVIEW", label: "Safety review" },
];

function newIdempotencyKey(action: QuestCommand, questId: string): string {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-${action}-quest-${questId}-${id}`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 404) return "Quest was not found.";
  return error instanceof Error ? error.message : fallback;
}

function readableValue(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

type AdminQuestEditRequest = Extract<QuestDetailView["editHistory"][number], { kind: "EDIT_REQUEST" }>;

type QuestEditChange = {
  field: string;
  accepted: string;
  proposed: string;
};

function recordValue(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function editValueText(value: unknown): string {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const textValues = value
      .map((item) => recordValue(item)?.text)
      .filter((item): item is string => typeof item === "string");
    if (textValues.length === value.length) return textValues.join(" · ");
    return value.map(editValueText).join(" · ");
  }
  const objectValue = recordValue(value);
  if (!objectValue) return "Not provided";
  return Object.entries(objectValue)
    .map(([key, item]) => `${readableValue(key)}: ${editValueText(item)}`)
    .join("; ");
}

function currentQuestValue(detail: QuestDetailView, field: string): unknown {
  switch (field) {
    case "title": return detail.title;
    case "description": return detail.description;
    case "condition": return detail.condition.items.length ? detail.condition.items : detail.condition.text;
    case "startTime": return detail.startTime;
    case "dueAt": return detail.dueAt;
    case "proofRequired": return detail.proofRequired;
    case "locations": return detail.locations.map((location) => location.label);
    case "images": return detail.images?.map((image) => image.fileId);
    default: return "Current accepted value not provided by the Admin API.";
  }
}

function editChangesFor(detail: QuestDetailView, request: AdminQuestEditRequest): QuestEditChange[] {
  const proposed = recordValue(request.proposedChanges);
  if (!proposed) return [];

  if ("previousCondition" in proposed || "proposedCondition" in proposed) {
    return [{
      field: "Quest Condition",
      accepted: editValueText(proposed.previousCondition),
      proposed: editValueText(proposed.proposedCondition),
    }];
  }

  return Object.entries(proposed).map(([field, value]) => ({
    field: readableValue(field),
    accepted: editValueText(currentQuestValue(detail, field)),
    proposed: editValueText(value),
  }));
}

function Badge({ state }: { state: QuestState }) {
  return <span className={`badge ${questStatusClass(state)}`}>{readableValue(state.replace("QUEST_", ""))}</span>;
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {count !== undefined ? <span className="section-count">{count}</span> : null}
      </div>
      <div className="quest-detail-body">{children}</div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact"><span>{label}</span><strong>{children}</strong></div>;
}

function ListEmpty({ children }: { children: ReactNode }) {
  return <div className="submission-empty"><strong>{children}</strong></div>;
}

function QuestDetailContent({
  detail,
  finance,
  linkedDisputeId,
  disputeLookupError,
  onCommand,
  onOpenDispute,
  disputePending,
  disputeError,
  showFullDetailLink,
}: {
  detail: QuestDetailView;
  finance: QuestFinanceView | null;
  linkedDisputeId: string | null;
  disputeLookupError: string | null;
  onCommand: (command: QuestCommand) => void;
  onOpenDispute: (workerId: string) => void;
  disputePending: boolean;
  disputeError: string | null;
  showFullDetailLink: boolean;
}) {
  const state = detail.state;
  const hidden = Boolean(detail.hiddenAt);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const financeQuest = finance?.quest;
  const pendingHirerChange = detail.editHistory.find(
    (entry): entry is AdminQuestEditRequest => entry.kind === "EDIT_REQUEST" && entry.requestStatus === "EDIT_REQUEST_PENDING",
  );
  const pendingChanges = pendingHirerChange ? editChangesFor(detail, pendingHirerChange) : [];
  const fundingTotal = financeQuest?.questFundingTotalSatang ?? detail.questFundingTotalSatang;
  const reward = financeQuest?.rewardSatang ?? detail.rewardSatang;
  const platformFee = financeQuest?.platformFeePerWorkerSatang ?? detail.platformFeePerWorkerSatang;
  const timeline = detail.adminActions.length
    ? detail.adminActions.map((action) => ({
        id: action.id,
        title: readableValue(action.action),
        time: formatQuestDate(action.createdAt),
        detail: action.reasonCode ? readableValue(action.reasonCode) : "No reason code",
      }))
    : [{
        id: "current-state",
        title: readableValue(state.replace("QUEST_", "")),
        time: formatQuestDate(detail.updatedAt),
        detail: "Current Quest State recorded by the Admin API.",
      }];

  return (
    <div className="quest-detail-stack">
      <Section title="Quest summary">
        <div className="facts quest-detail-facts">
          <Fact label="Status"><Badge state={state} />{hidden ? <span className="badge neutral quest-hidden-overlay">Hidden</span> : null}</Fact>
          <Fact label="Quest Funding Total">{formatQuestMoney(fundingTotal)}</Fact>
          <Fact label="Participant mode">{detail.participation === "GROUP" ? "Team" : "Solo"}</Fact>
          <Fact label="Candidate mode">{detail.mode === "FIRST_COME_FIRST_SERVED" ? "First come, first served" : "Candidate"}</Fact>
          <Fact label="Quest ID">{detail.id}</Fact>
          <Fact label="API version">{detail.apiVersion}</Fact>
        </div>
      </Section>

      <Section title="Quest description">
        <p className="record-description">{detail.description || "No Quest description recorded by the Admin API."}</p>
        <div className="requirement-box">
          <strong>Quest Condition</strong>
          <p>{detail.condition.text || "No Quest Condition text recorded by the Admin API."}</p>
          {detail.condition.items.length ? (
            <ol>
              {detail.condition.items.map((item) => <li key={`${item.position}-${item.text}`}>{item.text}</li>)}
            </ol>
          ) : null}
        </div>
      </Section>

      <Section title="Hirer attachments" count={detail.images?.length ?? 0}>
        {detail.images === undefined ? (
          <p className="audit-note">Hirer attachments are not available from the Admin API.</p>
        ) : detail.images.length ? (
          <div className="related-list">
            {detail.images.map((image) => (
              <a
                className="file-row quest-attachment-link"
                href={image.url}
                key={image.imageId}
                rel="noreferrer"
                target="_blank"
              >
                <Image className="attachment-thumbnail" src={image.url} alt={`Hirer attachment ${image.position + 1}`} height={54} loading="lazy" unoptimized width={72} />
                <span>
                  <strong>Hirer attachment {image.position + 1}</strong>
                  <small>{image.fileId} · Link expires {formatQuestDate(image.urlExpiresAt)}</small>
                </span>
                <span>Open</span>
              </a>
            ))}
          </div>
        ) : <ListEmpty>No Hirer attachments were returned by the Admin API.</ListEmpty>}
      </Section>

      {pendingHirerChange ? (
        <Section title="Pending Hirer changes">
          <div className="change-warning">
            <div>
              <strong>Current accepted terms remain active</strong>
              <p>This proposal does not change the Worker agreement until every Active Worker consents.</p>
            </div>
          </div>
          <div className="change-meta">
            <div><span>Status</span><strong>{pendingHirerChange.requestStatus}</strong></div>
            <div><span>Requested by</span><strong>{pendingHirerChange.requestedByUserId === detail.hirer.id ? `${questMemberName(detail.hirer)} · Hirer` : pendingHirerChange.requestedByUserId ?? "Hirer not provided by the Admin API."}</strong></div>
            <div><span>Requested at</span><strong>{formatQuestDate(pendingHirerChange.createdAt)}</strong></div>
            <div><span>Expires at</span><strong>{formatQuestDate(pendingHirerChange.expiresAt)}</strong></div>
          </div>
          {pendingChanges.length ? (
            <div className="change-table">
              <div className="change-row change-head"><span>Field</span><span>Accepted value</span><span>Proposed value</span></div>
              {pendingChanges.map((change) => (
                <div className="change-row" key={change.field}>
                  <strong>{change.field}</strong>
                  <span>{change.accepted}</span>
                  <span>{change.proposed}</span>
                </div>
              ))}
            </div>
          ) : <p className="audit-note">The Admin API did not return the proposed changes.</p>}
          <div className="response-block">
            <h3>Participant consent</h3>
            {pendingHirerChange.responses.length ? (
              <div className="response-table">
                <div className="response-row response-head"><span>Worker</span><span>Status</span></div>
                {pendingHirerChange.responses.map((response) => {
                  const worker = detail.assignments.find((assignment) => assignment.worker.id === response.workerId)?.worker;
                  return (
                    <div className="response-row" key={response.workerId}>
                      <span><strong>{worker ? questMemberName(worker) : response.workerId}</strong><small>{response.reason ?? "No response reason"}</small></span>
                      <span className="response-status">{response.decision ?? "Pending"}</span>
                    </div>
                  );
                })}
              </div>
            ) : <ListEmpty>No Worker responses were returned by the Admin API.</ListEmpty>}
          </div>
        </Section>
      ) : null}

      <Section title="Hirer">
        <div className="hirer-profile-summary">
          <strong>{questMemberName(detail.hirer)}</strong>
          <span>{detail.hirer.email}</span>
        </div>
      </Section>

      <Section title="Schedule and location">
        <div className="facts">
          <Fact label="Starts">{formatQuestDate(detail.startTime)}</Fact>
          <Fact label="Due">{formatQuestDate(detail.dueAt)}</Fact>
        </div>
        <div className="quest-detail-list-block">
          <span className="fact-label">Location</span>
          <strong className="quest-detail-list-value">
            {detail.locations.length
              ? detail.locations.map((location) => location.label || "Location label not provided by the Admin API.").join(" · ")
              : "Location not provided by the Admin API."}
          </strong>
        </div>
      </Section>

      <Section
        title="Candidates and Assignments"
        count={detail.candidates.applications.length + detail.candidates.teams.length + detail.assignments.length}
      >
        {detail.candidates.applications.length ? (
          <div className="related-list">
            {detail.candidates.applications.map((application) => (
              <div className="related-row" key={application.id}>
                <span><strong>{questMemberName(application.worker)}</strong><small>Candidate · {readableValue(application.applicationStatus)}</small></span>
                <span>{formatQuestDate(application.appliedAt)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {detail.candidates.teams.length ? (
          <div className="related-list quest-detail-list-gap">
            {detail.candidates.teams.map((team) => (
              <div className="related-row" key={team.id}>
                <span><strong>{team.name}</strong><small>Candidate Team · {readableValue(team.teamStatus)} · {team.members.length} member{team.members.length === 1 ? "" : "s"}</small></span>
                <span>{formatQuestDate(team.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {detail.assignments.length ? (
          <div className="related-list quest-detail-list-gap">
            {detail.assignments.map((assignment) => (
              <div className="related-row" key={assignment.id}>
                <span><strong>{questMemberName(assignment.worker)}</strong><small>Assignment · {readableValue(assignment.assignmentStatus)}</small></span>
                <span>{assignment.startedAt ? `Started ${formatQuestDate(assignment.startedAt)}` : "Not started"}</span>
              </div>
            ))}
          </div>
        ) : null}
        {!detail.candidates.applications.length && !detail.candidates.teams.length && !detail.assignments.length ? <ListEmpty>No Candidates, Candidate Teams, or Assignments returned by the Admin API.</ListEmpty> : null}
      </Section>

      <Section title="Proof Submissions" count={detail.proofSubmissions.length}>
        {detail.proofSubmissions.length ? (
          <div className="related-list">
            {detail.proofSubmissions.map((submission) => (
              <div className="related-row" key={submission.id}>
                <span><strong>{submission.worker ? questMemberName(submission.worker) : questMemberName(submission.submittedBy)}</strong><small>{readableValue(submission.submissionStatus)} · {formatQuestDate(submission.submittedAt)}</small><small>{submission.content || "No proof description."}</small></span>
                <span>{submission.files.length} file{submission.files.length === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        ) : <ListEmpty>No Proof Submissions returned by the Admin API.</ListEmpty>}
      </Section>

      <Section title="Financial record">
        <div className="financial-line"><span>Quest Funding Total</span><strong>{formatQuestMoney(fundingTotal)}</strong></div>
        <div className="financial-line"><span>Quest Reward</span><strong>{formatQuestMoney(reward)}</strong></div>
        <div className="financial-line"><span>Platform Fee per Worker</span><strong>{formatQuestMoney(platformFee)}</strong></div>
        <div className="financial-line"><span>Platform Fee policy</span><strong>{detail.platformFeeBps === null ? "Not provided by the Admin API" : `${detail.platformFeeBps / 100}%`}</strong></div>
        {finance?.reservation ? (
          <>
            <div className="financial-line"><span>Funding Reservation</span><strong>{readableValue(finance.reservation.status)}</strong></div>
            <div className="financial-line"><span>Reserved</span><strong>{formatQuestMoney(finance.reservation.totalReservedSatang)}</strong></div>
            <div className="financial-line"><span>Remaining</span><strong>{formatQuestMoney(finance.reservation.remainingSatang)}</strong></div>
          </>
        ) : <p className="audit-note">No Funding Reservation was returned by the Finance API.</p>}
        {finance?.transfers.length ? (
          <div className="quest-finance-list">
            <h3>Money movements</h3>
            {finance.transfers.map((transfer) => <div className="financial-line" key={transfer.id}><span>{readableValue(transfer.type)}<small>{formatQuestDate(transfer.occurredAt)}</small></span><strong>{formatQuestMoney(transfer.amountSatang)}</strong></div>)}
          </div>
        ) : null}
        {finance?.ledgerTransactions.length ? (
          <div className="quest-finance-list">
            <h3>Ledger Transactions</h3>
            <ul className="related-list quest-ledger-list">
              {finance.ledgerTransactions.map((transaction) => (
                <li className="related-row" key={transaction.id}>
                  <span>
                    <strong>{readableValue(transaction.eventType)}</strong>
                    <small>{formatQuestDate(transaction.createdAt)} · {transaction.businessReference || "Business reference not provided by the Finance API."}</small>
                    <small>{transaction.description || "Description not provided by the Finance API."}</small>
                  </span>
                  <span>{transaction.postings.length} Ledger Posting{transaction.postings.length === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : finance ? <p className="audit-note">No Ledger Transactions were returned by the Finance API.</p> : null}
        {!finance ? <p className="audit-note">Quest finance data is not available from the Admin API.</p> : null}
      </Section>

      <Section title="Quest edit history" count={detail.editHistory.length}>
        {detail.editHistory.length ? (
          <div className="related-list">
            {detail.editHistory.map((entry) => {
              const detailLabel = entry.kind === "FIELD_EDIT"
                ? `Field · ${entry.fieldName}`
                : `Request · ${readableValue(entry.requestStatus)}`;
              const editedAt = entry.kind === "FIELD_EDIT" ? entry.editedAt : entry.createdAt;
              return (
                <div className="related-row" key={entry.id}>
                  <span><strong>{readableValue(entry.kind)}</strong><small>{detailLabel}</small></span>
                  <span>{formatQuestDate(editedAt)}</span>
                </div>
              );
            })}
          </div>
        ) : <ListEmpty>No Quest edits returned by the Admin API.</ListEmpty>}
      </Section>

      <Section title="Dispute and risk">
        {disputeLookupError ? (
          <p className="field-error" role="alert">{disputeLookupError}</p>
        ) : linkedDisputeId ? (
          <>
            <p>A Dispute Case is linked to this Quest.</p>
            <Link className="btn primary full-width" href={disputeRoutes.detail(linkedDisputeId)}>Open Dispute Case</Link>
          </>
        ) : state === "QUEST_FAILED" ? (
          <>
            <p className="audit-note">This Quest is in QUEST_FAILED, but no linked Dispute Case was returned by the Admin API.</p>
            {detail.assignments.length ? (
              <form
                className="dispute-open-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (selectedWorkerId) onOpenDispute(selectedWorkerId);
                }}
              >
                <label htmlFor="quest-dispute-worker">Worker
                  <select
                    id="quest-dispute-worker"
                    name="workerId"
                    value={selectedWorkerId}
                    onChange={(event) => setSelectedWorkerId(event.target.value)}
                    required
                    disabled={disputePending}
                  >
                    <option value="">Select an assigned Worker</option>
                    {detail.assignments.map((assignment) => (
                      <option key={assignment.worker.id} value={assignment.worker.id}>
                        {questMemberName(assignment.worker)}
                      </option>
                    ))}
                  </select>
                </label>
                {disputeError ? <p className="field-error" role="alert">{disputeError}</p> : null}
                <button className="btn primary dispute-open-submit" type="submit" disabled={disputePending}>
                  {disputePending ? "Opening Dispute Case…" : "Open Dispute Case"}
                </button>
                <p className="audit-note">Select the assigned Worker for this failed Quest.</p>
              </form>
            ) : <p className="audit-note">No assigned Worker was returned by the Admin API.</p>}
          </>
        ) : <p className="audit-note">No linked Dispute Case was returned by the Admin API.</p>}
      </Section>

      <Section title="Overall Quest timeline" count={timeline.length}>
        <ol className="timeline">
          {timeline.map((entry) => <li key={entry.id}><strong>{entry.title}</strong><time>{entry.time}</time><span>{entry.detail}</span></li>)}
        </ol>
      </Section>

      <div className="quest-command-actions">
        {showFullDetailLink ? <a className="btn quest-full-detail-link" href={questRoutes.detail(detail.id)}>Full Quest detail</a> : null}
        {!hidden && canHideQuest(state) ? <button className="btn" type="button" onClick={() => onCommand("hide")}>Hide Quest</button> : null}
        {hidden ? <button className="btn" type="button" onClick={() => onCommand("restore")}>Restore Quest</button> : null}
        {!isQuestTerminal(state) ? <button className="btn danger" type="button" onClick={() => onCommand("terminate")}>Terminate Quest</button> : null}
      </div>
    </div>
  );
}

function QuestCommandDialog({
  command,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  command: QuestCommand;
  onCancel: () => void;
  onSubmit: (submission: QuestCommandSubmission) => void;
  error: string | null;
  pending: boolean;
}) {
  const needsReason = true;
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState<AdminQuestReasonCode | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsReason && reason.trim().length < 8) {
      setValidationError("Enter at least 8 characters for the reason.");
      return;
    }
    if (!reasonCode) {
      setValidationError("Select a reason code.");
      return;
    }
    onSubmit({ command, reason: reason.trim(), reasonCode });
  }

  return (
    <div className="quest-command-layer" role="presentation">
      <button className="quest-command-backdrop" type="button" aria-label="Close command dialog" onClick={onCancel} />
      <dialog open className="quest-command-dialog" aria-labelledby="quest-command-title">
        <form onSubmit={submit}>
          <h2 id="quest-command-title">{command === "hide" ? "Hide Quest" : command === "restore" ? "Restore Quest" : "Terminate Quest"}</h2>
          <p>{command === "terminate" ? "This changes the Quest to QUEST_CANCELLED and preserves the Admin Action." : "The API Server remains the authority for this Quest action."}</p>
          {needsReason ? <label htmlFor="quest-command-reason">Reason<textarea id="quest-command-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} /></label> : null}
          <label htmlFor="quest-command-reason-code">Reason code{needsReason ? " *" : ""}<select id="quest-command-reason-code" value={reasonCode} onChange={(event) => setReasonCode(event.target.value as AdminQuestReasonCode | "")}><option value="">{needsReason ? "Select a reason code" : "No reason code"}</option>{reasonCodes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          {validationError || error ? <p className="field-error" role="alert">{validationError || error}</p> : null}
          <div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={pending}>Cancel</button><button className={`btn ${command === "terminate" ? "danger" : "primary"}`} type="submit" disabled={pending}>{pending ? "Saving…" : "Confirm"}</button></div>
        </form>
      </dialog>
    </div>
  );
}

export function QuestDetailPage({ questId, presentation = "page", initialData }: QuestDetailPageProps) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const restoreDrawerFocusRef = useRef(false);
  const [detail, setDetail] = useState<QuestDetailView>(initialData.detail);
  const [finance, setFinance] = useState<QuestFinanceView | null>(initialData.finance);
  const [linkedDisputeId, setLinkedDisputeId] = useState<string | null>(initialData.linkedDisputeId);
  const [disputeLookupError, setDisputeLookupError] = useState<string | null>(initialData.disputeLookupError);
  const [command, setCommand] = useState<QuestCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputePending, setDisputePending] = useState(false);

  useEffect(() => {
    setDetail(initialData.detail);
    setFinance(initialData.finance);
    setLinkedDisputeId(initialData.linkedDisputeId);
    setDisputeLookupError(initialData.disputeLookupError);
    setDisputeError(null);
  }, [initialData]);

  useEffect(() => {
    if (presentation !== "drawer") return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const activeElement = document.activeElement;
    const triggerElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-quest-drawer-trigger]"),
    ).filter((element) => element.dataset.questDrawerTrigger === questId);
    drawerOpenerRef.current =
      activeElement instanceof HTMLElement && activeElement.dataset.questDrawerTrigger === questId
        ? activeElement
        : triggerElements.find((element) => element.tagName === "A") ?? triggerElements[0] ?? null;
    restoreDrawerFocusRef.current = false;

    const shell = drawer.closest<HTMLElement>(".admin-shell");
    const outsideElements = shell
      ? Array.from(shell.children).filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement &&
            element !== drawer &&
            !element.classList.contains("scrim"),
        )
      : [];
    const previousInert = outsideElements.map((element) => element.inert);
    outsideElements.forEach((element) => {
      element.inert = true;
    });

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () =>
      Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0,
      );

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector(".quest-command-dialog")) return;
        event.preventDefault();
        restoreDrawerFocusRef.current = true;
        router.back();
        return;
      }
      if (event.key !== "Tab" || document.querySelector(".quest-command-dialog")) return;

      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus({ preventScroll: true });
        return;
      }

      const currentElement = document.activeElement;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (currentElement === drawer || currentElement === first || !drawer.contains(currentElement))) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (currentElement === last || !drawer.contains(currentElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    const markBrowserClose = () => {
      restoreDrawerFocusRef.current = true;
    };

    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("popstate", markBrowserClose);
    drawer.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("popstate", markBrowserClose);
      outsideElements.forEach((element, index) => {
        element.inert = previousInert[index] ?? false;
      });
      if (restoreDrawerFocusRef.current && drawerOpenerRef.current?.isConnected) {
        requestAnimationFrame(() => drawerOpenerRef.current?.focus({ preventScroll: true }));
      }
    };
  }, [presentation, questId, router]);

  function openCommand(nextCommand: QuestCommand) {
    setCommandError(null);
    setCommand(nextCommand);
  }

  function closeDrawer() {
    restoreDrawerFocusRef.current = true;
    router.back();
  }

  async function openDispute(workerId: string) {
    if (linkedDisputeId || disputeLookupError || disputePending || detail.state !== "QUEST_FAILED") return;
    if (!detail.assignments.some((assignment) => assignment.worker.id === workerId)) return;
    const worker = detail.assignments.find((assignment) => assignment.worker.id === workerId)?.worker;
    if (!worker || !window.confirm(`Open a Dispute Case for ${questMemberName(worker)}?`)) return;

    setDisputeError(null);
    setDisputePending(true);
    try {
      const result = await adminApi.openDispute(detail.id, { workerId });
      setLinkedDisputeId(result.id);
      if (presentation === "drawer") closeDrawer();
    } catch (openError: unknown) {
      setDisputeError(errorMessage(openError, "Dispute Case could not be opened."));
    } finally {
      setDisputePending(false);
    }
  }

  async function submitCommand(submission: QuestCommandSubmission) {
    if (!detail || !command || command !== submission.command) return;
    setCommandError(null);
    setCommandPending(true);
    const options = {
      idempotencyKey: newIdempotencyKey(submission.command, detail.id),
      expectedVersion: detail.version,
    };
    try {
      if (submission.command === "hide") {
        await adminApi.hideQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
      } else if (submission.command === "restore") {
        await adminApi.restoreQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
      } else {
        await adminApi.terminateQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
      }
      setCommand(null);
      router.refresh();
    } catch (commandErrorValue: unknown) {
      setCommandError(errorMessage(commandErrorValue, "Quest command failed."));
    } finally {
      setCommandPending(false);
    }
  }

  const content = <QuestDetailContent detail={detail} finance={finance} linkedDisputeId={linkedDisputeId} disputeLookupError={disputeLookupError} onCommand={openCommand} onOpenDispute={openDispute} disputePending={disputePending} disputeError={disputeError} showFullDetailLink={presentation === "drawer"} />;

  if (presentation === "drawer") {
    return (
      <>
        <button className="scrim" type="button" tabIndex={-1} aria-label="Close Quest detail" onClick={closeDrawer} />
        <dialog
          ref={drawerRef}
          className="drawer open quest-drawer"
          aria-modal="true"
          aria-labelledby="quest-drawer-title"
          tabIndex={-1}
          open
        >
          <div className="drawer-top"><div><strong id="quest-drawer-title">{detail.title}</strong><small>Quest {questId} · Quest detail drawer</small></div><button className="icon" type="button" aria-label="Close Quest detail" onClick={closeDrawer}><span className="close-lines" /></button></div>
          <div className="drawer-body">{content}</div>
        </dialog>
        {command ? <QuestCommandDialog command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page quest-detail-page" tabIndex={-1}>
      <div className="page-head"><div><p className="admin-route-kicker">Quest</p><h1>{detail.title}</h1><p>Created by {questMemberName(detail.hirer)}</p></div><Link className="btn" href={questRoutes.list()}>Back to Quests</Link></div>
      <div className="quest-detail-grid">{content}</div>
      {command ? <QuestCommandDialog command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
    </main>
  );
}

export function AdminQuestPage({ initialData }: { initialData: QuestBoardPageData }) {
  const router = useRouter();
  const [rows, setRows] = useState<QuestBoardRow[]>(initialData.rows);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<QuestBoardTab>("all");
  const [pageSize, setPageSize] = useState<QuestBoardPageSize>(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<QuestSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<QuestSortDirection>("descending");
  useEffect(() => {
    setRows(initialData.rows);
  }, [initialData]);

  const filteredRows = searchQuestRows(rows, query).filter((row) => questMatchesTab(row, tab));
  const sortedRows = sortQuestRows(filteredRows, sortKey, sortDirection);
  const totalPages = questPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visibleRows = pageQuestRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  function chooseTab(nextTab: QuestBoardTab) { setTab(nextTab); setPage(1); }
  function choosePageSize(nextSize: QuestBoardPageSize) { setPageSize(nextSize); setPage(1); }
  function sortBy(nextKey: QuestSortKey) {
    setPage(1);
    if (sortKey === nextKey) setSortDirection((direction) => direction === "ascending" ? "descending" : "ascending");
    else { setSortKey(nextKey); setSortDirection("ascending"); }
  }

  return (
    <main className="admin-route-page quest-route-page" tabIndex={-1}>
      <div className="page-head"><div><p className="admin-route-kicker">KUQuest Admin</p><h1>Quests</h1><p>Review Quests through every Quest State.</p></div></div>
      <section className="panel quest-board" aria-label="Quest board">
        <div className="tabs" aria-label="Quest filters">{QUEST_BOARD_TABS.map((item) => <button className={`tab${tab === item.id ? " active" : ""}`} type="button" aria-pressed={tab === item.id} key={item.id} onClick={() => chooseTab(item.id)}>{item.label}{item.id === "all" ? ` (${rows.length})` : ""}</button>)}</div>
        <div className="toolbar resource-toolbar"><label className="inline-search search-field" htmlFor="quest-search"><span className="visually-hidden">Search Quests</span><input id="quest-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search Quests…" autoComplete="off" /></label><span className="sort-help">Click a column to sort</span><div className="page-size-controls">{([10, 25, 50, "all"] as const).map((size) => <button className={`page-size-button${pageSize === size ? " active" : ""}`} type="button" key={size} onClick={() => choosePageSize(size)}>{size === "all" ? "Show all" : `Show ${size}`}</button>)}</div><span className="count" aria-live="polite">Showing {pageStart}–{pageEnd} of {sortedRows.length} results</span></div>
        {!sortedRows.length ? <div className="empty"><h2>No matching records</h2><p>There are no Quests in this view.</p><button className="btn" type="button" onClick={() => { setQuery(""); setTab("all"); }}>Reset view</button></div> : <div className="table-wrap" aria-label="quests table"><table className="data"><caption>Quests</caption><thead><tr><SortableHeader label="Quest" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Title" sortKey="title" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Hirer" sortKey="hirer" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Created At" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Quest Reward" sortKey="reward" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="quest-row" data-quest-id={row.id} data-quest-drawer-trigger={row.id} key={row.id} tabIndex={0} aria-label={`Open Quest ${row.title}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; void router.push(questRoutes.detail(row.id)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void router.push(questRoutes.detail(row.id)); } }}><td><Link className="row-record-button" data-quest-drawer-trigger={row.id} href={questRoutes.detail(row.id)} aria-label={`Open Quest ${row.displayId}`}>{row.displayId}</Link></td><td><Link className="row-record-button quest-title-link" data-quest-drawer-trigger={row.id} href={questRoutes.detail(row.id)} aria-label={`Open Quest ${row.title}`}><strong>{row.title}</strong><small>{row.participationLabel} · {row.modeLabel}</small></Link></td><td><strong>{row.hirerName}</strong><small>{row.hirerEmail}</small></td><td>{formatQuestDate(row.createdAt)}</td><td className="money">{formatQuestMoney(row.rewardSatang)}</td><td><span className={`badge ${questStatusClass(row.state)}`}>{row.stateLabel}</span>{row.hiddenAt ? <span className="badge neutral quest-hidden-overlay">Hidden</span> : null}</td></tr>)}</tbody></table></div>}
        {sortedRows.length ? <div className="table-pagination"><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="page-indicator">Page {currentPage} of {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div> : null}
      </section>
    </main>
  );
}

function SortableHeader({ label, sortKey, activeKey, direction, onSort }: { label: string; sortKey: QuestSortKey; activeKey: QuestSortKey; direction: QuestSortDirection; onSort: (key: QuestSortKey) => void }) {
  return <th aria-sort={activeKey === sortKey ? direction : "none"}><button className={`table-sort${activeKey === sortKey ? " is-active" : ""}`} type="button" onClick={() => onSort(sortKey)}>{label}<span className="sort-indicator" aria-hidden="true">{activeKey === sortKey && direction === "ascending" ? "↑" : "↓"}</span></button></th>;
}
