import type {
  AdminFinanceOverview,
  AdminLedgerEventType,
  AdminLedgerPosting,
  AdminLedgerTransaction,
  AdminWallet,
  AdminWalletDetail,
  AdminWalletStatusHistoryEntry,
} from "../api/admin-api";
import { mockDemoMemberSeeds } from "../data/mock-demo-fixtures";

function makeWallet(input: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  status: AdminWallet["walletStatus"];
  spending: number;
  earnings: number;
  fundingReserved: number;
  reservedForPayouts: number;
  createdAt: string;
  updatedAt: string;
  latestTransactionAt: string;
}): AdminWallet {
  return {
    id: input.id,
    userId: input.userId,
    member: {
      firstName: input.firstName,
      lastName: input.lastName,
      studentId: input.studentId,
      email: input.email,
      telephone: null,
    },
    walletStatus: input.status,
    balances: {
      spendingBalanceSatang: input.spending,
      earningsBalanceSatang: input.earnings,
      fundingReservedSatang: input.fundingReserved,
      reservedForPayoutsSatang: input.reservedForPayouts,
      totalBalanceSatang: input.spending
        + input.earnings
        + input.fundingReserved
        + input.reservedForPayouts,
    },
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    latestTransactionAt: input.latestTransactionAt,
  };
}

const mockCoreWallets: AdminWallet[] = [
  makeWallet({
    id: "WAL-1001",
    userId: "68000000",
    firstName: "Akarin",
    lastName: "Ariyawat",
    studentId: "6510100001",
    email: "akarin.a@ku.th",
    status: "FROZEN",
    spending: 180000,
    earnings: 50000,
    fundingReserved: 20000,
    reservedForPayouts: 10000,
    createdAt: "2026-01-12T02:00:00.000Z",
    updatedAt: "2026-09-12T08:30:00.000Z",
    latestTransactionAt: "2026-09-12T08:30:00.000Z",
  }),
  makeWallet({
    id: "WAL-1002",
    userId: "68000020",
    firstName: "Amara",
    lastName: "Ariyawat",
    studentId: "6510100002",
    email: "amara.a@ku.th",
    status: "ACTIVE",
    spending: 245000,
    earnings: 83000,
    fundingReserved: 0,
    reservedForPayouts: 12000,
    createdAt: "2026-02-08T04:00:00.000Z",
    updatedAt: "2026-09-11T04:15:00.000Z",
    latestTransactionAt: "2026-09-11T04:15:00.000Z",
  }),
  makeWallet({
    id: "WAL-1003",
    userId: "68000040",
    firstName: "Benja",
    lastName: "Ariyawat",
    studentId: "6510100003",
    email: "benja.a@ku.th",
    status: "SUSPENDED",
    spending: 98000,
    earnings: 21000,
    fundingReserved: 45000,
    reservedForPayouts: 0,
    createdAt: "2026-03-16T06:30:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
    latestTransactionAt: "2026-09-10T10:00:00.000Z",
  }),
  makeWallet({
    id: "WAL-1004",
    userId: "68000060",
    firstName: "Chayut",
    lastName: "Ariyawat",
    studentId: "6510100004",
    email: "chayut.a@ku.th",
    status: "CLOSED",
    spending: 0,
    earnings: 0,
    fundingReserved: 0,
    reservedForPayouts: 0,
    createdAt: "2026-04-20T01:45:00.000Z",
    updatedAt: "2026-08-01T09:20:00.000Z",
    latestTransactionAt: "2026-08-01T09:20:00.000Z",
  }),
  makeWallet({
    id: "WAL-1005",
    userId: "68000080",
    firstName: "Darin",
    lastName: "Intharawong",
    studentId: "6510100005",
    email: "darin.i@ku.th",
    status: "ACTIVE",
    spending: 320000,
    earnings: 115000,
    fundingReserved: 60000,
    reservedForPayouts: 25000,
    createdAt: "2026-05-05T03:10:00.000Z",
    updatedAt: "2026-09-13T06:00:00.000Z",
    latestTransactionAt: "2026-09-13T06:00:00.000Z",
  }),
];

const demoWalletStatuses: AdminWallet["walletStatus"][] = ["ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"];

type DemoWalletMember = {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
};

function demoWalletMemberFor(index: number): DemoWalletMember {
  const seed = mockDemoMemberSeeds[index];
  if (seed) {
    return {
      id: seed.id,
      firstName: seed.firstName,
      lastName: seed.lastName,
      studentId: seed.studentId,
      email: seed.email,
    };
  }

  const sequence = String(index + 1).padStart(3, "0");
  return {
    id: String(68000200 + index),
    firstName: "Demo",
    lastName: `Member ${sequence}`,
    studentId: `652020${String(index + 1).padStart(4, "0")}`,
    email: `demo.member${sequence}@ku.th`,
  };
}

export const mockDemoWallets: AdminWallet[] = Array.from({ length: 195 }, (_, index) => {
  const member = demoWalletMemberFor(index);
  return makeWallet({
    id: `WAL-${1006 + index}`,
    userId: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    studentId: member.studentId,
    email: member.email,
    status: demoWalletStatuses[index % demoWalletStatuses.length] ?? "ACTIVE",
    spending: index % 4 === 3 ? 0 : 25000 + index * 4500,
    earnings: index % 4 === 3 ? 0 : 15000 + index * 3000,
    fundingReserved: index % 4 === 3 ? 0 : index % 4 === 0 ? 0 : 5000 + index * 250,
    reservedForPayouts: index % 4 === 3 ? 0 : index % 6 === 0 ? 0 : 2500 + index * 125,
    createdAt: new Date(Date.UTC(2026, 6, 1 + index, 2, 0, 0)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 8, 1 + (index % 12), 6, 0, 0)).toISOString(),
    latestTransactionAt: new Date(Date.UTC(2026, 8, 1 + (index % 12), 6, 0, 0)).toISOString(),
  });
});

// Keep the original export stable for existing fixtures. Route services use
// mockAllWallets so the expanded set is available through the mock UI.
export const mockWallets: AdminWallet[] = mockCoreWallets;
export const mockAllWallets: AdminWallet[] = [...mockCoreWallets, ...mockDemoWallets];

export const mockWalletFinanceSummary: AdminFinanceOverview["memberBalancesSummary"] = {
  totalSpendingSatang: 843000,
  totalEarningsSatang: 269000,
  totalFundingReservedSatang: 125000,
  totalPayoutReservedSatang: 47000,
  totalCirculatingSatang: 1284000,
};

export const mockWalletDetails: AdminWalletDetail[] = mockWallets.map((wallet) => ({
  ...wallet,
  projectionMatchesLedger: true,
}));

export const mockAllWalletDetails: AdminWalletDetail[] = mockAllWallets.map((wallet) => ({
  ...wallet,
  projectionMatchesLedger: true,
}));

const mockLedgerEventTypes: AdminLedgerEventType[] = [
  "TOP_UP",
  "FUNDING_RESERVE",
  "EARNINGS_CONVERSION",
  "PAYOUT",
  "FUNDING_RELEASE",
];

function mockLedgerPosting(
  walletId: string,
  transactionNumber: number,
  postingNumber: number,
  accountType: string,
  amountSatang: number,
): AdminLedgerPosting {
  return {
    id: `POSTING-${walletId}-${transactionNumber}-${postingNumber}`,
    accountId: `${accountType}-${walletId}`,
    accountType,
    walletId: accountType.startsWith("PLATFORM_") ? null : walletId,
    amountSatang,
    member: null,
  };
}

function mockLedgerTransaction(
  wallet: AdminWallet,
  walletIndex: number,
  transactionNumber: number,
): AdminLedgerTransaction {
  const eventType = mockLedgerEventTypes[transactionNumber] ?? "ADJUSTMENT";
  const amountSatang = 1000 + walletIndex * 25 + transactionNumber * 125;
  const postings = eventType === "TOP_UP"
    ? [
      mockLedgerPosting(wallet.id, transactionNumber, 1, "SPENDING", amountSatang),
      mockLedgerPosting(wallet.id, transactionNumber, 2, "PLATFORM_SUSPENSE", -amountSatang),
    ]
    : eventType === "FUNDING_RESERVE"
      ? [
        mockLedgerPosting(wallet.id, transactionNumber, 1, "SPENDING", -amountSatang),
        mockLedgerPosting(wallet.id, transactionNumber, 2, "FUNDING_RESERVED", amountSatang),
      ]
      : eventType === "EARNINGS_CONVERSION"
        ? [
          mockLedgerPosting(wallet.id, transactionNumber, 1, "EARNINGS", -amountSatang),
          mockLedgerPosting(wallet.id, transactionNumber, 2, "SPENDING", amountSatang),
        ]
        : eventType === "PAYOUT"
          ? [
            mockLedgerPosting(wallet.id, transactionNumber, 1, "RESERVED_FOR_PAYOUTS", -amountSatang),
            mockLedgerPosting(wallet.id, transactionNumber, 2, "PLATFORM_SUSPENSE", amountSatang),
          ]
          : [
            mockLedgerPosting(wallet.id, transactionNumber, 1, "FUNDING_RESERVED", -amountSatang),
            mockLedgerPosting(wallet.id, transactionNumber, 2, "SPENDING", amountSatang),
          ];
  const baseTimestamp = Date.parse(wallet.latestTransactionAt || wallet.updatedAt || wallet.createdAt);
  const createdAt = new Date(baseTimestamp - transactionNumber * 86_400_000).toISOString();

  return {
    id: `LEDGER-${wallet.id}-${String(transactionNumber + 1).padStart(2, "0")}`,
    businessReference: `${eventType}-${wallet.id}-${String(transactionNumber + 1).padStart(2, "0")}`,
    eventType,
    description: `${eventType.replaceAll("_", " ")} record for demo review.`,
    createdByUserId: null,
    correctionOfTransactionId: null,
    createdAt,
    sealedAt: new Date(baseTimestamp - transactionNumber * 86_400_000 + 60_000).toISOString(),
    isBalanced: true,
    postings,
  };
}

/**
 * Committed and sealed Ledger Transactions for mock Wallet detail workflows.
 * Keep this separate from the Wallet DTOs so the mock still exercises the
 * same projection used by the Admin API (`walletLedgerRowsFromApi`).
 */
export const mockWalletLedgerTransactions: Record<string, AdminLedgerTransaction[]> = Object.fromEntries(
  mockAllWallets.map((wallet, walletIndex) => [
    wallet.id,
    Array.from({ length: 5 }, (_, transactionNumber) => mockLedgerTransaction(wallet, walletIndex, transactionNumber)),
  ]),
);

export const mockWalletStatusHistory: Record<string, AdminWalletStatusHistoryEntry[]> = {
  "WAL-1001": [{
    id: "WAL-HIST-1001",
    walletId: "WAL-1001",
    fromStatus: "ACTIVE",
    toStatus: "FROZEN",
    reason: "Temporary administrative hold pending review.",
    actorUserId: null,
    actorAdminId: "admin-mock",
    createdAt: "2026-09-12T08:30:00.000Z",
  }],
  "WAL-1003": [{
    id: "WAL-HIST-1003",
    walletId: "WAL-1003",
    fromStatus: "ACTIVE",
    toStatus: "SUSPENDED",
    reason: "Administrative review required before the Wallet can be restored.",
    actorUserId: null,
    actorAdminId: "admin-mock",
    createdAt: "2026-09-10T10:00:00.000Z",
  }],
};
