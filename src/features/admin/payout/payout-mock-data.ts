import type {
  AdminApiPayoutStatus,
  AdminPayoutDetail,
} from "../api/admin-api";
import { mockDemoMemberSeeds } from "../data/mock-demo-fixtures";

type PayoutHistoryStep = {
  fromStatus: AdminApiPayoutStatus | null;
  toStatus: AdminApiPayoutStatus;
  providerStatus: string | null;
  source: string;
  reason: string | null;
  elapsedMinutes: number;
  actor: "member" | "admin" | "provider";
};

const demoActualFeeSatang = 1200;
const demoActualTaxSatang = 84;

/**
 * Build a complete status timeline for a mock Payout.
 *
 * The Admin detail view must show the lifecycle from the Member request to
 * the current status. Keep the transitions within the accepted Payout
 * lifecycle; a mock Payout must not jump directly to a terminal status.
 */
function payoutHistoryFor(input: {
  id: string;
  studentId: string;
  status: AdminApiPayoutStatus;
  createdAt: string;
}): AdminPayoutDetail["history"] {
  const steps: PayoutHistoryStep[] = [
    {
      fromStatus: null,
      toStatus: "PENDING_ADMIN_APPROVAL",
      providerStatus: null,
      source: "PAYOUT_REQUEST",
      reason: null,
      elapsedMinutes: 0,
      actor: "member",
    },
  ];

  if (!["PENDING_ADMIN_APPROVAL", "CANCELLED"].includes(input.status)) {
    steps.push({
      fromStatus: "PENDING_ADMIN_APPROVAL",
      toStatus: "SUBMITTED_TO_PROVIDER",
      providerStatus: "PROCESSING",
      source: "ADMIN_APPROVAL",
      reason: "PAYOUT_POLICY_REVIEW",
      elapsedMinutes: 15,
      actor: "admin",
    });
  }

  if (["PROVIDER_PENDING", "SUCCEEDED", "FAILED"].includes(input.status)) {
    steps.push({
      fromStatus: "SUBMITTED_TO_PROVIDER",
      toStatus: "PROVIDER_PENDING",
      providerStatus: "PENDING",
      source: "PROVIDER_CALLBACK",
      reason: null,
      elapsedMinutes: 45,
      actor: "provider",
    });
  }

  if (input.status === "SUCCEEDED") {
    steps.push({
      fromStatus: "PROVIDER_PENDING",
      toStatus: "SUCCEEDED",
      providerStatus: "SUCCEEDED",
      source: "PROVIDER_CALLBACK",
      reason: null,
      elapsedMinutes: 180,
      actor: "provider",
    });
  } else if (input.status === "FAILED") {
    steps.push({
      fromStatus: "PROVIDER_PENDING",
      toStatus: "FAILED",
      providerStatus: "FAILED",
      source: "PROVIDER_CALLBACK",
      reason: "PAYOUT_PROVIDER_FAILURE",
      elapsedMinutes: 180,
      actor: "provider",
    });
  } else if (input.status === "CANCELLED") {
    steps.push({
      fromStatus: "PENDING_ADMIN_APPROVAL",
      toStatus: "CANCELLED",
      providerStatus: null,
      source: "ADMIN_REJECTION",
      reason: "PAYOUT_INVALID_DESTINATION",
      elapsedMinutes: 60,
      actor: "admin",
    });
  }

  const createdAt = Date.parse(input.createdAt);
  return steps.map((step, index) => ({
    id: `history-${input.id.toLowerCase()}-${index + 1}`,
    fromStatus: step.fromStatus,
    toStatus: step.toStatus,
    providerStatus: step.providerStatus,
    actorUserId: step.actor === "member" ? input.studentId : null,
    actorAdminId: step.actor === "admin" ? "admin-demo" : null,
    source: step.source,
    reason: step.reason,
    occurredAt: new Date(createdAt + step.elapsedMinutes * 60_000).toISOString(),
  }));
}

const makePayoutDetail = (input: {
  id: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  email: string;
  status: AdminApiPayoutStatus;
  amount: number;
  bankCode: string;
  bankName: string;
  destination: string;
  routing: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  cancellationReasonCode?: string | null;
  providerReference?: string | null;
  providerStatus?: string | null;
  actualFeeSatang?: number | null;
  actualTaxSatang?: number | null;
  actualDebitSatang?: number | null;
  history?: AdminPayoutDetail["history"];
}): AdminPayoutDetail => {
  const studentId = input.studentId ?? `student-${input.id.toLowerCase()}`;
  // Keep the Mock Payout records complete so every detail view has numeric
  // fee, tax, and debit values to review.
  const actualFeeSatang = input.actualFeeSatang ?? demoActualFeeSatang;
  const actualTaxSatang = input.actualTaxSatang ?? demoActualTaxSatang;
  const actualDebitSatang = input.actualDebitSatang ?? input.amount + actualFeeSatang + actualTaxSatang;
  return {
    id: input.id,
    student: {
      id: studentId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    quoteId: `quote-${input.id.toLowerCase()}`,
    principalSatang: input.amount,
    receiptSatang: input.amount,
    maximumFeeSatang: 1500,
    maximumTaxSatang: 105,
    maximumDebitSatang: input.amount + 1605,
    actualFeeSatang,
    actualTaxSatang,
    actualDebitSatang,
    bankCode: input.bankCode,
    bankName: input.bankName,
    destinationType: "BANK_ACCOUNT",
    maskedDestinationValue: input.destination,
    maskedRoutingValue: input.routing,
    providerReference: input.providerReference ?? null,
    providerStatus: input.providerStatus ?? null,
    payoutStatus: input.status,
    cancellationReasonCode: input.cancellationReasonCode ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    version: input.version,
    history: input.history ?? payoutHistoryFor({
      id: input.id,
      studentId,
      status: input.status,
      createdAt: input.createdAt,
    }),
  };
};

export const mockPendingPayout = makePayoutDetail({
    id: "PAY-9637",
    firstName: "Mali",
    lastName: "S.",
    email: "mali.s@ku.th",
    status: "PENDING_ADMIN_APPROVAL",
    amount: 125000,
    bankCode: "KBANK",
    bankName: "Kasikornbank",
    destination: "•••• 9637",
    routing: "••••",
    createdAt: "2026-09-10T03:12:00.000Z",
    updatedAt: "2026-09-10T03:12:00.000Z",
    version: 2,
  });

const mockPreviousPayout = makePayoutDetail({
  id: "PAY-9636",
  studentId: "student-pay-9637",
  firstName: "Mali",
  lastName: "S.",
  email: "mali.s@ku.th",
  status: "SUCCEEDED",
  amount: 98000,
  bankCode: "KBANK",
  bankName: "Kasikornbank",
  destination: "•••• 9637",
  routing: "••••",
  createdAt: "2026-08-28T03:12:00.000Z",
  updatedAt: "2026-08-28T03:20:00.000Z",
  version: 1,
  actualFeeSatang: 1200,
  actualTaxSatang: 84,
  actualDebitSatang: 99284,
});

type DemoPayoutMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

const payoutsPerDemoMember = 4;

function demoPayoutMemberFor(memberIndex: number): DemoPayoutMember {
  const seed = mockDemoMemberSeeds[memberIndex];
  if (seed) {
    return {
      id: seed.id,
      firstName: seed.firstName,
      lastName: seed.lastName,
      email: seed.email,
    };
  }

  const sequence = String(memberIndex + 1).padStart(3, "0");
  return {
    id: String(68000200 + memberIndex),
    firstName: "Demo",
    lastName: `Member ${sequence}`,
    email: `demo.member${sequence}@ku.th`,
  };
}

const demoPayoutTerminalStatuses: AdminApiPayoutStatus[] = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
];

/**
 * Keep the review queue large enough to exercise every page-size option while
 * keeping a few historical Payouts attached to each demo Member.
 */
export function mockDemoPayoutStatusFor(index: number): AdminApiPayoutStatus {
  const memberIndex = Math.floor(index / payoutsPerDemoMember);
  const position = index % payoutsPerDemoMember;
  if (position === 0 || (position === 1 && memberIndex < 3)) {
    return "PENDING_ADMIN_APPROVAL";
  }
  if (position === 1) return "SUBMITTED_TO_PROVIDER";
  if (position === 2) return "PROVIDER_PENDING";
  return demoPayoutTerminalStatuses[memberIndex % demoPayoutTerminalStatuses.length];
}

function demoPayoutTimestamp(index: number, elapsedMinutes: number): string {
  const latest = Date.UTC(2026, 8, 16, 3, 0, 0);
  const createdAt = latest - index * 86_400_000;
  return new Date(createdAt + elapsedMinutes * 60_000).toISOString();
}

function demoPayoutUpdatedAt(status: AdminApiPayoutStatus, index: number): string {
  const elapsedMinutes = status === "PENDING_ADMIN_APPROVAL"
    ? 0
    : status === "SUBMITTED_TO_PROVIDER"
      ? 15
      : status === "PROVIDER_PENDING"
        ? 45
        : status === "CANCELLED"
          ? 60
          : 180;
  return demoPayoutTimestamp(index, elapsedMinutes);
}

const mockDemoPayoutDetails: AdminPayoutDetail[] = Array.from({ length: 196 }, (_, index) => {
  const member = demoPayoutMemberFor(Math.floor(index / payoutsPerDemoMember));
  const status = mockDemoPayoutStatusFor(index);
  const amount = 45000 + index * 7500;
  const providerStatus = status === "SUBMITTED_TO_PROVIDER"
    ? "PROCESSING"
    : status === "PROVIDER_PENDING"
      ? "PENDING"
      : status === "SUCCEEDED"
        ? "SUCCEEDED"
        : status === "FAILED"
          ? "FAILED"
          : null;
  return makePayoutDetail({
    id: `PAY-${9700 + index}`,
    studentId: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    status,
    amount,
    bankCode: ["KBANK", "SCB", "KTB"][index % 3],
    bankName: ["Kasikornbank", "Siam Commercial Bank", "Krung Thai Bank"][index % 3],
    destination: `•••• ${String(1200 + index).slice(-4)}`,
    routing: "••••",
    createdAt: demoPayoutTimestamp(index, 0),
    updatedAt: demoPayoutUpdatedAt(status, index),
    version: 1 + (index % 4),
    providerReference: providerStatus ? `provider-ref-${9700 + index}` : null,
    providerStatus,
    cancellationReasonCode: status === "CANCELLED" ? "PAYOUT_INVALID_DESTINATION" : null,
  });
});

const mockCorePayoutDetails: AdminPayoutDetail[] = [
  mockPendingPayout,
  mockPreviousPayout,
  makePayoutDetail({
    id: "PAY-9638",
    firstName: "Narin",
    lastName: "T.",
    email: "narin.t@ku.th",
    status: "SUBMITTED_TO_PROVIDER",
    amount: 78000,
    bankCode: "SCB",
    bankName: "Siam Commercial Bank",
    destination: "•••• 1128",
    routing: "••••",
    createdAt: "2026-09-08T08:05:00.000Z",
    updatedAt: "2026-09-08T08:20:00.000Z",
    version: 4,
    providerReference: "provider-ref-9638",
    providerStatus: "PROCESSING",
    history: [
      {
        id: "history-pay-9638-1",
        fromStatus: null,
        toStatus: "PENDING_ADMIN_APPROVAL",
        providerStatus: null,
        actorUserId: "student-pay-9638",
        actorAdminId: null,
        source: "PAYOUT_REQUEST",
        reason: null,
        occurredAt: "2026-09-08T08:05:00.000Z",
      },
      {
        id: "history-pay-9638-2",
        fromStatus: "PENDING_ADMIN_APPROVAL",
        toStatus: "SUBMITTED_TO_PROVIDER",
        providerStatus: "PROCESSING",
        actorUserId: null,
        actorAdminId: "admin-69",
        source: "ADMIN_APPROVAL",
        reason: "PAYOUT_POLICY_REVIEW",
        occurredAt: "2026-09-08T08:20:00.000Z",
      },
    ],
  }),
  makePayoutDetail({
    id: "PAY-9639",
    firstName: "Ploy",
    lastName: "K.",
    email: "ploy.k@ku.th",
    status: "CANCELLED",
    amount: 45000,
    bankCode: "KTB",
    bankName: "Krung Thai Bank",
    destination: "•••• 4401",
    routing: "••••",
    createdAt: "2026-09-05T02:30:00.000Z",
    updatedAt: "2026-09-05T04:10:00.000Z",
    version: 3,
    cancellationReasonCode: "PAYOUT_INVALID_DESTINATION",
    history: [
      {
        id: "history-pay-9639-1",
        fromStatus: null,
        toStatus: "PENDING_ADMIN_APPROVAL",
        providerStatus: null,
        actorUserId: "student-pay-9639",
        actorAdminId: null,
        source: "PAYOUT_REQUEST",
        reason: null,
        occurredAt: "2026-09-05T02:30:00.000Z",
      },
      {
        id: "history-pay-9639-2",
        fromStatus: "PENDING_ADMIN_APPROVAL",
        toStatus: "CANCELLED",
        providerStatus: null,
        actorUserId: null,
        actorAdminId: "admin-69",
        source: "ADMIN_REJECTION",
        reason: "PAYOUT_INVALID_DESTINATION",
        occurredAt: "2026-09-05T04:10:00.000Z",
      },
    ],
  }),
  makePayoutDetail({
    id: "PAY-9631",
    firstName: "Fah",
    lastName: "Lertwiroj",
    email: "fah.lertwiroj@ku.th",
    status: "PENDING_ADMIN_APPROVAL",
    amount: 171100,
    bankCode: "KBANK",
    bankName: "Kasikornbank",
    destination: "•••• 9631",
    routing: "••••",
    createdAt: "2026-09-09T04:00:00.000Z",
    updatedAt: "2026-09-09T04:00:00.000Z",
    version: 1,
  }),
  ...mockDemoPayoutDetails,
];

export const mockPayoutDetails: AdminPayoutDetail[] = mockCorePayoutDetails.slice(0, 4);
export const mockAllPayoutDetails: AdminPayoutDetail[] = mockCorePayoutDetails;

export function mockPayoutDetail(id: string): AdminPayoutDetail | null {
  return mockAllPayoutDetails.find((item) => item.id === id) ?? null;
}
