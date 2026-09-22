import type {
  AdminApiQuestStatus,
  AdminQuest,
  AdminQuestDetail,
  AdminQuestFinance,
  AdminQuestMember,
} from "../api/admin-api";
import { pageCount, pageRows, type BoardPageSize } from "@/lib/board-pagination";
import { formatAdminTimestamp } from "../date-format";
import { questStateFor, questStateLabel, type QuestState } from "../domain/rulebook";

export type QuestMemberView = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type QuestTimelineView = {
  event: string;
  status: AdminApiQuestStatus | null;
  occurredAt: string;
  actorId: string | null;
  reasonCode: string | null;
};

type QuestModeView = "FIRST_COME_FIRST_SERVED" | "CANDIDATE";
type QuestParticipationView = "SINGLE" | "GROUP";

export type QuestDetailView = {
  id: string;
  displayId: string;
  apiVersion: "v1" | "v2";
  version: number;
  title: string;
  state: QuestState;
  mode: QuestModeView;
  participation: QuestParticipationView;
  headcount: number;
  rewardSatang: number | null;
  questFundingTotalSatang: number | null;
  startTime: string;
  dueAt: string | null;
  hiddenAt: string | null;
  hiddenByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  hirer: QuestMemberView;
  description: string | null;
  condition: { text: string; items: Array<{ position: number; text: string }> };
  locations: Array<{ label: string | null }>;
  proofRequired: boolean;
  tagId: string | null;
  fundingReservationId: string | null;
  policyRevisionId: string | null;
  platformFeeBps: number | null;
  platformFeePerWorkerSatang: number | null;
  questEscrowSatang: number | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancelledByAdminId: string | null;
  candidates: {
    applications: Array<{
      id: string;
      worker: QuestMemberView;
      applicationStatus: string;
      reworkLimit: number;
      appliedAt: string;
    }>;
    teams: Array<{
      id: string;
      name: string;
      teamStatus: string;
      reworkLimit: number;
      leaderId: string;
      createdAt: string;
      members: Array<{ member: QuestMemberView; joinedAt: string }>;
    }>;
  };
  assignments: Array<{
    id: string;
    worker: QuestMemberView;
    assignmentStatus: string;
    startedAt: string | null;
    createdAt: string;
  }>;
  images?: Array<{
    imageId: string;
    fileId: string;
    position: number;
    url: string;
    urlExpiresAt: string;
  }>;
  proofSubmissions: Array<{
    id: string;
    worker: QuestMemberView | null;
    team: { id: string; name: string } | null;
    submittedBy: QuestMemberView;
    content: string;
    submissionStatus: string;
    reviewNote: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    files: Array<{ fileId: string; contentType: string; sizeBytes: number; position: number }>;
  }>;
  editHistory: Array<
    | {
        kind: "FIELD_EDIT";
        id: string;
        fieldName: string;
        oldValue: unknown;
        newValue: unknown;
        editedAt: string;
        editedByUserId: string | null;
        editedByAdminId: string | null;
      }
    | {
        kind: "EDIT_REQUEST";
        id: string;
        apiVersion: "v1" | "v2";
        requestStatus: string;
        failureCode: string | null;
        requestedByUserId: string | null;
        proposedChanges: unknown;
        createdAt: string;
        expiresAt: string | null;
        resolvedAt: string | null;
        responses: Array<{
          workerId: string;
          decision: string | null;
          reason: string | null;
          respondedAt: string | null;
        }>;
      }
  >;
  timeline: QuestTimelineView[];
  adminActions: Array<{
    id: string;
    admin: { id: string; firstName: string; lastName: string };
    action: string;
    reasonCode: string | null;
    createdAt: string;
  }>;
};

export type QuestFinanceView = {
  quest: {
    id: string;
    title: string;
    state: QuestState;
    headcount: number;
    rewardSatang: number | null;
    platformFeePerWorkerSatang: number | null;
    questFundingTotalSatang: number | null;
    hirer: {
      id: string;
      firstName: string;
      lastName: string;
      studentId: string | null;
    };
  };
  reservation: {
    id: string;
    status: string;
    totalReservedSatang: number;
    remainingSatang: number;
    createdAt: string;
  } | null;
  transfers: Array<{
    id: string;
    occurredAt: string;
    type: "RESERVE" | "SETTLEMENT" | "RELEASE" | "DISPUTE_SETTLEMENT";
    from: { type: string; id: string; displayName: string };
    to: { type: string; id: string; displayName: string };
    amountSatang: number;
    platformFeeSatang: number;
    description: string;
    ledgerTransactionId: string;
    businessReference: string;
  }>;
  ledgerTransactions: Array<{
    id: string;
    businessReference: string;
    eventType: string;
    description: string | null;
    createdAt: string;
    sealedAt: string | null;
    postings: Array<{
      id: string;
      accountId: string;
      accountType: string;
      walletId: string | null;
      ownerUserId: string | null;
      amountSatang: number;
    }>;
  }>;
};

export const QUEST_BOARD_TABS = [
  { id: "all", label: "All" },
  { id: "team", label: "Team" },
  { id: "solo", label: "Solo" },
  { id: "QUEST_DRAFT", label: "Draft" },
  { id: "QUEST_OPEN", label: "Open" },
  { id: "QUEST_ASSIGNED", label: "Assigned" },
  { id: "QUEST_IN_PROGRESS", label: "In progress" },
  { id: "QUEST_COMPLETED", label: "Completed" },
  { id: "QUEST_CANCELLED", label: "Cancelled" },
  { id: "QUEST_FAILED", label: "Failed" },
] as const;

export type QuestBoardTab = (typeof QUEST_BOARD_TABS)[number]["id"];
export type QuestBoardPageSize = BoardPageSize;
export type QuestSortKey = "id" | "title" | "hirer" | "createdAt" | "reward" | "status";
export type QuestSortDirection = "ascending" | "descending";

export type QuestBoardRow = {
  id: string;
  displayId: string;
  title: string;
  hirerName: string;
  hirerEmail: string;
  state: QuestState;
  stateLabel: string;
  modeLabel: string;
  participationLabel: string;
  rewardSatang: number | null;
  createdAt: string;
  hiddenAt: string | null;
  version: number;
};

/**
 * Keep the canonical Quest identifier for API calls, but use a short stable
 * label when the Admin API does not provide a human-readable display ID.
 */
export function questDisplayIdFor(id: string, displayId?: string | null): string {
  const preferred = displayId?.trim();
  if (preferred) return preferred;

  const canonical = id.trim();
  if (canonical.length <= 24) return canonical;
  return `${canonical.slice(0, 8)}…${canonical.slice(-4)}`;
}

function questMemberViewFromApi(member: AdminQuestMember): QuestMemberView {
  return {
    id: member.id,
    memberId: member.memberId ?? member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
  };
}

export function questDetailViewFromApi(detail: AdminQuestDetail): QuestDetailView {
  const view: QuestDetailView = {
    id: detail.id,
    displayId: questDisplayIdFor(detail.id, detail.displayId),
    apiVersion: detail.apiVersion,
    version: detail.version,
    title: detail.title,
    state: questStateFor(detail.questStatus),
    mode: detail.mode,
    participation: detail.participation,
    headcount: detail.headcount,
    rewardSatang: detail.rewardSatang,
    questFundingTotalSatang: detail.questFundingTotalSatang,
    startTime: detail.startTime,
    dueAt: detail.dueAt,
    hiddenAt: detail.hiddenAt,
    hiddenByAdminId: detail.hiddenByAdminId ?? null,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    hirer: questMemberViewFromApi(detail.hirer),
    description: detail.description,
    condition: {
      text: detail.condition.text,
      items: detail.condition.items.map((item) => ({ position: item.position, text: item.text })),
    },
    locations: detail.locations.map((location) => ({ label: location.label })),
    proofRequired: detail.proofRequired,
    tagId: detail.tagId,
    fundingReservationId: detail.fundingReservationId,
    policyRevisionId: detail.policyRevisionId,
    platformFeeBps: detail.platformFeeBps,
    platformFeePerWorkerSatang: detail.platformFeePerWorkerSatang,
    questEscrowSatang: detail.questEscrowSatang,
    cancelledAt: detail.cancelledAt,
    cancelledByUserId: detail.cancelledByUserId,
    cancelledByAdminId: detail.cancelledByAdminId,
    candidates: {
      applications: detail.candidates.applications.map((application) => ({
        id: application.id,
        worker: questMemberViewFromApi(application.worker),
        applicationStatus: application.applicationStatus,
        reworkLimit: application.reworkLimit,
        appliedAt: application.appliedAt,
      })),
      teams: detail.candidates.teams.map((team) => ({
        id: team.id,
        name: team.name,
        teamStatus: team.teamStatus,
        reworkLimit: team.reworkLimit,
        leaderId: team.leaderId,
        createdAt: team.createdAt,
        members: team.members.map((member) => ({
          member: questMemberViewFromApi(member.member),
          joinedAt: member.joinedAt,
        })),
      })),
    },
    assignments: detail.assignments.map((assignment) => ({
      id: assignment.id,
      worker: questMemberViewFromApi(assignment.worker),
      assignmentStatus: assignment.assignmentStatus,
      startedAt: assignment.startedAt,
      createdAt: assignment.createdAt,
    })),
    proofSubmissions: detail.proofSubmissions.map((submission) => ({
      id: submission.id,
      worker: submission.worker ? questMemberViewFromApi(submission.worker) : null,
      team: submission.team ? { id: submission.team.id, name: submission.team.name } : null,
      submittedBy: questMemberViewFromApi(submission.submittedBy),
      content: submission.content,
      submissionStatus: submission.submissionStatus,
      reviewNote: submission.reviewNote,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      files: submission.files.map((file) => ({
        fileId: file.fileId,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        position: file.position,
      })),
    })),
    editHistory: detail.editHistory.map((entry) => entry.kind === "FIELD_EDIT"
      ? {
          kind: "FIELD_EDIT",
          id: entry.id,
          fieldName: entry.fieldName,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          editedAt: entry.editedAt,
          editedByUserId: entry.editedByUserId,
          editedByAdminId: entry.editedByAdminId,
        }
      : {
          kind: "EDIT_REQUEST",
          id: entry.id,
          apiVersion: entry.apiVersion,
          requestStatus: entry.requestStatus,
          failureCode: entry.failureCode,
          requestedByUserId: entry.requestedByUserId,
          proposedChanges: entry.proposedChanges,
          createdAt: entry.createdAt,
          expiresAt: entry.expiresAt,
          resolvedAt: entry.resolvedAt,
          responses: entry.responses.map((response) => ({
            workerId: response.workerId,
            decision: response.decision,
            reason: response.reason,
            respondedAt: response.respondedAt,
          })),
        }),
    adminActions: detail.adminActions.map((action) => ({
      id: action.id,
      admin: {
        id: action.admin.id,
        firstName: action.admin.firstName,
        lastName: action.admin.lastName,
      },
      action: action.action,
      reasonCode: action.reasonCode,
      createdAt: action.createdAt,
    })),
    timeline: (detail.timeline ?? []).map((entry) => ({
      event: entry.event,
      status: entry.status,
      occurredAt: entry.occurredAt,
      actorId: entry.actorId,
      reasonCode: entry.reasonCode,
    })),
  };

  if (detail.images !== undefined) {
    view.images = detail.images.map((image) => ({
      imageId: image.imageId,
      fileId: image.fileId,
      position: image.position,
      url: image.url,
      urlExpiresAt: image.urlExpiresAt,
    }));
  }

  return view;
}

export function questFinanceViewFromApi(finance: AdminQuestFinance): QuestFinanceView {
  return {
    quest: {
      id: finance.quest.id,
      title: finance.quest.title,
      state: questStateFor(finance.quest.questStatus),
      headcount: finance.quest.headcount,
      rewardSatang: finance.quest.rewardSatang,
      platformFeePerWorkerSatang: finance.quest.platformFeePerWorkerSatang,
      questFundingTotalSatang: finance.quest.questFundingTotalSatang,
      hirer: {
        id: finance.quest.hirer.id,
        firstName: finance.quest.hirer.firstName,
        lastName: finance.quest.hirer.lastName,
        studentId: finance.quest.hirer.studentId,
      },
    },
    reservation: finance.reservation
      ? {
          id: finance.reservation.id,
          status: finance.reservation.status,
          totalReservedSatang: finance.reservation.totalReservedSatang,
          remainingSatang: finance.reservation.remainingSatang,
          createdAt: finance.reservation.createdAt,
        }
      : null,
    transfers: finance.transfers.map((transfer) => ({
      id: transfer.id,
      occurredAt: transfer.occurredAt,
      type: transfer.type,
      from: { type: transfer.from.type, id: transfer.from.id, displayName: transfer.from.displayName },
      to: { type: transfer.to.type, id: transfer.to.id, displayName: transfer.to.displayName },
      amountSatang: transfer.amountSatang,
      platformFeeSatang: transfer.platformFeeSatang,
      description: transfer.description,
      ledgerTransactionId: transfer.ledgerTransactionId,
      businessReference: transfer.businessReference,
    })),
    ledgerTransactions: finance.ledgerTransactions.map((transaction) => ({
      id: transaction.id,
      businessReference: transaction.businessReference,
      eventType: transaction.eventType,
      description: transaction.description,
      createdAt: transaction.createdAt,
      sealedAt: transaction.sealedAt,
      postings: transaction.postings.map((posting) => ({
        id: posting.id,
        accountId: posting.accountId,
        accountType: posting.accountType,
        walletId: posting.walletId,
        ownerUserId: posting.ownerUserId,
        amountSatang: posting.amountSatang,
      })),
    })),
  };
}

function memberName(member: { firstName: string; lastName: string; email: string }): string {
  return `${member.firstName} ${member.lastName}`.trim() || member.email;
}

export function questRowFromApi(quest: AdminQuest): QuestBoardRow {
  const state = questStateFor(quest.questStatus);
  return {
    id: quest.id,
    displayId: questDisplayIdFor(quest.id, quest.displayId),
    title: quest.title,
    hirerName: memberName(quest.hirer),
    hirerEmail: quest.hirer.email,
    state,
    stateLabel: questStateLabel(state),
    modeLabel: quest.mode === "FIRST_COME_FIRST_SERVED" ? "First come, first served" : "Candidate",
    participationLabel: quest.participation === "GROUP" ? "Team" : "Solo",
    rewardSatang: quest.rewardSatang,
    createdAt: quest.createdAt,
    hiddenAt: quest.hiddenAt,
    version: quest.version,
  };
}

export function questRowsFromApi(quests: AdminQuest[]): QuestBoardRow[] {
  return quests.map(questRowFromApi);
}

export function questMatchesTab(row: QuestBoardRow, tab: QuestBoardTab): boolean {
  if (tab === "all") return true;
  if (tab === "team") return row.participationLabel === "Team";
  if (tab === "solo") return row.participationLabel === "Solo";
  return row.state === tab;
}

export function searchQuestRows(rows: QuestBoardRow[], query: string): QuestBoardRow[] {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return rows;
  return rows.filter((row) => [
    row.id,
    row.displayId,
    row.title,
    row.hirerName,
    row.hirerEmail,
    row.stateLabel,
  ].some((field) => field.toLocaleLowerCase().includes(value)));
}

function compareRows(left: QuestBoardRow, right: QuestBoardRow, key: QuestSortKey): number {
  if (key === "reward") return (left.rewardSatang ?? -1) - (right.rewardSatang ?? -1);
  if (key === "createdAt") return Date.parse(left.createdAt) - Date.parse(right.createdAt);

  const leftValue = key === "id"
    ? left.displayId
    : key === "title"
      ? left.title
      : key === "hirer"
        ? left.hirerName
        : left.stateLabel;
  const rightValue = key === "id"
    ? right.displayId
    : key === "title"
      ? right.title
      : key === "hirer"
        ? right.hirerName
        : right.stateLabel;
  return leftValue.localeCompare(rightValue);
}

export function sortQuestRows(
  rows: QuestBoardRow[],
  key: QuestSortKey,
  direction: QuestSortDirection,
): QuestBoardRow[] {
  const multiplier = direction === "ascending" ? 1 : -1;
  return rows.toSorted((left, right) => compareRows(left, right, key) * multiplier);
}

export function pageQuestRows(
  rows: QuestBoardRow[],
  page: number,
  pageSize: QuestBoardPageSize,
): QuestBoardRow[] {
  return pageRows(rows, page, pageSize);
}

export function questPageCount(rowCount: number, pageSize: QuestBoardPageSize): number {
  return pageCount(rowCount, pageSize);
}

export function formatQuestDate(value: string | null | undefined): string {
  return formatAdminTimestamp(value, "Asia/Bangkok");
}

export function formatQuestMoney(satang: number | null | undefined): string {
  if (satang === null || satang === undefined) return "Not provided";
  return `฿${(satang / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function questStatusClass(state: QuestState): string {
  return `status-${state.toLocaleLowerCase().replaceAll("_", "-")}`;
}

export function questMemberName(member: { firstName: string; lastName: string; email: string }): string {
  return memberName(member);
}
