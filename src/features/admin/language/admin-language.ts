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
