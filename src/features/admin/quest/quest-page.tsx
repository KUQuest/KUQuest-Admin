"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ApiError } from "../../../lib/api/client";
import { AdminActionReceipt, AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminRecordHeader } from "../../../components/admin/admin-record-header";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Badge as UiBadge, Button as UiButton, Card, CardContent, CardHeader, CardTitle, Input, PageSizeControls, Pagination, Table, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { disputeRoutes, questRoutes } from "../admin-routes";
import {
  adminApi,
  type AdminQuestReasonCode,
} from "../api/admin-api";
import { canHideQuest, isQuestTerminal, questStateLabel, type QuestState } from "../domain/rulebook";
import {
  formatQuestDate,
  formatQuestMoney,
  pageQuestRows,
  QUEST_BOARD_TABS,
  questMatchesTab,
  questMemberName,
  questPageCount,
  questDisplayIdFor,
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
import {
  applyMockQuestCommand,
  applyMockQuestOverride,
  questMockOverrideFromDetail,
  readMockQuestOverride,
  saveMockQuestOverride,
} from "./quest-mock-state";

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
  dataSource: "api" | "mock";
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

function readableFieldName(value: string): string {
  return readableValue(value.replace(/([a-z])([A-Z])/g, "$1 $2"));
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
    default: return "Previous value not provided.";
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
  const { translateText } = useAdminShell();
  return <UiBadge tone="neutral" className={`badge ${questStatusClass(state)}`}>{translateText(readableValue(state.replace("QUEST_", "")))}</UiBadge>;
}

function Section({ title, count, children, variant = "panel" }: { title: string; count?: number; children: ReactNode; variant?: "panel" | "record" }) {
  const { translateText } = useAdminShell();
  const isRecord = variant === "record";
  return (
    <Card as="section" className={isRecord ? "record-panel p-[18px]" : "panel"}>
      <CardHeader flush className={isRecord ? "record-panel-head" : "panel-head"}>
        <CardTitle>{translateText(title)}</CardTitle>
        {count !== undefined ? <span className="section-count">{count}</span> : null}
      </CardHeader>
      <CardContent flush className={isRecord ? "quest-record-body" : "p-[18px]"}>{children}</CardContent>
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  const { translateText } = useAdminShell();
  return <div className="fact"><span>{translateText(label)}</span><strong>{children}</strong></div>;
}

function questCandidateCount(detail: QuestDetailView): number {
  return detail.assignments.length > 0
    ? detail.assignments.length
    : detail.candidates.applications.length + detail.candidates.teams.length;
}

function ListEmpty({ children }: { children: ReactNode }) {
  const { translateText } = useAdminShell();
  return <div className="submission-empty"><strong>{typeof children === "string" ? translateText(children) : children}</strong></div>;
}

function QuestRecordAlert({ detail }: { detail: QuestDetailView }) {
  const { translateText } = useAdminShell();
  const stateLabel = readableValue(detail.state.replace("QUEST_", ""));
  const hidden = Boolean(detail.hiddenAt);
  const failed = detail.state === "QUEST_FAILED";
  const message = hidden
    ? translateText("This Quest is hidden from public discovery. Review the Quest record before restoring it.")
    : failed
      ? translateText("This Quest is failed. Review the Dispute Case, Proof Submissions, and Funding Reservation before taking action.")
      : translateText("Review the Quest Condition, participants, Proof Submissions, and funding before taking action.");

  return (
    <AdminStatusAlert
      tone={failed || hidden ? "danger" : "success"}
      title={`${translateText("Quest State:")} ${translateText(stateLabel)}`}
      description={message}
      badge={translateText(stateLabel)}
      badgeClassName={questStatusClass(detail.state)}
      className="dispute-page-alert quest-page-alert"
    />
  );
}

function QuestFinancialSection({
  finance,
  fundingTotal,
  reward,
  platformFee,
  platformFeeBps,
  variant,
}: {
  finance: QuestFinanceView | null;
  fundingTotal: number | null;
  reward: number | null;
  platformFee: number | null;
  platformFeeBps: number | null;
  variant: "panel" | "record";
}) {
  const { translateText } = useAdminShell();
  return (
    <Section title={translateText("Financial record")} variant={variant}>
      <div className="financial-line"><span>{translateText("Quest Funding Total")}</span><strong>{formatQuestMoney(fundingTotal)}</strong></div>
      <div className="financial-line"><span>{translateText("Quest Reward")}</span><strong>{formatQuestMoney(reward)}</strong></div>
      <div className="financial-line"><span>{translateText("Platform Fee per Worker")}</span><strong>{formatQuestMoney(platformFee)}</strong></div>
      <div className="financial-line"><span>{translateText("Platform Fee policy")}</span><strong>{platformFeeBps === null ? translateText("Not provided") : `${platformFeeBps / 100}%`}</strong></div>
      {finance?.transfers.length ? (
        <div className="quest-finance-list">
          <h3>{translateText("Money movements")}</h3>
          {finance.transfers.map((transfer) => <div className="financial-line" key={transfer.id}><span>{translateText(readableValue(transfer.type))}<small>{formatQuestDate(transfer.occurredAt)}</small></span><strong>{formatQuestMoney(transfer.amountSatang)}</strong></div>)}
        </div>
      ) : null}
      {!finance ? <p className="audit-note">{translateText("Quest finance data is not available.")}</p> : null}
    </Section>
  );
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
  recordLayout = false,
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
  recordLayout?: boolean;
}) {
  const { translateText } = useAdminShell();
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
  const statusTimeline = detail.timeline
    .filter((entry) => entry.status !== null)
    .map((entry, index, entries) => {
      const previousStatus = entries[index - 1]?.status;
      const status = entry.status as string;
      const statusLabel = readableValue(status.replace("QUEST_", ""));
      const previousLabel = previousStatus ? readableValue(previousStatus.replace("QUEST_", "")) : null;
      const transition = previousLabel && previousLabel !== statusLabel
        ? `${previousLabel} → ${statusLabel}`
        : statusLabel;
      const detailText = [
        readableValue(entry.event),
        entry.reasonCode ? `${translateText("Reason code:")} ${translateText(readableValue(entry.reasonCode))}` : null,
        entry.actorId ? `${translateText("Actor:")} ${entry.actorId}` : null,
      ].filter(Boolean).join(" · ");
      return {
        id: `${entry.event}-${entry.occurredAt}-${index}`,
        title: transition,
        time: formatQuestDate(entry.occurredAt),
        detail: detailText || translateText("Quest State recorded."),
      };
    });
  const timeline = statusTimeline.length
    ? statusTimeline
    : [{
        id: "current-state",
        title: readableValue(state.replace("QUEST_", "")),
        time: formatQuestDate(detail.updatedAt),
        detail: translateText("Quest State history is not provided."),
      }];
  const hasAcceptedRoster = detail.assignments.length > 0;
  const candidateApplications = hasAcceptedRoster ? [] : detail.candidates.applications;
  const candidateTeams = hasAcceptedRoster ? [] : detail.candidates.teams;
  const candidateCount = questCandidateCount(detail);
  const sectionVariant = recordLayout ? "record" : "panel";
  const disputeRiskContent = disputeLookupError ? (
    <p className="field-error" role="alert">{translateText(disputeLookupError)}</p>
  ) : linkedDisputeId ? (
    <>
      <p>{translateText("A Dispute Case is linked to this Quest.")}</p>
      <UiButton asChild variant="primary" className="w-full"><Link href={disputeRoutes.detail(linkedDisputeId)}>{translateText("Open Dispute Case")}</Link></UiButton>
    </>
  ) : state === "QUEST_FAILED" ? (
    <>
      <p className="audit-note">{translateText("This Quest is Failed, but no linked Dispute Case was returned.")}</p>
      {detail.assignments.length ? (
        <form
          className="dispute-open-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedWorkerId) onOpenDispute(selectedWorkerId);
          }}
        >
          <label htmlFor="quest-dispute-worker">{translateText("Worker")}
            <select
              id="quest-dispute-worker"
              name="workerId"
              value={selectedWorkerId}
              onChange={(event) => setSelectedWorkerId(event.target.value)}
              required
              disabled={disputePending}
            >
              <option value="">{translateText("Select an assigned Worker")}</option>
              {detail.assignments.map((assignment) => (
                <option key={assignment.worker.id} value={assignment.worker.id}>
                  {questMemberName(assignment.worker)}
                </option>
              ))}
            </select>
          </label>
          {disputeError ? <p className="field-error" role="alert">{translateText(disputeError)}</p> : null}
          <UiButton variant="primary" className="dispute-open-submit" type="submit" disabled={disputePending}>
            {disputePending ? translateText("Opening Dispute Case…") : translateText("Open Dispute Case")}
          </UiButton>
          <p className="audit-note">{translateText("Select the assigned Worker for this failed Quest.")}</p>
        </form>
      ) : <p className="audit-note">{translateText("No assigned Worker was returned.")}</p>}
    </>
  ) : <p className="audit-note">{translateText("No linked Dispute Case was returned.")}</p>;

  return (
    <div className={`drawer-content-flow ${recordLayout ? "grid items-start gap-[18px] !grid-cols-[minmax(0,1.65fr)_minmax(290px,0.72fr)] max-[1000px]:!grid-cols-1" : "grid !grid-cols-1 gap-[18px]"}`}>
      <div className={recordLayout ? "grid min-w-0 !grid-cols-1 gap-[18px]" : "contents"}>
      <Section title="Quest summary" variant={sectionVariant}>
        <div className="facts quest-detail-facts">
          <Fact label="Status"><Badge state={state} />{hidden ? <span className="badge neutral quest-hidden-overlay">{translateText("Hidden")}</span> : null}</Fact>
          <Fact label="Quest Funding Total">{formatQuestMoney(fundingTotal)}</Fact>
          <Fact label="Participant mode">{translateText(detail.participation === "GROUP" ? "Team" : "Solo")}</Fact>
          <Fact label="Candidate mode">{translateText(detail.mode === "FIRST_COME_FIRST_SERVED" ? "First come, first served" : "Candidate")}</Fact>
          <Fact label="Quest ID">{questDisplayIdFor(detail.id, detail.displayId)}</Fact>
        </div>
        <div className="quest-description-block mt-[18px] border-t border-admin-border pt-[18px]">
          <h3 className="m-0 mb-[10px] text-[14px]">{translateText("Quest description")}</h3>
          <p className="record-description">{detail.description || translateText("No Quest description recorded.")}</p>
          <div className="requirement-box">
            <strong>{translateText("Quest Condition")}</strong>
            <p>{detail.condition.text || translateText("No Quest Condition text recorded.")}</p>
            {detail.condition.items.length ? (
              <ol>
                {detail.condition.items.map((item) => <li key={`${item.position}-${item.text}`}>{item.text}</li>)}
              </ol>
            ) : null}
          </div>
        </div>
        {!recordLayout ? <div className="quest-summary-context mt-[18px] grid !grid-cols-2 gap-x-6 gap-y-[18px] border-t border-admin-border pt-[18px] max-[600px]:!grid-cols-1">
          <div className="quest-summary-context-section min-w-0">
            <h3 className="m-0 mb-[10px] text-[14px]">{translateText("Hirer")}</h3>
            <div className="hirer-profile-summary">
              <strong>{questMemberName(detail.hirer)}</strong>
              <span>{detail.hirer.email}</span>
            </div>
          </div>

          <div className="quest-summary-context-section min-w-0">
            <h3 className="m-0 mb-[10px] text-[14px]">{translateText("Schedule and location")}</h3>
            <div className="facts">
              <Fact label="Starts">{formatQuestDate(detail.startTime)}</Fact>
              <Fact label="Due">{formatQuestDate(detail.dueAt)}</Fact>
            </div>
            <div className="quest-detail-list-block">
              <span className="fact-label">{translateText("Location")}</span>
              <strong className="quest-detail-list-value">
                {detail.locations.length
                  ? detail.locations.map((location) => location.label || translateText("Location label not provided.")).join(" · ")
                  : translateText("Location not provided.")}
              </strong>
            </div>
          </div>

        </div> : null}
      </Section>

      <Section title="Hirer attachments" count={detail.images?.length ?? 0} variant={sectionVariant}>
        {detail.images === undefined ? (
          <p className="audit-note">{translateText("Hirer attachments are not available.")}</p>
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
                <Image className="attachment-thumbnail" src={image.url} alt={`${translateText("Hirer attachment")} ${image.position + 1}`} height={54} loading="lazy" unoptimized width={72} />
                <span>
                  <strong>{translateText("Hirer attachment")} {image.position + 1}</strong>
                  <small>{image.fileId} · {translateText("Link expires")} {formatQuestDate(image.urlExpiresAt)}</small>
                </span>
                <span>{translateText("Open")}</span>
              </a>
            ))}
          </div>
        ) : <ListEmpty>{translateText("No Hirer attachments were returned.")}</ListEmpty>}
      </Section>

      {pendingHirerChange ? (
        <Section title="Pending Hirer changes" variant={sectionVariant}>
          <div className="change-warning">
            <div>
              <strong>{translateText("Current accepted terms remain active")}</strong>
              <p>{translateText("This proposal does not change the Worker agreement until every Active Worker consents.")}</p>
            </div>
          </div>
          <div className="change-meta">
            <div><span>{translateText("Status")}</span><strong>{translateText(pendingHirerChange.requestStatus)}</strong></div>
            <div><span>{translateText("Requested by")}</span><strong>{pendingHirerChange.requestedByUserId === detail.hirer.id ? `${questMemberName(detail.hirer)} · ${translateText("Hirer")}` : pendingHirerChange.requestedByUserId ?? translateText("Hirer not provided.")}</strong></div>
            <div><span>{translateText("Requested at")}</span><strong>{formatQuestDate(pendingHirerChange.createdAt)}</strong></div>
            <div><span>{translateText("Expires at")}</span><strong>{formatQuestDate(pendingHirerChange.expiresAt)}</strong></div>
          </div>
          {pendingChanges.length ? (
            <div className="change-table">
              <div className="change-row change-head"><span>{translateText("Field")}</span><span>{translateText("Previous value")}</span><span>{translateText("Proposed value")}</span></div>
              {pendingChanges.map((change) => (
                <div className="change-row" key={change.field}>
                  <strong>{translateText(change.field)}</strong>
                  <span>{change.accepted}</span>
                  <span>{change.proposed}</span>
                </div>
              ))}
            </div>
          ) : <p className="audit-note">{translateText("The proposed changes were not provided.")}</p>}
          <div className="response-block">
            <h3>{translateText("Participant consent")}</h3>
            {pendingHirerChange.responses.length ? (
              <div className="response-table">
                <div className="response-row response-head"><span>{translateText("Worker")}</span><span>{translateText("Status")}</span></div>
                {pendingHirerChange.responses.map((response) => {
                  const worker = detail.assignments.find((assignment) => assignment.worker.id === response.workerId)?.worker;
                  return (
                    <div className="response-row" key={response.workerId}>
                      <span><strong>{worker ? questMemberName(worker) : response.workerId}</strong><small>{response.reason ?? translateText("No response reason")}</small></span>
                      <span className="response-status">{response.decision ? translateText(response.decision) : translateText("Pending")}</span>
                    </div>
                  );
                })}
              </div>
            ) : <ListEmpty>{translateText("No Worker responses were returned.")}</ListEmpty>}
          </div>
        </Section>
      ) : null}

      <Section
        title="Candidates"
        count={candidateCount}
        variant={sectionVariant}
      >
        {candidateApplications.length ? (
          <div className="related-list">
            {candidateApplications.map((application) => (
              <div className="related-row" key={application.id}>
                <span><strong>{questMemberName(application.worker)}</strong><small>{translateText("Candidate")} · {translateText(readableValue(application.applicationStatus))}</small></span>
                <span>{formatQuestDate(application.appliedAt)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {candidateTeams.length ? (
          <div className="related-list quest-detail-list-gap">
            {candidateTeams.map((team) => (
              <div className="related-row" key={team.id}>
                <span><strong>{team.name}</strong><small>{translateText("Candidate Team")} · {translateText(readableValue(team.teamStatus))} · {team.members.length} {translateText(team.members.length === 1 ? "member" : "members")}</small></span>
                <span>{formatQuestDate(team.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {detail.assignments.length ? (
          <div className="related-list quest-detail-list-gap">
            {detail.assignments.map((assignment) => (
              <div className="related-row" key={assignment.id}>
                <span><strong>{questMemberName(assignment.worker)}</strong><small>{translateText("Assignment")} · {translateText(readableValue(assignment.assignmentStatus))}</small></span>
                <span>{assignment.startedAt ? `${translateText("Started")} ${formatQuestDate(assignment.startedAt)}` : translateText("Not started")}</span>
              </div>
            ))}
          </div>
        ) : null}
        {!candidateApplications.length && !candidateTeams.length && !detail.assignments.length ? <ListEmpty>{translateText("No Candidates, Candidate Teams, or Assignments returned.")}</ListEmpty> : null}
      </Section>

      <Section title="Proof Submissions" count={detail.proofSubmissions.length} variant={sectionVariant}>
        {detail.proofSubmissions.length ? (
          <div className="related-list">
            {detail.proofSubmissions.map((submission) => (
              <div className="related-row" key={submission.id}>
                <span><strong>{submission.worker ? questMemberName(submission.worker) : questMemberName(submission.submittedBy)}</strong><small>{translateText(readableValue(submission.submissionStatus))} · {formatQuestDate(submission.submittedAt)}</small><small>{submission.content || translateText("No proof description.")}</small></span>
                <span>{submission.files.length} {translateText(submission.files.length === 1 ? "file" : "files")}</span>
              </div>
            ))}
          </div>
        ) : <ListEmpty>{translateText("No Proof Submissions returned.")}</ListEmpty>}
      </Section>

      {!recordLayout ? <QuestFinancialSection finance={finance} fundingTotal={fundingTotal} reward={reward} platformFee={platformFee} platformFeeBps={detail.platformFeeBps} variant={sectionVariant} /> : null}

      <Section title="Quest edit history" count={detail.editHistory.length} variant={sectionVariant}>
        {detail.editHistory.length ? (
          <div className="related-list">
            {detail.editHistory.map((entry) => {
              const detailLabel = entry.kind === "FIELD_EDIT"
                ? `${translateText("Field")} · ${translateText(readableFieldName(entry.fieldName))}`
                : `${translateText("Request")} · ${translateText(readableValue(entry.requestStatus))}`;
              const editedAt = entry.kind === "FIELD_EDIT" ? entry.editedAt : entry.createdAt;
              return (
                <div className="related-row" key={entry.id}>
                  <span>
                    <strong>{entry.kind === "FIELD_EDIT" ? translateText(readableFieldName(entry.fieldName)) : translateText(readableValue(entry.kind))}</strong>
                    <small>{entry.kind === "FIELD_EDIT" ? `${editValueText(entry.oldValue)} → ${editValueText(entry.newValue)}` : detailLabel}</small>
                  </span>
                  <span>{formatQuestDate(editedAt)}</span>
                </div>
              );
            })}
          </div>
        ) : <ListEmpty>{translateText("No Quest edits returned.")}</ListEmpty>}
      </Section>

      {!recordLayout ? (
        <Section title="Overall Quest timeline" count={timeline.length} variant={sectionVariant}>
          <ol className="timeline">
            {timeline.map((entry) => <li key={entry.id}><strong>{translateText(entry.title)}</strong><time>{entry.time}</time><span>{translateText(entry.detail)}</span></li>)}
          </ol>
        </Section>
      ) : null}

      {!recordLayout ? <Section title="Dispute and risk" variant={sectionVariant}><div className="quest-summary-context-section">{disputeRiskContent}</div></Section> : null}
      </div>

      <aside className={recordLayout ? "grid min-w-0 !grid-cols-1 gap-[18px]" : "contents"}>
      {recordLayout ? (
        <>
          <Section title="Hirer" variant={sectionVariant}>
            <div className="hirer-profile-summary">
              <strong>{questMemberName(detail.hirer)}</strong>
              <span>{detail.hirer.email}</span>
            </div>
          </Section>

          <Section title="Schedule and location" variant={sectionVariant}>
            <div className="facts">
              <Fact label="Starts">{formatQuestDate(detail.startTime)}</Fact>
              <Fact label="Due">{formatQuestDate(detail.dueAt)}</Fact>
            </div>
            <div className="quest-detail-list-block">
              <span className="fact-label">{translateText("Location")}</span>
              <strong className="quest-detail-list-value">
                {detail.locations.length
                  ? detail.locations.map((location) => location.label || translateText("Location label not provided.")).join(" · ")
                  : translateText("Location not provided.")}
              </strong>
            </div>
          </Section>

          <QuestFinancialSection finance={finance} fundingTotal={fundingTotal} reward={reward} platformFee={platformFee} platformFeeBps={detail.platformFeeBps} variant={sectionVariant} />

          <Section title="Overall Quest timeline" count={timeline.length} variant={sectionVariant}>
            <ol className="timeline">
              {timeline.map((entry) => <li key={entry.id}><strong>{translateText(entry.title)}</strong><time>{entry.time}</time><span>{translateText(entry.detail)}</span></li>)}
            </ol>
          </Section>

          <Section title="Dispute and risk" variant={sectionVariant}>
            <div className="quest-summary-context-section">{disputeRiskContent}</div>
          </Section>
        </>
      ) : null}

      <div className="quest-command-actions">
        {showFullDetailLink ? <UiButton asChild variant="outline" className="quest-full-detail-link"><a href={questRoutes.detail(detail.id)}>{translateText("Full Quest detail")}</a></UiButton> : null}
        {!hidden && canHideQuest(state) ? <UiButton variant="outline" type="button" onClick={() => onCommand("hide")}>{translateText("Hide Quest")}</UiButton> : null}
        {hidden ? <UiButton variant="outline" type="button" onClick={() => onCommand("restore")}>{translateText("Restore Quest")}</UiButton> : null}
        {!isQuestTerminal(state) ? <UiButton variant="danger" type="button" onClick={() => onCommand("terminate")}>{translateText("Terminate Quest")}</UiButton> : null}
      </div>
      </aside>
    </div>
  );
}

function QuestCommandDialog({
  detail,
  command,
  dataSource,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  detail: QuestDetailView;
  command: QuestCommand;
  dataSource: "api" | "mock";
  onCancel: () => void;
  onSubmit: (submission: QuestCommandSubmission) => void;
  error: string | null;
  pending: boolean;
}) {
  const { translateText } = useAdminShell();
  // The API requires a Restore reason. Mock mode keeps the same field visible
  // so the UI remains close to the live flow, but the fixture path allows an
  // Admin to submit Restore without a reason while the API contract is pending.
  const reasonRequired = command !== "restore" || dataSource === "api";
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState<AdminQuestReasonCode | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reasonRequired && !reasonCode) {
      setValidationError("Select a reason code.");
      return;
    }
    if (reasonRequired && reason.trim().length < 8) {
      setValidationError("Enter at least 8 characters for the reason.");
      return;
    }
    onSubmit({ command, reason: reason.trim(), reasonCode: reasonCode || "POLICY_REVIEW" });
  }

  return (
    <AdminModalPortal open onClose={onCancel}>
      <div className="quest-command-layer" role="presentation">
      <button className="quest-command-backdrop" type="button" aria-label={translateText("Close command dialog")} onClick={onCancel} />
      <dialog open className="quest-command-dialog" aria-labelledby="quest-command-title">
        <form onSubmit={submit}>
          <h2 id="quest-command-title">{translateText(command === "hide" ? "Hide Quest" : command === "restore" ? "Restore Quest" : "Terminate Quest")}</h2>
          <p>{translateText(command === "terminate" ? "This changes the Quest to Cancelled and preserves the Admin Action." : "The API Server remains the authority for this Quest action.")}</p>
          <AdminActionSummary
            title={translateText("Before you confirm")}
            affected={`${translateText("Quest")} ${detail.displayId || detail.id}`}
            currentState={translateText(command === "restore" ? "Hidden" : command === "hide" ? "Discoverable" : questStateLabel(detail.state))}
            nextState={translateText(command === "restore" ? "Discoverable" : command === "hide" ? "Hidden" : questStateLabel("QUEST_CANCELLED"))}
            effect={translateText(command === "hide"
              ? "Remove the Quest from public discovery only. Quest State and Quest Escrow do not change."
              : command === "restore"
                ? "Return the Quest to public discovery. Quest State and Quest Escrow do not change."
                : "Change the Quest to Cancelled. Review the Quest and Funding Reservation record before confirming.")}
            reversibility={translateText(command === "terminate" ? "This is a terminal Quest State. It has no restore path." : "An Admin can reverse this discovery visibility change with the opposite command.")}
            warning={translateText(command === "restore" && !reasonRequired ? "Restore reason is optional in mock mode. The visibility change is still recorded as an Admin Action." : "The API Server remains the authority for the final Quest result.")}
          />
          <label htmlFor="quest-command-reason-code">{translateText("Reason code")}{reasonRequired ? <span aria-hidden="true"> *</span> : null}<select id="quest-command-reason-code" required={reasonRequired} value={reasonCode} onChange={(event) => setReasonCode(event.target.value as AdminQuestReasonCode | "")} autoFocus><option value="">{translateText(reasonRequired ? "Select a reason code" : "No reason code")}</option>{reasonCodes.map((item) => <option key={item.value} value={item.value}>{translateText(item.label)}</option>)}</select></label>
          <label htmlFor="quest-command-reason">{translateText("Reason")}{reasonRequired ? <span aria-hidden="true"> *</span> : null}<textarea id="quest-command-reason" required={reasonRequired} minLength={reasonRequired ? 8 : undefined} maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} rows={4} /></label>
          {validationError || error ? <p className="field-error" role="alert">{translateText(validationError || error || "")}</p> : null}
          <div className="dialog-actions"><UiButton variant="outline" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</UiButton><UiButton variant={command === "terminate" ? "danger" : "primary"} type="submit" disabled={pending}>{pending ? translateText("Saving…") : translateText("Confirm")}</UiButton></div>
        </form>
      </dialog>
      </div>
    </AdminModalPortal>
  );
}

export function QuestDetailPage({ questId, presentation = "page", initialData, dataSource }: QuestDetailPageProps) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const [detail, setDetail] = useState<QuestDetailView>(initialData.detail);
  const [finance, setFinance] = useState<QuestFinanceView | null>(initialData.finance);
  const [linkedDisputeId, setLinkedDisputeId] = useState<string | null>(initialData.linkedDisputeId);
  const [disputeLookupError, setDisputeLookupError] = useState<string | null>(initialData.disputeLookupError);
  const [command, setCommand] = useState<QuestCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputePending, setDisputePending] = useState(false);
  const [actionReceipt, setActionReceipt] = useState<{
    action: string;
    status: string;
    reason: string;
    occurredAt: string;
  } | null>(null);

  useEffect(() => {
    const persistedDetail = dataSource === "mock" && typeof window !== "undefined"
      ? applyMockQuestOverride(initialData.detail, readMockQuestOverride(window.localStorage, initialData.detail.id))
      : initialData.detail;
    setDetail(persistedDetail);
    setFinance(initialData.finance);
    setLinkedDisputeId(initialData.linkedDisputeId);
    setDisputeLookupError(initialData.disputeLookupError);
    setDisputeError(null);
  }, [initialData, dataSource]);

  function openCommand(nextCommand: QuestCommand) {
    setCommandError(null);
    setCommand(nextCommand);
  }

  function closeDrawer() {
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
      if (dataSource === "api") {
        if (submission.command === "hide") {
          await adminApi.hideQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
        } else if (submission.command === "restore") {
          await adminApi.restoreQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
        } else {
          await adminApi.terminateQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
        }
      } else {
        const occurredAt = new Date().toISOString();
        const nextDetail = applyMockQuestCommand(detail, submission.command, submission.reason, submission.reasonCode, occurredAt);
        setDetail(nextDetail);
        if (typeof window !== "undefined") {
          saveMockQuestOverride(window.localStorage, nextDetail.id, questMockOverrideFromDetail(nextDetail));
        }
        setActionReceipt({
          action: submission.command === "hide" ? "Hide Quest" : submission.command === "restore" ? "Restore Quest" : "Terminate Quest",
          status: submission.command === "hide" ? "HIDDEN" : submission.command === "restore" ? "DISCOVERABLE" : "QUEST_CANCELLED",
          reason: submission.reason || "No reason required for Quest Restore in mock mode.",
          occurredAt,
        });
      }
      setCommand(null);
      if (dataSource === "api") router.refresh();
    } catch (commandErrorValue: unknown) {
      setCommandError(errorMessage(commandErrorValue, "Quest command failed."));
    } finally {
      setCommandPending(false);
    }
  }

  const receipt = actionReceipt ? <AdminActionReceipt action={actionReceipt.action} resource="Quest" resourceId={detail.displayId || detail.id} status={actionReceipt.status} occurredAt={actionReceipt.occurredAt} mock details={<p>{translateText("Reason")}: {translateText(actionReceipt.reason)}</p>} /> : null;
  const content = <><QuestDetailContent detail={detail} finance={finance} linkedDisputeId={linkedDisputeId} disputeLookupError={disputeLookupError} onCommand={openCommand} onOpenDispute={openDispute} disputePending={disputePending} disputeError={disputeError} showFullDetailLink={presentation === "drawer"} recordLayout={presentation === "page"} />{receipt}</>;

  if (presentation === "drawer") {
    return (
      <>
        <AdminDrawer ariaLabel={translateText("Close Quest detail")} title={detail.title} titleId="quest-drawer-title" subtitle={`${translateText("Quest")} ${questDisplayIdFor(detail.id, detail.displayId)} · ${translateText("Quest detail drawer")}`} className="quest-drawer" openerAttribute="data-quest-drawer-trigger" openerValue={questId} escapeDisabled={Boolean(command)} onClose={closeDrawer}>
          {content}
        </AdminDrawer>
        {command ? <QuestCommandDialog detail={detail} command={command} dataSource={dataSource} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page quest-detail-page max-w-[1080px]" tabIndex={-1}>
      <AdminRecordHeader
        breadcrumbHref={questRoutes.list()}
        breadcrumbLabel={translateText("Quests")}
        recordId={questDisplayIdFor(detail.id, detail.displayId)}
        title={detail.title}
        subtitle={`${translateText(detail.participation === "GROUP" ? "Team" : "Solo")} · ${translateText("created")} ${formatQuestDate(detail.createdAt)}`}
        actions={<UiButton asChild size="lg" variant="outline"><Link href={questRoutes.list()}>{translateText("Back to Quests")}</Link></UiButton>}
      />
      <QuestRecordAlert detail={detail} />
      <RecordStatusBar className="quest-record-status-bar" items={[{ id: "status", label: translateText("Status"), value: <Badge state={detail.state} /> }, { id: "participant-mode", label: translateText("Participant mode"), value: translateText(detail.participation === "GROUP" ? "Team" : "Solo") }, { id: "created", label: translateText("Created"), value: formatQuestDate(detail.createdAt) }, { id: "funding-total", label: translateText("Quest Funding Total"), value: formatQuestMoney(finance?.quest.questFundingTotalSatang ?? detail.questFundingTotalSatang) }, { id: "candidates", label: translateText("Candidates"), value: questCandidateCount(detail) }]} />
      <div className="min-w-0">{content}</div>
      {command ? <QuestCommandDialog detail={detail} command={command} dataSource={dataSource} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
    </main>
  );
}

export function AdminQuestPage({ initialData }: { initialData: QuestBoardPageData }) {
  const router = useRouter();
  const { translateText } = useAdminShell();
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
      <AdminPageHeader title={translateText("Quests")} description={translateText("Review Quests through every Quest State.")} />
      <Card as="section" className="overflow-hidden quest-board" aria-label={translateText("Quest board")}>
        <Tabs value={tab} onValueChange={(value) => chooseTab(value as QuestBoardTab)} className="w-full gap-0">
          <TabsList className="w-full flex-nowrap justify-start overflow-x-auto rounded-none border-b border-admin-border bg-transparent p-0" aria-label={translateText("Quest filters")}>
            {QUEST_BOARD_TABS.map((item) => <TabsTrigger key={item.id} value={item.id} className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 text-sm text-admin-muted shadow-none hover:bg-transparent data-[state=active]:border-admin-accent data-[state=active]:bg-transparent data-[state=active]:text-admin-text data-[state=active]:shadow-none">{translateText(item.label)}{item.id === "all" ? ` (${rows.length})` : ""}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2"><label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text" htmlFor="quest-search"><span className="visually-hidden">{translateText("Search Quests")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="quest-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={translateText("Search Quests…")} autoComplete="off" /></label><span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span><PageSizeControls value={pageSize} translateText={translateText} onChange={choosePageSize} /><span className="ml-auto text-sm text-admin-muted max-[600px]:hidden" aria-live="polite">{translateText("Showing")} {pageStart}–{pageEnd} {translateText("of")} {sortedRows.length} {translateText("results")}</span></div>
        {!sortedRows.length ? <div className="empty"><h2>{translateText("No matching records")}</h2><p>{translateText("There are no Quests in this view.")}</p><UiButton variant="outline" type="button" onClick={() => { setQuery(""); setTab("all"); }}>{translateText("Reset view")}</UiButton></div> : <div className="table-wrap" aria-label={translateText("Quests table")}><Table className="data"><caption>{translateText("Quests")}</caption><thead><tr><SortableHeader label={translateText("Quest")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Title")} sortKey="title" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Hirer")} sortKey="hirer" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Created At")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Quest Reward")} sortKey="reward" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label={translateText("Status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="quest-row" data-quest-id={row.id} data-quest-drawer-trigger={row.id} key={row.id} tabIndex={0} aria-label={`${translateText("Open Quest")} ${row.title}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; router.push(questRoutes.detail(row.id)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(questRoutes.detail(row.id)); } }}><td><Link className="row-record-button" data-quest-drawer-trigger={row.id} href={questRoutes.detail(row.id)} aria-label={`${translateText("Open Quest")} ${row.displayId}`}>{row.displayId}</Link></td><td><Link className="row-record-button quest-title-link" data-quest-drawer-trigger={row.id} href={questRoutes.detail(row.id)} aria-label={`${translateText("Open Quest")} ${row.title}`}><strong>{row.title}</strong><small>{translateText(row.participationLabel)} · {translateText(row.modeLabel)}</small></Link></td><td><strong>{row.hirerName}</strong><small>{row.hirerEmail}</small></td><td>{formatQuestDate(row.createdAt)}</td><td className="money">{formatQuestMoney(row.rewardSatang)}</td><td><span className={`badge ${questStatusClass(row.state)}`}>{translateText(row.stateLabel)}</span>{row.hiddenAt ? <span className="badge neutral quest-hidden-overlay">{translateText("Hidden")}</span> : null}</td></tr>)}</tbody></Table></div>}
        {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPage} ariaLabel={translateText("Quests pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className="table-pagination" /> : null}
      </Card>
    </main>
  );
}

function SortableHeader({ label, sortKey, activeKey, direction, onSort }: { label: string; sortKey: QuestSortKey; activeKey: QuestSortKey; direction: QuestSortDirection; onSort: (key: QuestSortKey) => void }) {
  return <th aria-sort={activeKey === sortKey ? direction : "none"}><button className={`table-sort${activeKey === sortKey ? " is-active" : ""}`} type="button" onClick={() => onSort(sortKey)}>{label}<span className="sort-indicator" aria-hidden="true">{activeKey === sortKey && direction === "ascending" ? "↑" : "↓"}</span></button></th>;
}
