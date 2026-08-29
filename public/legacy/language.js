const languageStorageKey = "kuquest-admin-language";
const languageDefinitions = {
  en: { label: "English", documentLanguage: "en" },
  th: { label: "ไทย", documentLanguage: "th" },
};
const translations = {
  "Red Flag": "ติดธงแดง",
  "Record violation": "บันทึกการละเมิด",
  "Confirm violation": "ยืนยันการละเมิด",
  "No violation": "ไม่พบการละเมิด",
  "Confirmed violations": "การละเมิดที่ยืนยันแล้ว",
  "Active Red Flags": "Red Flag ที่ใช้งานอยู่",
  "Next outcome": "ผลลัพธ์ถัดไป",
  "Penalty ladder": "บทลงโทษแบบขั้นบันได",
  Overview: "ภาพรวม",
  Quests: "งาน",
  Disputes: "ข้อพิพาท",
  Reports: "รายงาน",
  Payouts: "การจ่ายเงิน",
  Users: "ผู้ใช้",
  "Activity log": "บันทึกกิจกรรม",
  SYSTEM: "ระบบ",
  "Log out": "ออกจากระบบ",
  "Marketplace admin": "ผู้ดูแลระบบตลาด",
  "Search quests, users, and payouts": "ค้นหางาน ผู้ใช้ และการจ่ายเงิน",
  Theme: "ธีม",
  "Choose a theme": "เลือกธีม",
  "Grey-white": "เทา-ขาว",
  "Neutral workspace": "พื้นที่ทำงานโทนกลาง",
  "Light green": "เขียวอ่อน",
  "Original KuQuest palette": "โทนสีดั้งเดิมของ KuQuest",
  Dark: "โหมดมืด",
  "Low-light workspace": "พื้นที่ทำงานในที่แสงน้อย",
  Language: "ภาษา",
  "Language options": "ตัวเลือกภาษา",
  "Latest dispute/report": "ข้อพิพาท/รายงานล่าสุด",
  "Needs a decision": "รายการที่ต้องตัดสินใจ",
  "Quest flow": "สถานะงาน",
  "Current marketplace distribution": "การกระจายงานในระบบปัจจุบัน",
  "Recent activity": "กิจกรรมล่าสุด",
  "Latest administrative trail": "ประวัติการดูแลล่าสุด",
  "Payout watch": "ติดตามการจ่ายเงิน",
  "User watch": "ติดตามผู้ใช้",
  "Open review queue": "เปิดคิวตรวจสอบ",
  "View activity": "ดูกิจกรรม",
  "Open quests": "เปิดดูงาน",
  "Open payouts": "เปิดดูการจ่ายเงิน",
  "Open users": "เปิดดูผู้ใช้",
  "Active disputes": "ข้อพิพาทที่กำลังดำเนินการ",
  "Payouts needing review": "การจ่ายเงินที่ต้องตรวจสอบ",
  "Open report": "รายงานที่เปิดอยู่",
  "Total work left": "งานที่เหลือทั้งหมด",
  "Items requiring admin action": "รายการที่ต้องดำเนินการโดยผู้ดูแล",
  "No decisions waiting": "ไม่มีรายการรอการตัดสินใจ",
  "All current records are clear or processing normally.": "รายการปัจจุบันไม่มีปัญหาหรือกำลังดำเนินการตามปกติ",
  "New user report": "รายงานผู้ใช้ใหม่",
  "Active report": "รายงานที่กำลังดำเนินการ",
  "Recent Payout Request": "คำขอจ่ายเงินล่าสุด",
  "Money movement requiring a closer look": "รายการเงินที่ต้องตรวจสอบเพิ่มเติม",
  "Recent User penalty": "บทลงโทษผู้ใช้ล่าสุด",
  "Accounts that may need a moderator": "บัญชีที่ผู้ดูแลอาจต้องตรวจสอบ",
  "Open review": "เปิดการตรวจสอบ",
  "Payout approved": "อนุมัติการจ่ายเงินแล้ว",
  "Payout requested": "ส่งคำขอจ่ายเงินแล้ว",
  "Dispute opened": "เปิดข้อพิพาทแล้ว",
  "Draft": "ฉบับร่าง",
  Open: "เปิด",
  Assigned: "มอบหมายแล้ว",
  "In progress": "กำลังดำเนินการ",
  Submitted: "ส่งแล้ว",
  "Change pending": "รอการเปลี่ยนแปลง",
  Disputed: "มีข้อพิพาท",
  Completed: "เสร็จสิ้น",
  Approved: "อนุมัติแล้ว",
  Cancelled: "ยกเลิก",
  "Needs approval": "รออนุมัติ",
  Processing: "กำลังดำเนินการ",
  Rejected: "ปฏิเสธ",
  Normal: "ปกติ",
  Flag: "ติดธง",
  "Temp ban": "ระงับชั่วคราว",
  "Perm ban": "ระงับถาวร",
  Active: "ใช้งานอยู่",
  Closed: "ปิดแล้ว",
  Visible: "แสดงอยู่",
  Reported: "ถูกรายงาน",
  Hidden: "ซ่อนอยู่",
  All: "ทั้งหมด",
  Previous: "ก่อนหน้า",
  Next: "ถัดไป",
  "Show 10": "แสดง 10 รายการ",
  "Show 25": "แสดง 25 รายการ",
  "Show 50": "แสดง 50 รายการ",
  "Show all": "แสดงทั้งหมด",
  View: "ดู",
  Hide: "ซ่อน",
  Remove: "ลบ",
  Cancel: "ยกเลิก",
  Confirm: "ยืนยัน",
  Close: "ปิด",
  "No matching records": "ไม่พบรายการที่ตรงกัน",
  "Try changing your search or selected view.": "ลองเปลี่ยนคำค้นหรือมุมมองที่เลือก",
  "Reset view": "รีเซ็ตมุมมอง",
  "No matching reviews": "ไม่พบรีวิวที่ตรงกัน",
  "Try another filter or search term.": "ลองใช้ตัวกรองหรือคำค้นอื่น",
  Reviewer: "ผู้รีวิว",
  Rating: "คะแนน",
  Review: "รีวิว",
  Reviews: "รีวิว",
  Date: "วันที่",
  Reports: "รายงาน",
  Status: "สถานะ",
  Action: "การดำเนินการ",
  "Filter reviews by rating": "กรองรีวิวตามคะแนน",
  "Review filters": "ตัวกรองรีวิว",
  "About Me": "เกี่ยวกับฉัน",
  Experience: "ประสบการณ์",
  "My Works": "ผลงานของฉัน",
  "Payout history": "ประวัติการจ่ายเงิน",
  Certificates: "ใบรับรอง",
  "Account Information": "ข้อมูลบัญชี",
  "Moderation Summary": "สรุปการดูแล",
  "Recent Reports": "รายงานล่าสุด",
  "Admin Notes": "บันทึกผู้ดูแล",
  "Internal note": "บันทึกภายใน",
  "Account Actions": "การดำเนินการบัญชี",
  "Quest history": "ประวัติงาน",
  Role: "บทบาท",
  Worker: "ผู้ทำงาน",
  Hirer: "ผู้ว่าจ้าง",
  "Quest status": "สถานะงาน",
  Dates: "วันที่",
  "Amount earned": "รายได้",
  "Amount funded": "จำนวนเงินที่สนับสนุน",
  "View full quest": "ดูรายละเอียดงานทั้งหมด",
  "Full quest detail": "รายละเอียดงานทั้งหมด",
  "Open user profile": "เปิดโปรไฟล์ผู้ใช้",
  "See full user profile": "ดูโปรไฟล์ผู้ใช้แบบเต็ม",
  "Back to admin": "กลับไปหน้าผู้ดูแล",
  "View accepted terms": "ดูข้อกำหนดที่ยอมรับ",
  "Compare versions": "เปรียบเทียบเวอร์ชัน",
  "Download all": "ดาวน์โหลดทั้งหมด",
  "Export CSV": "ส่งออก CSV",
  "Revision history": "ประวัติการแก้ไข",
  "Request clarification": "ขอคำชี้แจง",
  "More actions": "การดำเนินการเพิ่มเติม",
  Notifications: "การแจ้งเตือน",
  "Payout summary": "สรุปการจ่ายเงิน",
  "Available to withdraw": "ยอดถอนได้",
  "Payout amount": "จำนวนเงินที่จ่าย",
  "Remaining after payout": "คงเหลือหลังการจ่าย",
  "Previously paid out": "จ่ายไปก่อนหน้า",
  "Earning sources": "แหล่งรายได้",
  "Payout timing": "กำหนดเวลาการจ่าย",
  Requested: "ส่งคำขอแล้ว",
  "Transfer in progress": "กำลังโอนเงิน",
  "Transfer completed": "โอนเงินสำเร็จ",
  "Why your approval is needed": "เหตุผลที่ต้องอนุมัติ",
  "Approve payout": "อนุมัติการจ่ายเงิน",
  "Approval reason": "เหตุผลการอนุมัติ",
  "Reject payout": "ปฏิเสธการจ่ายเงิน",
  Record: "รายการ",
  "Record details": "รายละเอียดรายการ",
  "Search marketplace records": "ค้นหารายการในระบบ",
  "Search quests, users, payouts…": "ค้นหางาน ผู้ใช้ การจ่ายเงิน…",
  "Search quests, users, payouts, or student IDs": "ค้นหางาน ผู้ใช้ การจ่ายเงิน หรือรหัสนักศึกษา",
  "Search by name, quest, student ID, or payout…": "ค้นหาด้วยชื่อ งาน รหัสนักศึกษา หรือการจ่ายเงิน…",
  "Search users": "ค้นหาผู้ใช้",
  "Search quests": "ค้นหางาน",
  "Search payouts": "ค้นหาการจ่ายเงิน",
  "Search disputes": "ค้นหาข้อพิพาท",
  "Search reports": "ค้นหารายงาน",
  "Search reviews": "ค้นหารีวิว",
  "Reporting user": "ผู้รายงาน",
  "Report type": "ประเภทรายงาน",
  "What happened?": "เกิดอะไรขึ้น?",
  "Evidence file (optional)": "ไฟล์หลักฐาน (ไม่บังคับ)",
  "Moderate listings through every marketplace state.": "ดูแลรายการงานในทุกสถานะของตลาด",
  "Review student accounts, reports, and marketplace access.": "ตรวจสอบบัญชีนักศึกษา รายงาน และสิทธิ์การใช้งานตลาด",
  "Approve or investigate money leaving the marketplace.": "อนุมัติหรือตรวจสอบเงินที่ออกจากตลาด",
  "Review evidence and make accountable resolutions.": "ตรวจสอบหลักฐานและตัดสินใจอย่างมีความรับผิดชอบ",
  "Review reports submitted by users about other users.": "ตรวจสอบรายงานที่ผู้ใช้ส่งเกี่ยวกับผู้ใช้อื่น",
  "Click a column to sort": "คลิกหัวคอลัมน์เพื่อเรียงลำดับ",
  "Clear your search to see more results.": "ล้างคำค้นเพื่อดูผลลัพธ์เพิ่มเติม",
  "There are no records in this view.": "ไม่มีรายการในมุมมองนี้",
  "Filter quests records": "กรองรายการงาน",
  "Filter users records": "กรองรายการผู้ใช้",
  "Filter payouts records": "กรองรายการจ่ายเงิน",
  "Filter disputes records": "กรองรายการข้อพิพาท",
  "Filter reports records": "กรองรายการรายงาน",
  Quest: "งาน",
  Title: "ชื่อเรื่อง",
  Hirer: "ผู้ว่าจ้าง",
  Tag: "แท็ก",
  Wage: "ค่าจ้าง",
  "Student ID": "รหัสนักศึกษา",
  User: "ผู้ใช้",
  Email: "อีเมล",
  "Academic profile": "ข้อมูลการศึกษา",
  Payout: "การจ่ายเงิน",
  Recipient: "ผู้รับเงิน",
  Account: "บัญชี",
  Amount: "จำนวนเงิน",
  "Dispute date": "วันที่เกิดข้อพิพาท",
  Category: "หมวดหมู่",
  Report: "รายงาน",
  "Reported user": "ผู้ถูกรายงาน",
  "Reported by": "รายงานโดย",
  Type: "ประเภท",
  Reported: "วันที่รายงาน",
  "University email": "อีเมลมหาวิทยาลัย",
  Password: "รหัสผ่าน",
  "Sign in": "เข้าสู่ระบบ",
  "Sign in to admin": "เข้าสู่ระบบผู้ดูแล",
  "Use your Kasetsart University email to access.": "ใช้อีเมล Kasetsart University เพื่อเข้าถึงระบบ",
  "Only @ku.th accounts can access this console.": "เฉพาะบัญชี @ku.th เท่านั้นที่เข้าถึงระบบนี้ได้",
  Show: "แสดง",
  Yes: "ใช่",
  "Back to list": "กลับไปยังรายการ",
  "Full quest record": "รายการงานฉบับเต็ม",
  "Terminate quest": "ยุติงาน",
  "Funded wage": "ค่าจ้างที่สนับสนุน",
  "Participant mode": "รูปแบบผู้เข้าร่วม",
  "Candidate mode": "รูปแบบผู้สมัคร",
  Single: "เดี่ยว",
  Team: "ทีม",
  FCFS: "มาก่อนได้ก่อน",
  "No submission": "ยังไม่มีการส่งงาน",
  "Quest description": "รายละเอียดงาน",
  "Completion requirements": "ข้อกำหนดการทำงานให้เสร็จ",
  "Submit work before the recorded deadline": "ส่งงานก่อนกำหนดเวลาที่บันทึกไว้",
  "Attach verifiable proof files": "แนบไฟล์หลักฐานที่ตรวจสอบได้",
  "Keep communication and payment inside KuQuest": "สื่อสารและชำระเงินภายใน KuQuest",
  "Keep all payment inside KuQuest": "ชำระเงินทั้งหมดภายใน KuQuest",
  "Files from hirer": "ไฟล์จากผู้ว่าจ้าง",
  "Reference material supplied with the quest.": "เอกสารอ้างอิงที่ผู้ว่าจ้างจัดเตรียมสำหรับงาน",
  Application: "การสมัคร",
  "Proof submissions": "หลักฐานการส่งงาน",
  "No submission yet": "ยังไม่มีการส่งงาน",
  "Edit history": "ประวัติการแก้ไข",
  "Changes to the quest description, wage, schedule, location, or deliverables appear here.": "การเปลี่ยนแปลงรายละเอียดงาน ค่าจ้าง กำหนดการ สถานที่ หรือสิ่งที่ต้องส่งจะแสดงที่นี่",
  "No edits recorded": "ไม่มีการบันทึกการแก้ไข",
  "Overall quest timeline": "ลำดับเหตุการณ์ของงานทั้งหมด",
  "Export log": "ส่งออกบันทึก",
  "Accepted terms": "ข้อกำหนดที่ยอมรับ",
  "Terms version history": "ประวัติเวอร์ชันข้อกำหนด",
  "Money policy revisions": "ประวัติการแก้ไขนโยบายการเงิน",
  "Quest published": "เผยแพร่งานแล้ว",
  "Quest record created": "สร้างรายการงานแล้ว",
  "Schedule and location": "กำหนดการและสถานที่",
  Starts: "เริ่มต้น",
  Due: "กำหนดส่ง",
  "Application window": "ช่วงเวลารับสมัคร",
  Location: "สถานที่",
  "Financial record": "รายการทางการเงิน",
  "Funded by hirer": "สนับสนุนเงินโดยผู้ว่าจ้าง",
  "Platform fee": "ค่าธรรมเนียมแพลตฟอร์ม",
  "Worker receives": "ผู้ทำงานได้รับ",
  "Team receives (total)": "ทีมได้รับ (รวม)",
  "Funds remain held until submitted proof is accepted or a dispute is resolved.": "เงินจะถูกพักไว้จนกว่าจะยอมรับหลักฐานการส่งงานหรือยุติข้อพิพาท",
  "Dispute and risk": "ข้อพิพาทและความเสี่ยง",
  Clear: "ไม่มีปัญหา",
  "No dispute or active moderation hold is connected to this quest.": "ไม่มีข้อพิพาทหรือการพักรายการโดยผู้ดูแลที่เชื่อมโยงกับงานนี้",
  "Review user information, activity, payouts, and penalty history.": "ตรวจสอบข้อมูลผู้ใช้ กิจกรรม การจ่ายเงิน และประวัติบทลงโทษ",
  Activity: "กิจกรรม",
  "Penalty History": "ประวัติบทลงโทษ",
  "Total earned": "รายได้รวม",
  "Recent requests and transfer outcomes for this account.": "คำขอล่าสุดและผลการโอนเงินของบัญชีนี้",
  "View all": "ดูทั้งหมด",
  "Account status": "สถานะบัญชี",
  "Email verified": "ยืนยันอีเมลแล้ว",
  Created: "สร้างเมื่อ",
  "Last active": "ใช้งานล่าสุด",
  Student: "นักศึกษา",
  Faculty: "คณะ",
  "Reports received": "รายงานที่ได้รับ",
  "Active warnings": "คำเตือนที่ใช้งานอยู่",
  Suspensions: "การระงับการใช้งาน",
  "View reports": "ดูรายงาน",
  "No reports have been filed against this account.": "ยังไม่มีรายงานเกี่ยวกับบัญชีนี้",
  "Admin only": "สำหรับผู้ดูแลเท่านั้น",
  "Save note": "บันทึกหมายเหตุ",
  "Apply penalty": "ใช้บทลงโทษ",
  "Report user": "รายงานผู้ใช้",
  "View penalty history": "ดูประวัติบทลงโทษ",
};
const categoryTranslations = {
  Payment: "การชำระเงิน",
  Evidence: "หลักฐาน",
  Completion: "การทำงานให้เสร็จ",
  Quality: "คุณภาพ",
  Scope: "ขอบเขตงาน",
  Delivery: "การส่งงาน",
  Timing: "กำหนดเวลา",
  Rights: "สิทธิ์",
};
const patternTranslations = [
  [/^All \(([\d,]+)\)$/, (match) => `ทั้งหมด (${match[1]})`],
  [/^Showing all ([\d,]+) (?:results|result)$/, (match) => `แสดงทั้งหมด ${match[1]} รายการ`],
  [/^Showing ([\d,]+)–([\d,]+) of ([\d,]+) (?:results|result)$/, (match) => `แสดง ${match[1]}–${match[2]} จาก ${match[3]} รายการ`],
  [/^Showing ([\d,]+)–([\d,]+) of ([\d,]+)$/, (match) => `แสดง ${match[1]}–${match[2]} จาก ${match[3]}`],
  [/^Showing (\d+) latest dispute\/report records$/, (match) => `แสดงข้อพิพาท/รายงานล่าสุด ${match[1]} รายการ`],
  [/^Page (\d+) of (\d+)$/, (match) => `หน้า ${match[1]} จาก ${match[2]}`],
  [/^Show (\d+)$/, (match) => `แสดง ${match[1]} รายการ`],
  [/^(\d+) star$/, (match) => `${match[1]} ดาว`],
  [/^(\d+) reviews?$/, (match) => `${match[1]} รีวิว`],
  [/^(\d+) selected participants · Team quest$/, (match) => `${match[1]} ผู้เข้าร่วมที่เลือก · งานทีม`],
  [/^Resolve (.+) dispute$/, (match) => `ตรวจสอบข้อพิพาท${categoryTranslations[match[1]] || match[1]}`],
  [/^(฿[\d,]+) held$/, (match) => `${match[1]} คงค้าง`],
  [/^(\d+) active report$/, (match) => `${match[1]} รายงานที่กำลังดำเนินการ`],
  [/^Temporary all-quest ban · (\d+) days? left$/, (match) => `ระงับการทำงานทุกงานชั่วคราว · เหลือ ${match[1]} วัน`],
  [/^(\d+) days? left$/, (match) => `เหลือ ${match[1]} วัน`],
  [/^(\d+) days? ago$/, (match) => `${match[1]} วันที่แล้ว`],
  [/^(\d+) weeks? ago$/, (match) => `${match[1]} สัปดาห์ที่แล้ว`],
  [/^(\d+) months? ago$/, (match) => `${match[1]} เดือนที่แล้ว`],
  [/^(\d+) files?$/, (match) => `${match[1]} ไฟล์`],
  [/^(.+) · (Needs approval|Processing|Completed|Rejected)$/, (match) => `${match[1]} · ${translations[match[2]]}`],
  [/^(.+) · (\d+) active report$/, (match) => `${match[1]} · ${match[2]} รายงานที่กำลังดำเนินการ`],
  [/^(.+) · Temporary all-quest ban · (\d+) days? left$/, (match) => `${match[1]} · ระงับการทำงานทุกงานชั่วคราว · เหลือ ${match[2]} วัน`],
  [/^(.+) · Permanent all-quest ban$/, (match) => `${match[1]} · ระงับการทำงานทุกงานถาวร`],
  [/^Total earned (฿[\d,]+) · Recent requests and transfer outcomes for this account\.$/, (match) => `รายได้รวม ${match[1]} · คำขอล่าสุดและผลการโอนเงินของบัญชีนี้`],
  [/^Applications closed · (.+)$/, (match) => `ปิดรับสมัคร · ${match[1]}`],
  [/^Files uploaded by the selected (participant|participants)\.$/, () => "ไฟล์ที่ผู้เข้าร่วมที่เลือกอัปโหลด"],
  [/^The selected (participant|participants) have not uploaded any proof files\.$/, () => "ผู้เข้าร่วมที่เลือกยังไม่ได้อัปโหลดไฟล์หลักฐาน"],
  [/^PDF · (\d+) pages · added by (.+)$/, (match) => `PDF · ${match[1]} หน้า · เพิ่มโดย ${match[2]}`],
  [/^XLSX · (.+) · added with quest$/, (match) => `XLSX · ${match[1]} · เพิ่มพร้อมงาน`],
  [/^(.+) · created by (.+)$/, (match) => `${match[1]} · สร้างโดย ${match[2]}`],
];
const functionalActionLabels = {
  "View accepted terms": "view-accepted-terms",
  "Compare versions": "compare-versions",
  "Download all": "download-all",
  "Export log": "export-log",
  "Export CSV": "export-csv",
  "Revision history": "revision-history",
  "Open user profile": "open-user-profile",
  "View user": "view-user",
  "Request clarification": "request-clarification",
  Notifications: "notifications",
};
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
let activeLanguage = "en";
let translating = false;

function isLanguage(value) {
  return Object.prototype.hasOwnProperty.call(languageDefinitions, value);
}

function storedLanguage() {
  try {
    const value = localStorage.getItem(languageStorageKey);
    return isLanguage(value) ? value : "en";
  } catch {
    return "en";
  }
}

function translatedValue(value) {
  if (activeLanguage === "en") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const direct = translations[trimmed];
  if (direct) return value.replace(trimmed, direct);
  for (const [pattern, translate] of patternTranslations) {
    const match = trimmed.match(pattern);
    if (match) return value.replace(trimmed, translate(match));
  }
  return value;
}

function translateTextNode(node) {
  if (!node.parentElement?.closest("body") || node.parentElement.closest("script, style, template")) return;
  if (!originalText.has(node)) originalText.set(node, node.nodeValue || "");
  const source = originalText.get(node);
  const next = translatedValue(source);
  if (node.nodeValue !== next) node.nodeValue = next;
}

function translateAttribute(element, name) {
  const value = element.getAttribute(name);
  if (value === null) return;
  let values = originalAttributes.get(element);
  if (!values) {
    values = {};
    originalAttributes.set(element, values);
  }
  if (!(name in values)) values[name] = value;
  const next = translatedValue(values[name]);
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}

function markFunctionalActions(root) {
  if (root.nodeType === 1 && root.matches("button")) markFunctionalAction(root);
  root.querySelectorAll("button").forEach(markFunctionalAction);
}

function markFunctionalAction(button) {
  if (button.dataset.functionalAction) return;
  const action = functionalActionLabels[button.textContent.trim()];
  if (action) button.dataset.functionalAction = action;
}

function translateTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) translateTextNode(node);
}

function translateAttributes(root) {
  if (root.nodeType === 1) {
    ["aria-label", "placeholder", "title"].forEach((name) => translateAttribute(root, name));
  }
  root.querySelectorAll("*").forEach((element) => {
    ["aria-label", "placeholder", "title"].forEach((name) => translateAttribute(element, name));
  });
}

function translateAddedNode(node) {
  if (node.nodeType === 3) {
    translateTextNode(node);
    return;
  }
  if (node.nodeType !== 1 && node.nodeType !== 11) return;
  translateTextNodes(node);
  translateAttributes(node);
}

function syncLanguageControls() {
  document.querySelectorAll("[data-language-option]").forEach((option) => {
    option.setAttribute("aria-pressed", String(option.dataset.languageOption === activeLanguage));
  });
}

function translateDocument() {
  if (translating) return;
  translating = true;
  document.documentElement.lang = languageDefinitions[activeLanguage].documentLanguage;
  document.documentElement.dataset.language = activeLanguage;
  markFunctionalActions(document.body);
  syncLanguageControls();
  translateTextNodes(document.body);
  translateAttributes(document.body);
  translating = false;
}

function persistLanguage(language) {
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    // Continue with the in-memory language if storage is unavailable.
  }
}

function applyLanguage(language, shouldPersist = true) {
  activeLanguage = isLanguage(language) ? language : "en";
  if (shouldPersist) persistLanguage(activeLanguage);
  translateDocument();
}

window.__KUQUEST_LANGUAGE__ = {
  current: () => activeLanguage,
  translate: translatedValue,
};

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const option = target?.closest("[data-language-option]");
  if (!option) return;
  applyLanguage(option.dataset.languageOption);
  option.focus();
});

applyLanguage(storedLanguage(), false);
let translationScheduled = false;
const pendingMutations = [];
function scheduleMutationTranslation(records) {
  pendingMutations.push(...records);
  if (translationScheduled) return;
  translationScheduled = true;
  const flush = () => {
    translationScheduled = false;
    const mutations = pendingMutations.splice(0);
    mutations.forEach((record) => {
      if (record.type === "attributes") translateAttribute(record.target, record.attributeName);
      else if (record.type === "characterData") translateTextNode(record.target);
      else {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === 1 || node.nodeType === 11) markFunctionalActions(node);
          if (activeLanguage !== "en") translateAddedNode(node);
        });
      }
    });
    if (activeLanguage === "en") return;
    syncLanguageControls();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
  else setTimeout(flush, 0);
}
const languageObserver = new MutationObserver(scheduleMutationTranslation);
languageObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["aria-label", "placeholder", "title"],
  characterData: true,
  childList: true,
  subtree: true,
});
