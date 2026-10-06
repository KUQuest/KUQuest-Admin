import { ApiError } from "../../../lib/api/client";
import type {
  AdminApiPayoutStatus,
  AdminPayoutDetail,
} from "../api/admin-api";
import {
  ADMIN_API_PAYOUT_STATUSES,
} from "../api/admin-api";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { adminApiProvider } from "../api/admin-provider";
import {
  payoutDetailViewFromApi,
  payoutRowsFromApi,
  type PayoutBoardRow,
  type PayoutDetailView,
} from "./payout-model";

export type PayoutBoardPageData = {
  rows: PayoutBoardRow[];
};

export type PayoutDetailPageData = {
  detail: PayoutDetailView;
};

async function listAllPayoutsForStatus(
  status: AdminApiPayoutStatus,
  cookieHeader?: string,
) {
  const options = adminApiRequestOptions(cookieHeader);
  const items = [] as Awaited<ReturnType<typeof adminApiProvider.read.listPayouts>>["items"];
  let cursor: string | undefined;

  do {
    const page = await adminApiProvider.read.listPayouts(
      { status, limit: 50, cursor, sort: "newest" },
      options,
    );
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return items;
}

async function listAllPayouts(cookieHeader?: string) {
  const pages = await Promise.all(
    ADMIN_API_PAYOUT_STATUSES.map((status) => listAllPayoutsForStatus(status, cookieHeader)),
  );
  return pages.flat();
}

export async function loadPayoutBoardPageData(
  cookieHeader?: string,
): Promise<PayoutBoardPageData> {
  const items = await listAllPayouts(cookieHeader);
  return { rows: payoutRowsFromApi(items) };
}

export async function loadPayoutDetailPageData(
  payoutId: string,
  cookieHeader?: string,
): Promise<PayoutDetailPageData | null> {
  let detail: AdminPayoutDetail | null;
  try {
    detail = await adminApiProvider.read.getPayout(payoutId, adminApiRequestOptions(cookieHeader));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }

  try {
    const history = await adminApiProvider.read.getPayoutHistory(
      payoutId,
      adminApiRequestOptions(cookieHeader),
    );
    detail = { ...detail, history };
  } catch {
    // The Payout detail response also carries history, so keep that record if
    // the dedicated history route is temporarily unavailable.
  }

  const relatedPayouts = await listAllPayouts(cookieHeader);
  return { detail: payoutDetailViewFromApi(detail, relatedPayouts) };
}
