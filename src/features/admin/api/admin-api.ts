import { createAdminCoreApi } from "./admin-api-core";
import { createAdminDisputeApi } from "./admin-api-dispute";
import { createAdminMemberWalletApi } from "./admin-api-member-wallet";
import { createAdminPayoutApi } from "./admin-api-payout";
import { createAdminQuestApi } from "./admin-api-quest";
import { createAdminReportApi } from "./admin-api-report";
export { subscribeToAdminEvents } from "./admin-api-events";

export * from "./admin-api-types";

export const adminApi = {
  ...createAdminCoreApi(),
  ...createAdminQuestApi(),
  ...createAdminDisputeApi(),
  ...createAdminPayoutApi(),
  ...createAdminReportApi(),
  ...createAdminMemberWalletApi(),
};

export type AdminReadPort = Pick<
  typeof adminApi,
  | "getOverview"
  | "getFinanceOverview"
  | "listActivityLogs"
  | "listQuests"
  | "getQuest"
  | "getQuestFinance"
  | "listDisputes"
  | "getDispute"
  | "listPayouts"
  | "getPayout"
  | "getPayoutHistory"
  | "reconcilePayout"
  | "retryPayoutProviderEvent"
  | "listTopUps"
  | "listReports"
  | "getReport"
  | "getEvidence"
  | "getDisputeEvidence"
  | "listMembers"
  | "getMember"
  | "getMemberFinance"
  | "listWallets"
  | "getWallet"
  | "getWalletStatusHistory"
  | "verifyWalletProjection"
>;

export type AdminCommandPort = Pick<
  typeof adminApi,
  | "hideQuest"
  | "restoreQuest"
  | "terminateQuest"
  | "openDispute"
  | "resolveDispute"
  | "approvePayout"
  | "rejectPayout"
  | "reconcilePayout"
  | "retryPayoutProviderEvent"
  | "reconcileTopUp"
  | "retryTopUpProviderEvent"
  | "decideReport"
  | "setWalletStatus"
  | "rebuildWalletProjection"
>;

// These typed ports are the only application boundary required when the live
// Admin API is enabled. They do not make a request until a screen calls them.
export const adminApiReadPort: AdminReadPort = adminApi;
export const adminApiCommandPort: AdminCommandPort = adminApi;

export type AdminEventSubscription = {
  close: () => void;
};
