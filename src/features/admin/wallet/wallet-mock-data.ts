import type { AdminFinanceOverview, AdminWallet, AdminWalletDetail } from "../api/admin-api";

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

export const mockWallets: AdminWallet[] = [
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
