import type { AdminFinanceOverview } from "../api/admin-api";
import { mockWalletFinanceSummary } from "../wallet/wallet-mock-data";

/** Local fixture for the Finance Overview shown while the Admin runs in Mock mode. */
export const mockFinanceOverview: AdminFinanceOverview = {
  platformBalances: {
    revenueSatang: 0,
    suspenseSatang: 0,
  },
  memberBalancesSummary: mockWalletFinanceSummary,
  volumeLifetime: {
    totalTopUpDepositedSatang: 2500000,
    totalPayoutCompletedSatang: 780000,
    totalPlatformFeesEarnedSatang: 38500,
  },
  integrity: {
    subledgerBalanced: true,
    totalPostingsDiscrepancySatang: 0,
    lastAuditedAt: "2026-09-17T02:00:00.000Z",
  },
};
