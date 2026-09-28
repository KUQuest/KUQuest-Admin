export type AdminPayout = {
  id: string;
  student: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  quoteId: string;
  principalSatang: number;
  receiptSatang: number;
  maximumFeeSatang: number;
  maximumTaxSatang: number;
  maximumDebitSatang: number;
  actualFeeSatang: number | null;
  actualTaxSatang: number | null;
  actualDebitSatang: number | null;
  bankCode: string;
  bankName: string;
  destinationType: string;
  maskedDestinationValue: string;
  maskedRoutingValue: string;
  providerReference: string | null;
  providerStatus: string | null;
  payoutStatus: AdminApiPayoutStatus;
  cancellationReasonCode: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};
export type AdminPayoutHistoryEntry = {
  id: string;
  fromStatus: AdminApiPayoutStatus | null;
  toStatus: AdminApiPayoutStatus;
  providerStatus: string | null;
  actorUserId: string | null;
  actorAdminId: string | null;
  source: string;
  reason: string | null;
  occurredAt: string;
};

export const ADMIN_API_PAYOUT_STATUSES = [
  "PENDING_ADMIN_APPROVAL",
  "SUBMITTED_TO_PROVIDER",
  "PROVIDER_PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type AdminApiPayoutStatus = (typeof ADMIN_API_PAYOUT_STATUSES)[number];

export type AdminPayoutDetail = AdminPayout & {
  history: AdminPayoutHistoryEntry[];
};

export type AdminPayoutCommandResult = {
  resourceSummary: AdminPayout;
  resourceVersion: number;
  adminActionId: string;
};

export type AdminPayoutReconciliation = {
  id: string;
  internalReference: string;
  principalUserId: string;
  quoteId: string;
  payoutDestinationId: string;
  destinationRecipientType: string;
  destinationGivenName: string;
  destinationSurname: string;
  destinationRelationship: string;
  destinationAccountCountry: string;
  destinationAccountCurrency: string;
  destinationBankCode: string;
  destinationAccountHolderName: string;
  destinationRoutingType: string;
  destinationMaskedLastFour: string;
  destinationMaskedRoutingValue: string;
  provider: string;
  providerReference: string | null;
  providerApiVersion: string | null;
  providerStatus: string | null;
  providerAmountSatang: number | null;
  principalSatang: number;
  receiptSatang: number;
  maximumFeeSatang: number;
  maximumTaxSatang: number;
  maximumDebitSatang: number;
  actualFeeSatang: number | null;
  actualTaxSatang: number | null;
  actualDebitSatang: number | null;
  payoutStatus: AdminApiPayoutStatus;
  version: number;
  reserveLedgerTransactionId: string;
  finalLedgerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPayoutReconcileResult = {
  payout: AdminPayoutReconciliation;
};

export type AdminPayoutProviderEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  resourceType: string;
  internalReference: string | null;
  providerReference: string | null;
  providerApiVersion: string | null;
  providerStatus: string;
  normalizedStatus: string;
  providerAmountSatang: number | null;
  actualFeeSatang: number | null;
  actualTaxSatang: number | null;
  actualDebitSatang: number | null;
  providerChannelCode: string | null;
  providerOccurredAt: string;
  payloadHash: string;
  rawPayloadAvailable: boolean;
  rawPayloadExpiresAt: string;
  processingStatus: string;
  attemptCount: number;
  claimedAt: string | null;
  processedAt: string | null;
  lastError: string | null;
  receivedAt: string;
  createdAt: string;
};

export type AdminPayoutProviderEventResult = {
  event: AdminPayoutProviderEvent;
};

export const ADMIN_API_TOP_UP_STATUSES = ["PENDING", "PAID", "EXPIRED", "FAILED"] as const;
export type AdminApiTopUpStatus = (typeof ADMIN_API_TOP_UP_STATUSES)[number];

export type AdminTopUpListItem = {
  id: string;
  userId: string;
  member: {
    firstName: string;
    lastName: string;
    studentId: string | null;
  };
  topUpStatus: AdminApiTopUpStatus;
  creditAmountSatang: number;
  providerFeeSatang: number;
  providerTaxSatang: number;
  paymentTotalSatang: number;
  paymentMethod: string;
  providerReference: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
};

export type AdminTopUpDetail = {
  id: string;
  internalReference: string;
  principalUserId: string;
  quoteId: string;
  provider: string;
  providerReference: string | null;
  providerApiVersion: string | null;
  providerStatus: string | null;
  providerAmountSatang: number | null;
  providerChannelCode: string | null;
  creditSatang: number;
  chargedFeeSatang: number;
  chargedTaxSatang: number;
  paymentTotalSatang: number;
  providerFeeSatang: number;
  providerTaxSatang: number;
  providerTotalSatang: number;
  qrPayload: string | null;
  qrDataUrl: string | null;
  qrExpiresAt: string | null;
  topUpStatus: AdminApiTopUpStatus;
  creditedLedgerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  simulated?: boolean;
  callbackReceived?: boolean;
  reconciliationUsed?: boolean;
};

export type AdminTopUpReconcileResult = {
  topUp: AdminTopUpDetail;
};

export type AdminTopUpProviderEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  resourceType: string;
  internalReference: string | null;
  providerReference: string | null;
  providerApiVersion: string | null;
  providerStatus: string;
  normalizedStatus: string;
  providerAmountSatang: number | null;
  providerChannelCode: string | null;
  providerOccurredAt: string;
  payloadHash: string;
  rawPayloadAvailable: boolean;
  rawPayloadExpiresAt: string;
  processingStatus: string;
  attemptCount: number;
  claimedAt: string | null;
  processedAt: string | null;
  lastError: string | null;
  receivedAt: string;
  createdAt: string;
};

export type AdminTopUpProviderEventResult = {
  event: AdminTopUpProviderEvent;
};
