import { apiRequest } from "../../../lib/api/client";
import {
  encode,
  questCommandHeaders,
  queryString,
} from "./admin-api-transport";
import type {
  AdminApiRequestOptions,
  AdminPage,
  AdminQuest,
  AdminQuestCommandResult,
  AdminQuestDetail,
  AdminQuestFinance,
  AdminQuestListQuery,
  QuestHideCommand,
  QuestRestoreCommand,
  QuestTerminateCommand,
} from "./admin-api";

export function createAdminQuestApi() {
  return {
    listQuests(
      query: AdminQuestListQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminPage<AdminQuest>> {
      return apiRequest<AdminPage<AdminQuest>>(
        `/api/v1/admin/quests${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    getQuest(questId: string, options: AdminApiRequestOptions = {}): Promise<AdminQuestDetail> {
      return apiRequest<AdminQuestDetail>(
        `/api/v1/admin/quests/${encode(questId)}`,
        { cache: "no-store", ...options },
      );
    },

    getQuestFinance(questId: string, options: AdminApiRequestOptions = {}): Promise<AdminQuestFinance> {
      return apiRequest<AdminQuestFinance>(
        `/api/v1/admin/finance/quests/${encode(questId)}`,
        { cache: "no-store", ...options },
      );
    },

    hideQuest(questId: string, options: QuestHideCommand): Promise<AdminQuestCommandResult> {
      return apiRequest<AdminQuestCommandResult>(
        `/api/v1/admin/quests/${encode(questId)}/hide`,
        {
          method: "POST",
          headers: questCommandHeaders(options),
          body: { reason: options.reason, reasonCode: options.reasonCode },
        },
      );
    },

    restoreQuest(questId: string, options: QuestRestoreCommand): Promise<AdminQuestCommandResult> {
      return apiRequest<AdminQuestCommandResult>(
        `/api/v1/admin/quests/${encode(questId)}/restore`,
        {
          method: "POST",
          headers: questCommandHeaders(options),
          body: { reason: options.reason, reasonCode: options.reasonCode },
        },
      );
    },

    terminateQuest(questId: string, options: QuestTerminateCommand): Promise<AdminQuestCommandResult> {
      return apiRequest<AdminQuestCommandResult>(
        `/api/v1/admin/quests/${encode(questId)}/terminate`,
        {
          method: "POST",
          headers: questCommandHeaders(options),
          body: { reason: options.reason, reasonCode: options.reasonCode },
        },
      );
    },
  };
}
