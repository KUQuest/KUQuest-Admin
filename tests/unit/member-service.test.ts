import { afterEach, describe, expect, it } from "bun:test";

import { loadMemberDetailFromApi } from "../../src/features/admin/member/member-service";
import { adminWalletDetailFixtures } from "../fixtures/admin-wallet-api-fixtures";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function ledgerTransaction(id: string, createdAt: string) {
  return {
    id,
    displayReference: `LED-${id}`,
    businessReference: `REF-${id}`,
    eventType: "TOP_UP",
    description: "Wallet top-up",
    createdByUserId: null,
    correctionOfTransactionId: null,
    createdAt,
    sealedAt: createdAt,
    isBalanced: true,
    postings: [{
      id: `posting-${id}`,
      accountId: "wallet-account-1001",
      accountType: "SPENDING",
      walletId: "WAL-1001",
      amountSatang: 100,
      member: null,
    }, {
      id: `posting-${id}-counterpart`,
      accountId: "platform-account-1001",
      accountType: "PLATFORM_SUSPENSE",
      walletId: null,
      amountSatang: -100,
      member: null,
    }],
  };
}

const memberDetail = {
  member: {
    id: "68000000",
    displayId: "MEM-000001",
    email: "akarin.a@ku.th",
    firstName: "Akarin",
    lastName: "Ariyawat",
    studentId: "6810000000",
    telephone: null,
    academicYear: 1,
    faculty: null,
    department: null,
    occupation: null,
    memberStatus: "NORMAL",
    bio: null,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  wallet: {
    id: "WAL-1001",
    walletStatus: adminWalletDetailFixtures[0]!.walletStatus,
    spendingBalanceSatang: 100,
    earningsBalanceSatang: 0,
    fundingReservedSatang: 0,
    reservedForPayoutsSatang: 0,
    totalBalanceSatang: 100,
    projectionMatchesLedger: true,
  },
  stats: {
    questsCreatedCount: 0,
    questsCompletedAsWorkerCount: 0,
    reviewsReceivedCount: 0,
    averageRating: null,
    payoutsCount: 0,
    totalEarnedSatang: 0,
    totalPaidOutSatang: 0,
  },
};

const reportStatuses = [
  "REPORT_CASE_PENDING",
  "REPORT_CASE_DISMISSED",
  "REPORT_CASE_HIDDEN",
  "REPORT_CASE_RESTORED",
  "CONDUCT_REPORT_PENDING",
  "CONDUCT_REPORT_UPHELD",
  "CONDUCT_REPORT_DISMISSED",
] as const;
type ReportStatus = (typeof reportStatuses)[number];

function reportCounts(overrides: Partial<Record<ReportStatus, number>> = {}): Record<ReportStatus, number> {
  return {
    REPORT_CASE_PENDING: 0,
    REPORT_CASE_DISMISSED: 0,
    REPORT_CASE_HIDDEN: 0,
    REPORT_CASE_RESTORED: 0,
    CONDUCT_REPORT_PENDING: 0,
    CONDUCT_REPORT_UPHELD: 0,
    CONDUCT_REPORT_DISMISSED: 0,
    ...overrides,
  };
}

function reportPage(
  status: string,
  items: unknown[] = [],
  nextCursor: string | null = null,
  countsByStatus = reportCounts(),
) {
  return {
    items,
    nextCursor,
    totalCount: countsByStatus[status as ReportStatus] ?? 0,
    countsByStatus,
  };
}

const payoutStatuses = [
  "PENDING_ADMIN_APPROVAL",
  "SUBMITTED_TO_PROVIDER",
  "PROVIDER_PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

function reportRecord(id: string, status: (typeof reportStatuses)[number]) {
  const member = {
    id: "68000000",
    displayId: "MEM-000001",
    email: "akarin.a@ku.th",
    firstName: "Akarin",
    lastName: "Ariyawat",
    studentId: "6810000000",
  };
  const quest = {
    id: "quest-000001",
    displayId: "QST-000001",
    title: "Quest context",
    questStatus: "QUEST_COMPLETED",
    mode: "FIRST_COME_FIRST_SERVED",
    participation: "SINGLE",
  };
  if (status.startsWith("CONDUCT_REPORT_")) {
    return {
      kind: "CONDUCT_REPORT",
      id,
      displayId: "CND-000001",
      status,
      filer: { ...member, studentId: null },
      reportedMember: { ...member, studentId: null },
      quest,
      reason: "CONDUCT_ABANDONED",
      detail: "The Worker did not attend the agreed Quest.",
      createdAt: "2026-09-12T08:30:00.000Z",
    };
  }
  return {
    kind: "REPORT_CASE",
    id,
    displayId: "RPT-000001",
    status,
    reportedMember: member,
    quest,
    reporterEntries: [{
      id: `entry-${id}`,
      reporterMemberId: "68000001",
      reporter: { ...member, id: "68000001", displayId: "MEM-000002", firstName: "Suda", lastName: "Reporter" },
      reason: "REPORT_SPAM",
      detail: "This message repeats an unrelated advert.",
      createdAt: "2026-09-12T08:30:00.000Z",
    }],
    createdAt: "2026-09-12T08:30:00.000Z",
  };
}

function payoutRecord(id: string, payoutStatus: (typeof payoutStatuses)[number]) {
  return {
    id,
    displayId: "PAY-000001",
    student: {
      id: "68000000",
      displayId: "MEM-000001",
      email: "akarin.a@ku.th",
      firstName: "Akarin",
      lastName: "Ariyawat",
      studentId: "6810000000",
    },
    quoteId: `quote-${id}`,
    principalSatang: 12500,
    receiptSatang: 12500,
    maximumFeeSatang: 0,
    maximumTaxSatang: 0,
    maximumDebitSatang: 12500,
    actualFeeSatang: null,
    actualTaxSatang: null,
    actualDebitSatang: null,
    bankCode: "KBANK",
    bankName: "Kasikorn Bank",
    destinationType: "BANK_ACCOUNT",
    maskedDestinationValue: "xxx-x-xx123-x",
    maskedRoutingValue: "xxx",
    providerReference: null,
    providerStatus: null,
    payoutStatus,
    cancellationReasonCode: null,
    createdAt: "2026-09-12T08:30:00.000Z",
    updatedAt: "2026-09-12T08:30:00.000Z",
    version: 1,
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("Member detail service", () => {
  it("loads every Ledger page for the Member Wallet Statement", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: memberDetail });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage(url.searchParams.get("status") ?? "") });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return jsonResponse({
          success: true,
          data: url.searchParams.get("cursor") === "ledger-next"
            ? { items: [ledgerTransaction("ledger-1002", "2026-09-11T08:30:00.000Z")], nextCursor: null }
            : { items: [ledgerTransaction("ledger-1001", "2026-09-12T08:30:00.000Z")], nextCursor: "ledger-next" },
        });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000", "kuquest-admin=session");

    expect(model?.walletStatement.items?.map((transaction) => transaction.id)).toEqual(["ledger-1001", "ledger-1002"]);
    expect(model?.walletStatement.error).toBeNull();
    expect(model?.walletReadState).toMatchObject({ kind: "available", source: "member-detail", warning: { kind: "request" } });
    const ledgerRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"));
    expect(ledgerRequests).toHaveLength(2);
    expect(ledgerRequests[0]?.url).toContain("walletId=WAL-1001");
    expect(ledgerRequests[1]?.url).toContain("cursor=ledger-next");
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
  });

  it("does not use a Finance Wallet when Member detail reports no Wallet", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: { ...memberDetail, wallet: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/members/68000000") {
        return jsonResponse({ success: true, data: { member: { userId: "68000000" }, wallet: memberDetail.wallet } });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage("", []) });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Unexpected request" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000", "kuquest-admin=session");

    expect(model?.walletReadState).toMatchObject({ kind: "conflict", error: { kind: "contract" } });
    expect(model?.walletId).toBeNull();
    expect(model?.walletBalances).toBeNull();
    expect(requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"))).toHaveLength(0);
  });


  it("keeps verified empty Report and Payout histories distinct from unavailable reads", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") return jsonResponse({ success: true, data: memberDetail });
      if (url.pathname === "/api/v1/admin/reports") return jsonResponse({ success: true, data: reportPage(url.searchParams.get("status") ?? "") });
      if (url.pathname === "/api/v1/admin/payouts") return jsonResponse({ success: true, data: { items: [], totalCount: 0, nextCursor: null } });
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.reportsReceived).toMatchObject({ items: [], totalCount: 0, complete: true, error: null });
    expect(model?.payouts).toMatchObject({ items: [], totalCount: 0, complete: true, error: null });
  });


  it("keeps unavailable Report and Payout reads as unavailable", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") return jsonResponse({ success: true, data: memberDetail });
      if (url.pathname === "/api/v1/admin/reports" || url.pathname === "/api/v1/admin/payouts") {
        return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "History unavailable" } }, 503);
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.reportsReceived).toMatchObject({ items: null, complete: false, error: { kind: "request" } });
    expect(model?.payouts).toMatchObject({ items: null, complete: false, error: { kind: "request" } });
  });

  it("keeps partial Report pages and rejects a Payout outside the Member scope", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") return jsonResponse({ success: true, data: memberDetail });
      if (url.pathname === "/api/v1/admin/reports") {
        if (url.searchParams.has("submittedByMemberId")) {
          return jsonResponse({ success: true, data: reportPage("", []) });
        }
        if (url.searchParams.has("cursor")) {
          return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Reports unavailable" } }, 503);
        }
        const counts = reportCounts({ REPORT_CASE_PENDING: 2, REPORT_CASE_DISMISSED: 1 });
        return jsonResponse({
          success: true,
          data: {
            items: [reportRecord("report-partial", "REPORT_CASE_PENDING")],
            nextCursor: "report-next",
            totalCount: 3,
            countsByStatus: counts,
          },
        });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        const payout = payoutRecord("invalid-payout", "CANCELLED");
        return jsonResponse({
          success: true,
          data: {
            items: [{ ...payout, student: { ...payout.student, id: "68000001" } }],
            nextCursor: null,
            totalCount: 1,
          },
        });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.reportsReceived.items?.map((report) => report.id)).toContain("report-partial");
    expect(model?.reportsReceived.complete).toBe(false);
    expect(model?.reportsReceived.totalCount).toBe(3);
    expect(model?.reportsReceived.error?.kind).toBe("request");
    expect(model?.payouts.items).toBeNull();
    expect(model?.payouts.complete).toBe(false);
    expect(model?.payouts.error?.kind).toBe("contract");
  });
  it("loads complete Admin Member profile collections with scoped full-history reads", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const memberId = "68000000";
    const memberDisplayId = "MEM-000001";
    const detail = {
      ...memberDetail,
      member: { ...memberDetail.member, displayId: memberDisplayId },
      stats: { ...memberDetail.stats, reviewsReceivedCount: 2, averageRating: 4.5 },
    };
    const requests: Request[] = [];
    const receivedCounts = reportCounts({
      REPORT_CASE_HIDDEN: 1,
      CONDUCT_REPORT_UPHELD: 1,
    });
    const submittedCounts = reportCounts({
      REPORT_CASE_RESTORED: 1,
      CONDUCT_REPORT_DISMISSED: 1,
    });
    const otherMember = {
      id: "68000002",
      displayId: "MEM-000002",
      email: "other@ku.th",
      firstName: "Other",
      lastName: "Member",
      studentId: null,
    };
    const quest = {
      id: "quest-000001",
      displayId: "QST-000001",
      title: "Report Quest",
      questStatus: "QUEST_COMPLETED",
      mode: "FIRST_COME_FIRST_SERVED",
      participation: "SINGLE",
    };
    const receivedCase = {
      kind: "REPORT_CASE",
      id: "received-case",
      displayId: "RPT-000001",
      status: "REPORT_CASE_HIDDEN",
      reportedMember: {
        id: memberId,
        displayId: memberDisplayId,
        email: "akarin.a@ku.th",
        firstName: "Akarin",
        lastName: "Ariyawat",
        studentId: "6810000000",
      },
      quest,
      reporterEntries: [{
        id: "received-entry",
        reporterMemberId: otherMember.id,
        reporter: otherMember,
        reason: "REPORT_SPAM",
        detail: "Spam message.",
        createdAt: "2026-09-12T08:30:00.000Z",
      }],
      createdAt: "2026-09-12T08:30:00.000Z",
    };
    const receivedConduct = {
      kind: "CONDUCT_REPORT",
      id: "received-conduct",
      displayId: "CND-000001",
      status: "CONDUCT_REPORT_UPHELD",
      filer: otherMember,
      reportedMember: { ...otherMember, id: memberId, displayId: memberDisplayId },
      quest,
      reason: "CONDUCT_ABANDONED",
      detail: "Missed the agreed work.",
      createdAt: "2026-09-10T08:30:00.000Z",
    };
    const submittedCase = {
      kind: "REPORT_CASE",
      id: "submitted-case",
      displayId: "RPT-000002",
      status: "REPORT_CASE_RESTORED",
      reportedMember: otherMember,
      quest,
      reporterEntries: [
        {
          id: "other-entry",
          reporterMemberId: otherMember.id,
          reporter: otherMember,
          reason: "REPORT_SPAM",
          detail: "Another Member filed this entry.",
          createdAt: "2026-09-12T08:30:00.000Z",
        },
        {
          id: "member-entry",
          reporterMemberId: memberId,
          reporter: { ...otherMember, id: memberId, displayId: memberDisplayId, firstName: "Akarin", lastName: "Ariyawat" },
          reason: "REPORT_OTHER",
          detail: "This Member filed this entry.",
          createdAt: "2026-09-12T08:31:00.000Z",
        },
      ],
      createdAt: "2026-09-12T08:30:00.000Z",
    };
    const submittedConduct = {
      kind: "CONDUCT_REPORT",
      id: "submitted-conduct",
      displayId: "CND-000002",
      status: "CONDUCT_REPORT_DISMISSED",
      filer: { ...otherMember, id: memberId, displayId: memberDisplayId, firstName: "Akarin", lastName: "Ariyawat" },
      reportedMember: otherMember,
      quest,
      reason: "CONDUCT_NO_SHOW",
      detail: "The Worker did not attend.",
      createdAt: "2026-09-10T08:30:00.000Z",
    };
    const workExperience = (title: string) => ({
      title,
      employmentType: "PART_TIME",
      organization: "Kasetsart University",
      description: null,
      startedAt: "2022-01-01",
      endedAt: null,
    });
    const certificate = {
      name: "First Aid",
      issuer: "KU",
      issuedAt: "2025-04-02",
      image: { contentType: "image/png", sizeBytes: 1024 },
    };
    const historyItem = (role: "HIRER" | "WORKER", questId: string) => ({
      role,
      createdAt: "2026-09-10T08:30:00.000Z",
      assignmentStatus: role === "WORKER" ? "ASSIGNMENT_COMPLETED" : null,
      startedAt: role === "WORKER" ? "2026-09-10T09:00:00.000Z" : null,
      assignmentStatusChangedAt: role === "WORKER" ? "2026-09-11T08:30:00.000Z" : null,
      quest: {
        id: questId,
        displayId: role === "HIRER" ? "QST-000001" : "QST-000002",
        title: `${role} Quest`,
        questStatus: "QUEST_COMPLETED",
        createdAt: "2026-09-10T08:30:00.000Z",
        questStatusChangedAt: "2026-09-11T08:30:00.000Z",
      },
      relatedMembers: role === "HIRER" ? [{
        role: "WORKER",
        member: {
          id: otherMember.id,
          displayId: otherMember.displayId,
          firstName: otherMember.firstName,
          lastName: otherMember.lastName,
        },
        assignmentStatus: "ASSIGNMENT_COMPLETED",
        assignmentCreatedAt: "2026-09-10T08:30:00.000Z",
        startedAt: "2026-09-10T09:00:00.000Z",
        assignmentStatusChangedAt: "2026-09-11T08:30:00.000Z",
      }] : [{
        role: "HIRER",
        member: {
          id: otherMember.id,
          displayId: otherMember.displayId,
          firstName: otherMember.firstName,
          lastName: otherMember.lastName,
        },
        assignmentStatus: null,
        assignmentCreatedAt: null,
        startedAt: null,
        assignmentStatusChangedAt: null,
      }],
    });
    const review = (id: string) => ({
      id,
      rating: 5,
      comment: "Good work.",
      createdAt: "2026-09-11T08:30:00.000Z",
      updatedAt: "2026-09-11T08:30:00.000Z",
      reviewer: { displayId: otherMember.displayId, name: "Other Member" },
      quest: { displayId: "QST-000001", title: "Completed Quest", questStatus: "QUEST_COMPLETED" },
    });
    const penalty = (reversed: boolean) => ({
      ladder: "MISCONDUCT",
      source: "REPORT_CASE",
      sourceDisplayId: "RPT-000001",
      sequenceNumber: 1,
      result: reversed ? "PENALTY_REVERSAL" : "PENALTY_RED_FLAG",
      actor: { type: "ADMIN", displayName: "Admin One" },
      reasonCode: "POLICY_REVIEW",
      createdAt: reversed ? "2026-09-12T08:30:00.000Z" : "2026-09-11T08:30:00.000Z",
      reviewRating: null,
      isEffectiveActiveMisconductPenalty: !reversed,
      reversal: reversed
        ? { relation: "REVERSAL_OF", sequenceNumber: 1, result: "PENALTY_RED_FLAG", createdAt: "2026-09-11T08:30:00.000Z" }
        : { relation: "REVERSED_BY", sequenceNumber: 1, result: "PENALTY_REVERSAL", createdAt: "2026-09-12T08:30:00.000Z" },
    });

    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);
      const success = (data: unknown) => jsonResponse({ success: true, data });

      if (url.pathname === `/api/v1/admin/members/${memberId}`) return success(detail);
      if (url.pathname === `/api/v1/admin/finance/members/${memberId}`) {
        return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return success({ items: [], nextCursor: null });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/profile-tags") {
        return success({ member: { displayId: memberDisplayId }, tags: [{ name: "Communication" }] });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/work-experiences") {
        const cursor = url.searchParams.get("cursor");
        return success({
          member: { displayId: memberDisplayId },
          items: [workExperience(cursor ? "Tutor" : "Research Assistant")],
          totalCount: 2,
          nextCursor: cursor ? null : "work-next",
        });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/certificates") {
        return success({
          member: { displayId: memberDisplayId },
          items: [certificate],
          totalCount: 1,
          nextCursor: null,
        });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/history") {
        const cursor = url.searchParams.get("cursor");
        return success({
          member: { displayId: memberDisplayId },
          items: [historyItem(cursor ? "WORKER" : "HIRER", cursor ? "quest-worker" : "quest-hirer")],
          totalCount: 2,
          nextCursor: cursor ? null : "history-next",
        });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/reviews") {
        const cursor = url.searchParams.get("cursor");
        return success({
          items: [review(cursor ? "review-2" : "review-1")],
          totalCount: 2,
          nextCursor: cursor ? null : "review-next",
        });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/penalty-history") {
        const cursor = url.searchParams.get("cursor");
        return success({
          member: { displayId: memberDisplayId },
          confirmedMisconductCount: 1,
          effectiveActiveMisconductPenaltyCount: 0,
          reviewLadderRecordCount: 0,
          items: [penalty(Boolean(cursor))],
          totalCount: 2,
          nextCursor: cursor ? null : "penalty-next",
        });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        const submitted = url.searchParams.has("submittedByMemberId");
        const cursor = url.searchParams.get("cursor");
        const counts = submitted ? submittedCounts : receivedCounts;
        const items = submitted
          ? [cursor ? submittedConduct : submittedCase]
          : [cursor ? receivedConduct : receivedCase];
        return success({
          items,
          nextCursor: cursor ? null : submitted ? "submitted-next" : "received-next",
          totalCount: 2,
          countsByStatus: counts,
        });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        const cursor = url.searchParams.get("cursor");
        return success({
          items: [payoutRecord(cursor ? "payout-2" : "payout-1", cursor ? "FAILED" : "SUCCEEDED")],
          totalCount: 2,
          nextCursor: cursor ? null : "payout-next",
        });
      }
      return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Unexpected API request." } }, 404);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi(memberId);

    expect(model?.profileTags?.items).toEqual(["Communication"]);
    expect(model?.workExperiences?.items?.map((item) => item.title)).toEqual(["Research Assistant", "Tutor"]);
    expect(model?.workExperiences).toMatchObject({ totalCount: 2, complete: true, error: null });
    expect(model?.certificates?.items).toEqual([certificate]);
    expect(model?.questHistory?.items?.map((item) => item.role)).toEqual(["HIRER", "WORKER"]);
    expect(model?.questHistory?.items?.[0]?.quest.displayId).toBe("QST-000001");
    expect(model?.reviews?.items?.map((item) => item.id)).toEqual(["review-1", "review-2"]);
    expect(model?.reportsReceived?.items?.map((item) => item.id)).toEqual(["received-case", "received-conduct"]);
    expect(model?.reportsSubmitted?.items?.map((item) => item.id)).toEqual(["submitted-case", "submitted-conduct"]);
    expect(model?.reportsSubmitted?.items?.find((item) => item.id === "submitted-case")?.reporterId).toBe(memberId);
    expect(model?.payouts?.items?.map((item) => item.status)).toEqual(["SUCCEEDED", "FAILED"]);
    expect(model?.payouts).toMatchObject({ totalCount: 2, complete: true, error: null });
    expect(model?.penaltyHistory?.summary).toEqual({
      confirmedMisconductCount: 1,
      effectiveActiveMisconductPenaltyCount: 0,
      reviewLadderRecordCount: 0,
    });
    expect(model?.penaltyHistory?.items?.map((item) => item.sequenceNumber)).toEqual([1, 1]);
    expect(model?.penaltyHistory?.items?.map((item) => item.result)).toEqual(["PENALTY_RED_FLAG", "PENALTY_REVERSAL"]);

    const memberReports = requests.filter((request) => new URL(request.url).pathname === "/api/v1/admin/reports");
    const receivedReports = memberReports.filter((request) => new URL(request.url).searchParams.has("memberId"));
    const submittedReports = memberReports.filter((request) => new URL(request.url).searchParams.has("submittedByMemberId"));
    const payoutRequests = requests.filter((request) => new URL(request.url).pathname === "/api/v1/admin/payouts");
    expect(receivedReports.every((request) => new URL(request.url).searchParams.get("statusMode") === "FULL_HISTORY")).toBe(true);
    expect(submittedReports.every((request) => new URL(request.url).searchParams.get("statusMode") === "FULL_HISTORY")).toBe(true);
    expect(submittedReports.every((request) => new URL(request.url).searchParams.get("submittedByMemberId") === memberId)).toBe(true);
    expect(submittedReports.every((request) => !new URL(request.url).searchParams.has("memberId"))).toBe(true);
    expect(payoutRequests.every((request) => new URL(request.url).searchParams.get("status") === "ALL" && new URL(request.url).searchParams.get("userId") === memberId)).toBe(true);
    expect(requests.filter((request) => new URL(request.url).pathname.endsWith("/work-experiences"))).toHaveLength(2);
    expect(requests.filter((request) => new URL(request.url).pathname.endsWith("/certificates"))).toHaveLength(1);
    expect(requests.filter((request) => new URL(request.url).pathname.endsWith("/history"))).toHaveLength(2);
    expect(requests.filter((request) => new URL(request.url).pathname.endsWith("/reviews"))).toHaveLength(2);
    expect(requests.filter((request) => new URL(request.url).pathname.endsWith("/penalty-history"))).toHaveLength(2);
  });
  it("keeps partial, request-failed, invalid, and verified-empty Member collections distinct", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const memberId = "68000000";
    const memberDisplayId = "MEM-000001";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const success = (data: unknown) => jsonResponse({ success: true, data });

      if (url.pathname === `/api/v1/admin/members/${memberId}`) {
        return success({ ...memberDetail, member: { ...memberDetail.member, displayId: memberDisplayId } });
      }
      if (url.pathname === `/api/v1/admin/finance/members/${memberId}`) {
        return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return success({ items: [], nextCursor: null });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/profile-tags") {
        return success({ member: { displayId: memberDisplayId }, tags: "invalid" });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/work-experiences") {
        if (url.searchParams.has("cursor")) throw new Error("Work Experience read failed.");
        return success({
          member: { displayId: memberDisplayId },
          items: [{
            title: "Research Assistant",
            employmentType: "PART_TIME",
            organization: null,
            description: null,
            startedAt: "2022-01-01",
            endedAt: null,
          }],
          totalCount: 2,
          nextCursor: "work-next",
        });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/certificates") {
        return success({
          member: { displayId: memberDisplayId },
          items: [{ name: 5, issuer: "KU", issuedAt: "2025-04-02", image: null }],
          totalCount: 1,
          nextCursor: null,
        });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/history") {
        return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "History read failed." } }, 503);
      }
      if (url.pathname === "/api/v1/admin/members/68000000/reviews") {
        return success({ items: [], totalCount: 0, nextCursor: null });
      }
      if (url.pathname === "/api/v1/admin/members/68000000/penalty-history") {
        return success({
          member: { displayId: memberDisplayId },
          confirmedMisconductCount: 0,
          effectiveActiveMisconductPenaltyCount: 0,
          reviewLadderRecordCount: 0,
          items: [],
          totalCount: 0,
          nextCursor: null,
        });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        const status = url.searchParams.get("status");
        return success({
          items: [],
          totalCount: 0,
          nextCursor: null,
          countsByStatus: reportCounts(status ? { [status]: 0 } : {}),
        });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        return success({ items: [], totalCount: 0, nextCursor: null });
      }
      return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Unexpected API request." } }, 404);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi(memberId);

    expect(model?.profileTags).toBeDefined();
    expect(model?.profileTags).toMatchObject({ items: null, complete: false, error: { kind: "contract" } });
    expect(model?.workExperiences).toMatchObject({ items: [{ title: "Research Assistant" }], totalCount: 2, complete: false, error: { kind: "request" } });
    expect(model?.certificates).toMatchObject({ items: null, complete: false, error: { kind: "contract" } });
    expect(model?.questHistory).toMatchObject({ items: null, complete: false, error: { kind: "request" } });
    expect(model?.reviews).toMatchObject({ items: [], totalCount: 0, complete: true, error: null });
    expect(model?.penaltyHistory).toMatchObject({
      items: [],
      totalCount: 0,
      complete: true,
      summary: { confirmedMisconductCount: 0, effectiveActiveMisconductPenaltyCount: 0, reviewLadderRecordCount: 0 },
    });
  });
  it("treats successful empty Member profile reads as verified empty collections", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const memberId = "68000000";
    const memberDisplayId = "MEM-000001";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const success = (data: unknown) => jsonResponse({ success: true, data });

      if (url.pathname === `/api/v1/admin/members/${memberId}`) {
        return success({ ...memberDetail, member: { ...memberDetail.member, displayId: memberDisplayId } });
      }
      if (url.pathname === `/api/v1/admin/finance/ledger/transactions`) {
        return success({ items: [], nextCursor: null });
      }
      if (url.pathname.endsWith("/profile-tags")) {
        return success({ member: { displayId: memberDisplayId }, tags: [] });
      }
      if (url.pathname.endsWith("/work-experiences") || url.pathname.endsWith("/certificates")) {
        return success({ member: { displayId: memberDisplayId }, items: [], totalCount: 0, nextCursor: null });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Read unavailable." } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi(memberId);

    expect(model?.profileTags).toBeDefined();
    expect(model?.profileTags).toMatchObject({ items: [], complete: true, totalCount: 0, error: null });
    expect(model?.workExperiences).toMatchObject({ items: [], complete: true, totalCount: 0, error: null });
    expect(model?.certificates).toMatchObject({ items: [], complete: true, totalCount: 0, error: null });
  });
  it("does not treat a successful missing Finance Wallet as a usable detail Wallet", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const ledgerRequests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: memberDetail });
      }
      if (url.pathname === "/api/v1/admin/finance/members/68000000") {
        return jsonResponse({ success: true, data: { member: { userId: "68000000" }, wallet: null } });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage("", []) });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        return jsonResponse({ success: true, data: { items: [], totalCount: 0, nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        ledgerRequests.push(request);
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Unexpected request" } }, 404);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.walletReadState).toMatchObject({ kind: "conflict" });
    expect(model?.walletId).toBeNull();
    expect(model?.walletBalances).toBeNull();
    expect(ledgerRequests).toHaveLength(0);
  });

  it("keeps an invalid Finance Wallet response visible as a contract error", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const ledgerRequests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: memberDetail });
      }
      if (url.pathname === "/api/v1/admin/finance/members/68000000") {
        return jsonResponse({
          success: true,
          data: {
            member: { userId: "68000000" },
            wallet: { ...memberDetail.wallet, spendingBalanceSatang: "100" },
          },
        });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage("", []) });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        return jsonResponse({ success: true, data: { items: [], totalCount: 0, nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        ledgerRequests.push(request);
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Unexpected request" } }, 404);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.walletReadState).toMatchObject({ kind: "contract-error", error: { kind: "contract" } });
    expect(model?.walletId).toBeNull();
    expect(model?.walletBalances).toBeNull();
    expect(ledgerRequests).toHaveLength(0);
  });

  it("keeps a valid Finance Wallet usable when the Member-detail Wallet is invalid", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const ledgerRequests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({
          success: true,
          data: { ...memberDetail, wallet: { ...memberDetail.wallet, totalBalanceSatang: 99 } },
        });
      }
      if (url.pathname === "/api/v1/admin/finance/members/68000000") {
        return jsonResponse({ success: true, data: { member: { userId: "68000000" }, wallet: memberDetail.wallet } });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage("", []) });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        return jsonResponse({ success: true, data: { items: [], totalCount: 0, nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        ledgerRequests.push(request);
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Unexpected request" } }, 404);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.walletReadState).toMatchObject({ kind: "available", source: "finance", warning: { kind: "contract" } });
    expect(model?.walletBalances).toMatchObject({ spendingBalanceSatang: 100 });
    expect(model?.walletStatement).toMatchObject({ items: [], complete: true, error: null });
    expect(ledgerRequests).toHaveLength(1);
  });

  it("does not mark a repeated Ledger cursor as a complete Wallet Statement", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: memberDetail });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage("", []) });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        return jsonResponse({ success: true, data: { items: [], totalCount: 0, nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return jsonResponse({
          success: true,
          data: url.searchParams.has("cursor")
            ? { items: [], nextCursor: "ledger-repeat" }
            : { items: [ledgerTransaction("ledger-repeat", "2026-09-12T08:30:00.000Z")], nextCursor: "ledger-repeat" },
        });
      }
      return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Unexpected request" } }, 404);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.walletStatement).toMatchObject({
      items: null,
      complete: false,
      error: { kind: "contract" },
    });
  });

  it("classifies an invalid Ledger page as a contract error", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: memberDetail });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage("", []) });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        return jsonResponse({ success: true, data: { items: [], totalCount: 0, nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return jsonResponse({ success: true, data: { items: null, nextCursor: null } });
      }
      return jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "Unexpected request" } }, 404);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.walletStatement).toMatchObject({
      items: null,
      complete: false,
      error: { kind: "contract" },
    });
  });

});
