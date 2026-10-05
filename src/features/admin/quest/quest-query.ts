import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { QuestBoardPageData } from "./quest-service";
import { loadQuestBoardPageData } from "./quest-service";
import type { QuestDetailView } from "./quest-model";
import type { QuestCommandSubmission } from "./quest-command-dialog";

export const questBoardQueryKey = ["admin", "quests", "board"] as const;

export type QuestCommandMutationInput = {
  detail: QuestDetailView;
  submission: QuestCommandSubmission;
  idempotencyKey: string;
};

export function useQuestCommandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "quests", "command"],
    mutationFn: async ({ detail, submission, idempotencyKey }: QuestCommandMutationInput): Promise<void> => {
      const options = {
        idempotencyKey,
        expectedVersion: detail.version,
      };
      if (submission.command === "hide") {
        await adminApiProvider.commands.hideQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
      } else if (submission.command === "restore") {
        await adminApiProvider.commands.restoreQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
      } else {
        await adminApiProvider.commands.terminateQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: questBoardQueryKey }),
  });
}

export function useQuestOpenDisputeMutation() {
  return useMutation({
    mutationKey: ["admin", "quests", "open-dispute"],
    mutationFn: ({ questId, workerId }: { questId: string; workerId: string }) => adminApiProvider.commands.openDispute(questId, { workerId }),
  });
}

export function useQuestBoardQuery(initialData: QuestBoardPageData) {
  return useQuery({
    queryKey: questBoardQueryKey,
    queryFn: () => loadQuestBoardPageData(),
    initialData,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
