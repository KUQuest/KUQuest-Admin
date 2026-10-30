import type { AdminApiRequestOptions } from "./admin-api";

export function adminApiRequestOptions(cookieHeader?: string): AdminApiRequestOptions {
  return cookieHeader === undefined ? {} : { headers: { Cookie: cookieHeader } };
}
