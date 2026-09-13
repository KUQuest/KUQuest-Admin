import type { AdminQuest } from "../api/admin-api";
import { questStateFor, questStateLabel, type QuestState } from "../domain/rulebook";

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
export type QuestBoardPageSize = number | "all";
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

function memberName(member: { firstName: string; lastName: string; email: string }): string {
  return `${member.firstName} ${member.lastName}`.trim() || member.email;
}

export function questRowFromApi(quest: AdminQuest): QuestBoardRow {
  const state = questStateFor(quest.questStatus);
  return {
    id: quest.id,
    displayId: quest.displayId ?? quest.id,
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
  if (pageSize === "all") return rows;
  const start = Math.max(0, page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function questPageCount(rowCount: number, pageSize: QuestBoardPageSize): number {
  return pageSize === "all" ? (rowCount ? 1 : 0) : Math.ceil(rowCount / pageSize);
}

export function formatQuestDate(value: string | null | undefined): string {
  if (!value) return "Not provided";
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
