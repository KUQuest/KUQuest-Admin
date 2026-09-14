import { describe, expect, it } from "bun:test";

import type {
  AdminPayout,
  AdminPayoutDetail,
} from "../../src/features/admin/api/admin-api";
import {
  payoutDetailViewFromApi,
  payoutOutcomeReason,
  payoutRowFromApi,
  type PayoutDetailView,
} from "../../src/features/admin/payout/payout-model";

function payout(overrides: Partial<AdminPayout> = {}): AdminPayout {
  return {
    id: "PAY-9637",
    student: {
      id: "member-1",
      email: "student@ku.th",
      firstName: "Ari",
      lastName: "Wattanakul",
    },
    quoteId: "quote-1",
    principalSatang: 420000,
    receiptSatang: 415000,
    maximumFeeSatang: 5000,
    maximumTaxSatang: 0,
    maximumDebitSatang: 420000,
    actualFeeSatang: null,
    actualTaxSatang: null,
    actualDebitSatang: null,
    bankCode: "KBANK",
    bankName: "Kasikornbank",
    destinationType: "BANK_ACCOUNT",
    maskedDestinationValue: "xxx-x-xx123-x",
    maskedRoutingValue: "xxx",
    providerReference: null,
    providerStatus: null,
    payoutStatus: "PENDING_ADMIN_APPROVAL",
    cancellationReasonCode: null,
    createdAt: "2026-09-14T01:00:00.000Z",
    updatedAt: "2026-09-14T01:00:00.000Z",
    version: 4,
    ...overrides,
  };
}

function payoutDetail(overrides: Partial<AdminPayout> = {}): AdminPayoutDetail {
  return {
    ...payout(overrides),
    history: [{
      id: "history-1",
      fromStatus: null,
      toStatus: "PENDING_ADMIN_APPROVAL",
      providerStatus: null,
      actorUserId: "member-1",
      actorAdminId: null,
      source: "PAYOUT_REQUEST",
      reason: null,
      occurredAt: "2026-09-14T01:00:00.000Z",
    }],
  };
}

describe("Payout route model", () => {
  it("maps a Payout DTO to safe board and detail view models", () => {
    const apiPayout = payoutDetail({ payoutStatus: "CANCELLED", cancellationReasonCode: "PAYOUT_RISK_REVIEW" });

    const row = payoutRowFromApi(apiPayout);
    const detail = payoutDetailViewFromApi(apiPayout);

    expect(row).toMatchObject({
      id: "PAY-9637",
      studentName: "Ari Wattanakul",
      status: "CANCELLED",
      principalSatang: 420000,
      maskedDestinationValue: "xxx-x-xx123-x",
    });
    expect(detail).toMatchObject({
      id: "PAY-9637",
      status: "CANCELLED",
      amounts: {
        principalSatang: 420000,
        receiptSatang: 415000,
        maximumDebitSatang: 420000,
      },
      destination: {
        bankName: "Kasikornbank",
        maskedValue: "xxx-x-xx123-x",
      },
      history: [{ toStatus: "PENDING_ADMIN_APPROVAL" }],
    });
    expect(detail).not.toHaveProperty("payoutStatus");
    expect(detail).not.toHaveProperty("rawDestination");
    expect(detail).not.toHaveProperty("providerPayload");
    expect(detail).not.toBe(apiPayout);
  });

  it("keeps API-provided actual amounts as null instead of calculating them", () => {
    const detail: PayoutDetailView = payoutDetailViewFromApi(payoutDetail({
      actualFeeSatang: null,
      actualTaxSatang: null,
      actualDebitSatang: null,
    }));

    expect(detail.amounts.actualFeeSatang).toBeNull();
    expect(detail.amounts.actualTaxSatang).toBeNull();
    expect(detail.amounts.actualDebitSatang).toBeNull();
  });

  it("maps previous Student Payouts and status decision context", () => {
    const current = payoutDetail();
    const previous = payout({
      id: "PAY-9636",
      payoutStatus: "SUCCEEDED",
      createdAt: "2026-09-13T01:00:00.000Z",
    });
    const otherStudent = payout({
      id: "PAY-OTHER",
      student: { id: "member-2", email: "other@ku.th", firstName: "Other", lastName: "Student" },
      createdAt: "2026-09-12T01:00:00.000Z",
    });

    const detail = payoutDetailViewFromApi(current, [previous, otherStudent]);

    expect(detail.previousPayouts).toEqual([{
      id: "PAY-9636",
      status: "SUCCEEDED",
      principalSatang: 420000,
      createdAt: "2026-09-13T01:00:00.000Z",
    }]);
    expect(detail.decisionContext).toEqual({
      heading: "Why your approval is needed",
      copy: "This Payout is ready for release, but it cannot move to the bank until an Admin approves it.",
      next: "Approve Payout → status changes to Sent. Funds are not yet transferred.",
    });
  });

  it("only uses a reason from the current terminal status transition", () => {
    const apiDetail = payoutDetail({ payoutStatus: "FAILED" });
    apiDetail.history = [
      ...apiDetail.history,
      {
        id: "history-approval",
        fromStatus: "PENDING_ADMIN_APPROVAL",
        toStatus: "SUBMITTED_TO_PROVIDER",
        providerStatus: null,
        actorUserId: null,
        actorAdminId: "admin-1",
        source: "ADMIN_APPROVAL",
        reason: "PAYOUT_POLICY_REVIEW",
        occurredAt: "2026-09-14T01:05:00.000Z",
      },
      {
        id: "history-failure",
        fromStatus: "SUBMITTED_TO_PROVIDER",
        toStatus: "FAILED",
        providerStatus: null,
        actorUserId: null,
        actorAdminId: null,
        source: "PROVIDER_CALLBACK",
        reason: null,
        occurredAt: "2026-09-14T01:10:00.000Z",
      },
    ];
    const detail = payoutDetailViewFromApi(apiDetail);

    expect(payoutOutcomeReason(detail)).toBeNull();
  });

});
