"use client";

import { AdminThemeControl as SharedAdminThemeControl } from "../../../components/admin/admin-theme-control";

type ThemeTranslator = {
  translate: (value: string) => string;
};

function translateThemeText(value: string): string {
  if (typeof window === "undefined") return value;
  const legacyWindow = window as unknown as Record<string, unknown>;
  const translator = legacyWindow["__KUQUEST_LANGUAGE__"] as ThemeTranslator | undefined;
  return translator?.translate(value) ?? value;
}

export function AdminThemeControl() {
  return <SharedAdminThemeControl translateText={translateThemeText} />;
}
