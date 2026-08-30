import { describe, expect, it } from "bun:test";

import {
  isAdminTheme,
  normalizeAdminTheme,
  themeDatasetValue,
  themeDefinitions,
} from "../../src/features/admin/theme/theme-model";

describe("theme model", () => {
  it("recognizes the supported themes and falls back to grey", () => {
    expect(isAdminTheme("green")).toBe(true);
    expect(isAdminTheme("purple")).toBe(false);
    expect(normalizeAdminTheme("purple")).toBe("grey");
  });

  it("maps the default and alternate themes to document state", () => {
    expect(themeDatasetValue("grey")).toBeUndefined();
    expect(themeDatasetValue("dark")).toBe("dark");
    expect(themeDefinitions.dark.scheme).toBe("dark");
  });
});
