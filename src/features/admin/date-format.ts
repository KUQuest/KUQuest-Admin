const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Format an ISO timestamp for Admin-facing text without exposing its transport
 * representation. Keep the instant in UTC so the displayed values match the
 * date and time represented by a `Z` timestamp from the API.
 */
export function formatAdminTimestamp(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "Not provided";
  if (!ISO_TIMESTAMP_PATTERN.test(raw)) return raw;

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return raw;

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value || "";

  return `${part("day")} ${part("month")} ${part("year")} ${part("hour")}:${part("minute")}`;
}
