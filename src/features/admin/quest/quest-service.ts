import { ApiError } from "../../../lib/api/client";
import type {
  AdminApiRequestOptions,
  AdminDisputeCase,
  AdminMemberReview,
  AdminQuest,
} from "../api/admin-api";
import { adminMemberReviewsSchema } from "../api/admin-api-types-member-profile";
import { adminApiProvider } from "../api/admin-provider";
import { displayAdminId } from "../display-admin-id";
import { isQuestTerminal } from "../domain/rulebook";
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
  workerReviews: Record<string, QuestWorkerReviewData>;
  linkedDisputeId: string | null;
  disputeLookupError?: string | null;
};

export type QuestWorkerReviewData = {
  reviews: AdminMemberReview[] | null;
  error: "Review details could not be loaded." | "Review data does not match the Admin API contract." | null;
};

const reviewPageLimit = 50;

async function loadWorkerReviews(
  workerId: string,
  questDisplayId: string,
  options: AdminApiRequestOptions,
): Promise<QuestWorkerReviewData> {
  if (!questDisplayId) {
    return { reviews: null, error: "Review data does not match the Admin API contract." };
  }

  const reviews: AdminMemberReview[] = [];
  const seenCursors = new Set<string>();
  const seenReviewIds = new Set<string>();
  let cursor: string | undefined;
  let totalCount: number | null = null;

  while (true) {
    try {
      const result = adminMemberReviewsSchema.safeParse(
        await adminApiProvider.read.listMemberReviews(
          workerId,
          { limit: reviewPageLimit, ...(cursor ? { cursor } : {}) },
          options,
        ),
      );
      if (!result.success) {
        return { reviews: null, error: "Review data does not match the Admin API contract." };
      }

      const page = result.data;
      if ((totalCount !== null && totalCount !== page.totalCount)
        || reviews.length + page.items.length > page.totalCount) {
        return { reviews: null, error: "Review data does not match the Admin API contract." };
      }
      for (const review of page.items) {
        if (seenReviewIds.has(review.id)) {
          return { reviews: null, error: "Review data does not match the Admin API contract." };
        }
        seenReviewIds.add(review.id);
      }
      totalCount = page.totalCount;
      reviews.push(...page.items);

      if (page.nextCursor === null) {
        if (reviews.length !== totalCount) {
          return { reviews: null, error: "Review data does not match the Admin API contract." };
        }
        return {
          reviews: reviews.filter((review) => review.quest.displayId === questDisplayId),
          error: null,
        };
      }
      if (page.items.length === 0 || seenCursors.has(page.nextCursor)) {
        return { reviews: null, error: "Review data does not match the Admin API contract." };
      }
      seenCursors.add(page.nextCursor);
      cursor = page.nextCursor;
    } catch {
      return { reviews: null, error: "Review details could not be loaded." };
    }
  }
}

function apiRequestOptions(cookieHeader?: string): AdminApiRequestOptions {
  return cookieHeader ? { headers: { Cookie: cookieHeader } } : {};
}
function questDisputeCasesFromApi(disputes: AdminDisputeCase[]): QuestDetailView["disputeCases"] {
  return disputes.map((dispute) => ({
    id: dispute.id,
    displayId: displayAdminId(dispute.displayId, dispute.id) ?? "",
    questId: dispute.questId,
    ...(typeof dispute.filerUserId === "string" ? { filerUserId: dispute.filerUserId } : {}),
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
  const workerReviews: Record<string, QuestWorkerReviewData> = {};
  if (isQuestTerminal(detail.state)) {
    const reviewEntries = await Promise.all(detail.assignments.map(async (assignment) => [
      assignment.worker.id,
      await loadWorkerReviews(assignment.worker.id, detail.displayId, options),
    ] as const));
    for (const [workerId, reviewData] of reviewEntries) {
      workerReviews[workerId] = reviewData;
    }
  }

  return {
    detail,
    finance: financeResult.status === "fulfilled" ? questFinanceViewFromApi(financeResult.value) : null,
    workerReviews,
    linkedDisputeId: detail.disputeCases[0]?.id ?? null,
    disputeLookupError,
  };
}
