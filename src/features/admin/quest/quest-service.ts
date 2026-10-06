import { ApiError } from "../../../lib/api/client";
import type {
  AdminApiRequestOptions,
  AdminDisputeCase,
  AdminQuest,
} from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { displayAdminId } from "../display-admin-id";
import { DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE, listDisputeCasesForQuest } from "./quest-dispute";
import {
  questDetailViewFromApi,
  questFinanceViewFromApi,
  questRowsFromApi,
  type QuestBoardRow,
  type QuestDetailView,
  type QuestFinanceView,
} from "./quest-model";
export type QuestBoardPageData = {
  rows: QuestBoardRow[];
};

export type QuestDetailPageData = {
  detail: QuestDetailView;
  finance: QuestFinanceView | null;
  linkedDisputeId: string | null;
  disputeLookupError?: string | null;
};

function apiRequestOptions(cookieHeader?: string): AdminApiRequestOptions {
  return cookieHeader ? { headers: { Cookie: cookieHeader } } : {};
}
function questDisputeCasesFromApi(disputes: AdminDisputeCase[]): QuestDetailView["disputeCases"] {
  return disputes.map((dispute) => ({
    id: dispute.id,
    displayId: displayAdminId(dispute.displayId, dispute.id) ?? "",
    questId: dispute.questId,
    status: dispute.status,
    createdAt: typeof dispute.createdAt === "string" ? dispute.createdAt : null,
    updatedAt: typeof dispute.updatedAt === "string" ? dispute.updatedAt : null,
  }));
}

async function resolveApiQuestId(
  questId: string,
  options: AdminApiRequestOptions,
): Promise<{ id: string; displayId?: string }> {
  if (!/^QST-/i.test(questId)) return { id: questId };

  let cursor: string | undefined;
  do {
    const page = await adminApiProvider.read.listQuests({
      limit: 50,
      sort: "newest",
      ...(cursor ? { cursor } : {}),
    }, options);
    const match = page.items.find((item) => item.displayId === questId || item.id === questId);
    if (match) return { id: match.id, displayId: match.displayId ?? questId };
    if (!page.nextCursor || page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  } while (cursor);

  return { id: questId, displayId: questId };
}

export async function loadQuestBoardPageData(
  cookieHeader?: string,
): Promise<QuestBoardPageData> {
  const options = apiRequestOptions(cookieHeader);
  const quests: AdminQuest[] = [];
  let cursor: string | undefined;

  do {
    const page = await adminApiProvider.read.listQuests({
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
): Promise<QuestDetailPageData | null> {
  const options = apiRequestOptions(cookieHeader);
  const apiQuest = await resolveApiQuestId(questId, options);
  const [detailResult, financeResult] = await Promise.allSettled([
    adminApiProvider.read.getQuest(apiQuest.id, options),
    adminApiProvider.read.getQuestFinance(apiQuest.id, options),
  ]);

  if (detailResult.status === "rejected") {
    if (detailResult.reason instanceof ApiError && detailResult.reason.status === 404) return null;
    throw detailResult.reason;
  }

  const detail = questDetailViewFromApi({
    ...detailResult.value,
    displayId: detailResult.value.displayId ?? apiQuest.displayId,
  });
  let disputeCases: QuestDetailView["disputeCases"] = [];
  let disputeLookupError: string | null = null;
  if (detail.state === "QUEST_FAILED") {
    try {
      disputeCases = questDisputeCasesFromApi(await listDisputeCasesForQuest(apiQuest.id, options));
    } catch {
      disputeLookupError = DISPUTE_LOOKUP_UNAVAILABLE_MESSAGE;
    }
  }
  detail.disputeCases = disputeCases;
  return {
    detail,
    finance: financeResult.status === "fulfilled" ? questFinanceViewFromApi(financeResult.value) : null,
    linkedDisputeId: detail.disputeCases[0]?.id ?? null,
    disputeLookupError,
  };
}
