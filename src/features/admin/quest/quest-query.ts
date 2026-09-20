import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { QuestBoardPageData, QuestDataSource } from "./quest-service";
import { loadQuestBoardPageData } from "./quest-service";
import { readMockQuestOverride, QUEST_MOCK_STATE_EVENT } from "./quest-mock-state";
import { questRowsFromApi } from "./quest-model";
import { mockAllQuests } from "./quest-mock-data";
import { questStateLabel } from "../domain/rulebook";

export const questBoardQueryKey = ["admin", "quests", "board"] as const;

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
