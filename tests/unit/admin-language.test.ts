import { describe, expect, it } from "bun:test";

import {
  normalizeAdminLanguage,
  translateAdminText,
} from "../../src/features/admin/language/admin-language";

describe("Admin shell language", () => {
  it("translates shared shell labels to Thai and keeps English as the default", () => {
    expect(normalizeAdminLanguage("unknown")).toBe("en");
    expect(translateAdminText("en", "Members")).toBe("Members");
    expect(translateAdminText("th", "Members")).toBe("สมาชิก");
    expect(translateAdminText("th", "Activity Log")).toBe("บันทึกกิจกรรม");
  });
});
