const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DISPLAY_TIMESTAMP_PATTERN = /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\s*(?:[·,]\s*|\s+)(\d{2}:\d{2})(?:\s+ICT)?$/i;

function normaliseMonth(value: string): string {
  const months: Record<string, string> = {
    april: "Apr",
    august: "Aug",
    december: "Dec",
    february: "Feb",
    january: "Jan",
    july: "Jul",
    june: "Jun",
    march: "Mar",
    may: "May",
    november: "Nov",
    october: "Oct",
    september: "Sep",
    sept: "Sep",
  };
  return months[value.toLocaleLowerCase()] ?? value;
}

/**
 * Format an Admin timestamp as `DD Mon YYYY HH:mm`. ISO values are converted
 * in the requested timezone; legacy display values are normalised in place.
 */
export function formatAdminTimestamp(
  value: string | null | undefined,
  timeZone = "UTC",
): string {
  const raw = value?.trim();
  if (!raw) return "Not provided";
  const displayMatch = raw.match(DISPLAY_TIMESTAMP_PATTERN);
  if (displayMatch) {
    const [, day, month, year, time] = displayMatch;
    return `${day.padStart(2, "0")} ${normaliseMonth(month)} ${year} ${time}`;
  }
  if (!ISO_TIMESTAMP_PATTERN.test(raw)) return raw;

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return raw;

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value || "";

  return `${part("day")} ${normaliseMonth(part("month"))} ${part("year")} ${part("hour")}:${part("minute")}`;
}
