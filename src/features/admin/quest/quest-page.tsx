"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { ApiError } from "../../../lib/api/client";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminRecordHeader } from "../../../components/admin/admin-record-header";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { AdminRecordFact as Fact } from "../../../components/admin/admin-record-fields";
import { adminRecordCount, adminRecordDescription, adminRecordFact, adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection, adminRecordSideFacts } from "../../../components/admin/admin-record-styles";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Badge as UiBadge, Button as UiButton, Card, CardContent, CardHeader, CardTitle } from "../../../components/ui";
import { disputeRoutes, memberRoutes, questRoutes } from "../admin-routes";
import type { AdminDisputeOpenCommand, AdminDisputeOpenResult } from "../api/admin-api-types-commands";
import { canHideQuest, isQuestTerminal, type QuestState } from "../domain/rulebook";
import { displayAdminId } from "../display-admin-id";
import {
  formatQuestDate,
  formatQuestMoney,
  questMemberName,
  questStatusClass,
  type QuestDetailView,
  type QuestFinanceView,
  type QuestTimelineView,
} from "./quest-model";
import type { QuestDetailPageData, QuestWorkerReviewData } from "./quest-service";
import { QuestCommandDialog, type QuestCommand, type QuestCommandSubmission } from "./quest-command-dialog";
import { useQuestCommandMutation, useQuestOpenDisputeMutation } from "./quest-query";

type QuestPresentation = "page" | "drawer";

type QuestDetailPageProps = {
  questId: string;
  presentation?: QuestPresentation;
  initialData: QuestDetailPageData;
};

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

const DISPUTE_CATEGORY_OPTIONS: { value: AdminDisputeOpenCommand["category"]; label: string }[] = [
  { value: "PROOF_REVIEW", label: "Proof review" },
  { value: "QUEST_CONDITION", label: "Quest Condition" },
  { value: "PARTIAL_WORK", label: "Partial work" },
  { value: "OTHER", label: "Other" },
];

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

function questEditValueText(fieldName: string, value: unknown): string {
  const fieldLabel = readableFieldName(fieldName);
  if ((fieldLabel === "Start Time" || fieldLabel === "Due At") && typeof value === "string") {
    return formatQuestDate(value);
  }
  return editValueText(value);
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
    <Card as="section" className={isRecord ? adminRecordSection : "overflow-hidden"}>
      <CardHeader flush className={isRecord ? adminRecordHeader : "flex min-h-[60px] items-center justify-between gap-4 border-b border-admin-border px-4 py-3.5"}>
        <CardTitle className={isRecord ? adminRecordHeading : "text-base font-semibold text-admin-text"}>{translateText(title)}</CardTitle>
        {count !== undefined ? <span className={adminRecordCount}>{count}</span> : null}
      </CardHeader>
      <CardContent flush className={isRecord ? "p-0" : "p-[18px]"}>{children}</CardContent>
    </Card>
  );
}

function questCandidateCount(detail: QuestDetailView): number {
  return detail.assignments.length > 0
    ? detail.assignments.length
    : detail.candidates.applications.length + detail.candidates.teams.length;
}

function ListEmpty({ children }: { children: ReactNode }) {
  const { translateText } = useAdminShell();
  return <div className="rounded-[10px] bg-admin-soft p-3.5"><strong>{typeof children === "string" ? translateText(children) : children}</strong></div>;
}

function HirerReview({ data, state }: { data: QuestWorkerReviewData | undefined; state: QuestState }) {
  const { translateText } = useAdminShell();
  return (
    <section className="grid gap-2 rounded-lg border border-admin-border bg-admin-soft p-3" aria-label={translateText("Hirer Review")}>
      <h3 className="m-0 text-sm font-semibold text-admin-text">{translateText("Hirer Review")}</h3>
      {!isQuestTerminal(state) ? (
        <p className="m-0 text-sm text-admin-muted">{translateText("A Review is available after the Quest reaches a Terminal State.")}</p>
      ) : data?.error ? (
        <p className="m-0 text-sm text-admin-muted" role="alert">{translateText(data.error)}</p>
      ) : data?.reviews?.length ? (
        <ul className="m-0 grid list-none gap-2 p-0">
          {data.reviews.map((review) => (
            <li className="grid gap-1" key={review.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <strong>{review.reviewer.name}</strong>
                <span className="text-sm text-admin-muted" aria-label={`${review.rating} ${translateText("out of five stars")}`}>
                  <span aria-hidden="true">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span> {review.rating}/5
                </span>
              </div>
              <time className="text-sm text-admin-muted" dateTime={review.updatedAt}>{formatQuestDate(review.updatedAt)}</time>
              <p className="m-0 whitespace-pre-wrap text-sm">{review.comment || translateText("No written comment.")}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-admin-muted">{translateText("No Hirer Review was returned.")}</p>
      )}
    </section>
  );
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
      <div className="flex items-center justify-between py-2 text-[17px] leading-[1.4] text-admin-muted"><span>{translateText("Quest Funding Total")}</span><strong className="text-admin-text [font-variant-numeric:tabular-nums]">{formatQuestMoney(fundingTotal)}</strong></div>
      <div className="flex items-center justify-between py-2 text-[17px] leading-[1.4] text-admin-muted"><span>{translateText("Quest Reward")}</span><strong className="text-admin-text [font-variant-numeric:tabular-nums]">{formatQuestMoney(reward)}</strong></div>
      <div className="flex items-center justify-between py-2 text-[17px] leading-[1.4] text-admin-muted"><span>{translateText("Platform Fee per Worker")}</span><strong className="text-admin-text [font-variant-numeric:tabular-nums]">{formatQuestMoney(platformFee)}</strong></div>
      <div className="flex items-center justify-between py-2 text-[17px] leading-[1.4] text-admin-muted"><span>{translateText("Platform Fee policy")}</span><strong className="text-admin-text [font-variant-numeric:tabular-nums]">{platformFeeBps === null ? translateText("Not provided") : `${platformFeeBps / 100}%`}</strong></div>
      {finance?.transfers.length ? (
        <div className="mt-3 border-t border-admin-border pt-2">
          <h3 className="m-0 mb-1 text-[15px] leading-[1.4]">{translateText("Money movements")}</h3>
          {finance.transfers.map((transfer) => <div className="flex items-center justify-between py-2 text-[17px] leading-[1.4] text-admin-muted" key={transfer.id}><span>{translateText(readableValue(transfer.type))}<small className="mt-0.5 block text-[15px] leading-[1.4] text-admin-muted">{formatQuestDate(transfer.occurredAt)}</small></span><strong className="text-admin-text [font-variant-numeric:tabular-nums]">{formatQuestMoney(transfer.amountSatang)}</strong></div>)}
        </div>
      ) : null}
      {!finance ? <p className="audit-note">{translateText("Quest finance data is not available.")}</p> : null}
    </Section>
  );
}

function QuestDetailContent({
  detail,
  finance,
  workerReviews,
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
  workerReviews: Record<string, QuestWorkerReviewData>;
  disputeLookupError: string | null;
  onCommand: (command: QuestCommand) => void;
  onOpenDispute: (commands: AdminDisputeOpenCommand[]) => void;
  disputePending: boolean;
  disputeError: string | null;
  showFullDetailLink: boolean;
  recordLayout?: boolean;
}) {
  const { translateText } = useAdminShell();
  const disputeSectionsId = useId();
  const state = detail.state;
  const isTeamQuest = detail.participation === "GROUP";
  const hidden = Boolean(detail.hiddenAt);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [selectedDisputeCategory, setSelectedDisputeCategory] = useState<AdminDisputeOpenCommand["category"] | "">("");
  const [submittedDetail, setSubmittedDetail] = useState("");
  const [disputeFormError, setDisputeFormError] = useState<string | null>(null);
  useEffect(() => {
    setSelectedWorkerId("");
    setSelectedWorkerIds([]);
    setSelectedDisputeCategory("");
    setSubmittedDetail("");
    setDisputeFormError(null);
  }, [detail.disputeCases]);
  const financeQuest = finance?.quest;
  const pendingHirerChange = detail.editHistory.find(
    (entry): entry is AdminQuestEditRequest => entry.kind === "EDIT_REQUEST" && entry.requestStatus === "EDIT_REQUEST_PENDING",
  );
  const pendingChanges = pendingHirerChange ? editChangesFor(detail, pendingHirerChange) : [];
  const fundingTotal = financeQuest?.questFundingTotalSatang ?? detail.questFundingTotalSatang;
  const reward = financeQuest?.rewardSatang ?? detail.rewardSatang;
  const platformFee = financeQuest?.platformFeePerWorkerSatang ?? detail.platformFeePerWorkerSatang;
  const statusTimeline = detail.timeline
    .filter((entry): entry is QuestTimelineView & { status: string } => typeof entry.status === "string" && entry.status.length > 0)
    .map((entry, index, entries) => {
      const previousStatus = entries[index - 1]?.status;
      const status = entry.status;
      const statusLabel = readableValue(status.replace("QUEST_", ""));
      const previousLabel = previousStatus ? readableValue(previousStatus.replace("QUEST_", "")) : null;
      const transition = previousLabel && previousLabel !== statusLabel
        ? `${previousLabel} → ${statusLabel}`
        : statusLabel;
      const detailText = [
        readableValue(entry.event),
        entry.reasonCode ? `${translateText("Reason code:")} ${translateText(readableValue(entry.reasonCode))}` : null,
        displayAdminId(entry.actorId) ? `${translateText("Actor:")} ${displayAdminId(entry.actorId)}` : null,
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
  const selectedWorkerCount = isTeamQuest ? selectedWorkerIds.length : selectedWorkerId ? 1 : 0;
  const pluralDisputeAction = selectedWorkerCount > 1;
  const candidateApplications = hasAcceptedRoster ? [] : detail.candidates.applications;
  const candidateTeams = hasAcceptedRoster ? [] : detail.candidates.teams;
  const candidateCount = questCandidateCount(detail);
  const sectionVariant = recordLayout ? "record" : "panel";
  const filedWorkerIds = new Set(
    detail.disputeCases
      .map((disputeCase) => disputeCase.filerUserId)
      .filter((filerUserId): filerUserId is string => Boolean(filerUserId)),
  );
  const hasCaseWithoutFiler = detail.disputeCases.some((disputeCase) => !disputeCase.filerUserId);
  const workersWithoutCase = hasCaseWithoutFiler
    ? []
    : detail.assignments.filter((assignment) => !filedWorkerIds.has(assignment.worker.id));
  const disputeRiskContent = state === "QUEST_FAILED" ? (
    <>
      <section aria-labelledby={`${disputeSectionsId}-linked`} className="grid gap-2">
        <h3 className="m-0" id={`${disputeSectionsId}-linked`}>{translateText("Linked Dispute Cases")}</h3>
        {detail.disputeCases.length ? (
          <div className="grid gap-2">
            {detail.disputeCases.map((disputeCase) => {
              const filerAssignment = detail.assignments.find((assignment) => assignment.worker.id === disputeCase.filerUserId);
              const isHirerFiler = disputeCase.filerUserId === detail.hirer.id;
              const filerName = isHirerFiler ? questMemberName(detail.hirer) : filerAssignment ? questMemberName(filerAssignment.worker) : null;
              const filerLabel = isHirerFiler ? translateText("Hirer") : filerAssignment ? translateText("Worker") : null;
              return (
                <div className="grid gap-2 rounded-lg border border-admin-border bg-admin-soft p-2.5" key={disputeCase.id}>
                  <div className="flex items-center justify-between gap-3">
                    <strong>{disputeCase.displayId || translateText("Dispute Case")}</strong>
                    <span>{translateText(readableValue(disputeCase.status.replace("DISPUTE_CASE_", "")))}</span>
                  </div>
                  {filerName && filerLabel ? <small className="text-admin-muted">{filerLabel}: {filerName}</small> : null}
                  {disputeCase.createdAt ? <small className="text-admin-muted">{translateText("Opened")}: {formatQuestDate(disputeCase.createdAt)}</small> : null}
                  <UiButton asChild variant="primary" className="w-full"><Link href={disputeRoutes.detail(disputeCase.id)}>{translateText("Open Dispute Case")}</Link></UiButton>
                </div>
              );
            })}
          </div>
        ) : disputeLookupError ? (
          <p className="field-error" role="alert">{translateText(disputeLookupError)}</p>
        ) : <p className="audit-note">{translateText("This Quest is Failed, but no linked Dispute Case was returned.")}</p>}
      </section>
      {!disputeLookupError && workersWithoutCase.length ? (
        <section aria-labelledby={`${disputeSectionsId}-open`} className="grid gap-3 border-t border-admin-border pt-4">
          <div className="grid gap-1">
            <h3 className="m-0" id={`${disputeSectionsId}-open`}>
              {translateText("Open a new Dispute Case")}
            </h3>
            <p className="m-0 text-admin-muted">{translateText(isTeamQuest
              ? "Select one or more assigned Workers who do not already have a Dispute Case. Each Worker gets a separate Dispute Case with this Category and Submitted detail."
              : "Choose an assigned Worker who does not already have a Dispute Case.")}</p>
          </div>
          <form
            className="dispute-open-form grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const detailText = submittedDetail.trim();
              if (!detailText) {
                setDisputeFormError("Submitted detail is required.");
                return;
              }
              const workerIds = isTeamQuest ? selectedWorkerIds : selectedWorkerId ? [selectedWorkerId] : [];
              if (!workerIds.length) {
                setDisputeFormError(isTeamQuest ? "Select at least one assigned Worker." : "Select an assigned Worker.");
                return;
              }
              if (selectedDisputeCategory) {
                setDisputeFormError(null);
                onOpenDispute(workerIds.map((workerId) => ({
                  workerId,
                  category: selectedDisputeCategory,
                  submittedDetail: detailText,
                })));
              }
            }}
          >
            {isTeamQuest ? (
              <fieldset aria-required="true" className="grid min-w-0 gap-2 border-0 p-0">
                <legend className="mb-1 font-semibold">{translateText("Assigned Workers")} <span aria-hidden="true">*</span></legend>
                <div className="grid gap-2">
                  {workersWithoutCase.map((assignment) => {
                    const workerId = assignment.worker.id;
                    const inputId = `${disputeSectionsId}-worker-${workerId}`;
                    const selected = selectedWorkerIds.includes(workerId);
                    return (
                      <label
                        className={`grid min-h-11 grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-admin-hover ${selected ? "border-admin-accent bg-admin-accent-soft" : "border-admin-border bg-admin-surface"}`}
                        htmlFor={inputId}
                        key={workerId}
                      >
                        <input
                          className="mt-1 size-4 accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
                          id={inputId}
                          name="workerIds"
                          type="checkbox"
                          value={workerId}
                          aria-label={questMemberName(assignment.worker)}
                          checked={selected}
                          onChange={(event) => {
                            setSelectedWorkerIds((current) => event.target.checked
                              ? [...current, workerId]
                              : current.filter((id) => id !== workerId));
                            setDisputeFormError(null);
                          }}
                          disabled={disputePending}
                        />
                        <span className="grid gap-0.5">
                          <strong className="text-sm leading-[1.4]">{questMemberName(assignment.worker)}</strong>
                          <small className="text-admin-muted">{translateText(readableValue(assignment.assignmentStatus))}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <label className="grid gap-1 font-semibold" htmlFor="quest-dispute-worker">
                <span>{translateText("Worker")} <span aria-hidden="true">*</span></span>
                <select
                  className="w-full rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-admin-text"
                  id="quest-dispute-worker"
                  name="workerId"
                  value={selectedWorkerId}
                  onChange={(event) => setSelectedWorkerId(event.target.value)}
                  required
                  disabled={disputePending}
                >
                  <option value="" disabled>{translateText("Select an assigned Worker")}</option>
                  {workersWithoutCase.map((assignment) => (
                    <option key={assignment.worker.id} value={assignment.worker.id}>
                      {questMemberName(assignment.worker)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 font-semibold" htmlFor="quest-dispute-category">
              <span>{translateText("Category")} <span aria-hidden="true">*</span></span>
              <select
                className="w-full rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-admin-text"
                id="quest-dispute-category"
                name="category"
                value={selectedDisputeCategory}
                onChange={(event) => {
                  setSelectedDisputeCategory(event.target.value as AdminDisputeOpenCommand["category"] | "");
                  setDisputeFormError(null);
                }}
                required
                disabled={disputePending}
              >
                <option value="" disabled>{translateText("Select a category")}</option>
                {DISPUTE_CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>{translateText(category.label)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 font-semibold" htmlFor="quest-dispute-submitted-detail">
              <span>{translateText("Submitted detail")} <span aria-hidden="true">*</span></span>
              <textarea
                className="w-full resize-y rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-admin-text"
                id="quest-dispute-submitted-detail"
                name="submittedDetail"
                value={submittedDetail}
                onChange={(event) => {
                  setSubmittedDetail(event.target.value);
                  setDisputeFormError(null);
                }}
                required
                rows={4}
                disabled={disputePending}
              />
              <span className="font-normal text-admin-muted">{translateText("Enter the detail provided by the Worker.")}</span>
            </label>
            {disputeFormError || disputeError ? <p className="field-error" role="alert">{translateText(disputeFormError ?? disputeError ?? "")}</p> : null}
            <UiButton variant="primary" className="dispute-open-submit" type="submit" disabled={disputePending}>
              {disputePending
                ? translateText(pluralDisputeAction ? "Opening Dispute Cases…" : "Opening Dispute Case…")
                : translateText(pluralDisputeAction ? "Open Dispute Cases" : "Open Dispute Case")}
            </UiButton>
          </form>
        </section>
      ) : !disputeLookupError ? (
        <p className="audit-note">
          {detail.assignments.length === 0
            ? translateText("No assigned Worker was returned.")
            : hasCaseWithoutFiler
              ? translateText("The Admin API did not return the filer for an existing Dispute Case.")
              : translateText("Each assigned Worker already has a Dispute Case.")}
        </p>
      ) : null}
    </>
  ) : <p className="audit-note">{translateText("No linked Dispute Case was returned.")}</p>;

  const commandButtons = <>
    {showFullDetailLink ? <UiButton asChild variant="outline"><a href={questRoutes.detail(detail.displayId || detail.id)}>{translateText("Full Quest detail")}</a></UiButton> : null}
    {!hidden && canHideQuest(state) ? <UiButton variant="outline" type="button" onClick={() => onCommand("hide")}>{translateText("Hide Quest")}</UiButton> : null}
    {hidden ? <UiButton variant="outline" type="button" onClick={() => onCommand("restore")}>{translateText("Restore Quest")}</UiButton> : null}
    {!isQuestTerminal(state) ? <UiButton variant="danger" type="button" onClick={() => onCommand("terminate")}>{translateText("Terminate Quest")}</UiButton> : null}
  </>;
  const hasCommandActions = showFullDetailLink || (!hidden && canHideQuest(state)) || hidden || !isQuestTerminal(state);
  const commandActions = hasCommandActions ? recordLayout ? (
    <Section title="Quest actions" variant="record">
      <div className="quest-command-actions grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 p-[18px] [&_[data-slot=button]]:m-0 [&_[data-slot=button]]:min-h-11 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:text-center">
        {commandButtons}
      </div>
    </Section>
  ) : (
    <div className="quest-command-actions sticky bottom-[-28px] z-[4] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 -mx-6 -mb-7 mt-[18px] border-t border-admin-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-6 py-3.5 shadow-[0_-6px_18px_color-mix(in_srgb,var(--text)_9%,transparent)] max-[720px]:bottom-[-24px] max-[720px]:-mx-4 max-[720px]:-mb-6 max-[720px]:px-4 [&_[data-slot=button]]:m-0 [&_[data-slot=button]]:min-h-11 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:text-center">
      {commandButtons}
    </div>
  ) : null;

  return (
    <div className={`admin-drawer-content-flow ${recordLayout ? "grid items-start gap-[18px] !grid-cols-[minmax(0,1.65fr)_minmax(290px,0.72fr)] max-[1000px]:!grid-cols-1" : "grid !grid-cols-1 gap-[18px]"}`}>
      <div className={recordLayout ? "grid min-w-0 !grid-cols-1 gap-[18px]" : "contents"}>
      <Section title="Quest summary" variant={sectionVariant}>
        <div className={`${adminRecordFacts} !grid-cols-3 max-[700px]:!grid-cols-1`}>
          <Fact label={translateText("Status")}><Badge state={state} />{hidden ? <span className="badge neutral ms-1 mt-[3px]">{translateText("Hidden")}</span> : null}</Fact>
          <Fact label={translateText("Quest Funding Total")}>{formatQuestMoney(fundingTotal)}</Fact>
          <Fact label={translateText("Participant mode")}>{translateText(detail.participation === "GROUP" ? "Team" : "Solo")}</Fact>
          <Fact label={translateText("Candidate mode")}>{translateText(detail.mode === "FIRST_COME_FIRST_SERVED" ? "First come, first served" : "Candidate")}</Fact>
          <Fact label={translateText("Quest ID")}>{detail.displayId || translateText("Not provided by the Admin API")}</Fact>
          <Fact label={translateText("Created")}>{formatQuestDate(detail.createdAt)}</Fact>
          <Fact label={translateText("Candidate numbers")}>{detail.headcount}</Fact>
          {!recordLayout ? <div className={adminRecordFact}>
            <span>{translateText("Hirer")}</span>
            <strong>{questMemberName(detail.hirer)}</strong>
            <small>{detail.hirer.email}</small>
          </div> : null}
        </div>
        <div className="quest-description-block mt-[18px] border-t border-admin-border pt-[18px]">
          <h3 className={`${adminRecordHeading} mb-[10px]`}>{translateText("Quest description")}</h3>
          <p className={adminRecordDescription}>{detail.description || translateText("No Quest description recorded.")}</p>
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
        {!recordLayout ? <div className="quest-summary-context mt-[18px] grid !grid-cols-1 gap-y-[18px] border-t border-admin-border pt-[18px]">
          <div className="quest-summary-context-section min-w-0 [&>p:not(.audit-note):not(.field-error)]:m-0 [&>p:not(.audit-note):not(.field-error)]:text-admin-muted">
            <h3 className={`${adminRecordHeading} mb-[10px]`}>{translateText("Schedule and location")}</h3>
            <div className={`${adminRecordFacts} !gap-x-8`}>
              <Fact label={translateText("Starts")}><span className="whitespace-nowrap">{formatQuestDate(detail.startTime)}</span></Fact>
              <Fact label={translateText("Due")}><span className="whitespace-nowrap">{formatQuestDate(detail.dueAt)}</span></Fact>
            </div>
            <div className="mt-4 grid gap-1">
              <span className="block text-xs font-semibold leading-[1.4] text-admin-muted">{translateText("Location")}</span>
              <strong className="text-sm font-medium leading-[1.4]">
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
                className="file-row text-inherit no-underline"
                href={image.url}
                key={image.imageId}
                rel="noreferrer"
                target="_blank"
              >
                <Image className="h-[54px] w-[72px] shrink-0 rounded-lg object-cover max-[500px]:h-12 max-[500px]:w-[60px]" src={image.url} alt={`${translateText("Hirer attachment")} ${image.position + 1}`} height={54} loading="lazy" unoptimized width={72} />
                <span>
                  <strong>{translateText("Hirer attachment")} {image.position + 1}</strong>
                  <small>{displayAdminId(image.fileId) ?? translateText("Attachment")} · {translateText("Link expires")} {formatQuestDate(image.urlExpiresAt)}</small>
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
            <div><span>{translateText("Requested by")}</span><strong>{pendingHirerChange.requestedByUserId === detail.hirer.id ? `${questMemberName(detail.hirer)} · ${translateText("Hirer")}` : translateText("Member")}</strong></div>
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
            <h3 className={adminRecordHeading}>{translateText("Participant consent")}</h3>
            {pendingHirerChange.responses.length ? (
              <div className="response-table">
                <div className="response-row response-head"><span>{translateText("Worker")}</span><span>{translateText("Status")}</span></div>
                {pendingHirerChange.responses.map((response) => {
                  const worker = detail.assignments.find((assignment) => assignment.worker.id === response.workerId)?.worker;
                  return (
                    <div className="response-row" key={response.workerId}>
                      <span><strong>{worker ? questMemberName(worker) : translateText("Member")}</strong><small>{response.reason ?? translateText("No response reason")}</small></span>
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
                <span>
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <strong>{questMemberName(application.worker)}</strong>
                    <span className="text-[13px] text-admin-muted">{formatQuestDate(application.appliedAt)}</span>
                  </span>
                  <small>{translateText("Student ID")}: {application.worker.studentId ?? translateText("Student ID not provided")}</small>
                  <small>{translateText("Candidate")} · {translateText(readableValue(application.applicationStatus))}</small>
                </span>
                <UiButton asChild variant="outline" size="xs" className="shrink-0">
                  <Link href={memberRoutes.detail(application.worker.memberId)}>{translateText("See Member profile")}</Link>
                </UiButton>
              </div>
            ))}
          </div>
        ) : null}
        {candidateTeams.length ? (
          <div className="related-list mt-3">
            {candidateTeams.map((team) => (
              <div className="related-row" key={team.id}>
                <div className="grid w-full gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span><strong>{team.name}</strong><small>{translateText("Candidate Team")} · {translateText(readableValue(team.teamStatus))} · {team.members.length} {translateText(team.members.length === 1 ? "member" : "members")}</small></span>
                    <span className="shrink-0">{formatQuestDate(team.createdAt)}</span>
                  </div>
                  {team.members.length ? (
                    <div className="grid gap-2 border-l border-admin-border pl-3">
                      {team.members.map(({ member }) => (
                        <div className="flex items-center justify-between gap-3" key={member.id}>
                          <strong>{questMemberName(member)}</strong>
                          <UiButton asChild variant="outline" size="xs" className="shrink-0">
                            <Link href={memberRoutes.detail(member.memberId)}>{translateText("See Member profile")}</Link>
                          </UiButton>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {detail.assignments.length ? (
          <div className="related-list mt-3">
            {detail.assignments.map((assignment) => (
              <div className="related-row" key={assignment.id}>
                <div className="grid w-full min-w-0 gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span><strong>{questMemberName(assignment.worker)}</strong><small>{translateText("Assignment")} · {translateText(readableValue(assignment.assignmentStatus))}</small></span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="quest-assignment-state">{assignment.startedAt ? `${translateText("Started")} ${formatQuestDate(assignment.startedAt)}` : translateText("Not started")}</span>
                      <UiButton asChild variant="outline" size="xs">
                        <Link href={memberRoutes.detail(assignment.worker.memberId)}>{translateText("See Member profile")}</Link>
                      </UiButton>
                    </div>
                  </div>
                  <HirerReview data={workerReviews[assignment.worker.id]} state={state} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!candidateApplications.length && !candidateTeams.length && !detail.assignments.length ? <ListEmpty>{translateText("No Candidates, Candidate Teams, or Assignments returned.")}</ListEmpty> : null}
      </Section>

      <Section title="Proof Submissions" count={detail.proofSubmissions.length} variant={sectionVariant}>
        {detail.proofSubmissions.length ? (
          <div className="related-list">
            {detail.proofSubmissions.map((submission) => {
              const subjectName = submission.team?.name
                ?? (submission.worker ? questMemberName(submission.worker) : questMemberName(submission.submittedBy));
              const subjectType = submission.team ? "Candidate Team" : submission.worker ? "Worker" : "Submitted by";
              return (
                <article className="related-row items-start" key={submission.id}>
                  <div className="grid w-full min-w-0 gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <strong>{subjectName}</strong>
                        <small>{translateText(subjectType)} · {translateText(readableValue(submission.submissionStatus))} · {formatQuestDate(submission.submittedAt)}</small>
                        <small>{translateText("Submitted by")}: {questMemberName(submission.submittedBy)}</small>
                        <small className="whitespace-pre-wrap break-words">{submission.content || translateText("No proof description.")}</small>
                        {submission.reviewedAt ? <small>{translateText("Reviewed at")}: {formatQuestDate(submission.reviewedAt)}{submission.reviewedBy ? ` · ${translateText(readableValue(submission.reviewedBy))}` : ""}</small> : null}
                        {submission.reviewNote ? <small className="whitespace-pre-wrap break-words">{translateText("Review note")}: {submission.reviewNote}</small> : null}
                      </div>
                      <span className="shrink-0">{submission.files.length} {translateText(submission.files.length === 1 ? "file" : "files")}</span>
                    </div>
                    {submission.files.length ? (
                      <div className="grid min-w-0 gap-1 border-t border-admin-border pt-2">
                        {submission.files.map((file) => (
                          <a className="file-row text-inherit no-underline" href={file.url} key={file.fileId} rel="noreferrer" target="_blank">
                            <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-admin-muted" focusable="false" />
                            <span className="min-w-0">
                              <strong>{translateText("Proof file")} {file.position + 1}</strong>
                              <small>{file.contentType} · {file.sizeBytes.toLocaleString()} bytes · {translateText("Link expires")} {formatQuestDate(file.urlExpiresAt)}</small>
                            </span>
                            <span>{translateText("Open")}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
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
                    <small>{entry.kind === "FIELD_EDIT" ? `${questEditValueText(entry.fieldName, entry.oldValue)} → ${questEditValueText(entry.fieldName, entry.newValue)}` : detailLabel}</small>
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

      {!recordLayout ? <Section title="Dispute and risk" variant={sectionVariant}><div className="quest-summary-context-section [&>p:not(.audit-note):not(.field-error)]:m-0 [&>p:not(.audit-note):not(.field-error)]:text-admin-muted">{disputeRiskContent}</div></Section> : null}
      </div>

      <aside className={recordLayout ? "grid min-w-0 !grid-cols-1 gap-[18px]" : "contents"}>
      {recordLayout ? (
        <>
          <Section title="Hirer" variant={sectionVariant}>
            <div className={adminRecordSideFacts}>
              <div>
                <span>{translateText("Name")}</span>
                <strong><Link href={memberRoutes.detail(detail.hirer.memberId)}>{questMemberName(detail.hirer)}</Link></strong>
              </div>
              <div>
                <span>{translateText("Student ID")}</span>
                <strong>{detail.hirer.studentId ?? translateText("Student ID not provided")}</strong>
              </div>
            </div>
            <UiButton asChild variant="outline" className="mt-3 w-full">
              <Link href={memberRoutes.detail(detail.hirer.memberId)}>{translateText("See Member profile")}</Link>
            </UiButton>
          </Section>

          <Section title="Schedule and location" variant={sectionVariant}>
            <div className={adminRecordFacts}>
              <Fact label={translateText("Starts")}>{formatQuestDate(detail.startTime)}</Fact>
              <Fact label={translateText("Due")}>{formatQuestDate(detail.dueAt)}</Fact>
            </div>
            <div className="mt-4 grid gap-1">
              <span className="block text-xs font-semibold leading-[1.4] text-admin-muted">{translateText("Location")}</span>
              <strong className="text-sm font-medium leading-[1.4]">
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
            <div className="quest-summary-context-section [&>p:not(.audit-note):not(.field-error)]:m-0 [&>p:not(.audit-note):not(.field-error)]:text-admin-muted">{disputeRiskContent}</div>
          </Section>
        </>
      ) : null}

      {commandActions}
      </aside>
    </div>
  );
}

export function QuestDetailPage({ questId, presentation = "page", initialData }: QuestDetailPageProps) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const [detail, setDetail] = useState<QuestDetailView>(initialData.detail);
  const [finance, setFinance] = useState<QuestFinanceView | null>(initialData.finance);
  const [disputeLookupError, setDisputeLookupError] = useState<string | null>(initialData.disputeLookupError ?? null);
  const [command, setCommand] = useState<QuestCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [openingDisputeBatch, setOpeningDisputeBatch] = useState(false);
  const commandMutation = useQuestCommandMutation();
  const openDisputeMutation = useQuestOpenDisputeMutation();

  useEffect(() => {
    setDetail(initialData.detail);
    setFinance(initialData.finance);
    setDisputeLookupError(initialData.disputeLookupError ?? null);
    setDisputeError(null);
  }, [initialData]);

  function openCommand(nextCommand: QuestCommand) {
    setCommandError(null);
    setCommand(nextCommand);
  }

  function closeDrawer() {
    router.back();
  }

  async function openDispute(disputeCommands: AdminDisputeOpenCommand[]) {
    if (disputeLookupError || openingDisputeBatch || openDisputeMutation.isPending || detail.state !== "QUEST_FAILED") return;
    const workerIds = disputeCommands.map((disputeCommand) => disputeCommand.workerId);
    if (!disputeCommands.length || new Set(workerIds).size !== workerIds.length) return;
    if (disputeCommands.some((disputeCommand) => !detail.assignments.some((assignment) => assignment.worker.id === disputeCommand.workerId))) return;
    if (workerIds.some((workerId) => detail.disputeCases.some((disputeCase) => disputeCase.filerUserId === workerId))) return;
    const workerNames = workerIds.map((workerId) => {
      const worker = detail.assignments.find((assignment) => assignment.worker.id === workerId)?.worker;
      return worker ? questMemberName(worker) : null;
    });
    if (workerNames.some((name) => !name)) return;
    const confirmedWorkerNames = workerNames.filter((name): name is string => Boolean(name));
    const confirmation = confirmedWorkerNames.length === 1
      ? `Open a Dispute Case for ${confirmedWorkerNames[0]}?`
      : `Open separate Dispute Cases for ${confirmedWorkerNames.join(", ")}?`;
    if (!window.confirm(confirmation)) return;

    setOpeningDisputeBatch(true);
    setDisputeError(null);
    const results: AdminDisputeOpenResult[] = [];
    let openError: unknown = null;
    let requestFailed = false;
    try {
      // Stop at the first failure so the page can keep any cases that already opened.
      for (const disputeCommand of disputeCommands) {
        try {
          results.push(await openDisputeMutation.mutateAsync({ questId: detail.id, ...disputeCommand }));
        } catch (error: unknown) {
          openError = error;
          requestFailed = true;
          break;
        }
      }

      if (results.length) {
        setDetail((current) => ({
          ...current,
          disputeCases: [
            ...current.disputeCases.filter((disputeCase) => !results.some((result) => result.id === disputeCase.id)),
            ...results.map((result) => ({
              id: result.id,
              displayId: "",
              questId: result.questId,
              category: result.category,
              filerUserId: result.filerUserId,
              status: result.status,
              createdAt: result.createdAt,
              updatedAt: result.updatedAt,
            })),
          ],
        }));
      }

      if (requestFailed) {
        const message = errorMessage(openError, "Dispute Case could not be opened.");
        setDisputeError(results.length
          ? `${translateText("Some Dispute Cases opened before another request failed.")} ${message}`
          : message);
        return;
      }

      if (presentation === "drawer") closeDrawer();
      else router.refresh();
    } finally {
      setOpeningDisputeBatch(false);
    }
  }

  async function submitCommand(submission: QuestCommandSubmission) {
    if (!detail || !command || command !== submission.command) return;
    setCommandError(null);
    try {
      await commandMutation.mutateAsync({
        detail,
        submission,
        idempotencyKey: newIdempotencyKey(submission.command, detail.id),
      });
      setCommand(null);
      router.refresh();
    } catch (commandErrorValue: unknown) {
      setCommandError(errorMessage(commandErrorValue, "Quest command failed."));
    }
  }

  const content = <QuestDetailContent detail={detail} finance={finance} workerReviews={initialData.workerReviews} disputeLookupError={disputeLookupError} onCommand={openCommand} onOpenDispute={openDispute} disputePending={openingDisputeBatch || openDisputeMutation.isPending} disputeError={disputeError} showFullDetailLink={presentation === "drawer"} recordLayout={presentation === "page"} />;

  if (presentation === "drawer") {
    return (
      <>
        <AdminDrawer ariaLabel={translateText("Close Quest detail")} title={detail.title} titleId="quest-drawer-title" subtitle={<>{translateText("Quest")} {detail.displayId || "—"} · {translateText("Quest detail drawer")}</>} className="quest-drawer" openerAttribute="data-quest-drawer-trigger" openerValue={questId} escapeDisabled={Boolean(command)} onClose={closeDrawer}>
          {content}
        </AdminDrawer>
        {command ? <QuestCommandDialog detail={detail} command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandMutation.isPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page quest-detail-page max-w-[1080px]" tabIndex={-1}>
      <AdminRecordHeader
        breadcrumbHref={questRoutes.list()}
        breadcrumbLabel={translateText("Quests")}
        recordId={detail.displayId || translateText("Not provided by the Admin API")}
        title={detail.title}
        subtitle={translateText(detail.participation === "GROUP" ? "Team" : "Solo")}
        actions={<UiButton asChild size="lg" variant="outline"><Link href={questRoutes.list()}>{translateText("Back to Quests")}</Link></UiButton>}
      />
      <QuestRecordAlert detail={detail} />
      <div className="min-w-0">{content}</div>
      {command ? <QuestCommandDialog detail={detail} command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandMutation.isPending} /> : null}
    </main>
  );
}

export { AdminQuestPage } from "./quest-board-page";
