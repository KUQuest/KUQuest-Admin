import { afterEach, describe, expect, it } from "bun:test";

import {
  canonicalQuestStateForApi,
  loadLiveDispute,
  loadLiveQuest,
  memberRecordFromApi,
  payoutRecordFromApi,
  refreshLivePayouts,
  refreshLiveDisputes,
  refreshLiveQuests,
  walletRecordFromApi,
  questRecordFromApiSummary,
} from "../../src/features/admin/legacy/live-review-data";
import { data } from "../../src/features/admin/legacy/runtime-data";

const originalFetch = globalThis.fetch;
const originalQuests = data.quests;
const originalPayouts = data.payouts;
const originalDisputes = data.disputes;

afterEach(() => {
  globalThis.fetch = originalFetch;
  data.quests = originalQuests;
  data.payouts = originalPayouts;
  data.disputes = originalDisputes;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("live review data", () => {
  it("resolves Quest refresh after the first API page while later pages load in the background", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let releaseSecondPage!: () => void;
    const secondPage = new Promise<Response>((resolve) => {
      releaseSecondPage = () => resolve(new Response(JSON.stringify({
        success: true,
        data: { items: [], nextCursor: null },
      }), { status: 200, headers: { "content-type": "application/json" } }));
    });

    globalThis.fetch = (async (input, init) => {
      const url = new URL(new Request(input, init).url);
      if (url.searchParams.get("cursor") === "next") return secondPage;
      return new Response(JSON.stringify({
        success: true,
        data: {
          items: [{
            id: "quest-1",
            apiVersion: "v1",
            version: 1,
            title: "Campus survey",
            questStatus: "QUEST_OPEN",
            mode: "FIRST_COME_FIRST_SERVED",
            participation: "SINGLE",
            headcount: 1,
            rewardSatang: 12000,
            questFundingTotalSatang: 12240,
            startTime: "2026-09-05T01:00:00.000Z",
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
          }],
          nextCursor: "next",
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof globalThis.fetch;

    const refresh = refreshLiveQuests();
    const result = await Promise.race([
      refresh.then(() => "first-page-ready"),
      new Promise<string>((resolve) => setTimeout(() => resolve("blocked"), 50)),
    ]);

    expect(result).toBe("first-page-ready");
    releaseSecondPage();
    await refresh;
  });

  it("coalesces simultaneous Quest refreshes", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    let calls = 0;
    globalThis.fetch = (async (_input: RequestInfo | URL, _init?: RequestInit) => {
      calls += 1;
      return new Response(JSON.stringify({
        success: true,
        data: { items: [], nextCursor: null },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof globalThis.fetch;

    await Promise.all([refreshLiveQuests(), refreshLiveQuests()]);

    expect(calls).toBe(1);
  });

  it("uses canonical Payout statuses in every API filter request", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requestedStatuses: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = new URL(new Request(input, init).url);
      requestedStatuses.push(url.searchParams.get("status") || "missing");
      return new Response(JSON.stringify({
        success: true,
        data: { items: [], nextCursor: null },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof globalThis.fetch;

    await refreshLivePayouts();

    expect(requestedStatuses).toEqual([
      "PENDING_ADMIN_APPROVAL",
      "SUBMITTED_TO_PROVIDER",
      "PROVIDER_PENDING",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
    ]);
  });

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
      payoutStatus: "SUBMITTED_TO_PROVIDER",
      cancellationReasonCode: null,
      version: 1,
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

  it("maps Member and Wallet API records without inventing Member moderation status", () => {
    const member = memberRecordFromApi({
      id: "member-1",
      email: "member@ku.th",
      firstName: "Ari",
      lastName: "Wattanakul",
      studentId: "68000001",
      telephone: null,
      academicYear: 2,
      faculty: "Engineering",
      department: "Computer Engineering",
      occupation: "Student",
      wallet: {
        id: "wallet-1",
        walletStatus: "FROZEN",
        spendingBalanceSatang: 12000,
        earningsBalanceSatang: 3000,
        totalBalanceSatang: 15000,
      },
      createdAt: "2026-09-02T01:00:00.000Z",
    });
    const wallet = walletRecordFromApi({
      id: "wallet-1",
      userId: "member-1",
      member: {
        firstName: "Ari",
        lastName: "Wattanakul",
        studentId: "68000001",
        email: "member@ku.th",
        telephone: null,
      },
      walletStatus: "FROZEN",
      balances: {
        spendingBalanceSatang: 12000,
        earningsBalanceSatang: 3000,
        fundingReservedSatang: 0,
        reservedForPayoutsSatang: 0,
        totalBalanceSatang: 15000,
      },
      createdAt: "2026-09-02T01:00:00.000Z",
      updatedAt: "2026-09-02T02:00:00.000Z",
    });

    expect(member).toMatchObject({
      id: "68000001",
      memberId: "member-1",
      walletId: "wallet-1",
      walletStatus: "FROZEN",
      memberStatusSource: "NOT_PROVIDED_BY_API",
      apiBacked: true,
    });
    expect(member.memberStatus).toBeUndefined();
    expect(wallet).toMatchObject({
      id: "wallet-1",
      memberId: "member-1",
      walletStatus: "FROZEN",
      walletTotalBalanceSatang: 15000,
      apiBacked: true,
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

  it("loads Dispute Cases and case-scoped evidence from the Admin API", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Array<{ url: string; idempotencyKey: string | null }> = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push({
        url: request.url,
        idempotencyKey: request.headers.get("idempotency-key"),
      });
      if (request.url.endsWith("/evidence")) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            caseId: "case-1",
            questId: "quest-1",
            truncated: false,
            quest: {
              id: "quest-1",
              questStatus: "QUEST_FAILED",
              version: 3,
              hirerId: "hirer-1",
              failedAt: "2026-09-02T02:00:00.000Z",
            },
            assignments: [{
              id: "assignment-1",
              workerId: "worker-1",
              assignmentStatus: "ASSIGNED",
              startedAt: null,
              createdAt: "2026-09-01T02:00:00.000Z",
            }],
            proofSubmissions: [{
              id: "proof-1",
              workerId: "worker-1",
              teamId: null,
              submittedByUserId: "worker-1",
              submissionStatus: "SUBMITTED",
              submittedAt: "2026-09-02T01:30:00.000Z",
              files: [{
                fileId: "file-1",
                contentType: "image/png",
                sizeBytes: 10,
                position: 0,
              }],
            }],
            adminActionId: "action-1",
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        success: true,
        data: {
          id: "case-1",
          questId: "quest-1",
          filerUserId: "worker-1",
          openedByAdminId: null,
          status: "DISPUTE_CASE_PENDING",
          version: 3,
          resolvedWorkerId: null,
          resolvedAmountSatang: null,
          resolvedByAdminId: null,
          resolvedAt: null,
          createdAt: "2026-09-02T01:00:00.000Z",
          updatedAt: "2026-09-02T01:00:00.000Z",
          quest: {
            id: "quest-1",
            title: "Campus survey",
            hirerId: "hirer-1",
            questStatus: "QUEST_FAILED",
            version: 3,
            failedAt: "2026-09-02T02:00:00.000Z",
            fundingReservationId: "reservation-1",
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof globalThis.fetch;

    await loadLiveDispute("case-1");

    expect(requests.map((request) => request.url)).toEqual([
      "https://api.example.test/api/v1/admin/disputes/case-1",
      "https://api.example.test/api/v1/admin/disputes/case-1/evidence",
    ]);
    expect(requests[1]?.idempotencyKey).toBeTruthy();
    expect(data.disputes[0]).toMatchObject({
      id: "case-1",
      title: "Campus survey",
      status: "DISPUTE_CASE_PENDING",
      questState: "QUEST_FAILED",
      workerId: "worker-1",
      evidence: ["Proof Submission · proof-1", "Attachment · file-1"],
      evidenceRefs: ["proof-1", "file-1"],
      apiBacked: true,
    });
    expect(data.disputes[0]?.mockDisputeData).toMatchObject({
      amountBaht: expect.any(Number),
      category: expect.any(String),
      claim: expect.any(String),
      response: expect.any(String),
    });
    expect(data.disputes[0]?.apiMissingFields).toContain("Participant claim and response");
  });

  it("replaces the Dispute Case collection with API data and does not use seeded fallback data", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    data.disputes = [{
      id: "mock-case",
      title: "Seeded case",
      person: "Mock",
      other: "Mock",
      status: "DISPUTE_CASE_PENDING",
      tone: "warning",
      amount: 10,
      age: "Today",
      evidence: [],
    }];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(new Request(input).url);
      const items = url.searchParams.get("status") === "DISPUTE_CASE_DISMISSED" ? [{
        id: "case-api",
        questId: "quest-api",
        filerUserId: "worker-api",
        openedByAdminId: null,
        status: "DISPUTE_CASE_DISMISSED",
        version: 2,
        resolvedWorkerId: null,
        resolvedAmountSatang: null,
        resolvedByAdminId: "admin-1",
        resolvedAt: "2026-09-02T02:00:00.000Z",
        createdAt: "2026-09-02T01:00:00.000Z",
        updatedAt: "2026-09-02T02:00:00.000Z",
      }] : [];
      return new Response(JSON.stringify({
        success: true,
        data: {
          items,
          nextCursor: null,
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof globalThis.fetch;

    await refreshLiveDisputes();

    expect(data.disputes).toHaveLength(1);
    expect(data.disputes[0]).toMatchObject({
      id: "case-api",
      apiBacked: true,
      status: "DISPUTE_CASE_DISMISSED",
    });
  });
});
