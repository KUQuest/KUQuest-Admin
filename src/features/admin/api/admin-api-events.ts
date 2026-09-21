import { getApiUrl } from "../../../lib/api/client";
import type { AdminEvent, AdminEventSubscription } from "./admin-api";

export function subscribeToAdminEvents(
  onEvent: (event: AdminEvent) => void,
  onError?: (error: Event) => void,
): AdminEventSubscription {
  const source = new EventSource(
    `${getApiUrl().replace(/\/$/, "")}/api/v1/admin/events`,
    { withCredentials: true },
  );

  const handleMessage = (event: MessageEvent<string>): void => {
    try {
      const parsed: unknown = JSON.parse(event.data);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;

      const record = parsed as Record<string, unknown>;
      const payload = record.success === true
        && record.data
        && typeof record.data === "object"
        && !Array.isArray(record.data)
        ? record.data as Record<string, unknown>
        : record;

      if (typeof payload.type === "string") onEvent(payload as AdminEvent);
    } catch {
      // Ignore malformed invalidation metadata. REST remains authoritative.
    }
  };

  source.addEventListener("message", (event) => {
    handleMessage(event as MessageEvent<string>);
  });
  source.addEventListener("error", (event) => {
    onError?.(event);
  });

  return {
    close: () => source.close(),
  };
}
