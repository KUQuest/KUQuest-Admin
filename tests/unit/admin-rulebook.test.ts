import { describe, expect, it } from "bun:test";

import {
  canHideQuest,
  canResolveDispute,
  disputeCaseStatusFor,
  disputeCaseStatusLabel,
  hasHiddenQuestOverlay,
  isReportCasePending,
  isPayoutPendingApproval,
  isPayoutStatus,
  isQuestState,
  isQuestTerminal,
  payoutStatusFor,
  payoutStatusLabel,
  questStateLabel,
  questStateFor,
  reportCaseStatusFor,
  isWalletStatus,
  walletStatusFor,
} from "../../src/features/admin/domain/rulebook";
import { statusBadgeClass } from "../../src/features/admin/status-badge";

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

  it("uses concise Payout labels without changing canonical statuses", () => {
    expect(payoutStatusLabel("PENDING_ADMIN_APPROVAL")).toBe("Needs review");
    expect(payoutStatusLabel("SUBMITTED_TO_PROVIDER")).toBe("Sent");
    expect(payoutStatusLabel("PROVIDER_PENDING")).toBe("Processing");
    expect(payoutStatusLabel("SUCCEEDED")).toBe("Paid");
    expect(payoutStatusLabel("FAILED")).toBe("Failed");
    expect(payoutStatusLabel("CANCELLED")).toBe("Cancelled");
    expect(payoutStatusFor("PENDING_ADMIN_APPROVAL")).toBe("PENDING_ADMIN_APPROVAL");
  });

  it("uses concise Quest and Dispute Case labels without changing canonical statuses", () => {
    expect(questStateLabel("QUEST_DRAFT")).toBe("Draft");
    expect(questStateLabel("QUEST_OPEN")).toBe("Open");
    expect(questStateLabel("QUEST_ASSIGNED")).toBe("Assigned");
    expect(questStateLabel("QUEST_IN_PROGRESS")).toBe("In progress");
    expect(questStateLabel("QUEST_COMPLETED")).toBe("Completed");
    expect(questStateLabel("QUEST_CANCELLED")).toBe("Cancelled");
    expect(questStateLabel("QUEST_FAILED")).toBe("Failed");
    expect(disputeCaseStatusLabel("DISPUTE_CASE_PENDING")).toBe("Open");
    expect(disputeCaseStatusLabel("DISPUTE_CASE_DISMISSED")).toBe("Dismissed");
    expect(disputeCaseStatusLabel("DISPUTE_CASE_RESOLVED")).toBe("Resolved");
    expect(questStateFor("QUEST_FAILED")).toBe("QUEST_FAILED");
    expect(disputeCaseStatusFor("DISPUTE_CASE_RESOLVED")).toBe("DISPUTE_CASE_RESOLVED");
  });

  it("assigns separate badge classes to canonical feature statuses", () => {
    expect(statusBadgeClass("QUEST_OPEN")).toBe("status-quest-open");
    expect(statusBadgeClass("DISPUTE_CASE_PENDING")).toBe("status-dispute-pending");
    expect(statusBadgeClass("PENDING_ADMIN_APPROVAL")).toBe("status-payout-pending-admin-approval");
    expect(statusBadgeClass("REPORT_CASE_HIDDEN")).toBe("status-report-hidden");
    expect(statusBadgeClass("CONDUCT_REPORT_UPHELD")).toBe("status-conduct-upheld");
    expect(statusBadgeClass("FROZEN")).toBe("status-wallet-frozen");
    expect(statusBadgeClass("Unknown")).toBe("");
  });
});
