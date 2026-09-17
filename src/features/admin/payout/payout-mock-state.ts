import {
  PAYOUT_STATUSES,
  payoutStatusLabel,
  type PayoutStatus,
} from "../domain/rulebook";
import {
  payoutDecisionContext,
  type PayoutBoardRow,
  type PayoutDetailView,
} from "./payout-model";

const PAYOUT_MOCK_STATE_KEY = "kuquest-admin-payout-mock-state-v1";
export const PAYOUT_MOCK_UPDATED_EVENT = "kuquest:payout-mock-updated";

export type PayoutMockStorage = Pick<Storage, "getItem" | "setItem">;
export type PayoutMockOverride = Pick<
  PayoutDetailView,
  "status" | "version" | "updatedAt" | "cancellationReasonCode" | "history"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPayoutStatus(value: unknown): value is PayoutStatus {
  return typeof value === "string" && PAYOUT_STATUSES.includes(value as PayoutStatus);
}

function isHistory(value: unknown): value is PayoutDetailView["history"] {
  return Array.isArray(value) && value.every((entry) => (
    isRecord(entry)
    && typeof entry.id === "string"
    && (entry.fromStatus === null || isPayoutStatus(entry.fromStatus))
    && isPayoutStatus(entry.toStatus)
    && (entry.actorUserId === null || typeof entry.actorUserId === "string")
    && (entry.actorAdminId === null || typeof entry.actorAdminId === "string")
    && typeof entry.source === "string"
    && (entry.reason === null || typeof entry.reason === "string")
    && typeof entry.occurredAt === "string"
  ));
}

function isOverride(value: unknown): value is PayoutMockOverride {
  return isRecord(value)
    && isPayoutStatus(value.status)
    && typeof value.version === "number"
    && Number.isInteger(value.version)
    && typeof value.updatedAt === "string"
    && (value.cancellationReasonCode === null || typeof value.cancellationReasonCode === "string")
    && isHistory(value.history);
}

function readOverrides(storage: PayoutMockStorage): Record<string, PayoutMockOverride> {
  try {
    const raw = storage.getItem(PAYOUT_MOCK_STATE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isOverride(value)),
    ) as Record<string, PayoutMockOverride>;
  } catch {
    return {};
  }
}

export function readMockPayoutOverride(
  storage: PayoutMockStorage,
  payoutId: string,
): PayoutMockOverride | null {
  return readOverrides(storage)[payoutId] ?? null;
}

export function readMockPayoutOverrides(
  storage: PayoutMockStorage,
): Record<string, PayoutMockOverride> {
  return readOverrides(storage);
}

export function payoutMockOverrideFromDetail(detail: PayoutDetailView): PayoutMockOverride {
  return {
    status: detail.status,
    version: detail.version,
    updatedAt: detail.updatedAt,
    cancellationReasonCode: detail.cancellationReasonCode,
    history: detail.history,
  };
}

export function saveMockPayoutOverride(
  storage: PayoutMockStorage,
  detail: PayoutMockOverride & { id: string },
): void {
  const next = {
    ...readOverrides(storage),
    [detail.id]: {
      status: detail.status,
      version: detail.version,
      updatedAt: detail.updatedAt,
      cancellationReasonCode: detail.cancellationReasonCode,
      history: detail.history,
    },
  };
  try {
    storage.setItem(PAYOUT_MOCK_STATE_KEY, JSON.stringify(next));
  } catch {
    // The in-memory state remains useful when browser storage is unavailable.
  }
}

export function applyMockPayoutOverride(
  detail: PayoutDetailView,
  override: PayoutMockOverride | null,
): PayoutDetailView {
  if (!override) return detail;
  return {
    ...detail,
    ...override,
    decisionContext: payoutDecisionContext(override.status),
  };
}

export function applyMockPayoutOverrideToRow(
  row: PayoutBoardRow,
  override: PayoutMockOverride | null,
): PayoutBoardRow {
  if (!override) return row;
  return {
    ...row,
    status: override.status,
    statusLabel: payoutStatusLabel(override.status),
    version: override.version,
  };
}

export function applyMockPayoutDecision(
  detail: PayoutDetailView,
  command: "approve" | "reject",
  reason: string | null,
  occurredAt: string,
  reasonCode: string | null = reason,
): PayoutDetailView {
  const nextStatus: PayoutStatus = command === "approve" ? "SUBMITTED_TO_PROVIDER" : "CANCELLED";
  return {
    ...detail,
    status: nextStatus,
    decisionContext: payoutDecisionContext(nextStatus),
    version: detail.version + 1,
    updatedAt: occurredAt,
    cancellationReasonCode: command === "reject" ? reasonCode : detail.cancellationReasonCode,
    history: [...detail.history, {
      id: `local-${command}-${Date.now()}`,
      fromStatus: detail.status,
      toStatus: nextStatus,
      actorUserId: null,
      actorAdminId: "mock-admin",
      source: command === "approve" ? "ADMIN_APPROVAL" : "ADMIN_REJECTION",
      reason: command === "reject" ? reason : null,
      occurredAt,
    }],
  };
}
