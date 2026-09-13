export type AdminAuthMode = "api" | "mock" | "invalid";

export function adminAuthMode(): AdminAuthMode {
  const configuredMode = process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE;
  if (configuredMode === "api" || configuredMode === "mock") return configuredMode;
  return "invalid";
}

export function isAdminMockEnabled(): boolean {
  return adminAuthMode() === "mock";
}

export function requiresAdminSessionBoundary(): boolean {
  return !isAdminMockEnabled();
}
