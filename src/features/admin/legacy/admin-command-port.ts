import type {
  AdminCommandPort,
  AdminDisputeOpenCommand,
  DisputeResolution,
  PayoutApproval,
  PayoutRejection,
  QuestHideCommand,
  QuestRestoreCommand,
  QuestTerminateCommand,
  ReportDecision,
  WalletStatusCommand,
} from "../api/admin-api";
import type { LegacyRecord } from "./runtime";
import { data, disputeCases } from "./runtime-data";
import {
  applyDemoAction,
  applyReportDecision,
  adminDateTime,
} from "./runtime-seed";

function recordFor(id: string, records: LegacyRecord[], kind: string): LegacyRecord {
  const record = records.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`${kind} was not found: ${id}`);
  return record;
}

function commandResult<K extends keyof AdminCommandPort>(
  method: K,
  record: LegacyRecord,
): ReturnType<AdminCommandPort[K]> {
  return Promise.resolve(record as unknown as Awaited<ReturnType<AdminCommandPort[K]>>) as ReturnType<AdminCommandPort[K]>;
}

function commandId(action: string, recordId: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-${action}-${recordId}-${uuid}`;
}

export function newAdminIdempotencyKey(action: string, recordId: string): string {
  return commandId(action.toLowerCase().replace(/[^a-z0-9]+/g, "-"), recordId);
}

function applyWalletStatus(user: LegacyRecord, options: WalletStatusCommand): void {
  const status = options.toStatus ?? options.status ?? "ACTIVE";
  user.status = status;
  user.walletStatus = status;
  user.statusReason = options.reason;
  user.statusAppliedAt = adminDateTime();
  user.tone = status === "ACTIVE" ? "success" : status === "FROZEN" ? "warning" : "danger";
  user.age = "Just now";
}

export const mockAdminCommandPort: AdminCommandPort = {
  hideQuest(questId: string, _options: QuestHideCommand) {
    const record = recordFor(questId, data.quests, "Quest");
    applyDemoAction("Hide quest", record);
    return commandResult("hideQuest", record);
  },

  restoreQuest(questId: string, _options: QuestRestoreCommand) {
    const record = recordFor(questId, data.quests, "Quest");
    applyDemoAction("Restore quest", record);
    return commandResult("restoreQuest", record);
  },

  terminateQuest(questId: string, options: QuestTerminateCommand) {
    const record = recordFor(questId, data.quests, "Quest");
    applyDemoAction("Terminate quest", record);
    record.status = "QUEST_CANCELLED";
    record.questState = "QUEST_CANCELLED";
    record.terminationReason = options.reason;
    return commandResult("terminateQuest", record);
  },

  async openDispute(_questId: string, _options: AdminDisputeOpenCommand) {
    throw new Error("Opening a Dispute Case requires the Admin API.");
  },

  resolveDispute(questId: string, options: DisputeResolution) {
    const record = data.disputes.find((candidate) =>
      candidate.questId === questId
      || candidate.id === questId
      || disputeCases[candidate.id]?.questId === questId,
    );
    if (!record) throw new Error(`Dispute Case was not found for Quest: ${questId}`);
    const quest = data.quests.find((candidate) => candidate.id === questId);
    record.status = "DISPUTE_CASE_RESOLVED";
    record.disputeCaseStatus = "DISPUTE_CASE_RESOLVED";
    record.tone = "neutral";
    record.disputeOutcome = options.outcome;
    record.decisionReason = options.reasonCode;
    record.resolution = options.outcome === "DISPUTE_CASE_DISMISSED" ? "Dispute Case dismissed" : "Release to Worker";
    record.resolutionAt = adminDateTime();
    if (options.amountSatang !== undefined) record.resolutionAmountSatang = options.amountSatang;
    if (quest) {
      quest.status = "QUEST_FAILED";
      quest.questState = "QUEST_FAILED";
    }
    return commandResult("resolveDispute", record);
  },

  approvePayout(payoutId: string, options: PayoutApproval) {
    const record = recordFor(payoutId, data.payouts, "Payout");
    applyDemoAction("Approve payout", record);
    record.status = "SUBMITTED_TO_PROVIDER";
    record.payoutStatus = "SUBMITTED_TO_PROVIDER";
    record.approvalReason = options.note || "Approved by Admin.";
    record.approvedAt = adminDateTime();
    return commandResult("approvePayout", record);
  },

  rejectPayout(payoutId: string, options: PayoutRejection) {
    const record = recordFor(payoutId, data.payouts, "Payout");
    applyDemoAction("Reject payout", record);
    record.status = "CANCELLED";
    record.payoutStatus = "CANCELLED";
    record.rejectionReason = options.reason || options.reasonCode;
    record.rejectedAt = adminDateTime();
    return commandResult("rejectPayout", record);
  },

  reconcilePayout(payoutId: string) {
    const record = recordFor(payoutId, data.payouts, "Payout");
    return commandResult("reconcilePayout", record);
  },

  retryPayoutProviderEvent(eventId: string) {
    const record = recordFor(eventId, data.payouts, "Payout provider event");
    return commandResult("retryPayoutProviderEvent", record);
  },

  decideReport(reportId: string, options: ReportDecision) {
    const record = recordFor(reportId, data.reports, "Report Case");
    if (options.decision === "REPORT_CASE_RESTORED") {
      record.status = "REPORT_CASE_RESTORED";
      record.reportCaseStatus = "REPORT_CASE_RESTORED";
      record.decisionReason = options.reason;
      record.resolutionAt = adminDateTime();
    } else if (options.decision === "CONDUCT_REPORT_UPHELD" || options.decision === "CONDUCT_REPORT_DISMISSED") {
      record.status = options.decision;
      record.conductReportStatus = options.decision;
      record.decisionReason = options.reason;
    } else {
      applyReportDecision(record, options.decision === "REPORT_CASE_HIDDEN" ? "confirmed-violation" : "no-violation", options.reason);
      record.status = options.decision;
      record.reportCaseStatus = options.decision;
    }
    return commandResult("decideReport", record);
  },

  setWalletStatus(memberId: string, options: WalletStatusCommand) {
    const user = recordFor(memberId, data.users, "Member");
    applyWalletStatus(user, options);
    return commandResult("setWalletStatus", user);
  },

  rebuildWalletProjection(walletId: string) {
    const wallet = recordFor(walletId, data.wallets, "Wallet");
    return commandResult("rebuildWalletProjection", wallet);
  },
};
