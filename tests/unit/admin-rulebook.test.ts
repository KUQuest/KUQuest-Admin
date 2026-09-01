import { describe, expect, it } from "bun:test";

import {
  canHideQuest,
  canResolveDispute,
  disputeCaseStatusFor,
  hasHiddenQuestOverlay,
  isReportCasePending,
  isPayoutPendingApproval,
  isPayoutStatus,
  isQuestState,
  isQuestTerminal,
  payoutStatusFor,
  questStateFor,
  reportCaseStatusFor,
  isWalletStatus,
  walletStatusFor,
} from "../../src/features/admin/domain/rulebook";

describe("Admin Rulebook status boundary", () => {
  it("accepts the canonical Quest State values", () => {
    expect(isQuestState("QUEST_FAILED")).toBe(true);
    expect(isQuestState("QUEST_DISPUTED")).toBe(false);
    expect(isQuestState("QUEST_HIDDEN")).toBe(false);
  });

  it("keeps Hidden outside the Quest lifecycle", () => {
    expect(canHideQuest("QUEST_OPEN")).toBe(true);
    expect(canHideQuest("QUEST_FAILED")).toBe(false);
    expect(isQuestTerminal("QUEST_FAILED")).toBe(true);
  });

  it("only resolves a pending Dispute Case on a Failed Quest", () => {
    expect(canResolveDispute("QUEST_FAILED", "DISPUTE_CASE_PENDING")).toBe(true);
    expect(canResolveDispute("QUEST_CANCELLED", "DISPUTE_CASE_PENDING")).toBe(false);
    expect(canResolveDispute("QUEST_FAILED", "DISPUTE_CASE_RESOLVED")).toBe(false);
  });

  it("maps legacy display values to canonical entity statuses", () => {
    expect(questStateFor("Disputed")).toBe("QUEST_FAILED");
    expect(disputeCaseStatusFor("Active")).toBe("DISPUTE_CASE_PENDING");
    expect(disputeCaseStatusFor("Closed")).toBe("DISPUTE_CASE_RESOLVED");
    expect(reportCaseStatusFor("Closed", "confirmed-violation")).toBe("REPORT_CASE_HIDDEN");
    expect(reportCaseStatusFor("CONDUCT_REPORT_UPHELD")).toBe("CONDUCT_REPORT_UPHELD");
    expect(payoutStatusFor("Needs approval")).toBe("PENDING_ADMIN_APPROVAL");
    expect(walletStatusFor("Temp ban")).toBe("FROZEN");
    expect(isPayoutPendingApproval("PENDING_ADMIN_APPROVAL")).toBe(true);
    expect(isReportCasePending("CONDUCT_REPORT_PENDING")).toBe(true);
  });

  it("keeps Hidden as a discovery overlay", () => {
    expect(hasHiddenQuestOverlay({ status: "Hidden" })).toBe(true);
    expect(hasHiddenQuestOverlay({ questState: "QUEST_OPEN", hiddenAt: "1 Sep 2026" })).toBe(true);
    expect(questStateFor("Hidden")).toBe("QUEST_OPEN");
  });

  it("accepts canonical Payout and Wallet statuses only", () => {
    expect(isPayoutStatus("PENDING_ADMIN_APPROVAL")).toBe(true);
    expect(isPayoutStatus("COMPLETED")).toBe(false);
    expect(isWalletStatus("FROZEN")).toBe(true);
    expect(isWalletStatus("BANNED")).toBe(false);
  });
});
