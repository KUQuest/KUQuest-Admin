import {
  adminApi,
  ADMIN_API_PAYOUT_STATUSES,
  type AdminDisputeCase,
  type AdminPayout,
  type AdminPayoutDetail,
  type AdminApiPayoutStatus,
} from "../api/admin-api";
import { ApiError } from "../../../lib/api/client";
import type { PayoutStatus } from "../domain/rulebook";
import type { LegacyHistoryEntry, LegacyRecord } from "./runtime";
import { data } from "./runtime-data";

type LiveResourceState = {
  loading: boolean;
  error: string | null;
};

export const liveResourceState: Record<"payouts" | "disputes", LiveResourceState> = {
  payouts: { loading: false, error: null },
  disputes: { loading: false, error: null },
};

function apiErrorMessage(error: unknown, resource: string): string {
  if (error instanceof ApiError) {
    return `${resource} API unavailable (HTTP ${error.status}). ${error.message}`;
  }
  return `${resource} API unavailable. ${error instanceof Error ? error.message : "Request failed."}`;
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

async function listAllPayoutsForStatus(status: AdminApiPayoutStatus): Promise<AdminPayout[]> {
  const items: AdminPayout[] = [];
  let cursor: string | undefined;
  do {
    const page = await adminApi.listPayouts({ status, limit: 50, cursor, sort: "newest" });
    items.push(...page.items);
    if (!page.nextCursor || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

export async function refreshLivePayouts(status?: PayoutStatus): Promise<void> {
  const state = liveResourceState.payouts;
  state.loading = true;
  state.error = null;
  data.payouts = [];
  try {
    const statuses = status
      ? apiPayoutStatusesForCanonical(status)
      : ADMIN_API_PAYOUT_STATUSES;
    const payoutLists = await Promise.all(statuses.map(listAllPayoutsForStatus));
    const uniquePayouts = new Map<string, AdminPayout>();
    payoutLists.flat().forEach((payout) => uniquePayouts.set(payout.id, payout));
    data.payouts = [...uniquePayouts.values()]
      .toSorted((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .map(payoutRecordFromApi);
  } catch (error) {
    state.error = apiErrorMessage(error, "Payout");
  } finally {
    state.loading = false;
  }
}

export async function refreshLiveDisputes(): Promise<void> {
  const state = liveResourceState.disputes;
  state.loading = true;
  state.error = null;
  data.disputes = [];
  try {
    const page = await adminApi.listDisputes({ limit: 50 });
    data.disputes = page.items.map(disputeRecordFromApi);
  } catch (error) {
    state.error = apiErrorMessage(error, "Dispute Case");
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

export function liveResourceError(view: "payouts" | "disputes"): string | null {
  return liveResourceState[view].error;
}
