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
    }],
  };
}

const memberDetail = {
  member: {
    id: "68000000",
    email: "akarin.a@ku.th",
    firstName: "Akarin",
    lastName: "Ariyawat",
    studentId: "6810000000",
    telephone: null,
    academicYear: 1,
    faculty: null,
    department: null,
    occupation: null,
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
    email: "akarin.a@ku.th",
    firstName: "Akarin",
    lastName: "Ariyawat",
    studentId: "6810000000",
  };
  if (status.startsWith("CONDUCT_REPORT_")) {
    return {
      kind: "CONDUCT_REPORT",
      id,
      displayId: id,
      status,
      filer: { ...member, studentId: null },
      reportedMember: { ...member, studentId: null },
      reason: "CONDUCT_ABANDONED",
      detail: "The Worker did not attend the agreed Quest.",
      createdAt: "2026-09-12T08:30:00.000Z",
    };
  }
  return {
    kind: "REPORT_CASE",
    id,
    displayId: id,
    status,
    reportedMember: member,
    reporterEntries: [{
      id: `entry-${id}`,
      reporterMemberId: "68000001",
      reporter: { ...member, id: "68000001", firstName: "Suda", lastName: "Reporter" },
      reason: "REPORT_SPAM",
      detail: "This message repeats an unrelated advert.",
      createdAt: "2026-09-12T08:30:00.000Z",
    }],
    questId: "quest-1001",
    createdAt: "2026-09-12T08:30:00.000Z",
  };
}

function payoutRecord(id: string, payoutStatus: (typeof payoutStatuses)[number]) {
  return {
    id,
    displayId: `PAY-${id}`,
    student: { id: "68000000", email: "akarin.a@ku.th", firstName: "Akarin", lastName: "Ariyawat" },
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

    expect(model?.walletStatement.map((transaction) => transaction.id)).toEqual(["ledger-1001", "ledger-1002"]);
    expect(model?.walletStatementError).toBeNull();
    const ledgerRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"));
    expect(ledgerRequests).toHaveLength(2);
    expect(ledgerRequests[0]?.url).toContain("walletId=WAL-1001");
    expect(ledgerRequests[1]?.url).toContain("cursor=ledger-next");
    expect(requests.every((request) => request.headers.get("cookie") === "kuquest-admin=session")).toBe(true);
  });

  it("loads Ledger Transactions from the effective Wallet when detail has no Wallet", async () => {
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
        return jsonResponse({ success: true, data: { wallet: memberDetail.wallet } });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        return jsonResponse({ success: true, data: reportPage(url.searchParams.get("status") ?? "") });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return jsonResponse({
          success: true,
          data: { items: [ledgerTransaction("ledger-from-finance", "2026-09-12T08:30:00.000Z")], nextCursor: null },
        });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Unexpected request" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000", "kuquest-admin=session");

    expect(model?.walletId).toBe("WAL-1001");
    expect(model?.walletStatement.map((transaction) => transaction.id)).toEqual(["ledger-from-finance"]);
    expect(model?.walletStatementError).toBeNull();
    const ledgerRequests = requests.filter((request) => new URL(request.url).pathname.endsWith("/ledger/transactions"));
    expect(ledgerRequests).toHaveLength(1);
    expect(ledgerRequests[0]?.url).toContain("walletId=WAL-1001");
  });

  it("loads all received Report statuses and all Member Payout status pages", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    const requests: Request[] = [];
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/admin/members/68000000") {
        return jsonResponse({ success: true, data: {
          ...memberDetail,
          stats: { ...memberDetail.stats, payoutsCount: 2, totalPaidOutSatang: 25000 },
        } });
      }
      if (url.pathname === "/api/v1/admin/reports") {
        const status = url.searchParams.get("status");
        const cursor = url.searchParams.get("cursor");
        const counts = reportCounts({ REPORT_CASE_PENDING: 2, CONDUCT_REPORT_UPHELD: 1 });
        if (status === "REPORT_CASE_PENDING") {
          return jsonResponse({ success: true, data: cursor
            ? reportPage(status, [reportRecord("report-2", status)], null, counts)
            : reportPage(status, [reportRecord("report-1", status)], "report-next", counts) });
        }
        return jsonResponse({ success: true, data: reportPage(status ?? "", status === "CONDUCT_REPORT_UPHELD" ? [reportRecord("conduct-1", status)] : [], null, counts) });
      }
      if (url.pathname === "/api/v1/admin/quests/quest-1001") {
        return jsonResponse({ success: true, data: { id: "quest-1001", displayId: "QST-1001" } });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        const status = url.searchParams.get("status");
        const cursor = url.searchParams.get("cursor");
        if (status === "SUCCEEDED") {
          return jsonResponse({ success: true, data: cursor ? { items: [payoutRecord("payout-2", status)], nextCursor: null } : { items: [payoutRecord("payout-1", status)], nextCursor: "payout-next" } });
        }
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      if (url.pathname === "/api/v1/finance/members/68000000" || url.pathname === "/api/v1/admin/finance/members/68000000") {
        return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Unexpected request" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.reports.map((report) => report.id)).toEqual(["report-1", "report-2", "conduct-1"]);
    expect(model?.reportsComplete).toBe(true);
    expect(model?.reportsTotalCount).toBe(3);
    expect(model?.reports[0]).toMatchObject({ questDisplayId: "QST-1001", kind: "Report Case" });
    expect(model?.payouts?.map((payout) => payout.id)).toEqual(["payout-1", "payout-2"]);
    expect(model?.payoutsComplete).toBe(true);
    expect(model?.payoutSuccessfulCountMatchesHistory).toBe(true);
    expect(model?.payouts?.[0]?.maskedDestinationValue).toBe("xxx-x-xx123-x");

    const reportRequests = requests.filter((request) => new URL(request.url).pathname === "/api/v1/admin/reports");
    const payoutRequests = requests.filter((request) => new URL(request.url).pathname === "/api/v1/admin/payouts");
    expect(new Set(reportRequests.map((request) => new URL(request.url).searchParams.get("status")))).toEqual(new Set(reportStatuses));
    expect(new Set(payoutRequests.map((request) => new URL(request.url).searchParams.get("status")))).toEqual(new Set(payoutStatuses));
    expect(reportRequests.every((request) => new URL(request.url).searchParams.get("memberId") === "68000000")).toBe(true);
    expect(payoutRequests.every((request) => new URL(request.url).searchParams.get("userId") === "68000000")).toBe(true);
    expect(reportRequests.some((request) => new URL(request.url).searchParams.get("cursor") === "report-next")).toBe(true);
    expect(payoutRequests.some((request) => new URL(request.url).searchParams.get("cursor") === "payout-next")).toBe(true);
  });

  it("keeps verified empty Report and Payout histories distinct from unavailable reads", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") return jsonResponse({ success: true, data: memberDetail });
      if (url.pathname === "/api/v1/admin/reports") return jsonResponse({ success: true, data: reportPage(url.searchParams.get("status") ?? "") });
      if (url.pathname === "/api/v1/admin/payouts") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.reports).toEqual([]);
    expect(model?.reportsComplete).toBe(true);
    expect(model?.reportsTotalCount).toBe(0);
    expect(model?.payouts).toEqual([]);
    expect(model?.payoutsComplete).toBe(true);
    expect(model?.payoutSuccessfulCountMatchesHistory).toBe(true);
    expect(model?.payoutsError).toBeNull();
  });

  it("does not treat an empty or missing Payout cursor as a complete history", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    for (const nextCursor of ["", undefined]) {
      globalThis.fetch = (async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        if (url.pathname === "/api/v1/admin/members/68000000") return jsonResponse({ success: true, data: memberDetail });
        if (url.pathname === "/api/v1/admin/reports") return jsonResponse({ success: true, data: reportPage(url.searchParams.get("status") ?? "") });
        if (url.pathname === "/api/v1/admin/payouts") {
          return jsonResponse({ success: true, data: nextCursor === undefined ? { items: [] } : { items: [], nextCursor } });
        }
        if (url.pathname === "/api/v1/admin/finance/ledger/transactions") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
        return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
      }) as typeof globalThis.fetch;

      const model = await loadMemberDetailFromApi("68000000");

      expect(model?.payouts).toBeNull();
      expect(model?.payoutsComplete).toBe(false);
      expect(model?.payoutsError).toBe("ข้อมูล Payout ไม่ตรงตามสัญญา API");
    }
  });

  it("keeps failed Report and Payout reads distinct from unavailable data", async () => {
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

    expect(model?.reports).toEqual([]);
    expect(model?.reportsComplete).toBe(false);
    expect(model?.reportsError).toBe("Reports received could not be loaded.");
    expect(model?.payouts).toBeNull();
    expect(model?.payoutsComplete).toBe(false);
    expect(model?.payoutsError).toBe("Payout details could not be loaded.");
  });

  it("keeps partial and invalid history reads from becoming verified empty results", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") return jsonResponse({ success: true, data: memberDetail });
      if (url.pathname === "/api/v1/admin/reports") {
        const status = url.searchParams.get("status");
        const cursor = url.searchParams.get("cursor");
        const counts = reportCounts({ REPORT_CASE_PENDING: 2, REPORT_CASE_DISMISSED: 1, REPORT_CASE_HIDDEN: 1 });
        if (status === "REPORT_CASE_PENDING") {
          if (cursor) return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Reports unavailable" } }, 503);
          return jsonResponse({ success: true, data: reportPage(status, [reportRecord("report-partial", status)], "report-next", counts) });
        }
        if (status === "REPORT_CASE_DISMISSED") return jsonResponse({ success: true, data: reportPage(status, [reportRecord("invalid-report", "REPORT_CASE_HIDDEN")], null, counts) });
        if (status === "REPORT_CASE_HIDDEN") {
          const invalidReport = { ...reportRecord("invalid-quest-id", status), questId: 42 };
          return jsonResponse({ success: true, data: reportPage(status, [invalidReport], null, counts) });
        }
        return jsonResponse({ success: true, data: reportPage(status ?? "", [], null, counts) });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        const status = url.searchParams.get("status");
        const cursor = url.searchParams.get("cursor");
        if (status === "SUCCEEDED") {
          if (cursor) return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Payouts unavailable" } }, 503);
          return jsonResponse({ success: true, data: { items: [payoutRecord("payout-partial", status)], nextCursor: "payout-next" } });
        }
        if (status === "FAILED") return jsonResponse({ success: true, data: { items: [payoutRecord("invalid-payout", "CANCELLED")], nextCursor: null } });
        return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.reports.map((report) => report.id)).toContain("report-partial");
    expect(model?.reportsComplete).toBe(false);
    expect(model?.reportsTotalCount).toBe(4);
    expect(model?.reportsError).toContain("invalid");
    expect(model?.payouts?.map((payout) => payout.id)).toContain("payout-partial");
    expect(model?.payoutsComplete).toBe(false);
    expect(model?.payoutsError).toContain("ข้อมูล Payout ไม่ตรงตามสัญญา API");
  });

  it("rejects duplicate records across Member history pages", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.pathname === "/api/v1/admin/members/68000000") return jsonResponse({ success: true, data: memberDetail });
      if (url.pathname === "/api/v1/admin/reports") {
        const status = url.searchParams.get("status") ?? "";
        const counts = reportCounts({ REPORT_CASE_PENDING: 2 });
        return jsonResponse({
          success: true,
          data: status === "REPORT_CASE_PENDING"
            ? reportPage(status, [reportRecord("duplicate-report", status as ReportStatus)], url.searchParams.has("cursor") ? null : "report-next", counts)
            : reportPage(status, [], null, counts),
        });
      }
      if (url.pathname === "/api/v1/admin/payouts") {
        const status = url.searchParams.get("status") ?? "";
        return jsonResponse({
          success: true,
          data: status === "SUCCEEDED"
            ? { items: [payoutRecord("duplicate-payout", status as (typeof payoutStatuses)[number])], nextCursor: url.searchParams.has("cursor") ? null : "payout-next" }
            : { items: [], nextCursor: null },
        });
      }
      if (url.pathname === "/api/v1/admin/finance/ledger/transactions") return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
      return jsonResponse({ success: false, error: { code: "UNAVAILABLE", message: "Finance unavailable" } }, 503);
    }) as typeof globalThis.fetch;

    const model = await loadMemberDetailFromApi("68000000");

    expect(model?.reports.map((report) => report.id)).toEqual(["duplicate-report"]);
    expect(model?.reportsComplete).toBe(false);
    expect(model?.reportsTotalCount).toBe(2);
    expect(model?.reportsError).toContain("invalid");
    expect(model?.payouts?.map((payout) => payout.id)).toEqual(["duplicate-payout"]);
    expect(model?.payoutsComplete).toBe(false);
    expect(model?.payoutsError).toBe("ข้อมูล Payout ไม่ตรงตามสัญญา API");
  });
});
