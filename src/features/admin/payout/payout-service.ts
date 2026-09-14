import { cookies } from "next/headers";

import { ApiError } from "../../../lib/api/client";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";
import type {
  AdminApiPayoutStatus,
  AdminPayoutDetail,
} from "../api/admin-api";
import {
  adminApi,
  ADMIN_API_PAYOUT_STATUSES,
} from "../api/admin-api";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { isAdminApiEnabled } from "../api/admin-provider";
import { mockPayoutDetail, mockPayoutDetails } from "./payout-mock-data";
import {
  payoutDetailViewFromApi,
  payoutRowsFromApi,
  type PayoutBoardRow,
  type PayoutDetailView,
} from "./payout-model";

export type PayoutDataSource = "api" | "mock";

export type PayoutBoardPageData = {
  rows: PayoutBoardRow[];
};

export type PayoutDetailPageData = {
  detail: PayoutDetailView;
};

export async function loadPayoutRouteContext(): Promise<{
  dataSource: PayoutDataSource;
  cookieHeader?: string;
}> {
  const dataSource = isAdminApiEnabled() ? "api" : "mock";
  if (dataSource === "mock") return { dataSource };

  const cookieStore = await cookies();
  return {
    dataSource,
    cookieHeader: adminSessionCookieHeader(cookieStore.getAll()),
  };
}

async function listAllPayoutsForStatus(
  status: AdminApiPayoutStatus,
  cookieHeader?: string,
) {
  const options = adminApiRequestOptions(cookieHeader);
  const items = [] as Awaited<ReturnType<typeof adminApi.listPayouts>>["items"];
  let cursor: string | undefined;

  do {
    const page = await adminApi.listPayouts(
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
  cookieHeader: string | undefined,
  dataSource: PayoutDataSource,
): Promise<PayoutBoardPageData> {
  const items = dataSource === "mock"
    ? mockPayoutDetails
    : await listAllPayouts(cookieHeader);
  return { rows: payoutRowsFromApi(items) };
}

export async function loadPayoutDetailPageData(
  payoutId: string,
  cookieHeader: string | undefined,
  dataSource: PayoutDataSource,
): Promise<PayoutDetailPageData | null> {
  let detail: AdminPayoutDetail | null;
  if (dataSource === "mock") {
    detail = mockPayoutDetail(payoutId);
  } else {
    try {
      detail = await adminApi.getPayout(payoutId, adminApiRequestOptions(cookieHeader));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  const relatedPayouts = dataSource === "mock"
    ? mockPayoutDetails
    : await listAllPayouts(cookieHeader);
  return detail ? { detail: payoutDetailViewFromApi(detail, relatedPayouts) } : null;
}
