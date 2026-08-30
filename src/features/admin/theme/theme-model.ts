export const themeDefinitions = {
  grey: { label: "Grey-white", scheme: "light" },
  green: { label: "Light green", scheme: "light" },
  dark: { label: "Dark", scheme: "dark" },
} as const;

export type AdminTheme = keyof typeof themeDefinitions;

export const THEME_STORAGE_KEY = "kuquest-admin-theme";

export function isAdminTheme(value: unknown): value is AdminTheme {
  return typeof value === "string" && value in themeDefinitions;
}

export function normalizeAdminTheme(value: unknown): AdminTheme {
  return isAdminTheme(value) ? value : "grey";
}

export function themeDatasetValue(theme: AdminTheme): string | undefined {
  return theme === "grey" ? undefined : theme;
}
