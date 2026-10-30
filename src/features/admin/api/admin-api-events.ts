import { getApiUrl } from "../../../lib/api/client";
import { ADMIN_EVENT_SUBJECT_TYPES } from "./admin-api-types-commands";
import type { AdminEvent, AdminEventSubscription } from "./admin-api";

type AdminEventCallbacks = {
  onEvent: (event: AdminEvent) => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
};

function isAdminEventSubjectType(value: unknown): value is AdminEvent["subjectType"] {
  return ADMIN_EVENT_SUBJECT_TYPES.some((subjectType) => subjectType === value);
}

function isAdminEvent(value: unknown): value is AdminEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  return event.type === "RESOURCE_UPDATED"
    && typeof event.subjectId === "string"
    && event.subjectId.length > 0
    && isAdminEventSubjectType(event.subjectType);
}

export function subscribeToAdminEvents({
  onEvent,
  onOpen,
  onError,
}: AdminEventCallbacks): AdminEventSubscription {
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

      if (isAdminEvent(payload)) onEvent(payload);
    } catch {
      // Ignore malformed invalidation metadata. REST remains authoritative.
    }
  };

  source.addEventListener("open", () => onOpen?.());
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
