export function recordText(record: unknown, key: string): string {
  if (!record || typeof record !== "object") return "";
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function timestampValue(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string" || !value.trim()) return 0;
  const parsed = Date.parse(value.replace(" · ", " ").replace(/\s+ICT$/, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function recordNewestAt(record: unknown, keys: readonly string[]): number {
  return keys.reduce((newest, key) => Math.max(newest, timestampValue(recordText(record, key))), 0);
}

export function recordStatusLabel(
  record: unknown,
  keys: readonly string[],
  label: (value: unknown) => string,
): string {
  const raw = keys.map((key) => recordText(record, key)).find(Boolean);
  return raw ? label(raw) : "Not provided";
}

export function apiStatusLabel(value: string | undefined, label: (value: unknown) => string): string {
  return value ? label(value) : "Not provided";
}
