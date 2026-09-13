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

  it("translates the canonical Overview labels used by the dashboard", () => {
    for (const [english, thai] of [
      ["Payout", "การจ่ายเงิน"],
      ["Member", "สมาชิก"],
      ["Member status", "สถานะ Member"],
      ["Wallet status", "สถานะ Wallet"],
      ["Open", "เปิด"],
      ["Clear", "ไม่มีรายการค้าง"],
    ]) {
      expect(translateAdminText("th", english)).toBe(thai);
    }
  });
});
