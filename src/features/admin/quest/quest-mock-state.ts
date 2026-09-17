import type { AdminApiQuestStatus, AdminQuestReasonCode } from "../api/admin-api";
import { QUEST_STATES, type QuestState } from "../domain/rulebook";
import type { QuestDetailView, QuestTimelineView } from "./quest-model";

const QUEST_MOCK_STATE_KEY = "kuquest-admin-quest-mock-state-v1";

export type QuestMockStorage = Pick<Storage, "getItem" | "setItem">;
export type QuestMockOverride = Pick<
  QuestDetailView,
  "state" | "hiddenAt" | "version" | "updatedAt" | "timeline" | "adminActions"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuestState(value: unknown): value is QuestState {
  return typeof value === "string" && QUEST_STATES.includes(value as QuestState);
}

function isTimelineStatus(value: unknown): value is AdminApiQuestStatus | null {
  return value === null || (typeof value === "string" && value.startsWith("QUEST_"));
}

function isTimeline(value: unknown): value is QuestTimelineView[] {
  return Array.isArray(value) && value.every((entry) => (
    isRecord(entry)
    && typeof entry.event === "string"
    && isTimelineStatus(entry.status)
    && typeof entry.occurredAt === "string"
    && (entry.actorId === null || typeof entry.actorId === "string")
    && (entry.reasonCode === null || typeof entry.reasonCode === "string")
  ));
}

function isAdminActions(value: unknown): value is QuestDetailView["adminActions"] {
  return Array.isArray(value) && value.every((entry) => (
    isRecord(entry)
    && typeof entry.id === "string"
    && isRecord(entry.admin)
    && typeof entry.admin.id === "string"
    && typeof entry.admin.firstName === "string"
    && typeof entry.admin.lastName === "string"
    && typeof entry.action === "string"
    && (entry.reasonCode === null || typeof entry.reasonCode === "string")
    && typeof entry.createdAt === "string"
  ));
}

function isOverride(value: unknown): value is QuestMockOverride {
  return isRecord(value)
    && isQuestState(value.state)
    && (value.hiddenAt === null || typeof value.hiddenAt === "string")
    && typeof value.version === "number"
    && Number.isInteger(value.version)
    && typeof value.updatedAt === "string"
    && isTimeline(value.timeline)
    && isAdminActions(value.adminActions);
}

function readOverrides(storage: QuestMockStorage): Record<string, QuestMockOverride> {
  try {
    const raw = storage.getItem(QUEST_MOCK_STATE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isOverride(value)),
    ) as Record<string, QuestMockOverride>;
  } catch {
    return {};
  }
}

export function readMockQuestOverride(
  storage: QuestMockStorage,
  questId: string,
): QuestMockOverride | null {
  return readOverrides(storage)[questId] ?? null;
}

export function saveMockQuestOverride(
  storage: QuestMockStorage,
  questId: string,
  override: QuestMockOverride,
): void {
  try {
    storage.setItem(QUEST_MOCK_STATE_KEY, JSON.stringify({
      ...readOverrides(storage),
      [questId]: override,
    }));
  } catch {
    // The in-memory detail remains useful when browser storage is unavailable.
  }
}

export function applyMockQuestOverride(
  detail: QuestDetailView,
  override: QuestMockOverride | null,
): QuestDetailView {
  return override ? { ...detail, ...override } : detail;
}

export function questMockOverrideFromDetail(detail: QuestDetailView): QuestMockOverride {
  return {
    state: detail.state,
    hiddenAt: detail.hiddenAt,
    version: detail.version,
    updatedAt: detail.updatedAt,
    timeline: detail.timeline,
    adminActions: detail.adminActions,
  };
}

export function applyMockQuestCommand(
  detail: QuestDetailView,
  command: "hide" | "restore" | "terminate",
  reason: string,
  reasonCode: AdminQuestReasonCode,
  occurredAt: string,
): QuestDetailView {
  const nextState: QuestState = command === "terminate" ? "QUEST_CANCELLED" : detail.state;
  const nextHiddenAt = command === "hide" ? occurredAt : command === "restore" ? null : detail.hiddenAt;
  const timeline = command === "terminate"
    ? [...detail.timeline, {
        event: "QUEST_STATUS_CHANGED",
        status: nextState,
        occurredAt,
        actorId: "mock-admin",
        reasonCode,
      }]
    : detail.timeline;
  const adminActions = [...detail.adminActions, {
    id: `local-${command}-${Date.now()}`,
    admin: { id: "mock-admin", firstName: "Mock", lastName: "Admin" },
    action: command === "hide" ? "QUEST_HIDDEN" : command === "restore" ? "QUEST_RESTORED" : "QUEST_TERMINATED",
    reasonCode,
    createdAt: occurredAt,
  }];

  return {
    ...detail,
    state: nextState,
    hiddenAt: nextHiddenAt,
    version: detail.version + 1,
    updatedAt: occurredAt,
    timeline,
    adminActions,
  };
}
