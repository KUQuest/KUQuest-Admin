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
      ["Finance Overview is not available.", "ภาพรวมการเงินไม่พร้อมใช้งาน"],
      ["All Spending balance", "ยอดใช้จ่ายทั้งหมด"],
      ["All Earnings balance", "ยอดรายได้ทั้งหมด"],
      ["All Funding reserved", "เงินที่กันไว้สำหรับ Funding ทั้งหมด"],
      ["All Payout reserved", "เงินที่กันไว้สำหรับ Payout ทั้งหมด"],
      ["The Admin API search is not available.", "ไม่สามารถค้นหาผ่าน Admin API ได้"],
    ]) {
      expect(translateAdminText("th", english)).toBe(thai);
    }
  });

  it("translates controlled case copy and enum labels while preserving dynamic values", () => {
    expect(translateAdminText("th", "Assignment Active")).toBe("การมอบหมายใช้งานอยู่");
    expect(translateAdminText("th", "Bank Account")).toBe("บัญชีธนาคาร");
    expect(translateAdminText("th", "Report against Benja Ariyawat")).toBe("รายงานเกี่ยวกับ Benja Ariyawat");
    expect(translateAdminText("th", "Saved filter: Open reports")).toBe("บันทึกตัวกรองแล้ว: Open reports");
    expect(translateAdminText("th", "Wallet status changed to Active.")).toBe("เปลี่ยนสถานะ Wallet เป็น ใช้งานอยู่.");
    expect(translateAdminText("th", "Payout PAY-9637 was reconciled with the Provider.")).toBe("การจ่ายเงิน PAY-9637 ตรวจสอบกับ Provider แล้ว");
  });
});
