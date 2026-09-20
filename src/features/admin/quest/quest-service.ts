import { ApiError } from "../../../lib/api/client";
import type {
  AdminApiRequestOptions,
  AdminQuest,
} from "../api/admin-api";
import { adminApi } from "../api/admin-api";
import {
  questDetailViewFromApi,
  questFinanceViewFromApi,
  questRowsFromApi,
  type QuestBoardRow,
  type QuestDetailView,
  type QuestFinanceView,
} from "./quest-model";
import { DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE, findDisputeForQuest } from "./quest-dispute";
import {
  mockDisputeIdForQuest,
  mockQuestDetailForId,
  mockQuestFinance,
  mockAllQuests,
} from "./quest-mock-data";

export type QuestDataSource = "api" | "mock";

export type QuestBoardPageData = {
  rows: QuestBoardRow[];
};

export type QuestDetailPageData = {
  detail: QuestDetailView;
  finance: QuestFinanceView | null;
  linkedDisputeId: string | null;
  disputeLookupError: string | null;
};

function apiRequestOptions(cookieHeader?: string): AdminApiRequestOptions {
  return cookieHeader ? { headers: { Cookie: cookieHeader } } : {};
}

async function resolveApiQuestId(questId: string, options: AdminApiRequestOptions): Promise<string> {
  if (!/^QST-/i.test(questId)) return questId;

  let cursor: string | undefined;
  do {
    const page = await adminApi.listQuests({
      limit: 50,
      sort: "newest",
      ...(cursor ? { cursor } : {}),
    }, options);
    const match = page.items.find((item) => item.displayId === questId || item.id === questId);
    if (match) return match.id;
    if (!page.nextCursor || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  } while (cursor);

  return questId;
}

export async function loadQuestBoardPageData(
  cookieHeader?: string,
  dataSource: QuestDataSource = "api",
): Promise<QuestBoardPageData> {
  if (dataSource === "mock") return { rows: questRowsFromApi(mockAllQuests) };

  const options = apiRequestOptions(cookieHeader);
  const quests: AdminQuest[] = [];
  let cursor: string | undefined;

  do {
    const page = await adminApi.listQuests({
      limit: 50,
      sort: "newest",
      ...(cursor ? { cursor } : {}),
    }, options);
    quests.push(...page.items);
    if (!page.nextCursor || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  } while (cursor);

  return { rows: questRowsFromApi(quests) };
}

export async function loadQuestDetailPageData(
  questId: string,
  cookieHeader: string,
  dataSource: QuestDataSource = "api",
): Promise<QuestDetailPageData | null> {
  if (dataSource === "mock") {
    const apiDetail = mockQuestDetailForId(questId);
    if (!apiDetail) return null;
    return {
      detail: questDetailViewFromApi(apiDetail),
      finance: questFinanceViewFromApi(mockQuestFinance(apiDetail)),
      linkedDisputeId: mockDisputeIdForQuest(apiDetail.id),
      disputeLookupError: null,
    };
  }

  const options = apiRequestOptions(cookieHeader);
  const apiQuestId = await resolveApiQuestId(questId, options);
  const [detailResult, financeResult] = await Promise.allSettled([
    adminApi.getQuest(apiQuestId, options),
    adminApi.getQuestFinance(apiQuestId, options),
  ]);

  if (detailResult.status === "rejected") {
    if (detailResult.reason instanceof ApiError && detailResult.reason.status === 404) return null;
    throw detailResult.reason;
  }

  const detail = questDetailViewFromApi(detailResult.value);

  let linkedDisputeId: string | null = null;
  let disputeLookupError: string | null = null;
  if (detail.state === "QUEST_FAILED") {
    try {
      linkedDisputeId = await findDisputeForQuest(detail.id, options);
    } catch {
      disputeLookupError = DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE;
    }
  }

  return {
    detail,
    finance: financeResult.status === "fulfilled" ? questFinanceViewFromApi(financeResult.value) : null,
    linkedDisputeId,
    disputeLookupError,
  };
}
