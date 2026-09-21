import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import type {
  PayoutBoardPageData,
  PayoutDataSource,
} from "./payout-service";
import { applyMockPayoutDecision, PAYOUT_MOCK_UPDATED_EVENT, payoutMockOverrideFromDetail, saveMockPayoutOverride } from "./payout-mock-state";
import { type PayoutCommand, type PayoutCommandSubmission } from "./payout-command-dialog";
import type { PayoutDetailView } from "./payout-model";

export function payoutBoardQueryKey(dataSource: PayoutDataSource) {
  return ["admin", "payouts", "board", dataSource] as const;
}

export type PayoutCommandMutationInput = {
  detail: PayoutDetailView;
  dataSource: PayoutDataSource;
  submission: PayoutCommandSubmission;
  idempotencyKey: string;
};

export type PayoutCommandMutationResult = {
  detail: PayoutDetailView | null;
  command: PayoutCommand;
  reason: string | null;
  occurredAt: string | null;
};

export function usePayoutCommandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "payouts", "command"],
    mutationFn: async ({ detail, dataSource, submission, idempotencyKey }: PayoutCommandMutationInput): Promise<PayoutCommandMutationResult> => {
      const options = {
        idempotencyKey,
        expectedVersion: detail.version,
      };
      if (dataSource === "api") {
        if (submission.command === "approve") {
          await adminApiProvider.commands.approvePayout(detail.id, options);
        } else {
          await adminApiProvider.commands.rejectPayout(detail.id, {
            ...options,
            reasonCode: submission.reasonCode,
            reason: submission.reason,
          });
        }
        return { detail: null, command: submission.command, reason: submission.command === "reject" ? submission.reason : null, occurredAt: null };
      }
      const decisionReason = submission.command === "reject" ? submission.reason : null;
      const decisionReasonCode = submission.command === "reject" ? submission.reasonCode : null;
      const occurredAt = new Date().toISOString();
      const nextDetail = applyMockPayoutDecision(detail, submission.command, decisionReason, occurredAt, decisionReasonCode);
      if (typeof window !== "undefined") {
        saveMockPayoutOverride(window.localStorage, { id: nextDetail.id, ...payoutMockOverrideFromDetail(nextDetail) });
        window.dispatchEvent(new CustomEvent(PAYOUT_MOCK_UPDATED_EVENT, { detail: nextDetail }));
      }
      return { detail: nextDetail, command: submission.command, reason: decisionReason, occurredAt };
    },
    onSuccess: (_result, { dataSource }) => {
      if (dataSource === "api") void queryClient.invalidateQueries({ queryKey: payoutBoardQueryKey(dataSource) });
    },
  });
}

export function usePayoutReconcileMutation() {
  return useMutation({
    mutationKey: ["admin", "payouts", "reconcile"],
    mutationFn: async ({ payoutId, dataSource }: { payoutId: string; dataSource: PayoutDataSource }) => {
      if (dataSource === "api") await adminApiProvider.commands.reconcilePayout(payoutId);
    },
  });
}

export function usePayoutBoardQuery(
  initialData: PayoutBoardPageData,
  dataSource: PayoutDataSource,
) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => payoutBoardQueryKey(dataSource), [dataSource]);
  const query = useQuery({
    queryKey,
    queryFn: async () => initialData,
    initialData,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    queryClient.setQueryData(queryKey, initialData);
  }, [initialData, queryClient, queryKey]);

  return { ...query, queryKey };
}
