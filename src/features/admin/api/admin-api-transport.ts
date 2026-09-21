import { apiRequest } from "../../../lib/api/client";
import type {
  AdminApiRequestOptions,
  AdminCommandOptions,
  AdminOverview,
  DisputeResolution,
  PayoutApproval,
  PayoutRejection,
} from "./admin-api";

let overviewInFlight: Promise<AdminOverview> | null = null;
let overviewCache: { value: AdminOverview; expiresAt: number } | null = null;

export function getOverviewRequest(options: AdminApiRequestOptions = {}): Promise<AdminOverview> {
  if (options.headers !== undefined) {
    return apiRequest<AdminOverview>("/api/v1/admin/overview", {
      cache: "no-store",
      ...options,
    });
  }
  if (typeof window !== "undefined" && overviewCache && overviewCache.expiresAt > Date.now()) {
    return Promise.resolve(overviewCache.value);
  }
  if (overviewInFlight) return overviewInFlight;
  const request = apiRequest<AdminOverview>("/api/v1/admin/overview", {
    cache: "no-store",
    ...options,
  });
  const sharedRequest = request.then((value) => {
    if (typeof window !== "undefined") overviewCache = { value, expiresAt: Date.now() + 1000 };
    return value;
  }).finally(() => {
    if (overviewInFlight === sharedRequest) overviewInFlight = null;
  });
  overviewInFlight = sharedRequest;
  return sharedRequest;
}

export function encode(value: string): string {
  return encodeURIComponent(value);
}

export function queryString(query: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });

  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export function commandHeaders(options: AdminCommandOptions): HeadersInit {
  return { "Idempotency-Key": options.idempotencyKey };
}

export function questCommandHeaders(options: AdminCommandOptions): HeadersInit {
  if (typeof options.expectedVersion !== "number") {
    throw new Error("Quest command requires the current resource version.");
  }
  return {
    ...commandHeaders(options),
    "If-Match": String(options.expectedVersion),
  };
}

export function payoutCommandHeaders(options: PayoutApproval | PayoutRejection): HeadersInit {
  return {
    ...commandHeaders(options),
    "If-Match": String(options.expectedVersion),
  };
}

export function commandBody<T extends AdminCommandOptions>(
  options: T,
): Omit<T, "idempotencyKey" | "expectedVersion"> {
  const { idempotencyKey: _idempotencyKey, expectedVersion: _expectedVersion, ...body } = options;
  return body;
}

export function disputeCommandHeaders(options: DisputeResolution): HeadersInit {
  return {
    ...commandHeaders(options),
    "If-Match": String(options.expectedVersion),
  };
}

export function disputeCommandBody(options: DisputeResolution): Pick<
  DisputeResolution,
  "outcome" | "reasonCode" | "workerId" | "amountSatang"
> {
  return {
    outcome: options.outcome,
    reasonCode: options.reasonCode,
    ...(options.workerId ? { workerId: options.workerId } : {}),
    ...(options.amountSatang !== undefined ? { amountSatang: options.amountSatang } : {}),
  };
}
