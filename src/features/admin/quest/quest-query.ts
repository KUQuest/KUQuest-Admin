import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type { QuestBoardPageData, QuestDataSource } from "./quest-service";
import { loadQuestBoardPageData } from "./quest-service";
import { applyMockQuestCommand, notifyMockQuestStateChange, questMockOverrideFromDetail, readMockQuestOverride, QUEST_MOCK_STATE_EVENT, saveMockQuestOverride } from "./quest-mock-state";
import { questRowsFromApi, type QuestDetailView } from "./quest-model";
import { mockAllQuests } from "./quest-mock-data";
import { questStateLabel } from "../domain/rulebook";
import type { QuestCommand, QuestCommandSubmission } from "./quest-command-dialog";

export const questBoardQueryKey = ["admin", "quests", "board"] as const;

export type QuestCommandMutationInput = {
  detail: QuestDetailView;
  dataSource: QuestDataSource;
  submission: QuestCommandSubmission;
  idempotencyKey: string;
};

export type QuestCommandMutationResult = {
  detail: QuestDetailView | null;
  command: QuestCommand;
  reason: string;
  occurredAt: string | null;
};

export function useQuestCommandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "quests", "command"],
    mutationFn: async ({ detail, dataSource, submission, idempotencyKey }: QuestCommandMutationInput): Promise<QuestCommandMutationResult> => {
      const options = {
        idempotencyKey,
        expectedVersion: detail.version,
      };
      if (dataSource === "api") {
        if (submission.command === "hide") {
          await adminApiProvider.commands.hideQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
        } else if (submission.command === "restore") {
          await adminApiProvider.commands.restoreQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
        } else {
          await adminApiProvider.commands.terminateQuest(detail.id, { ...options, reason: submission.reason, reasonCode: submission.reasonCode });
        }
        return { detail: null, command: submission.command, reason: submission.reason, occurredAt: null };
      }
      const occurredAt = new Date().toISOString();
      const nextDetail = applyMockQuestCommand(detail, submission.command, submission.reason, submission.reasonCode, occurredAt);
      if (typeof window !== "undefined") {
        saveMockQuestOverride(window.localStorage, nextDetail.id, questMockOverrideFromDetail(nextDetail));
        notifyMockQuestStateChange();
      }
      return { detail: nextDetail, command: submission.command, reason: submission.reason || "No reason required for Quest Restore in mock mode.", occurredAt };
    },
    onSuccess: (_result, { dataSource }) => {
      if (dataSource === "api") void queryClient.invalidateQueries({ queryKey: [...questBoardQueryKey, dataSource] });
    },
  });
}

export function useQuestOpenDisputeMutation() {
  return useMutation({
    mutationKey: ["admin", "quests", "open-dispute"],
    mutationFn: ({ questId, workerId }: { questId: string; workerId: string }) => adminApiProvider.commands.openDispute(questId, { workerId }),
  });
}

function applyMockOverrides(data: QuestBoardPageData, dataSource: QuestDataSource): QuestBoardPageData {
  if (dataSource !== "mock" || typeof window === "undefined") return data;
  return {
    ...data,
    rows: data.rows.map((row) => {
      const override = readMockQuestOverride(window.localStorage, row.id)
        ?? readMockQuestOverride(window.localStorage, row.displayId);
      if (!override) return row;
      return {
        ...row,
        state: override.state,
        stateLabel: questStateLabel(override.state),
        hiddenAt: override.hiddenAt,
        version: override.version,
      };
    }),
  };
}

export function useQuestBoardQuery(
  initialData: QuestBoardPageData,
  dataSource: QuestDataSource,
) {
  const queryClient = useQueryClient();
  const initialBoardData = useMemo(
    () => applyMockOverrides(initialData, dataSource),
    [dataSource, initialData],
  );
  const query = useQuery({
    queryKey: [...questBoardQueryKey, dataSource],
    queryFn: async () => {
      const data = dataSource === "mock"
        ? { rows: questRowsFromApi(mockAllQuests) }
        : await loadQuestBoardPageData(undefined, dataSource);
      return applyMockOverrides(data, dataSource);
    },
    initialData: initialBoardData,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const refreshBoard = () => {
      void queryClient.invalidateQueries({ queryKey: [...questBoardQueryKey, dataSource] });
    };
    window.addEventListener(QUEST_MOCK_STATE_EVENT, refreshBoard);
    return () => window.removeEventListener(QUEST_MOCK_STATE_EVENT, refreshBoard);
  }, [dataSource, queryClient]);

  return { ...query, queryKey: [...questBoardQueryKey, dataSource] as const };
}
