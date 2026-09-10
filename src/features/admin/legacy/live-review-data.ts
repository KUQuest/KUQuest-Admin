import {
  adminApi,
  ADMIN_API_PAYOUT_STATUSES,
  type AdminQuest,
  type AdminQuestCommandResult,
  type AdminQuestDetail,
  type AdminApiQuestStatus,
  type AdminDisputeCase,
  type AdminPayout,
  type AdminPayoutDetail,
  type AdminApiPayoutStatus,
} from "../api/admin-api";
import { ApiError } from "../../../lib/api/client";
import type { PayoutStatus, QuestState } from "../domain/rulebook";
import type { LegacyHistoryEntry, LegacyRecord } from "./runtime";
import { data } from "./runtime-data";

type LiveResourceState = {
  loading: boolean;
  error: string | null;
  backgroundLoading: boolean;
};

export type LiveResourceView = "payouts" | "disputes" | "quests";
export const LIVE_RESOURCE_UPDATED_EVENT = "kuquest-live-resource-updated";

export const liveResourceState: Record<"payouts" | "disputes" | "quests", LiveResourceState> = {
  payouts: { loading: false, error: null, backgroundLoading: false },
  disputes: { loading: false, error: null, backgroundLoading: false },
  quests: { loading: false, error: null, backgroundLoading: false },
};

let mockDisputesFallback: LegacyRecord[] | null = null;
let mockQuestsFallback: LegacyRecord[] | null = null;

function apiErrorMessage(error: unknown, resource: string): string {
  if (error instanceof ApiError) {
    return `${resource} API unavailable (HTTP ${error.status}). ${error.message}`;
  }
  return `${resource} API unavailable. ${error instanceof Error ? error.message : "Request failed."}`;
}

function replaceCollection(view: "quests" | "payouts", records: LegacyRecord[]): void {
  data[view].splice(0, data[view].length, ...records);
}

function notifyLiveResourceUpdated(view: LiveResourceView): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LIVE_RESOURCE_UPDATED_EVENT, { detail: { view } }));
}

function toneForPayout(status: PayoutStatus): string {
  if (status === "PENDING_ADMIN_APPROVAL") return "warning";
  if (status === "SUCCEEDED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "CANCELLED") return "cancelled";
  return "info";
}

export function canonicalPayoutStatusForApi(status: AdminApiPayoutStatus): PayoutStatus {
  if (status === "CREATING") return "SUBMITTED_TO_PROVIDER";
  if (status === "PENDING" || status === "AWAITING_RECONCILIATION") return "PROVIDER_PENDING";
  if (status === "COMPLETED") return "SUCCEEDED";
  return status;
}

function apiPayoutStatusesForCanonical(status: PayoutStatus): AdminApiPayoutStatus[] {
  if (status === "SUBMITTED_TO_PROVIDER") return ["CREATING"];
  if (status === "PROVIDER_PENDING") return ["PENDING", "AWAITING_RECONCILIATION"];
  if (status === "SUCCEEDED") return ["COMPLETED"];
  return [status];
}

function dateTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })} ICT`;
}

function satangToBaht(value: number): number {
  return value / 100;
}

function memberName(member: { firstName: string; lastName: string; email: string }): string {
  return `${member.firstName} ${member.lastName}`.trim() || member.email;
}

function questTone(status: QuestState): string {
  if (status === "QUEST_FAILED") return "danger";
  if (status === "QUEST_CANCELLED") return "cancelled";
  if (status === "QUEST_COMPLETED") return "success";
  if (status === "QUEST_IN_PROGRESS") return "info";
  if (status === "QUEST_ASSIGNED") return "assigned";
  if (status === "QUEST_DRAFT") return "neutral";
  return "success";
}

export function canonicalQuestStateForApi(status: AdminApiQuestStatus): QuestState {
  switch (status) {
    case "QUEST_AWAITING_CONSENT":
      return "QUEST_ASSIGNED";
    case "QUEST_SUBMITTED":
    case "QUEST_REWORK":
      return "QUEST_IN_PROGRESS";
    case "QUEST_APPROVED":
      return "QUEST_COMPLETED";
    case "QUEST_DISPUTED":
      return "QUEST_FAILED";
    default:
      return status as QuestState;
  }
}

function questActivityFromSummary(quest: AdminQuest): string[] {
  const status = canonicalQuestStateForApi(quest.questStatus);
  return [`${status} · ${dateTimeLabel(quest.updatedAt)} · Current Quest State recorded by the Admin API.`];
}

function questRecordFromApi(quest: AdminQuest, detail?: AdminQuestDetail): LegacyRecord {
  const status = canonicalQuestStateForApi(quest.questStatus);
  const fundingTotalSatang = detail?.questFundingTotalSatang ?? quest.questFundingTotalSatang;
  const rewardSatang = detail?.rewardSatang ?? quest.rewardSatang;
  const hirer = memberName(quest.hirer);
  const applications = detail?.candidates.applications.map((application) => [
    memberName(application.worker),
    application.applicationStatus,
    "Worker",
  ] as [string, string, string]) ?? [];
  const assignedParticipants = detail?.assignments.map((assignment) => [
    memberName(assignment.worker),
    assignment.assignmentStatus,
    "Worker",
  ] as [string, string, string]) ?? [];
  const selectedParticipant = detail?.assignments[0]
    ? memberName(detail.assignments[0].worker)
    : applications.find((application) => application[1] === "APPLICATION_SELECTED")?.[0];
  const activity = detail?.adminActions.length
    ? detail.adminActions.map((action) => `${action.action} · ${dateTimeLabel(action.createdAt)} · ${action.reasonCode ?? "No reason code"}`)
    : questActivityFromSummary(quest);
  const proof = detail?.proofSubmissions.flatMap((submission) => {
    const submitted = dateTimeLabel(submission.submittedAt);
    if (submission.files.length) {
      return submission.files.map((file) => `${file.fileId} · ${file.contentType} · ${file.sizeBytes} bytes · submitted ${submitted}`);
    }
    return [`${submission.content || "Proof submission"} · ${submission.submissionStatus} · submitted ${submitted}`];
  });
  const latestEditRequest = detail?.editHistory.findLast((entry) => entry.kind === "EDIT_REQUEST");
  const editHistory = detail?.editHistory.map((entry) => entry.kind === "EDIT_REQUEST"
    ? `${entry.requestStatus ?? "EDIT_REQUEST"} · ${dateTimeLabel(entry.createdAt ?? quest.updatedAt)}`
    : `${entry.fieldName ?? "Quest field"} edited · ${dateTimeLabel(entry.editedAt ?? quest.updatedAt)}`);
  const locationLabels = detail?.locations
    .map(({ label }) => label?.trim())
    .filter((label): label is string => Boolean(label)) ?? [];

  return {
    id: quest.id,
    title: quest.title,
    person: hirer,
    other: detail?.tagId ? `Tag ${detail.tagId}` : "Tag not provided by the Admin API",
    status,
    questState: status,
    tone: questTone(status),
    amount: fundingTotalSatang === null ? 0 : satangToBaht(fundingTotalSatang),
    age: dateTimeLabel(quest.updatedAt),
    version: detail?.version ?? quest.version,
    hiddenAt: detail?.hiddenAt ?? quest.hiddenAt,
    hiddenByAdminId: detail?.hiddenByAdminId ?? quest.hiddenByAdminId,
    fundingTotalSatang: fundingTotalSatang ?? undefined,
    questRewardSatang: rewardSatang ?? undefined,
    platformFeeSatang: detail?.platformFeePerWorkerSatang ?? undefined,
    platformFeeBps: detail?.platformFeeBps ?? undefined,
    createdAt: quest.createdAt,
    dueAt: quest.dueAt ?? undefined,
    requestedAt: dateTimeLabel(quest.createdAt),
    apiBacked: true,
    description: detail?.description ?? "No Quest description recorded by the Admin API.",
    giver: [hirer, quest.hirer.email, `Member ID · ${quest.hirer.id}`],
    location: locationLabels.length
      ? [locationLabels.join(" · "), "Loaded from the Admin API."]
      : ["Location not provided by the Admin API", "Review the Quest record for available location data."],
    schedule: [
      dateTimeLabel(quest.startTime),
      quest.dueAt ? dateTimeLabel(quest.dueAt) : "Due date not provided by the Admin API",
    ],
    activity,
    editHistory,
    applications: applications.length ? applications : assignedParticipants,
    selectedParticipant,
    teamQuest: quest.participation === "GROUP",
    teamSize: detail?.candidates.teams[0]?.members.length ?? quest.headcount,
    teamParticipants: detail?.candidates.teams[0]?.members.map(({ member }) => [memberName(member), "Member"] as [string, string]),
    candidateMode: quest.mode,
    giverAttachments: [],
    proof: proof ?? [],
    editRequestStatus: latestEditRequest?.kind === "EDIT_REQUEST" ? latestEditRequest.requestStatus : undefined,
    tagId: detail?.tagId ?? undefined,
    condition: detail?.condition.text,
    proofRequired: detail?.proofRequired,
    fundingReservationId: detail?.fundingReservationId ?? undefined,
    policyRevisionId: detail?.policyRevisionId ?? undefined,
    questEscrowSatang: detail?.questEscrowSatang ?? undefined,
    cancelledAt: detail?.cancelledAt ?? undefined,
    cancelledByUserId: detail?.cancelledByUserId ?? undefined,
    cancelledByAdminId: detail?.cancelledByAdminId ?? undefined,
  };
}

export function questRecordFromApiSummary(quest: AdminQuest): LegacyRecord {
  return questRecordFromApi(quest);
}

export function mergeLiveQuestCommand(id: string, result: AdminQuestCommandResult): void {
  const record = data.quests.find((candidate) => candidate.id === id);
  if (!record) return;
  const detailFields = {
    description: record.description,
    giver: record.giver,
    location: record.location,
    schedule: record.schedule,
    activity: record.activity,
    editHistory: record.editHistory,
    applications: record.applications,
    selectedParticipant: record.selectedParticipant,
    teamQuest: record.teamQuest,
    teamParticipants: record.teamParticipants,
    teamSize: record.teamSize,
    candidateMode: record.candidateMode,
    giverAttachments: record.giverAttachments,
    proof: record.proof,
    condition: record.condition,
    proofRequired: record.proofRequired,
    fundingReservationId: record.fundingReservationId,
    policyRevisionId: record.policyRevisionId,
    questEscrowSatang: record.questEscrowSatang,
    cancelledAt: record.cancelledAt,
    cancelledByUserId: record.cancelledByUserId,
    cancelledByAdminId: record.cancelledByAdminId,
    tagId: record.tagId,
  };
  Object.assign(record, questRecordFromApi(result.resourceSummary), detailFields, {
    version: result.resourceVersion,
  });
}

export function payoutRecordFromApi(payout: AdminPayout): LegacyRecord {
  const status = canonicalPayoutStatusForApi(payout.payoutStatus);
  const recipient = `${payout.student.firstName} ${payout.student.lastName}`.trim() || payout.student.email;
  const requestedAt = dateTimeLabel(payout.createdAt);
  return {
    id: payout.id,
    title: recipient,
    person: `${payout.bankName} · ${payout.maskedDestinationValue}`,
    other: `${payout.destinationType} · ${payout.student.email}`,
    status,
    payoutStatus: status,
    tone: toneForPayout(status),
    amount: satangToBaht(payout.principalSatang),
    amountSatang: payout.principalSatang,
    age: requestedAt,
    requestedAt,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
    version: payout.version,
    apiBacked: true,
    studentId: payout.student.id,
    principalSatang: payout.principalSatang,
    receiptSatang: payout.receiptSatang,
    maximumFeeSatang: payout.maximumFeeSatang,
    maximumTaxSatang: payout.maximumTaxSatang,
    maximumDebitSatang: payout.maximumDebitSatang,
    actualFeeSatang: payout.actualFeeSatang,
    actualTaxSatang: payout.actualTaxSatang,
    actualDebitSatang: payout.actualDebitSatang,
    bankCode: payout.bankCode,
    bankName: payout.bankName,
    destinationType: payout.destinationType,
    maskedDestinationValue: payout.maskedDestinationValue,
    maskedRoutingValue: payout.maskedRoutingValue,
    providerReference: payout.providerReference,
    providerStatus: payout.providerStatus,
    rejectionReason: payout.rejectionReason,
  };
}

function disputeRecordFromApi(dispute: AdminDisputeCase): LegacyRecord {
  const evidence = (dispute.evidenceRefs || []).map((reference) => `Evidence Reference · ${reference}`);
  const status = dispute.status;
  return {
    id: dispute.id,
    title: `Quest ${dispute.questId}`,
    person: "Hirer not provided by API",
    other: dispute.workerId ? `Worker ${dispute.workerId}` : "Worker not provided by API",
    status,
    disputeCaseStatus: status,
    questState: dispute.questState,
    questId: dispute.questId,
    workerId: dispute.workerId,
    amount: typeof dispute.amountSatang === "number" ? satangToBaht(dispute.amountSatang) : null,
    amountSatang: dispute.amountSatang,
    age: "Date not provided by API",
    disputeDate: "Date not provided by API",
    detail: "Dispute Case data was loaded from the Admin API.",
    evidence,
    evidenceRefs: dispute.evidenceRefs,
    tone: status === "DISPUTE_CASE_PENDING" ? "warning" : "neutral",
    version: dispute.version,
    apiBacked: true,
  };
}

function mergePayouts(items: AdminPayout[]): LegacyRecord[] {
  const uniquePayouts = new Map<string, AdminPayout>();
  items.forEach((payout) => uniquePayouts.set(payout.id, payout));
  return [...uniquePayouts.values()]
    .toSorted((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    .map(payoutRecordFromApi);
}

let payoutsRefreshId = 0;
let payoutsRefreshInFlight: Promise<void> | null = null;

export function refreshLivePayouts(status?: PayoutStatus): Promise<void> {
  if (payoutsRefreshInFlight || liveResourceState.payouts.backgroundLoading) {
    return payoutsRefreshInFlight || Promise.resolve();
  }
  const refresh = refreshLivePayoutsInternal(status);
  const sharedRefresh = refresh.finally(() => {
    if (payoutsRefreshInFlight === sharedRefresh) payoutsRefreshInFlight = null;
  });
  payoutsRefreshInFlight = sharedRefresh;
  return sharedRefresh;
}

async function refreshLivePayoutsInternal(status?: PayoutStatus): Promise<void> {
  const refreshId = ++payoutsRefreshId;
  const state = liveResourceState.payouts;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  replaceCollection("payouts", []);
  try {
    const statuses = status
      ? apiPayoutStatusesForCanonical(status)
      : ADMIN_API_PAYOUT_STATUSES;
    const firstPages = await Promise.all(statuses.map(async (payoutStatus) => ({
      payoutStatus,
      page: await adminApi.listPayouts({ status: payoutStatus, limit: 50, sort: "newest" }),
    })));
    if (refreshId !== payoutsRefreshId) return;
    const firstItems = firstPages.flatMap(({ page }) => page.items);
    replaceCollection("payouts", mergePayouts(firstItems));
    state.loading = false;

    if (firstPages.some(({ page }) => page.nextCursor)) {
      state.backgroundLoading = true;
      void (async () => {
        const laterPages = await Promise.all(firstPages.map(async ({ payoutStatus, page }) => {
          const items: AdminPayout[] = [];
          let cursor = page.nextCursor || undefined;
          while (cursor) {
            const nextPage = await adminApi.listPayouts({ status: payoutStatus, limit: 50, cursor, sort: "newest" });
            items.push(...nextPage.items);
            if (!nextPage.nextCursor || nextPage.nextCursor === cursor) break;
            cursor = nextPage.nextCursor;
          }
          return items;
        }));
        if (refreshId !== payoutsRefreshId) return;
        replaceCollection("payouts", mergePayouts([...firstItems, ...laterPages.flat()]));
        state.backgroundLoading = false;
        notifyLiveResourceUpdated("payouts");
      })().catch(() => {
        if (refreshId === payoutsRefreshId) state.backgroundLoading = false;
      });
    }
  } catch (error) {
    if (refreshId !== payoutsRefreshId) return;
    state.error = apiErrorMessage(error, "Payout");
    state.loading = false;
  }
}

let questsRefreshId = 0;
let questsRefreshInFlight: Promise<void> | null = null;

export function refreshLiveQuests(): Promise<void> {
  if (questsRefreshInFlight || liveResourceState.quests.backgroundLoading) {
    return questsRefreshInFlight || Promise.resolve();
  }
  const refresh = refreshLiveQuestsInternal();
  const sharedRefresh = refresh.finally(() => {
    if (questsRefreshInFlight === sharedRefresh) questsRefreshInFlight = null;
  });
  questsRefreshInFlight = sharedRefresh;
  return sharedRefresh;
}

async function refreshLiveQuestsInternal(): Promise<void> {
  const refreshId = ++questsRefreshId;
  const state = liveResourceState.quests;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  if (!mockQuestsFallback) mockQuestsFallback = [...data.quests];
  replaceCollection("quests", []);
  try {
    const firstPage = await adminApi.listQuests({ limit: 50, sort: "newest" });
    if (refreshId !== questsRefreshId) return;
    replaceCollection("quests", firstPage.items.map(questRecordFromApiSummary));
    state.loading = false;

    if (firstPage.nextCursor) {
      state.backgroundLoading = true;
      void (async () => {
        const items: AdminQuest[] = [];
        let cursor = firstPage.nextCursor || undefined;
        while (cursor) {
          const page = await adminApi.listQuests({ limit: 50, cursor, sort: "newest" });
          items.push(...page.items);
          if (!page.nextCursor || page.nextCursor === cursor) break;
          cursor = page.nextCursor;
        }
        if (refreshId !== questsRefreshId) return;
        replaceCollection("quests", [
          ...data.quests,
          ...items.map(questRecordFromApiSummary),
        ]);
        state.backgroundLoading = false;
        notifyLiveResourceUpdated("quests");
      })().catch(() => {
        if (refreshId === questsRefreshId) state.backgroundLoading = false;
      });
    }
  } catch (error) {
    if (refreshId !== questsRefreshId) return;
    state.error = apiErrorMessage(error, "Quest");
    state.loading = false;
  }
}

export async function loadLiveQuest(questId: string): Promise<void> {
  const state = liveResourceState.quests;
  state.loading = true;
  state.error = null;
  state.backgroundLoading = false;
  if (!mockQuestsFallback) mockQuestsFallback = [...data.quests];
  replaceCollection("quests", []);
  try {
    const detail = await adminApi.getQuest(questId);
    replaceCollection("quests", [questRecordFromApi(detail, detail)]);
  } catch (error) {
    const mockQuest = mockQuestsFallback.find((quest) => quest.id === questId);
    if (mockQuest) replaceCollection("quests", [mockQuest]);
    else state.error = apiErrorMessage(error, "Quest detail");
  } finally {
    state.loading = false;
  }
}

export async function hydrateLiveQuest(record: LegacyRecord): Promise<void> {
  if (!record.apiBacked || record.questDetailLoaded) return;
  record.questDetailLoaded = true;
  try {
    const detail = await adminApi.getQuest(record.id);
    Object.assign(record, questRecordFromApi(detail, detail));
  } catch (error) {
    record.questDetailError = apiErrorMessage(error, "Quest detail");
  }
}

export async function refreshLiveDisputes(): Promise<void> {
  const state = liveResourceState.disputes;
  state.loading = true;
  state.error = null;
  if (!mockDisputesFallback) mockDisputesFallback = [...data.disputes];
  try {
    const page = await adminApi.listDisputes({ limit: 50 });
    data.disputes = page.items.map(disputeRecordFromApi);
  } catch {
    // The Admin API does not expose Dispute Case list/detail routes yet.
    // Keep the seeded Dispute Case records usable until those routes exist.
    data.disputes = mockDisputesFallback;
  } finally {
    state.loading = false;
  }
}

function historyEntryFromApi(entry: AdminPayoutDetail["history"][number]): LegacyHistoryEntry {
  const newStatus = canonicalPayoutStatusForApi(entry.toStatus);
  return {
    event: newStatus,
    at: dateTimeLabel(entry.occurredAt),
    by: entry.actorAdminId || entry.actorUserId || entry.source,
    reason: entry.reason || undefined,
    previousStatus: entry.fromStatus ? canonicalPayoutStatusForApi(entry.fromStatus) : undefined,
    newStatus,
  };
}

export async function hydrateLivePayout(record: LegacyRecord): Promise<void> {
  if (!record.apiBacked || record.payoutHistoryLoaded) return;
  record.payoutHistoryLoaded = true;
  try {
    const detail = await adminApi.getPayout(record.id);
    Object.assign(record, payoutRecordFromApi(detail), {
      payoutHistory: detail.history.map(historyEntryFromApi),
    });
  } catch (error) {
    record.payoutHistoryError = apiErrorMessage(error, "Payout detail");
  }
}

export function payoutServerValue(record: LegacyRecord, field: "principalSatang" | "receiptSatang" | "maximumFeeSatang" | "maximumTaxSatang" | "maximumDebitSatang"): number | null {
  const value = record[field];
  return typeof value === "number" ? satangToBaht(value) : null;
}

export function liveResourceError(view: "payouts" | "disputes" | "quests"): string | null {
  return liveResourceState[view].error;
}
