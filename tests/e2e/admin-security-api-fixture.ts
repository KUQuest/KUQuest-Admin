import { adminWalletFinanceSummary } from "../fixtures/admin-wallet-api-fixtures";

const adminOrigin = process.env.ADMIN_SECURITY_ADMIN_ORIGIN ?? "http://localhost:3006";
const apiPort = Number(process.env.ADMIN_SECURITY_API_PORT ?? "5002");
const adminSessionCookieName = "kuquest-admin.session_token";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": adminOrigin,
      "content-type": "application/json",
    },
  });
}

function cookieValue(cookie: string, name: string): string | null {
  const prefix = `${name}=`;
  const part = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return part ? part.slice(prefix.length) : null;
}

function adminApiAuthorizationResponse(cookie: string): Response | null {
  const sessionToken = cookieValue(cookie, adminSessionCookieName);
  if (sessionToken === "disabled-session") {
    return json({ success: false, error: { code: "FORBIDDEN", message: "Admin is disabled." } }, 403);
  }
  if (sessionToken !== "valid-session") {
    return json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin Session required." } }, 401);
  }

  return null;
}

const activityLogItems = [
  {
    id: "activity-1",
    admin: { id: "valid-admin", firstName: "Test", lastName: "Admin" },
    action: "QUEST_HIDDEN",
    resourceType: "QUEST",
    resourceId: "quest-1",
    reasonCode: "POLICY_REVIEW",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-15T00:00:00.000Z",
    createdAt: "2026-09-15T00:00:00.000Z",
    note: "Decision note returned by the Admin API fixture.",
  },
  {
    id: "activity-2",
    admin: { id: "valid-admin", firstName: "Test", lastName: "Admin" },
    action: "PAYOUT_APPROVED",
    resourceType: "PAYOUT",
    resourceId: "payout-1",
    reasonCode: "PAYOUT_REVIEWED",
    reasonCatalogVersion: 1,
    resultVersion: 3,
    resultTimestamp: "2026-09-14T00:00:00.000Z",
    createdAt: "2026-09-14T00:00:00.000Z",
  },
  {
    id: "activity-3",
    admin: { id: "valid-admin", firstName: "Test", lastName: "Admin" },
    action: "DISPUTE_CASE_RESOLVED",
    resourceType: "DISPUTE_CASE",
    resourceId: "dispute-1",
    reasonCode: "DISPUTE_POLICY_REVIEW",
    reasonCatalogVersion: 1,
    resultVersion: 2,
    resultTimestamp: "2026-09-13T00:00:00.000Z",
    createdAt: "2026-09-13T00:00:00.000Z",
  },
];
const memberProfileId = "00000000-0000-4000-8000-000000000101";
const memberWalletId = "00000000-0000-4000-8000-000000000201";
const otherMemberId = "00000000-0000-4000-8000-000000000102";
const questId = "00000000-0000-4000-8000-000000000301";
const memberDisplayId = "MEM-000101";

const memberProfile = {
  id: memberProfileId,
  displayId: memberDisplayId,
  email: "member@ku.th",
  firstName: "Ari",
  lastName: "Member",
  studentId: "68000001",
  telephone: null,
  bio: "Member profile from the Admin API.",
  academicYear: 2,
  faculty: "Engineering",
  department: "Computer Engineering",
  occupation: "Student",
  memberStatus: "NORMAL",
  createdAt: "2026-09-01T00:00:00.000Z",
};

const otherMember = {
  id: otherMemberId,
  displayId: "MEM-000102",
  email: "reviewer@ku.th",
  firstName: "Reviewer",
  lastName: "One",
  studentId: "68000002",
};

const memberQuest = {
  id: questId,
  displayId: "QST-000101",
  title: "Complete a Course Survey",
  questStatus: "QUEST_COMPLETED",
  mode: "FIRST_COME_FIRST_SERVED",
  participation: "SINGLE",
};

function reportCountsByStatus(status: string) {
  return {
    REPORT_CASE_PENDING: status === "REPORT_CASE_PENDING" ? 1 : 0,
    REPORT_CASE_DISMISSED: status === "REPORT_CASE_DISMISSED" ? 1 : 0,
    REPORT_CASE_HIDDEN: 0,
    REPORT_CASE_RESTORED: 0,
    CONDUCT_REPORT_PENDING: 0,
    CONDUCT_REPORT_UPHELD: 0,
    CONDUCT_REPORT_DISMISSED: 0,
  };
}

const receivedMemberReport = {
  kind: "REPORT_CASE",
  id: "00000000-0000-4000-8000-000000000401",
  displayId: "RPT-000101",
  status: "REPORT_CASE_PENDING",
  reportedMember: memberProfile,
  quest: memberQuest,
  reporterEntries: [{
    id: "00000000-0000-4000-8000-000000000411",
    reporterMemberId: otherMemberId,
    reporter: otherMember,
    reason: "REPORT_SPAM",
    detail: "This Report was filed against the Member.",
    createdAt: "2026-09-12T08:30:00.000Z",
  }],
  createdAt: "2026-09-12T08:30:00.000Z",
};

const submittedMemberReport = {
  kind: "REPORT_CASE",
  id: "00000000-0000-4000-8000-000000000402",
  displayId: "RPT-000102",
  status: "REPORT_CASE_DISMISSED",
  reportedMember: otherMember,
  quest: memberQuest,
  reporterEntries: [{
    id: "00000000-0000-4000-8000-000000000412",
    reporterMemberId: memberProfileId,
    reporter: memberProfile,
    reason: "REPORT_OTHER",
    detail: "This Report was submitted by the Member.",
    createdAt: "2026-09-13T08:30:00.000Z",
  }],
  createdAt: "2026-09-13T08:30:00.000Z",
};


const server = Bun.serve({
  port: apiPort,
  async fetch(request) {
    const url = new URL(request.url);
    const cookie = request.headers.get("cookie") ?? "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-origin": adminOrigin,
        },
      });
    }

    if (url.pathname === "/health") return json({ ok: true });

    if (url.pathname === "/api/admin/auth/get-session") {
      const sessionToken = cookieValue(cookie, adminSessionCookieName);
      if (sessionToken === "disabled-session") {
        return json({ success: false }, 403);
      }
      if (sessionToken !== "valid-session") return json({ success: false }, 401);
      return json({
        session: { id: "valid-session", userId: "valid-admin" },
        user: {
          id: "valid-admin",
          email: "admin@ku.th",
          firstName: "Test",
          lastName: "Admin",
          disabledAt: null,
        },
      });
    }

    if (url.pathname.startsWith("/api/v1/admin/")) {
      const authorizationResponse = adminApiAuthorizationResponse(cookie);
      if (authorizationResponse) return authorizationResponse;
    }

    if (url.pathname === "/api/v1/admin/overview") {
      return json({
        success: true,
        data: {
          quests: { total: 0, hidden: 0, byState: {} },
          disputes: { total: 0, awaitingResolution: 0 },
          payouts: { pendingAdminApproval: 0, inFlight: 0 },
          members: { frozenWallets: 0, suspendedWallets: 0 },
        },
      });
    }

    if (url.pathname === "/api/v1/admin/finance/overview") {
      return json({
        success: true,
        data: {
          memberBalancesSummary: adminWalletFinanceSummary,
          platformBalances: { revenueSatang: 0, suspenseSatang: 0 },
          volumeLifetime: {
            totalTopUpDepositedSatang: 0,
            totalPayoutCompletedSatang: 0,
            totalPlatformFeesEarnedSatang: 0,
          },
          integrity: {
            subledgerBalanced: true,
            totalPostingsDiscrepancySatang: 0,
            lastAuditedAt: "2026-09-15T00:00:00.000Z",
          },
        },
      });
    }

    if (url.pathname === "/api/v1/admin/wallets") {
      return json({ success: true, data: { items: [], nextCursor: null } });
    }

    if (url.pathname === "/api/v1/admin/top-ups") {
      return json({ success: true, data: { items: [{
        id: "00000000-0000-4000-8000-000000001001",
        displayId: "TOP-1001",
        userId: "member-1",
        member: { firstName: "Akarin", lastName: "Ariyawat", studentId: "68000000" },
        topUpStatus: "PAID",
        creditAmountSatang: 100000,
        providerFeeSatang: 2500,
        providerTaxSatang: 175,
        paymentTotalSatang: 102675,
        paymentMethod: "PROMPTPAY_QR",
        providerReference: "provider-ref-1001",
        expiresAt: "2026-09-15T00:05:00.000Z",
        paidAt: "2026-09-15T00:03:00.000Z",
        createdAt: "2026-09-15T00:00:00.000Z",
      }], nextCursor: null } });
    }
    const memberRoute = `/api/v1/admin/members/${memberProfileId}`;
    const walletSnapshot = {
      id: memberWalletId,
      walletStatus: "ACTIVE",
      spendingBalanceSatang: 10000,
      earningsBalanceSatang: 2500,
      fundingReservedSatang: 0,
      reservedForPayoutsSatang: 0,
      projectionMatchesLedger: true,
    };
    if (url.pathname === memberRoute) {
      return json({
        success: true,
        data: {
          member: memberProfile,
          wallet: { ...walletSnapshot, totalBalanceSatang: 12500 },
          stats: {
            questsCreatedCount: 0,
            questsCompletedAsWorkerCount: 1,
            reviewsReceivedCount: 1,
            averageRating: 4.5,
            payoutsCount: 1,
            totalEarnedSatang: 0,
            totalPaidOutSatang: 12500,
          },
        },
      });
    }
    if (url.pathname === `/api/v1/admin/finance/members/${memberProfileId}`) {
      return json({
        success: true,
        data: {
          member: {
            userId: memberProfileId,
            firstName: memberProfile.firstName,
            lastName: memberProfile.lastName,
            studentId: memberProfile.studentId,
            email: memberProfile.email,
          },
          wallet: walletSnapshot,
          lifetimeStats: {
            totalToppedUpSatang: 0,
            totalEarnedFromQuestsSatang: 0,
            totalSpentOnQuestsSatang: 0,
            totalPaidOutSatang: 12500,
            totalEarningsConvertedSatang: 0,
          },
          activeFundingReservations: [],
        },
      });
    }
    if (url.pathname === `${memberRoute}/profile-tags`) {
      return json({ success: true, data: { member: { displayId: memberDisplayId }, tags: [{ name: "Communication" }] } });
    }
    if (url.pathname === `${memberRoute}/work-experiences`) {
      return json({
        success: true,
        data: {
          member: { displayId: memberDisplayId },
          items: [{
            title: "Research Assistant",
            employmentType: "PART_TIME",
            organization: "Kasetsart University",
            description: "Supported survey research.",
            startedAt: "2024-01-01",
            endedAt: null,
          }],
          totalCount: 1,
          nextCursor: null,
        },
      });
    }
    if (url.pathname === `${memberRoute}/certificates`) {
      return json({
        success: true,
        data: {
          member: { displayId: memberDisplayId },
          items: [{
            name: "First Aid",
            issuer: "Kasetsart University",
            issuedAt: "2025-04-02",
            image: { contentType: "image/png", sizeBytes: 1024 },
          }],
          totalCount: 1,
          nextCursor: null,
        },
      });
    }
    if (url.pathname === `${memberRoute}/history`) {
      return json({
        success: true,
        data: {
          member: { displayId: memberDisplayId },
          items: [{
            role: "WORKER",
            createdAt: "2026-09-10T08:30:00.000Z",
            assignmentStatus: "ASSIGNMENT_COMPLETED",
            startedAt: "2026-09-10T09:00:00.000Z",
            assignmentStatusChangedAt: "2026-09-11T08:30:00.000Z",
            quest: {
              id: questId,
              displayId: "QST-000101",
              title: "Complete a Course Survey",
              questStatus: "QUEST_COMPLETED",
              createdAt: "2026-09-09T08:30:00.000Z",
              questStatusChangedAt: "2026-09-11T08:30:00.000Z",
            },
            relatedMembers: [{
              role: "HIRER",
              member: {
                id: otherMemberId,
                displayId: "MEM-000102",
                firstName: "Reviewer",
                lastName: "One",
              },
              assignmentStatus: null,
              assignmentCreatedAt: null,
              startedAt: null,
              assignmentStatusChangedAt: null,
            }],
          }],
          totalCount: 1,
          nextCursor: null,
        },
      });
    }
    if (url.pathname === `${memberRoute}/reviews`) {
      return json({
        success: true,
        data: {
          items: [{
            id: "00000000-0000-4000-8000-000000000501",
            rating: 5,
            comment: "Excellent work.",
            createdAt: "2026-09-11T08:30:00.000Z",
            updatedAt: "2026-09-11T08:30:00.000Z",
            reviewer: { displayId: "MEM-000102", name: "Reviewer One" },
            quest: { displayId: "QST-000101", title: "Complete a Course Survey", questStatus: "QUEST_COMPLETED" },
          }],
          totalCount: 1,
          nextCursor: null,
        },
      });
    }
    if (url.pathname === `${memberRoute}/penalty-history`) {
      return json({
        success: true,
        data: {
          member: { displayId: memberDisplayId },
          confirmedMisconductCount: 10,
          effectiveActiveMisconductPenaltyCount: 1,
          reviewLadderRecordCount: 0,
          versionToken: 10,
          items: [{
            recordId: "7d5558d5-a521-408e-b232-a19b1893e8f2",
            ladder: "MISCONDUCT",
            source: "REPORT_CASE",
            sourceDisplayId: "RPT-000101",
            sequenceNumber: 1,
            result: "PENALTY_RED_FLAG",
            actor: { type: "ADMIN", displayName: "Test Admin" },
            reasonCode: "POLICY_REVIEW",
            adminNote: null,
            createdAt: "2026-09-11T08:30:00.000Z",
            reviewRating: null,
            isEffective: false,
            isEffectiveActiveMisconductPenalty: false,
            reversal: { relation: "REVERSED_BY", sequenceNumber: 1, result: "PENALTY_REVERSAL", createdAt: "2026-09-12T08:30:00.000Z" },
            recalculatedFrom: null,
            replacedBy: null,
          }, {
            recordId: "492321e3-6a02-49d7-b46b-c06c1d712a60",
            ladder: "MISCONDUCT",
            source: "REPORT_CASE",
            sourceDisplayId: "RPT-000101",
            sequenceNumber: 1,
            result: "PENALTY_REVERSAL",
            actor: { type: "ADMIN", displayName: "Test Admin" },
            reasonCode: "POLICY_REVIEW",
            adminNote: null,
            createdAt: "2026-09-12T08:30:00.000Z",
            reviewRating: null,
            isEffective: false,
            isEffectiveActiveMisconductPenalty: false,
            reversal: { relation: "REVERSAL_OF", sequenceNumber: 1, result: "PENALTY_RED_FLAG", createdAt: "2026-09-11T08:30:00.000Z" },
            recalculatedFrom: null,
            replacedBy: null,
          }, {
            recordId: "e0c58c66-267a-4a4d-b133-6d78a4a5a101",
            ladder: "MISCONDUCT",
            source: "ADMIN",
            sourceDisplayId: null,
            sequenceNumber: 10,
            result: "PENALTY_RED_FLAG",
            actor: { type: "ADMIN", displayName: "Test Admin" },
            reasonCode: "MEMBER_PENALTY_VIOLATION_CONFIRMED",
            adminNote: null,
            createdAt: "2026-09-13T08:30:00.000Z",
            reviewRating: null,
            isEffective: true,
            isEffectiveActiveMisconductPenalty: true,
            reversal: null,
            recalculatedFrom: null,
            replacedBy: null,
          }],
          totalCount: 3,
          nextCursor: null,
        },
      });
    }
    if (url.pathname === "/api/v1/admin/reports") {
      const submitted = url.searchParams.has("submittedByMemberId");
      const report = submitted ? submittedMemberReport : receivedMemberReport;
      const statusCounts = reportCountsByStatus(report.status);
      return json({
        success: true,
        data: {
          items: [report],
          nextCursor: null,
          totalCount: 1,
          countsByStatus: statusCounts,
        },
      });
    }
    if (url.pathname === "/api/v1/admin/payouts") {
      return json({
        success: true,
        data: {
          items: [{
            id: "00000000-0000-4000-8000-000000000601",
            displayId: "PAY-000101",
            student: {
              id: memberProfileId,
              displayId: memberDisplayId,
              email: memberProfile.email,
              firstName: memberProfile.firstName,
              lastName: memberProfile.lastName,
              studentId: memberProfile.studentId,
            },
            quoteId: "00000000-0000-4000-8000-000000000602",
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
            maskedDestinationValue: "****1234",
            maskedRoutingValue: "****",
            providerReference: null,
            providerStatus: null,
            payoutStatus: "SUCCEEDED",
            cancellationReasonCode: null,
            version: 1,
            createdAt: "2026-09-12T08:30:00.000Z",
            updatedAt: "2026-09-12T08:30:00.000Z",
          }],
          nextCursor: null,
          totalCount: 1,
        },
      });
    }
    if (url.pathname === "/api/v1/admin/finance/ledger/transactions") {
      return json({
        success: true,
        data: {
          items: [{
            id: "00000000-0000-4000-8000-000000000701",
            displayReference: "LED-000101",
            businessReference: "TOPUP-000101",
            eventType: "TOP_UP",
            description: "Wallet top-up",
            createdByUserId: null,
            correctionOfTransactionId: null,
            createdAt: "2026-09-12T08:30:00.000Z",
            sealedAt: "2026-09-12T08:30:00.000Z",
            isBalanced: true,
            postings: [
              {
                id: "00000000-0000-4000-8000-000000000702",
                accountId: "00000000-0000-4000-8000-000000000703",
                accountType: "SPENDING",
                walletId: memberWalletId,
                amountSatang: 100,
                member: {
                  userId: memberProfileId,
                  firstName: memberProfile.firstName,
                  lastName: memberProfile.lastName,
                  studentId: memberProfile.studentId,
                },
              },
              {
                id: "00000000-0000-4000-8000-000000000704",
                accountId: "00000000-0000-4000-8000-000000000705",
                accountType: "PLATFORM_REVENUE",
                walletId: null,
                amountSatang: -100,
                member: null,
              },
            ],
          }],
          nextCursor: null,
        },
      });
    }

    if (url.pathname === "/api/v1/admin/activity-log") {
      const action = url.searchParams.get("action");
      if (action === "ACTIVITY_ERROR") {
        return json({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Activity Log is unavailable." } }, 503);
      }
      if (action === "ACTIVITY_SLOW") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const filters = ["action", "resourceType", "resourceId", "adminId"] as const;
      const filteredItems = activityLogItems.filter((item) => action === "ACTIVITY_SLOW" || filters.every((filter) => {
        const value = url.searchParams.get(filter);
        const itemValue = filter === "adminId" ? item.admin.id : item[filter];
        return !value || itemValue.includes(value);
      }));
      filteredItems.sort((left, right) => {
        const direction = url.searchParams.get("sort") === "oldest" ? 1 : -1;
        return direction * (Date.parse(left.createdAt) - Date.parse(right.createdAt));
      });
      const cursor = url.searchParams.get("cursor");
      const items = cursor === "activity-next" ? filteredItems.slice(2) : filteredItems.slice(0, 2);
      return json({
        success: true,
        data: {
          items,
          nextCursor: !cursor && items.length === 2 && filteredItems.length > items.length ? "activity-next" : null,
        },
      });
    }

    return json({ success: false, error: { code: "NOT_FOUND", message: "Admin API route not found." } }, 404);
  },
});

console.log(`Admin security API fixture running at http://localhost:${server.port}`);
