import type {
  AdminFinanceOverview,
  AdminWallet,
  AdminWalletDetail,
} from "../../src/features/admin/api/admin-api";

export const adminWalletFixtures: AdminWallet[] = [
  {
    id: "WAL-1001",
    displayId: "WAL-1001",
    userId: "68000000",
    member: { firstName: "Akarin", lastName: "Ariyawat", studentId: "6510100001", email: "akarin.a@ku.th", telephone: null },
    walletStatus: "FROZEN",
    balances: { spendingBalanceSatang: 180000, earningsBalanceSatang: 50000, fundingReservedSatang: 20000, reservedForPayoutsSatang: 10000, totalBalanceSatang: 260000 },
    createdAt: "2026-01-12T02:00:00.000Z",
    updatedAt: "2026-09-12T08:30:00.000Z",
    latestTransactionAt: "2026-09-12T08:30:00.000Z",
  },
  {
    id: "WAL-1002",
    displayId: "WAL-1002",
    userId: "68000020",
    member: { firstName: "Amara", lastName: "Ariyawat", studentId: "6510100002", email: "amara.a@ku.th", telephone: null },
    walletStatus: "ACTIVE",
    balances: { spendingBalanceSatang: 245000, earningsBalanceSatang: 83000, fundingReservedSatang: 0, reservedForPayoutsSatang: 12000, totalBalanceSatang: 340000 },
    createdAt: "2026-02-08T04:00:00.000Z",
    updatedAt: "2026-09-11T04:15:00.000Z",
    latestTransactionAt: "2026-09-11T04:15:00.000Z",
  },
  {
    id: "WAL-1003",
    displayId: "WAL-1003",
    userId: "68000040",
    member: { firstName: "Benja", lastName: "Ariyawat", studentId: "6510100003", email: "benja.a@ku.th", telephone: null },
    walletStatus: "SUSPENDED",
    balances: { spendingBalanceSatang: 98000, earningsBalanceSatang: 21000, fundingReservedSatang: 45000, reservedForPayoutsSatang: 0, totalBalanceSatang: 164000 },
    createdAt: "2026-03-16T06:30:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
    latestTransactionAt: "2026-09-10T10:00:00.000Z",
  },
  {
    id: "WAL-1004",
    displayId: "WAL-1004",
    userId: "68000060",
    member: { firstName: "Chayut", lastName: "Ariyawat", studentId: "6510100004", email: "chayut.a@ku.th", telephone: null },
    walletStatus: "CLOSED",
    balances: { spendingBalanceSatang: 0, earningsBalanceSatang: 0, fundingReservedSatang: 0, reservedForPayoutsSatang: 0, totalBalanceSatang: 0 },
    createdAt: "2026-04-20T01:45:00.000Z",
    updatedAt: "2026-08-01T09:20:00.000Z",
    latestTransactionAt: "2026-08-01T09:20:00.000Z",
  },
  {
    id: "WAL-1005",
    displayId: "WAL-1005",
    userId: "68000080",
    member: { firstName: "Darin", lastName: "Intharawong", studentId: "6510100005", email: "darin.i@ku.th", telephone: null },
    walletStatus: "ACTIVE",
    balances: { spendingBalanceSatang: 320000, earningsBalanceSatang: 115000, fundingReservedSatang: 60000, reservedForPayoutsSatang: 25000, totalBalanceSatang: 520000 },
    createdAt: "2026-05-05T03:10:00.000Z",
    updatedAt: "2026-09-13T06:00:00.000Z",
    latestTransactionAt: "2026-09-13T06:00:00.000Z",
  },
];

export const adminWalletDetailFixtures: AdminWalletDetail[] = adminWalletFixtures.map((wallet) => ({
  ...wallet,
  projectionMatchesLedger: true,
}));

export const adminWalletFinanceSummary: AdminFinanceOverview["memberBalancesSummary"] = {
  totalSpendingSatang: 843000,
  totalEarningsSatang: 269000,
  totalFundingReservedSatang: 125000,
  totalPayoutReservedSatang: 47000,
  totalCirculatingSatang: 1284000,
};
