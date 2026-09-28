import {
  ADMIN_DEMO_DATA_KEY,
  type BrowserStorage,
} from "../data/admin-demo-data-adapter";
import { pageMockItems } from "../data/mock-pagination";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import type { PersistedAdminData } from "../data/admin-records";
import {
  memberModelFromMockRecord,
  mockMemberModerationSummaryFromRecord,
  memberPenaltyForChoice,
  nextPenaltyFor,
  type MemberActionOutcome,
  type MemberModel,
  type MemberPenaltyChoice,
} from "./member-model";

export type MemberMockPage = {
  source: "mock";
  items: MemberModel[];
  nextCursor: string | null;
};

// Keep the first mock page small so the Load more flow is easy to exercise.
export const MEMBER_MOCK_PAGE_SIZE = 3;

function persist(storage: BrowserStorage, data: PersistedAdminData): void {
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(data));
  } catch {
    // Keep the in-memory demo record useful when browser storage is full.
  }
}

function memberRecord(data: PersistedAdminData, memberId: string): Record<string, unknown> | null {
  const record = data.collections.users.find((candidate) => candidate.id === memberId);
  return record ? record as Record<string, unknown> : null;
}

export function findMemberModerationSummaryFromMockData(
  data: PersistedAdminData,
  memberId: string,
) {
  const record = memberRecord(data, memberId);
  return record ? mockMemberModerationSummaryFromRecord(record, data) : null;
}

export function findMemberFromMockData(data: PersistedAdminData, memberId: string): MemberModel | null {
  const record = memberRecord(data, memberId);
  return record ? memberModelFromMockRecord(record, data) : null;
}

export function loadMembersFromMock(storage: BrowserStorage, cursor?: string): MemberMockPage {
  const data = loadDashboardData(storage);
  // Page the raw records before building detail-heavy Member models. Building
  // every Member model scans related Quest, Report Case, Conduct Report, and
  // Payout records. That cost becomes visible when the demo fixture contains
  // hundreds of records, while the Admin only needs the current page.
  const page = pageMockItems(data.collections.users, cursor, MEMBER_MOCK_PAGE_SIZE);
  const models = page.items.flatMap((record) => {
    const model = memberModelFromMockRecord(record, data, { summaryOnly: true });
    return model ? [model] : [];
  });
  return {
    source: "mock",
    items: models,
    nextCursor: page.nextCursor,
  };
}

/** Load the complete mock Member collection in one storage read for local pagination. */
export function loadAllMembersFromMock(storage: BrowserStorage): MemberMockPage {
  const data = loadDashboardData(storage);
  const items = data.collections.users.flatMap((record) => {
    const model = memberModelFromMockRecord(record, data, { summaryOnly: true });
    return model ? [model] : [];
  });
  return { source: "mock", items, nextCursor: null };
}

export function findMemberFromMock(storage: BrowserStorage, memberId: string): MemberModel | null {
  return findMemberFromMockData(loadDashboardData(storage), memberId);
}

export function saveMemberNote(
  storage: BrowserStorage,
  memberId: string,
  note: string,
  actor = "Admin",
): MemberModel | null {
  const data = loadDashboardData(storage);
  const record = memberRecord(data, memberId);
  if (!record) return null;
  const notes = Array.isArray(record.adminNotes) ? record.adminNotes : [];
  record.adminNotes = [
    { at: new Date().toISOString(), by: actor, note },
    ...notes,
  ];
  persist(storage, data);
  return memberModelFromMockRecord(record, data);
}

export type MemberViolationContext = {
  caseId?: string;
  caseType?: "Report Case" | "Conduct Report";
  caseHref?: string;
};

function addMemberHistory(
  record: Record<string, unknown>,
  outcome: MemberActionOutcome,
  reason: string,
  context?: MemberViolationContext,
  previousWalletStatus?: string,
  appliedAt = new Date(),
): void {
  const history = Array.isArray(record.moderationHistory) ? record.moderationHistory : [];
  record.moderationHistory = [
    {
      event: `${outcome.label} applied`,
      at: appliedAt.toISOString(),
      by: "Admin",
      reason,
      previousStatus: previousWalletStatus ?? record.walletStatus ?? record.status,
      newStatus: outcome.walletStatus,
      outcome: outcome.label,
      ...(outcome.durationDays ? { durationDays: outcome.durationDays } : {}),
      ...(outcome.durationDays ? { expiresAt: outcome.expiresAt } : {}),
      ...(context?.caseId ? { caseId: context.caseId } : {}),
      ...(context?.caseType ? { caseType: context.caseType } : {}),
      ...(context?.caseHref ? { caseHref: context.caseHref } : {}),
    },
    ...history,
  ];
}

function recordMemberViolationWithOutcome(
  data: PersistedAdminData,
  memberId: string,
  reason: string,
  note: string,
  context: MemberViolationContext | undefined,
  selectedPenalty?: MemberPenaltyChoice,
  manualChoiceRequired = false,
): { model: MemberModel; outcome: MemberActionOutcome } | null {
  const record = memberRecord(data, memberId);
  if (!record) return null;
  const current = memberModelFromMockRecord(record, data);
  if (!current) return null;
  const automaticOutcome = nextPenaltyFor(current);
  if (manualChoiceRequired && !automaticOutcome.exempted && !selectedPenalty) {
    throw new Error("Select a penalty to apply.");
  }
  if (selectedPenalty && automaticOutcome.exempted) {
    throw new Error("This violation is exempt. No penalty can be selected.");
  }
  const outcome = selectedPenalty ? memberPenaltyForChoice(current, selectedPenalty) : automaticOutcome;
  const appliedAt = new Date();
  const expiresAt = outcome.durationDays
    ? new Date(appliedAt.getTime() + outcome.durationDays * 86_400_000).toISOString()
    : null;
  const appliedOutcome = { ...outcome, expiresAt };
  const previousWalletStatus = current.walletStatus ?? undefined;
  const previousState = {
    memberStatus: current.memberStatus ?? "Normal",
    walletStatus: current.walletStatus ?? "ACTIVE",
    statusReason: record.statusReason ?? null,
    statusAppliedAt: record.statusAppliedAt ?? null,
    statusAppliedBy: record.statusAppliedBy ?? null,
    redFlagExpiresAt: record.redFlagExpiresAt ?? null,
    banExpiresAt: record.banExpiresAt ?? null,
    penalty: record.penalty ?? null,
    age: record.age ?? null,
  };
  record.confirmedViolationCount = (current.confirmedViolationCount ?? 0) + 1;
  record.memberStatus = outcome.memberStatus;
  record.walletStatus = outcome.walletStatus;
  record.status = outcome.walletStatus;
  record.tone = outcome.exempted ? "success" : outcome.walletStatus === "ACTIVE" ? "warning" : "danger";
  record.statusReason = reason;
  record.statusAppliedAt = appliedAt.toISOString();
  record.statusAppliedBy = "Admin";
  record.redFlagExpiresAt = outcome.memberStatus === "Flag" ? expiresAt : null;
  record.banExpiresAt = outcome.memberStatus === "Temp Ban" ? expiresAt : null;
  if (outcome.exempted) {
    if (current.newUserExemptionRemaining > 0) {
      record.newUserExemptionRemaining = current.newUserExemptionRemaining - 1;
    } else {
      record.postBanExemptionRemaining = Math.max(0, current.postBanExemptionRemaining - 1);
    }
    delete record.penalty;
  } else {
    record.penalty = {
      label: outcome.label,
      reason,
      recordedAt: appliedAt.toISOString(),
      appliedBy: "Admin",
      ...(outcome.durationDays ? { durationDays: outcome.durationDays } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      previousState,
    };
  }
  record.age = expiresAt ? `${outcome.label} · expires ${expiresAt}` : outcome.label;
  addMemberHistory(record, appliedOutcome, reason, context, previousWalletStatus, appliedAt);
  if (note.trim()) {
    const notes = Array.isArray(record.adminNotes) ? record.adminNotes : [];
    record.adminNotes = [{ at: appliedAt.toISOString(), by: "Admin", note: note.trim() }, ...notes];
  }
  const model = memberModelFromMockRecord(record, data);
  if (!model) return null;
  if (previousWalletStatus === outcome.walletStatus) {
    model.statusReason = reason;
  }
  return { model, outcome: appliedOutcome };
}

/** Apply one confirmed violation with the automatic outcome for case decisions. */
export function recordMemberViolationInData(
  data: PersistedAdminData,
  memberId: string,
  reason: string,
  note = "",
  context?: MemberViolationContext,
): { model: MemberModel; outcome: MemberActionOutcome } | null {
  return recordMemberViolationWithOutcome(data, memberId, reason, note, context);
}

/** Apply a Member-profile violation with the Admin-selected penalty. */
export function recordMemberViolationFromMemberInData(
  data: PersistedAdminData,
  memberId: string,
  reason: string,
  note: string,
  selectedPenalty: MemberPenaltyChoice | null,
): { model: MemberModel; outcome: MemberActionOutcome } | null {
  return recordMemberViolationWithOutcome(data, memberId, reason, note, undefined, selectedPenalty ?? undefined, true);
}

export function recordMemberViolation(
  storage: BrowserStorage,
  memberId: string,
  reason: string,
  note = "",
  context?: MemberViolationContext,
): { model: MemberModel; outcome: MemberActionOutcome } | null {
  const data = loadDashboardData(storage);
  const result = recordMemberViolationInData(data, memberId, reason, note, context);
  if (!result) return null;
  persist(storage, data);
  return result;
}

export function recordMemberViolationFromMember(
  storage: BrowserStorage,
  memberId: string,
  reason: string,
  note: string,
  selectedPenalty: MemberPenaltyChoice | null,
): { model: MemberModel; outcome: MemberActionOutcome } | null {
  const data = loadDashboardData(storage);
  const result = recordMemberViolationFromMemberInData(data, memberId, reason, note, selectedPenalty);
  if (!result) return null;
  persist(storage, data);
  return result;
}

export type MemberPenaltyRemovalResult = {
  model: MemberModel;
  previousStatus: string;
  nextStatus: string;
};

/**
 * Remove one active Mock Member penalty while keeping an immutable reversal
 * entry in the moderation history. The real Admin API does not expose this
 * command; the UI uses it only for Mock fixture workflows.
 */
export function removeMemberPenaltyInData(
  data: PersistedAdminData,
  memberId: string,
  reason: string,
): MemberPenaltyRemovalResult | null {
  const record = memberRecord(data, memberId);
  if (!record) return null;
  const current = memberModelFromMockRecord(record, data);
  if (!current || current.source !== "mock" || current.confirmedViolationCount === null || current.confirmedViolationCount < 1) {
    return null;
  }
  if (!current.memberStatus || current.memberStatus === "Normal") return null;

  const previousStatus = current.memberStatus;
  const nextViolationCount = Math.max(0, current.confirmedViolationCount - 1);
  const automaticMemberStatus = nextViolationCount >= 3
    ? "Perm Ban"
    : nextViolationCount === 2
      ? "Temp Ban"
      : nextViolationCount === 1
        ? "Flag"
        : "Normal";
  const activePenalty = record.penalty && typeof record.penalty === "object" && !Array.isArray(record.penalty)
    ? record.penalty as Record<string, unknown>
    : null;
  const previousState = activePenalty?.previousState && typeof activePenalty.previousState === "object" && !Array.isArray(activePenalty.previousState)
    ? activePenalty.previousState as Record<string, unknown>
    : null;
  const nextMemberStatus = typeof previousState?.memberStatus === "string"
    ? previousState.memberStatus
    : automaticMemberStatus;
  const nextWalletStatus = typeof previousState?.walletStatus === "string"
    ? previousState.walletStatus
    : nextMemberStatus === "Temp Ban" || nextMemberStatus === "Perm Ban" ? "FROZEN" : "ACTIVE";
  const now = new Date().toISOString();
  const history = Array.isArray(record.moderationHistory) ? record.moderationHistory : [];

  record.confirmedViolationCount = nextViolationCount;
  record.memberStatus = nextMemberStatus;
  record.walletStatus = nextWalletStatus;
  record.status = nextWalletStatus;
  record.tone = nextMemberStatus === "Normal" ? "success" : nextWalletStatus === "ACTIVE" ? "warning" : "danger";
  record.statusReason = typeof previousState?.statusReason === "string" ? previousState.statusReason : undefined;
  record.statusAppliedAt = typeof previousState?.statusAppliedAt === "string" ? previousState.statusAppliedAt : now;
  record.statusAppliedBy = typeof previousState?.statusAppliedBy === "string" ? previousState.statusAppliedBy : "Admin";
  record.redFlagExpiresAt = typeof previousState?.redFlagExpiresAt === "string" ? previousState.redFlagExpiresAt : undefined;
  record.banExpiresAt = typeof previousState?.banExpiresAt === "string" ? previousState.banExpiresAt : undefined;
  if (previousState && previousState.penalty && typeof previousState.penalty === "object" && !Array.isArray(previousState.penalty)) {
    record.penalty = previousState.penalty;
  } else {
    delete record.penalty;
  }
  record.age = typeof previousState?.age === "string" ? previousState.age : nextMemberStatus === "Normal" ? "No active penalty" : nextMemberStatus;
  record.moderationHistory = [
    {
      event: "Member penalty removed",
      at: now,
      by: "Admin",
      reason,
      previousStatus,
      newStatus: nextMemberStatus,
      outcome: "Penalty removed",
    },
    ...history,
  ];

  const model = memberModelFromMockRecord(record, data);
  if (!model) return null;
  return { model, previousStatus, nextStatus: nextMemberStatus };
}

export function removeMemberPenalty(
  storage: BrowserStorage,
  memberId: string,
  reason: string,
): MemberPenaltyRemovalResult | null {
  const data = loadDashboardData(storage);
  const result = removeMemberPenaltyInData(data, memberId, reason);
  if (!result) return null;
  persist(storage, data);
  return result;
}
