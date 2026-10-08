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

  it("translates Member Wallet read states distinctly", () => {
    expect(translateAdminText("en", "This Member has no Wallet.")).toBe("This Member has no Wallet.");
    expect(translateAdminText("th", "This Member has no Wallet.")).toBe("Member นี้ไม่มี Wallet");
    expect(translateAdminText("th", "Wallet data conflicts.")).toBe("ข้อมูล Wallet ขัดแย้งกัน");
    expect(translateAdminText("th", "Member finance could not be loaded.")).toBe("อ่านข้อมูลการเงินของ Member ไม่สำเร็จ");
    expect(translateAdminText("th", "Wallet source: Member detail.")).toBe("แหล่งข้อมูล Wallet: รายละเอียด Member");
    expect(translateAdminText("th", "No Ledger Transactions yet.")).toBe("ยังไม่มี Ledger Transaction");
    expect(translateAdminText("th", "No sealed Ledger Transactions match these filters.")).toBe("ไม่มี Ledger Transaction ที่ปิดผนึกตรงกับตัวกรอง");
    expect(translateAdminText("th", "Could not read the latest Ledger Transaction date.")).toBe("อ่านวันที่ Ledger Transaction ล่าสุดไม่สำเร็จ");
    expect(translateAdminText("en", "Could not read the Wallet Statement.")).toBe("Could not read the Wallet Statement.");
    expect(translateAdminText("th", "Could not read the Wallet Statement.")).toBe("อ่าน Wallet Statement ไม่สำเร็จ");
    expect(translateAdminText("th", "Wallet Statement is not verified.")).toBe("ยังไม่ยืนยันข้อมูล Wallet Statement");
    expect(translateAdminText("th", "Wallet Statement data does not match the API contract.")).toBe("ข้อมูล Wallet Statement ไม่ตรงตามสัญญา API");
    expect(translateAdminText("th", "Payout data does not match the API contract.")).toBe("ข้อมูล Payout ไม่ตรงตามสัญญา API");
  });
});
