import { afterEach, describe, expect, it } from "bun:test";

import {
  canonicalQuestStateForApi,
  loadLiveQuest,
  payoutRecordFromApi,
  questRecordFromApiSummary,
} from "../../src/features/admin/legacy/live-review-data";
import { data } from "../../src/features/admin/legacy/runtime-data";

const originalFetch = globalThis.fetch;
const originalQuests = data.quests;

afterEach(() => {
  globalThis.fetch = originalFetch;
  data.quests = originalQuests;
  delete process.env.NEXT_PUBLIC_API_URL;
});

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

  it("maps API Quest States to the canonical displayed Quest State", () => {
    expect(canonicalQuestStateForApi("QUEST_DISPUTED")).toBe("QUEST_FAILED");
    expect(canonicalQuestStateForApi("QUEST_SUBMITTED")).toBe("QUEST_IN_PROGRESS");

    const record = questRecordFromApiSummary({
      id: "quest-1",
      apiVersion: "v2",
      version: 4,
      title: "Campus survey",
      questStatus: "QUEST_DISPUTED",
      mode: "CANDIDATE",
      participation: "SINGLE",
      headcount: 1,
      rewardSatang: 12000,
      questFundingTotalSatang: 12240,
      startTime: "2026-09-02T01:00:00.000Z",
      dueAt: null,
      hiddenAt: null,
      createdAt: "2026-09-01T01:00:00.000Z",
      updatedAt: "2026-09-02T01:00:00.000Z",
      hirer: {
        id: "member-1",
        firstName: "Ari",
        lastName: "Wattanakul",
        email: "ari@ku.th",
      },
    });

    expect(record).toMatchObject({
      id: "quest-1",
      questState: "QUEST_FAILED",
      status: "QUEST_FAILED",
      person: "Ari Wattanakul",
      fundingTotalSatang: 12240,
      apiBacked: true,
    });
  });

  it("loads one Quest detail without loading the Quest collection", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const urls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      urls.push(new Request(input, init).url);
      return new Response(JSON.stringify({
        success: true,
        data: {
          id: "quest-1",
          apiVersion: "v1",
          version: 1,
          title: "Campus survey",
          description: "Collect survey responses.",
          condition: { text: "Submit the survey summary.", items: [] },
          locations: [{ label: "Central Library" }],
          questStatus: "QUEST_OPEN",
          mode: "FIRST_COME_FIRST_SERVED",
          participation: "SINGLE",
          headcount: 1,
          proofRequired: true,
          tagId: null,
          rewardSatang: 12000,
          questFundingTotalSatang: null,
          fundingReservationId: null,
          policyRevisionId: null,
          platformFeeBps: null,
          platformFeePerWorkerSatang: null,
          questEscrowSatang: null,
          startTime: "2026-09-05T01:00:00.000Z",
          dueAt: "2026-09-12T01:00:00.000Z",
          cancelledAt: null,
          cancelledByUserId: null,
          cancelledByAdminId: null,
          hiddenAt: null,
          hiddenByAdminId: null,
          createdAt: "2026-09-01T01:00:00.000Z",
          updatedAt: "2026-09-02T01:00:00.000Z",
          hirer: {
            id: "member-1",
            firstName: "Ari",
            lastName: "Wattanakul",
            email: "ari@ku.th",
          },
          candidates: { applications: [], teams: [] },
          assignments: [],
          proofSubmissions: [],
          editHistory: [],
          adminActions: [],
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof globalThis.fetch;

    await loadLiveQuest("quest-1");

    expect(urls).toEqual(["https://api.example.test/api/v1/admin/quests/quest-1"]);
    expect(data.quests).toHaveLength(1);
    expect(data.quests[0]).toMatchObject({
      id: "quest-1",
      title: "Campus survey",
      apiBacked: true,
      location: ["Central Library", "Loaded from the Admin API."],
    });
  });
});
