import { apiRequest } from "../../../lib/api/client";
import { commandHeaders, encode } from "./admin-api-transport";
import type {
  AdminMemberPenaltyAddCommand,
  AdminMemberPenaltyCommandResult,
  AdminMemberPenaltyRemoveCommand,
} from "./admin-api";

export function createAdminMemberPenaltyApi() {
  return {
    addMemberPenalty(
      memberId: string,
      options: AdminMemberPenaltyAddCommand,
    ): Promise<AdminMemberPenaltyCommandResult> {
      const { idempotencyKey, ...body } = options;
      return apiRequest<AdminMemberPenaltyCommandResult>(
        `/api/v1/admin/members/${encode(memberId)}/penalty-actions/add`,
        {
          method: "POST",
          headers: commandHeaders({ idempotencyKey }),
          body,
        },
      );
    },

    removeMemberPenalty(
      memberId: string,
      options: AdminMemberPenaltyRemoveCommand,
    ): Promise<AdminMemberPenaltyCommandResult> {
      const { idempotencyKey, ...body } = options;
      return apiRequest<AdminMemberPenaltyCommandResult>(
        `/api/v1/admin/members/${encode(memberId)}/penalty-actions/remove`,
        {
          method: "POST",
          headers: commandHeaders({ idempotencyKey }),
          body,
        },
      );
    },
  };
}
