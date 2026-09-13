import { cookies } from "next/headers";

import type { AdminAuthSessionDetails, AdminIdentity } from "../../features/admin/api/admin-api";
import { getApiUrl } from "../api/client";
import {
  adminSessionCookieHeader,
  adminSessionDecision,
  hasAdminSessionCookie,
  hasMockAdminSessionCookie,
} from "./admin-session-policy";

const adminSessionPath = "/api/admin/auth/get-session";
type AdminSessionFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type AdminSessionResult =
  | { kind: "authenticated"; identity: AdminIdentity }
  | { kind: "missing" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; error: Error };

const mockAdminIdentity: AdminIdentity = {
  id: "mock-admin",
  email: "admin@ku.th",
  firstName: "Nicha",
  lastName: "P.",
  disabledAt: null,
};

function isAdminApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE === "api";
}

function adminIdentityFrom(value: unknown): AdminIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.email !== "string") return null;

  return {
    id: record.id,
    email: record.email,
    firstName: typeof record.firstName === "string" ? record.firstName : "",
    lastName: typeof record.lastName === "string" ? record.lastName : "",
    disabledAt: typeof record.disabledAt === "string" ? record.disabledAt : null,
  };
}

function resultFromIdentity(identity: AdminIdentity | null): AdminSessionResult {
  const decision = adminSessionDecision(identity);
  if (decision === "missing") return { kind: "missing" };
  if (decision === "forbidden") return { kind: "forbidden" };
  return { kind: "authenticated", identity: identity as AdminIdentity };
}

function errorFrom(value: unknown, fallback: string): Error {
  return value instanceof Error ? value : new Error(fallback);
}

export async function getAdminSessionFromApi(
  cookieHeader: string,
  fetcher: AdminSessionFetcher = fetch,
): Promise<AdminSessionResult> {
  try {
    const response = await fetcher(`${getApiUrl().replace(/\/$/, "")}${adminSessionPath}`, {
      headers: {
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 404) return { kind: "missing" };
    if (response.status === 403) return { kind: "forbidden" };
    if (!response.ok) {
      return {
        kind: "unavailable",
        error: new Error(`Admin session request failed with status ${response.status}.`),
      };
    }

    const body = await response.json() as AdminAuthSessionDetails | null;
    return resultFromIdentity(body?.user ? adminIdentityFrom(body.user) : null);
  } catch (error: unknown) {
    return { kind: "unavailable", error: errorFrom(error, "Admin session request failed.") };
  }
}

export async function getAdminSession(): Promise<AdminSessionResult> {
  const cookieStore = await cookies();
  const requestCookies = cookieStore.getAll();

  if (!isAdminApiEnabled()) {
    return hasMockAdminSessionCookie(requestCookies)
      ? { kind: "authenticated", identity: mockAdminIdentity }
      : { kind: "missing" };
  }

  const cookieHeader = adminSessionCookieHeader(requestCookies);
  if (!cookieHeader || !hasAdminSessionCookie(requestCookies)) return { kind: "missing" };
  return getAdminSessionFromApi(cookieHeader);
}
