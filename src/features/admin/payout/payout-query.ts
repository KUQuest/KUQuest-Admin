import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApiProvider } from "../api/admin-provider";
import { loadPayoutBoardPageData, type PayoutBoardPageData } from "./payout-service";
import type { PayoutCommandSubmission } from "./payout-command-dialog";
import type { PayoutDetailView } from "./payout-model";

export const payoutBoardQueryKey = ["admin", "payouts", "board"] as const;

export type PayoutCommandMutationInput = {
  detail: PayoutDetailView;
  submission: PayoutCommandSubmission;
  idempotencyKey: string;
};

export function usePayoutCommandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "payouts", "command"],
    mutationFn: async ({ detail, submission, idempotencyKey }: PayoutCommandMutationInput): Promise<void> => {
      const options = {
        idempotencyKey,
        expectedVersion: detail.version,
      };
      if (submission.command === "approve") {
        await adminApiProvider.commands.approvePayout(detail.id, {
          ...options,
          reasonCode: submission.reasonCode,
          decisionReasonText: submission.decisionReasonText,
        });
      } else {
        await adminApiProvider.commands.rejectPayout(detail.id, {
          ...options,
          reasonCode: submission.reasonCode,
          decisionReasonText: submission.decisionReasonText,
        });
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: payoutBoardQueryKey }),
  });
}

export function usePayoutReconcileMutation() {
  return useMutation({
    mutationKey: ["admin", "payouts", "reconcile"],
    mutationFn: (payoutId: string) => adminApiProvider.commands.reconcilePayout(payoutId),
  });
}

export function usePayoutBoardQuery(initialData: PayoutBoardPageData) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: payoutBoardQueryKey,
    queryFn: () => loadPayoutBoardPageData(),
    initialData,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    queryClient.setQueryData(payoutBoardQueryKey, initialData);
  }, [initialData, queryClient]);

  return { ...query, queryKey: payoutBoardQueryKey };
}
