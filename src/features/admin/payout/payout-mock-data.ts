import type {
  AdminApiPayoutStatus,
  AdminPayoutDetail,
} from "../api/admin-api";

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
  history?: AdminPayoutDetail["history"];
}): AdminPayoutDetail => ({
  id: input.id,
  student: {
    id: input.studentId ?? `student-${input.id.toLowerCase()}`,
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
  actualFeeSatang: null,
  actualTaxSatang: null,
  actualDebitSatang: null,
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
  history: input.history ?? [{
    id: `history-${input.id.toLowerCase()}-1`,
    fromStatus: null,
    toStatus: input.status,
    providerStatus: input.providerStatus ?? null,
    actorUserId: `student-${input.id.toLowerCase()}`,
    actorAdminId: null,
    source: "PAYOUT_REQUEST",
    reason: null,
    occurredAt: input.createdAt,
  }],
});

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
});

export const mockPayoutDetails: AdminPayoutDetail[] = [
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
];

export function mockPayoutDetail(id: string): AdminPayoutDetail | null {
  return mockPayoutDetails.find((item) => item.id === id) ?? null;
}
