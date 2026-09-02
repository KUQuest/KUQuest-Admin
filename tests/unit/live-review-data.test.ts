import { describe, expect, it } from "bun:test";

import { payoutRecordFromApi } from "../../src/features/admin/legacy/live-review-data";

describe("live review data", () => {
  it("maps the Payout API DTO without calculating financial values", () => {
    const record = payoutRecordFromApi({
      id: "payout-1",
      student: {
        id: "student-1",
        email: "student@ku.th",
        firstName: "Ari",
        lastName: "Wattanakul",
      },
      quoteId: "quote-1",
      principalSatang: 12501,
      receiptSatang: 12301,
      maximumFeeSatang: 100,
      maximumTaxSatang: 100,
      maximumDebitSatang: 12701,
      actualFeeSatang: null,
      actualTaxSatang: null,
      actualDebitSatang: null,
      bankCode: "KBANK",
      bankName: "Kasikornbank",
      destinationType: "BANK_ACCOUNT",
      maskedDestinationValue: "•••• 1234",
      maskedRoutingValue: "••••",
      providerReference: null,
      providerStatus: null,
      payoutStatus: "CREATING",
      rejectionReason: null,
      createdAt: "2026-09-02T01:00:00.000Z",
      updatedAt: "2026-09-02T01:00:00.000Z",
    });

    expect(record).toMatchObject({
      id: "payout-1",
      title: "Ari Wattanakul",
      status: "SUBMITTED_TO_PROVIDER",
      payoutStatus: "SUBMITTED_TO_PROVIDER",
      amount: 125.01,
      amountSatang: 12501,
      maximumFeeSatang: 100,
      maximumTaxSatang: 100,
      maximumDebitSatang: 12701,
      apiBacked: true,
      studentId: "student-1",
    });
  });
});
