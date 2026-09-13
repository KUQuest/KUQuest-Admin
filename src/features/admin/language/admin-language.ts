export type AdminLanguage = "en" | "th";

const thaiTranslations: Record<string, string> = {
  Overview: "ภาพรวม",
  Quest: "งาน",
  "Dispute Cases": "คดีข้อพิพาท",
  "Report Cases": "คดีรายงาน",
  "Conduct Reports": "รายงานพฤติกรรม",
  Payouts: "การจ่ายเงิน",
  Members: "สมาชิก",
  Wallets: "กระเป๋าเงิน",
  "Activity Log": "บันทึกกิจกรรม",
  "KUQuest Admin": "KUQuest Admin",
  "One view of marketplace work, risk, and money.": "มุมมองเดียวของงาน ความเสี่ยง และการเงินในระบบ",
  "Work left": "งานที่เหลือ",
  "open decisions": "รายการรอการตัดสินใจ",
  "Queue map": "แผนผังคิว",
  "What needs attention now.": "รายการที่ต้องตรวจสอบในขณะนี้",
  "Current counts": "จำนวนปัจจุบัน",
  Queue: "คิว",
  Detail: "รายละเอียด",
  State: "สถานะ",
  Waiting: "เวลาที่รอ",
  "Recent Admin changes.": "การเปลี่ยนแปลงล่าสุดของ Admin",
  Latest: "ล่าสุด",
  "No administrative activity is available.": "ไม่มีข้อมูลกิจกรรมการดูแลระบบ",
  "Quest States": "สถานะ Quest",
  "Current distribution across Quests.": "การกระจายสถานะของ Quest ในปัจจุบัน",
  "Count by Member status.": "จำนวนตามสถานะ Member",
  "Count by Wallet status.": "จำนวนตามสถานะ Wallet",
  "Payouts in flight": "Payout ที่กำลังดำเนินการ",
  "Payout Approvals": "การอนุมัติ Payout",
  "Queue detail not provided": "ไม่ได้ระบุรายละเอียดคิว",
  "Queue count not provided": "ไม่ได้ระบุจำนวนคิว",
  "Not provided": "ไม่ได้ระบุ",
  Unavailable: "ไม่พร้อมใช้งาน",
  "Some Overview counters are not provided by the Admin API.": "Admin API ไม่ได้ส่งตัวนับ Overview บางรายการ",
  "Finance Overview": "ภาพรวมการเงิน",
  "Platform and Member Wallet totals.": "ยอดรวมของระบบและ Wallet ของ Member",
  "Search marketplace records": "ค้นหารายการในระบบ",
  "Search by name, Quest, Student ID, or Payout…": "ค้นหาด้วยชื่อ Quest Student ID หรือ Payout…",
  "Close search": "ปิดการค้นหา",
  "No matching records": "ไม่พบรายการที่ตรงกัน",
  "Read the Admin API to search Quest, Member, and Payout records.": "อ่านข้อมูลจาก Admin API เพื่อค้นหา Quest Member และ Payout",
  SYSTEM: "ระบบ",
  Admin: "ผู้ดูแลระบบ",
  Theme: "ธีม",
  "Choose a theme": "เลือกธีม",
  "Theme options": "ตัวเลือกธีม",
  "Grey-white": "เทา-ขาว",
  "Neutral workspace": "พื้นที่ทำงานโทนกลาง",
  "Light green": "เขียวอ่อน",
  "Original KuQuest palette": "โทนสีดั้งเดิมของ KuQuest",
  Dark: "โหมดมืด",
  "Low-light workspace": "พื้นที่ทำงานในที่แสงน้อย",
  Language: "ภาษา",
  "Language options": "ตัวเลือกภาษา",
  "Primary navigation": "การนำทางหลัก",
  "System navigation": "การนำทางระบบ",
  "Open navigation": "เปิดการนำทาง",
  "Close navigation": "ปิดการนำทาง",
};

export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === "en" || value === "th";
}

export function normalizeAdminLanguage(value: unknown): AdminLanguage {
  return isAdminLanguage(value) ? value : "en";
}

export function translateAdminText(language: AdminLanguage, value: string): string {
  return language === "th" ? thaiTranslations[value] ?? value : value;
}
