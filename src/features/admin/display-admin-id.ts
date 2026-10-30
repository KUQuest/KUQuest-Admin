const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Return a display identifier. Do not return a canonical UUID. */
export function displayAdminId(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const identifier = value.trim();
    if (identifier && !UUID_PATTERN.test(identifier)) return identifier;
  }
  return null;
}
