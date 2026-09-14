import type {
  AdminPayout,
  AdminPayoutDetail,
} from "../api/admin-api";
import {
  payoutStatusFor,
  payoutStatusLabel,
  type PayoutStatus,
} from "../domain/rulebook";

export const PAYOUT_BOARD_TABS = [
  { id: "PENDING_ADMIN_APPROVAL", label: "Needs review" },
  { id: "all", label: "All" },
  { id: "SUBMITTED_TO_PROVIDER", label: "Sent" },
  { id: "PROVIDER_PENDING", label: "Processing" },
  { id: "SUCCEEDED", label: "Paid" },
  { id: "FAILED", label: "Failed" },
  { id: "CANCELLED", label: "Cancelled" },
] as const;

export type PayoutBoardTab = (typeof PAYOUT_BOARD_TABS)[number]["id"];
export type PayoutBoardPageSize = number | "all";
export type PayoutSortKey = "id" | "student" | "createdAt" | "amount" | "status";
export type PayoutSortDirection = "ascending" | "descending";

export type PayoutStudentView = {
  id: string;
  name: string;
  email: string;
};

export type PayoutBoardRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: PayoutStatus;
  statusLabel: string;
  principalSatang: number;
  bankName: string;
  maskedDestinationValue: string;
  createdAt: string;
  version: number;
};

export type PayoutDetailView = {
  id: string;
  student: PayoutStudentView;
  quoteId: string;
  status: PayoutStatus;
  amounts: {
    principalSatang: number;
    receiptSatang: number;
    maximumFeeSatang: number;
    maximumTaxSatang: number;
    maximumDebitSatang: number;
    actualFeeSatang: number | null;
    actualTaxSatang: number | null;
    actualDebitSatang: number | null;
  };
  destination: {
    bankCode: string;
    bankName: string;
    type: string;
    maskedValue: string;
    maskedRoutingValue: string;
  };
  cancellationReasonCode: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  decisionContext: {
    heading: string;
    copy: string;
    next: string;
  };
  previousPayouts: Array<{
    id: string;
    status: PayoutStatus;
    principalSatang: number;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    fromStatus: PayoutStatus | null;
    toStatus: PayoutStatus;
    actorUserId: string | null;
    actorAdminId: string | null;
    source: string;
    reason: string | null;
    occurredAt: string;
  }>;
};

function studentName(student: AdminPayout["student"]): string {
  return `${student.firstName} ${student.lastName}`.trim() || student.email;
}

export function payoutDecisionContext(status: PayoutStatus): PayoutDetailView["decisionContext"] {
  const contexts: Record<PayoutStatus, PayoutDetailView["decisionContext"]> = {
    PENDING_ADMIN_APPROVAL: {
      heading: "Why your approval is needed",
      copy: "This Payout is ready for release, but it cannot move to the bank until an Admin approves it.",
      next: "Approve Payout → status changes to Sent. Funds are not yet transferred.",
    },
    SUBMITTED_TO_PROVIDER: {
      heading: "Transfer submitted",
      copy: "The Payout was approved and submitted to the payment Provider.",
      next: "The Provider will report the final transfer result.",
    },
    PROVIDER_PENDING: {
      heading: "Transfer in progress",
      copy: "The Payout has been approved and is moving to the recipient’s bank. No action is needed unless the transfer fails.",
      next: "The record will become Paid after the Provider confirms the transfer.",
    },
    SUCCEEDED: {
      heading: "Transfer completed",
      copy: "The recipient’s bank transfer completed successfully. This record is retained for audit.",
      next: "No further Admin action is available.",
    },
    CANCELLED: {
      heading: "Payout rejected",
      copy: "This Payout was rejected before funds were released. Review the recorded reason before creating a new Payout request.",
      next: "No retry is available from this record.",
    },
    FAILED: {
      heading: "Transfer failed",
      copy: "The payment Provider could not complete this transfer.",
      next: "Review the failure reason before creating a new Payout request.",
    },
  };
  return contexts[status];
}

function payoutTimestamp(value: string): number {
  return Date.parse(value) || 0;
}

function previousPayoutsFromApi(
  current: AdminPayout,
  payouts: AdminPayout[],
): PayoutDetailView["previousPayouts"] {
  const currentTimestamp = payoutTimestamp(current.createdAt);
  return payouts
    .filter((payout) => {
      if (payout.id === current.id || payout.student.id !== current.student.id) return false;
      const timestamp = payoutTimestamp(payout.createdAt);
      return timestamp < currentTimestamp || (!timestamp && !currentTimestamp);
    })
    .toSorted((left, right) => payoutTimestamp(right.createdAt) - payoutTimestamp(left.createdAt))
    .map((payout) => ({
      id: payout.id,
      status: payoutStatusFor(payout.payoutStatus),
      principalSatang: payout.principalSatang,
      createdAt: payout.createdAt,
    }));
}

export function payoutRowFromApi(payout: AdminPayout): PayoutBoardRow {
  const status = payoutStatusFor(payout.payoutStatus);
  return {
    id: payout.id,
    studentName: studentName(payout.student),
    studentEmail: payout.student.email,
    status,
    statusLabel: payoutStatusLabel(status),
    principalSatang: payout.principalSatang,
    bankName: payout.bankName,
    maskedDestinationValue: payout.maskedDestinationValue,
    createdAt: payout.createdAt,
    version: payout.version,
  };
}

export function payoutRowsFromApi(payouts: AdminPayout[]): PayoutBoardRow[] {
  return payouts.map(payoutRowFromApi);
}

export function payoutDetailViewFromApi(
  payout: AdminPayoutDetail,
  relatedPayouts: AdminPayout[] = [],
): PayoutDetailView {
  const status = payoutStatusFor(payout.payoutStatus);
  return {
    id: payout.id,
    student: {
      id: payout.student.id,
      name: studentName(payout.student),
      email: payout.student.email,
    },
    quoteId: payout.quoteId,
    status,
    amounts: {
      principalSatang: payout.principalSatang,
      receiptSatang: payout.receiptSatang,
      maximumFeeSatang: payout.maximumFeeSatang,
      maximumTaxSatang: payout.maximumTaxSatang,
      maximumDebitSatang: payout.maximumDebitSatang,
      actualFeeSatang: payout.actualFeeSatang,
      actualTaxSatang: payout.actualTaxSatang,
      actualDebitSatang: payout.actualDebitSatang,
    },
    destination: {
      bankCode: payout.bankCode,
      bankName: payout.bankName,
      type: payout.destinationType,
      maskedValue: payout.maskedDestinationValue,
      maskedRoutingValue: payout.maskedRoutingValue,
    },
    cancellationReasonCode: payout.cancellationReasonCode,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
    version: payout.version,
    decisionContext: payoutDecisionContext(status),
    previousPayouts: previousPayoutsFromApi(payout, relatedPayouts),
    history: payout.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus ? payoutStatusFor(entry.fromStatus) : null,
      toStatus: payoutStatusFor(entry.toStatus),
      actorUserId: entry.actorUserId,
      actorAdminId: entry.actorAdminId,
      source: entry.source,
      reason: entry.reason,
      occurredAt: entry.occurredAt,
    })),
  };
}

export function payoutOutcomeReason(detail: Pick<PayoutDetailView, "status" | "history" | "cancellationReasonCode">): string | null {
  return detail.history.toReversed().find((entry) => entry.toStatus === detail.status && entry.reason)?.reason
    ?? (detail.status === "CANCELLED" ? detail.cancellationReasonCode : null);
}

export function payoutMatchesTab(row: PayoutBoardRow, tab: PayoutBoardTab): boolean {
  return tab === "all" || row.status === tab;
}

export function searchPayoutRows(rows: PayoutBoardRow[], query: string): PayoutBoardRow[] {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return rows;
  return rows.filter((row) => [
    row.id,
    row.studentName,
    row.studentEmail,
    row.bankName,
    row.maskedDestinationValue,
    row.statusLabel,
  ].some((field) => field.toLocaleLowerCase().includes(value)));
}

function comparePayoutRows(left: PayoutBoardRow, right: PayoutBoardRow, key: PayoutSortKey): number {
  if (key === "amount") return left.principalSatang - right.principalSatang;
  if (key === "createdAt") return Date.parse(left.createdAt) - Date.parse(right.createdAt);

  const leftValue = payoutSortValue(left, key);
  const rightValue = payoutSortValue(right, key);
  return leftValue.localeCompare(rightValue);
}

function payoutSortValue(row: PayoutBoardRow, key: PayoutSortKey): string {
  return key === "id"
    ? row.id
    : key === "student"
      ? row.studentName
      : row.statusLabel;
}

export function sortPayoutRows(
  rows: PayoutBoardRow[],
  key: PayoutSortKey,
  direction: PayoutSortDirection,
): PayoutBoardRow[] {
  const multiplier = direction === "ascending" ? 1 : -1;
  return rows.toSorted((left, right) => comparePayoutRows(left, right, key) * multiplier);
}

export function pagePayoutRows(
  rows: PayoutBoardRow[],
  page: number,
  pageSize: PayoutBoardPageSize,
): PayoutBoardRow[] {
  if (pageSize === "all") return rows;
  const start = Math.max(0, page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function payoutPageCount(rowCount: number, pageSize: PayoutBoardPageSize): number {
  return pageSize === "all" ? (rowCount ? 1 : 0) : Math.ceil(rowCount / pageSize);
}

export function formatPayoutDate(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })} ICT`;
}

export function formatPayoutMoney(satang: number | null | undefined): string {
  if (satang === null || satang === undefined) return "Not provided";
  return `฿${(satang / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function payoutStatusClass(status: PayoutStatus): string {
  return `status-payout-${status.toLocaleLowerCase().replaceAll("_", "-")}`;
}
