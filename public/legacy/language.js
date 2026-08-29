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
  Administrator: "ผู้ดูแลระบบ",
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
  Unhide: "เลิกซ่อน",
  "Review hidden": "ซ่อนรีวิวแล้ว",
  "Review unhidden": "ยกเลิกการซ่อนรีวิวแล้ว",
  "Remove review": "ลบรีวิว",
  "Confirm remove": "ยืนยันการลบ",
  "Close remove review confirmation": "ปิดการยืนยันการลบรีวิว",
  "This review will be permanently removed from the user's profile.": "รีวิวนี้จะถูกลบออกจากโปรไฟล์ผู้ใช้อย่างถาวร",
  "Review removed": "ลบรีวิวแล้ว",
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
  "Search users…": "ค้นหาผู้ใช้…",
  "Search quests": "ค้นหางาน",
  "Search quests…": "ค้นหางาน…",
  "Search payouts": "ค้นหาการจ่ายเงิน",
  "Search payouts…": "ค้นหาการจ่ายเงิน…",
  "Search disputes": "ค้นหาข้อพิพาท",
  "Search disputes…": "ค้นหาข้อพิพาท…",
  "Search reports": "ค้นหารายงาน",
  "Search reports…": "ค้นหารายงาน…",
  "Search activity…": "ค้นหากิจกรรม…",
  "Search reviews…": "ค้นหารีวิว…",
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
  Case: "คดี",
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
  Evidence: "หลักฐาน",
  Description: "รายละเอียด",
  Participants: "ผู้เข้าร่วม",
  Participant: "ผู้เข้าร่วม",
  Pending: "รอดำเนินการ",
  Reason: "เหตุผล",
  Moderation: "การดูแล",
  "No active moderation action.": "ไม่มีมาตรการดูแลที่กำลังดำเนินการ",
  "Activity summary": "สรุปกิจกรรม",
  "Completed quests": "งานที่เสร็จสิ้น",
  "Cancelled quests": "งานที่ยกเลิก",
  "Disputed quests": "งานที่มีข้อพิพาท",
  "Payout status": "สถานะการจ่ายเงิน",
  "Pending payout": "การจ่ายเงินที่รอดำเนินการ",
  "Financial details remain in the dedicated payout review.": "รายละเอียดทางการเงินอยู่ในการตรวจสอบการจ่ายเงินโดยเฉพาะ",
  "View payouts": "ดูการจ่ายเงิน",
  History: "ประวัติ",
  "Account created": "สร้างบัญชีแล้ว",
  "Account created.": "สร้างบัญชีแล้ว",
  By: "โดย",
  System: "ระบบ",
  "Admin notes": "บันทึกผู้ดูแล",
  "Add note": "เพิ่มบันทึก",
  "Previous payouts": "การจ่ายเงินก่อนหน้า",
  "Close record": "ปิดรายการ",
  "Payout rejected": "ปฏิเสธการจ่ายเงิน",
  "Transfer failed": "การโอนเงินล้มเหลว",
  "The payout has been approved and is moving to the recipient’s bank. No action is needed unless the transfer fails.": "อนุมัติการจ่ายเงินแล้วและกำลังโอนไปยังธนาคารของผู้รับ ไม่ต้องดำเนินการใด ๆ เว้นแต่การโอนจะล้มเหลว",
  "The record will become Completed after the bank confirms the transfer.": "รายการจะเปลี่ยนเป็นเสร็จสิ้นหลังธนาคารยืนยันการโอน",
  "The recipient’s bank transfer completed successfully. This record is retained for audit.": "การโอนเงินไปยังธนาคารของผู้รับเสร็จสมบูรณ์แล้ว รายการนี้เก็บไว้สำหรับการตรวจสอบ",
  "No further admin action is available.": "ไม่มีการดำเนินการเพิ่มเติมสำหรับผู้ดูแล",
  "This payout was rejected before funds were released. Review the recorded reason before creating a new payout request.": "การจ่ายเงินนี้ถูกปฏิเสธก่อนปล่อยเงิน ตรวจสอบเหตุผลที่บันทึกไว้ก่อนสร้างคำขอจ่ายเงินใหม่",
  "No retry is available from this record.": "ไม่สามารถลองใหม่จากรายการนี้ได้",
  "The payment provider could not complete this transfer.": "ผู้ให้บริการชำระเงินไม่สามารถดำเนินการโอนนี้ได้",
  "Review the failure reason before creating a new payout request.": "ตรวจสอบเหตุผลที่ล้มเหลวก่อนสร้างคำขอจ่ายเงินใหม่",
  "No completed quests are connected to this recipient yet.": "ยังไม่มีงานที่เสร็จสิ้นเชื่อมโยงกับผู้รับเงินรายนี้",
  "No previous payouts are connected to this recipient.": "ยังไม่มีการจ่ายเงินก่อนหน้าที่เชื่อมโยงกับผู้รับเงินรายนี้",
  "Completion status": "สถานะการทำงาน",
  "Available balance": "ยอดคงเหลือที่ใช้ได้",
  "Bank / payout destination": "ธนาคาร / ปลายทางการจ่ายเงิน",
  "Approving this payout changes its status to Processing. Funds are not transferred immediately.": "การอนุมัติการจ่ายเงินนี้จะเปลี่ยนสถานะเป็นกำลังดำเนินการ เงินจะไม่ถูกโอนทันที",
  "Choose a reason": "เลือกเหตุผล",
  "Rejection reason": "เหตุผลที่ปฏิเสธ",
  "Transfer failure reason": "เหตุผลที่การโอนล้มเหลว",
  "Admin note:": "บันทึกผู้ดูแล:",
  "Admin note (optional)": "บันทึกผู้ดูแล (ไม่บังคับ)",
  "Insufficient withdrawable balance.": "ยอดถอนได้ไม่เพียงพอ",
  "Bank account name does not match the verified account holder.": "ชื่อบัญชีธนาคารไม่ตรงกับเจ้าของบัญชีที่ยืนยันแล้ว",
  "Recipient account could not be verified.": "ไม่สามารถยืนยันบัญชีผู้รับเงินได้",
  "Duplicate payout request.": "คำขอจ่ายเงินซ้ำ",
  "Hide quest": "ซ่อนงาน",
  "Clear flag": "ล้างธง",
  "Modify ban": "แก้ไขการระงับ",
  "Lift ban": "ยกเลิกการระงับ",
  "No reason recorded.": "ไม่มีการบันทึกเหตุผล",
  "Not recorded": "ไม่ได้บันทึก",
  "Date not recorded": "ไม่ได้บันทึกวันที่",
  "No penalty applied": "ไม่ได้ใช้บทลงโทษ",
  "Penalty applied": "ใช้บทลงโทษแล้ว",
  "No results": "ไม่พบผลลัพธ์",
  "Try a record ID, person, or quest title.": "ลองใช้รหัสรายการ ชื่อบุคคล หรือชื่องาน",
  quests: "งาน",
  disputes: "ข้อพิพาท",
  reports: "รายงาน",
  payouts: "การจ่ายเงิน",
  users: "ผู้ใช้",
  Payment: "การชำระเงิน",
  Completion: "การทำงานให้เสร็จ",
  Quality: "คุณภาพ",
  Scope: "ขอบเขตงาน",
  Delivery: "การส่งงาน",
  Timing: "กำหนดเวลา",
  Rights: "สิทธิ์",
  "Active dispute — funds and quest progression are blocked": "ข้อพิพาทที่กำลังดำเนินการ — การจ่ายเงินและความคืบหน้าของงานถูกระงับ",
  "No payout can settle until this case is resolved.": "ยังไม่สามารถจ่ายเงินได้จนกว่าคดีนี้จะได้รับการแก้ไข",
  "A worker team was selected and accepted the terms": "ทีมผู้ทำงานได้รับเลือกและยอมรับข้อกำหนดแล้ว",
  "Work and completion evidence were submitted": "ส่งงานและหลักฐานการทำงานเสร็จแล้ว",
  "Case assigned to admin review": "มอบหมายคดีให้ผู้ดูแลตรวจสอบแล้ว",
  "KuQuest placed funds on hold": "KuQuest พักเงินไว้",
  "Current state recorded in the audit trail": "บันทึกสถานะปัจจุบันในประวัติการตรวจสอบแล้ว",
  "The quest became available under its published terms": "งานพร้อมให้ดำเนินการตามข้อกำหนดที่เผยแพร่แล้ว",
  "Applicants were recorded for review against the quest requirements": "บันทึกผู้สมัครไว้เพื่อตรวจสอบตามข้อกำหนดของงานแล้ว",
  "The application window closed and no further applications were accepted": "ช่วงเวลารับสมัครปิดแล้วและไม่รับสมัครเพิ่มเติม",
  "Participant selection and acceptance were recorded for this quest": "บันทึกการเลือกผู้เข้าร่วมและการยอมรับงานนี้แล้ว",
  "A proposed change is waiting for participant consent": "การเปลี่ยนแปลงที่เสนออยู่ระหว่างรอความยินยอมจากผู้เข้าร่วม",
  "Applications received": "ได้รับใบสมัครแล้ว",
  "Awaiting participant consent": "รอความยินยอมจากผู้เข้าร่วม",
  "The proposal does not change the agreement until both the hirer and participant consent. KuQuest applies the change automatically after all required consent is recorded.": "ข้อเสนอนี้จะไม่เปลี่ยนข้อตกลงจนกว่าผู้ว่าจ้างและผู้เข้าร่วมจะยินยอม KuQuest จะใช้การเปลี่ยนแปลงโดยอัตโนมัติหลังบันทึกความยินยอมที่จำเป็นครบถ้วน",
  "The hirer proposed updated scope and delivery details for moderator review.": "ผู้ว่าจ้างเสนอการเปลี่ยนแปลงขอบเขตงานและรายละเอียดการส่งงานเพื่อให้ผู้ดูแลตรวจสอบ",
  "No admin approval is required. Intervene only when a participant files a dispute or the proposed terms violate marketplace policy.": "ไม่จำเป็นต้องได้รับอนุมัติจากผู้ดูแล ให้แทรกแซงเฉพาะเมื่อผู้เข้าร่วมยื่นข้อพิพาทหรือข้อกำหนดที่เสนอขัดต่อนโยบายตลาด",
  "Submitted evidence was added to the record for review": "เพิ่มหลักฐานที่ส่งลงในรายการเพื่อการตรวจสอบแล้ว",
  "This event was recorded in the audit trail": "บันทึกเหตุการณ์นี้ในประวัติการตรวจสอบแล้ว",
  Proof: "หลักฐาน",
  "Team quest": "งานทีม",
  "View profile": "ดูโปรไฟล์",
  "Open full dispute": "เปิดรายละเอียดข้อพิพาท",
  "Why this quest is disputed": "เหตุผลที่งานนี้มีข้อพิพาท",
  "Needs case review": "ต้องตรวจสอบคดี",
  "No files from hirer": "ไม่มีไฟล์จากผู้ว่าจ้าง",
  "This quest was published using text details only.": "งานนี้เผยแพร่โดยใช้รายละเอียดแบบข้อความเท่านั้น",
  "Full dispute detail": "รายละเอียดข้อพิพาททั้งหมด",
  "Dispute resolution case": "คดีการระงับข้อพิพาท",
  "Dispute decision recorded": "บันทึกผลการตัดสินข้อพิพาทแล้ว",
  "This case is closed and retained as a read-only audit record.": "คดีนี้ปิดแล้วและเก็บไว้เป็นรายการตรวจสอบแบบอ่านอย่างเดียว",
  "Dispute overview": "ภาพรวมข้อพิพาท",
  "Amount at risk": "จำนวนเงินที่มีความเสี่ยง",
  Respondent: "ผู้ถูกร้อง",
  "Related files": "ไฟล์ที่เกี่ยวข้อง",
  "Verified record": "รายการที่ตรวจสอบแล้ว",
  "Related quest": "งานที่เกี่ยวข้อง",
  "Open full quest": "เปิดรายละเอียดงานทั้งหมด",
  "View conditions, assignment, proof, and edit history": "ดูเงื่อนไข การมอบหมาย หลักฐาน และประวัติการแก้ไข",
  "Resolution decision": "ผลการตัดสิน",
  "Refund hirer": "คืนเงินให้ผู้ว่าจ้าง",
  "Release to worker": "โอนเงินให้ผู้ทำงาน",
  "Choose the outcome before resolving.": "เลือกผลลัพธ์ก่อนดำเนินการแก้ไข",
  "Require rework": "ให้แก้ไขงาน",
  "Keep funds held": "คงการพักเงินไว้",
  "Confirm dispute resolution": "ยืนยันการแก้ไขข้อพิพาท",
  "Select a resolution before closing this dispute.": "เลือกผลการตัดสินก่อนปิดข้อพิพาทนี้",
  "Private case messages": "ข้อความส่วนตัวของคดี",
  "Messages are separate for each party and become part of the case audit trail.": "ข้อความจะแยกตามแต่ละฝ่ายและเป็นส่วนหนึ่งของประวัติการตรวจสอบคดี",
  "Chat with hirer": "แชทกับผู้ว่าจ้าง",
  "Chat with worker": "แชทกับผู้ทำงาน",
  "Close chat": "ปิดแชท",
  "Attach file": "แนบไฟล์",
  "No file attached": "ไม่ได้แนบไฟล์",
  "Send message": "ส่งข้อความ",
  "Admin review": "การตรวจสอบโดยผู้ดูแล",
  "I have attached the records supporting my claim.": "ฉันได้แนบรายการที่สนับสนุนคำร้องของฉันแล้ว",
  "I have added my response and supporting files.": "ฉันได้เพิ่มคำตอบและไฟล์สนับสนุนแล้ว",
  "Please keep all further evidence in this case.": "โปรดเก็บหลักฐานเพิ่มเติมทั้งหมดไว้ในคดีนี้",
  "I submitted this report and attached the evidence for review.": "ฉันส่งรายงานนี้และแนบหลักฐานเพื่อการตรวจสอบแล้ว",
  "I would like to provide context about this report and its evidence.": "ฉันต้องการให้ข้อมูลเพิ่มเติมเกี่ยวกับรายงานนี้และหลักฐาน",
  "Please keep any further context in this report.": "โปรดเก็บข้อมูลเพิ่มเติมทั้งหมดไว้ในรายงานนี้",
  "Record a report submitted by one KuQuest user about another. This report does not apply a penalty automatically.": "บันทึกรายงานที่ผู้ใช้ KuQuest คนหนึ่งส่งเกี่ยวกับผู้ใช้อีกคน รายงานนี้จะไม่ลงโทษโดยอัตโนมัติ",
  "Describe what happened and what evidence supports the report…": "อธิบายสิ่งที่เกิดขึ้นและหลักฐานที่สนับสนุนรายงาน…",
  "Submit report": "ส่งรายงาน",
  "Open report — review is required": "รายงานที่เปิดอยู่ — ต้องตรวจสอบ",
  "Report overview": "ภาพรวมรายงาน",
  Reporter: "ผู้รายงาน",
  "Opened by": "เปิดโดย",
  "Submitted by": "ส่งโดย",
  "Resolve dispute": "แก้ไขข้อพิพาท",
  "Resolution": "ผลการดำเนินการ",
  Penalty: "บทลงโทษ",
  "Pending moderator resolution": "รอการตัดสินใจจากผู้ดูแล",
  "Back to user": "กลับไปยังผู้ใช้",
  "Open full report": "เปิดรายละเอียดรายงานทั้งหมด",
  "Full report detail": "รายละเอียดรายงานทั้งหมด",
  "Review report": "ตรวจสอบรายงาน",
  "Report details": "รายละเอียดรายงาน",
  "User report": "รายงานผู้ใช้",
  "No evidence or attachment was provided.": "ไม่มีหลักฐานหรือไฟล์แนบ",
  "Review the submitted evidence and request any missing record before resolving funds.": "ตรวจสอบหลักฐานที่ส่งมาและขอรายการที่ขาดหายก่อนดำเนินการเรื่องเงิน",
  "No written reason was recorded for this legacy demo case.": "ไม่มีการบันทึกเหตุผลเป็นลายลักษณ์อักษรสำหรับกรณีตัวอย่างนี้",
  "The final allocation was recorded and the case is now read-only.": "บันทึกการจัดสรรเงินขั้นสุดท้ายแล้ว และคดีนี้เป็นแบบอ่านอย่างเดียว",
  "Additional enforcement": "มาตรการเพิ่มเติม",
  "Reason for decision": "เหตุผลของการตัดสินใจ",
  "Message saved": "บันทึกข้อความแล้ว",
  "Report against": "รายงานเกี่ยวกับ",
  "Back to reports": "กลับไปยังรายงาน",
  "Close report": "ปิดรายงาน",
  "Closed report — record retained": "รายงานปิดแล้ว — เก็บรายการไว้",
  "Active report — review is required": "รายงานที่กำลังดำเนินการ — ต้องตรวจสอบ",
  "This report is closed and retained as a read-only audit record.": "รายงานนี้ปิดแล้วและเก็บไว้เป็นรายการตรวจสอบแบบอ่านอย่างเดียว",
  "Review the submitted details and evidence before closing this report.": "ตรวจสอบรายละเอียดและหลักฐานที่ส่งมาก่อนปิดรายงานนี้",
  Submitted: "ส่งแล้ว",
  "1 record": "1 รายการ",
  "None attached": "ไม่มีไฟล์แนบ",
  "Report detail": "รายละเอียดรายงาน",
  "People involved": "บุคคลที่เกี่ยวข้อง",
  "Private report messages": "ข้อความส่วนตัวของรายงาน",
  "Open a separate conversation with either side to review their messages and follow up.": "เปิดการสนทนาแยกกับแต่ละฝ่ายเพื่อตรวจสอบข้อความและติดตามผล",
  "Chat with reporter": "แชทกับผู้รายงาน",
  "Chat with reported user": "แชทกับผู้ถูกรายงาน",
  "No evidence file attached.": "ไม่มีไฟล์หลักฐานแนบ",
  "No attachment provided": "ไม่มีไฟล์แนบ",
  "Report timeline": "ลำดับเหตุการณ์ของรายงาน",
  "Report submitted": "ส่งรายงานแล้ว",
  "Awaiting admin decision": "รอการตัดสินใจจากผู้ดูแล",
  "Reported account": "บัญชีที่ถูกรายงาน",
  Name: "ชื่อ",
  "See full user profile": "ดูโปรไฟล์ผู้ใช้แบบเต็ม",
  "Recorded outcome": "ผลลัพธ์ที่บันทึกไว้",
  "Report decision": "การตัดสินใจเกี่ยวกับรายงาน",
  "Select the account action before closing this report. Every decision requires a written reason.": "เลือกการดำเนินการกับบัญชีก่อนปิดรายงานนี้ ทุกการตัดสินใจต้องมีเหตุผลเป็นลายลักษณ์อักษร",
  "Do nothing": "ไม่ดำเนินการใด ๆ",
  "Close the report without changing the reported user’s account.": "ปิดรายงานโดยไม่เปลี่ยนแปลงบัญชีของผู้ถูกรายงาน",
  "Flag only": "ติดธงเท่านั้น",
  "Record a policy flag; the account remains active.": "บันทึกการละเมิดนโยบาย บัญชียังคงใช้งานได้",
  "Temporary ban · 7 days": "ระงับชั่วคราว · 7 วัน",
  "Restrict the reported user from all quests for 7 days.": "จำกัดไม่ให้ผู้ถูกรายงานทำงานใด ๆ เป็นเวลา 7 วัน",
  "Permanent ban": "ระงับถาวร",
  "Block the reported user from all quests until reversed.": "บล็อกไม่ให้ผู้ถูกรายงานทำงานใด ๆ จนกว่าจะมีการยกเลิก",
  "General report": "รายงานทั่วไป",
  "Harassment or abuse": "การคุกคามหรือการละเมิด",
  "Fraud or payment issue": "การฉ้อโกงหรือปัญหาการชำระเงิน",
  "Misleading quest activity": "กิจกรรมงานที่ทำให้เข้าใจผิด",
  Other: "อื่น ๆ",
  "Report not found": "ไม่พบรายงาน",
  "Return to reports": "กลับไปยังรายงาน",
  "Report closed by admin": "ผู้ดูแลปิดรายงานแล้ว",
  "Record retained for audit": "เก็บรายการไว้สำหรับการตรวจสอบ",
  "Confirm action": "ยืนยันการดำเนินการ",
  "Reason for this decision": "เหตุผลสำหรับการตัดสินใจนี้",
  "Required for the permanent audit trail": "จำเป็นสำหรับประวัติการตรวจสอบถาวร",
  "Enter at least 8 characters before confirming.": "กรอกอย่างน้อย 8 ตัวอักษรก่อนยืนยัน",
  "Current accepted terms remain active": "ข้อกำหนดที่ยอมรับในปัจจุบันยังคงมีผล",
  "This proposal does not change the participant’s agreement until both parties consent.": "ข้อเสนอนี้จะไม่เปลี่ยนข้อตกลงของผู้เข้าร่วมจนกว่าทั้งสองฝ่ายจะยินยอม",
  "Pending hirer changes": "การเปลี่ยนแปลงจากผู้ว่าจ้างที่รอดำเนินการ",
  "Requested by": "ร้องขอโดย",
  Field: "ฟิลด์",
  "Accepted value": "ค่าที่ยอมรับ",
  "Proposed value": "ค่าที่เสนอ",
  "Participant consent": "ความยินยอมของผู้เข้าร่วม",
  "Admin oversight only": "สำหรับการกำกับดูแลโดยผู้ดูแลเท่านั้น",
  "Do not approve or reject this edit. Intervene only if a participant files a dispute or the proposed terms violate marketplace policy.": "อย่าอนุมัติหรือปฏิเสธการแก้ไขนี้ ให้แทรกแซงเฉพาะเมื่อผู้เข้าร่วมยื่นข้อพิพาทหรือข้อกำหนดที่เสนอขัดต่อนโยบายตลาด",
  "Shows proposed and accepted changes to the quest details.": "แสดงการเปลี่ยนแปลงรายละเอียดงานที่เสนอและยอมรับ",
  "Selected participant": "ผู้เข้าร่วมที่เลือก",
  "Selected participants": "ผู้เข้าร่วมที่เลือก",
  "Platform fee on completion": "ค่าธรรมเนียมแพลตฟอร์มเมื่อเสร็จสิ้น",
  "No participant has been selected, so no proof submission exists.": "ยังไม่ได้เลือกผู้เข้าร่วม จึงไม่มีหลักฐานการส่งงาน",
  "The selected participant has not uploaded any proof files.": "ผู้เข้าร่วมที่เลือกยังไม่ได้อัปโหลดไฟล์หลักฐาน",
  "This quest is marked as disputed, but no active dispute record is linked. Review the record relationship before taking action.": "งานนี้ถูกระบุว่ามีข้อพิพาท แต่ไม่มีรายการข้อพิพาทที่กำลังดำเนินการเชื่อมโยงอยู่ โปรดตรวจสอบความสัมพันธ์ของรายการก่อนดำเนินการ",
  "Not published": "ยังไม่เผยแพร่",
  "Add admin note": "เพิ่มบันทึกผู้ดูแล",
  "This note is visible only to authorized moderation staff.": "บันทึกนี้แสดงเฉพาะเจ้าหน้าที่ดูแลที่ได้รับอนุญาตเท่านั้น",
  "Record useful moderation context…": "บันทึกบริบทที่เป็นประโยชน์ต่อการดูแล…",
  "Review the account action, record why it is necessary, then confirm. A flag does not restrict account access.": "ตรวจสอบการดำเนินการกับบัญชี บันทึกเหตุผลที่จำเป็น แล้วจึงยืนยัน การติดธงจะไม่จำกัดการเข้าถึงบัญชี",
  "Enforcement action": "การบังคับใช้มาตรการ",
  "Records the violation; account access stays unchanged.": "บันทึกการละเมิด บัญชียังคงเข้าถึงได้ตามเดิม",
  "Stops this user from all quests for 7 days.": "ระงับผู้ใช้นี้จากงานทั้งหมดเป็นเวลา 7 วัน",
  "Stops this user from all quests until an admin reverses it.": "ระงับผู้ใช้นี้จากงานทั้งหมดจนกว่าผู้ดูแลจะยกเลิก",
  "Reason for this penalty": "เหตุผลสำหรับบทลงโทษนี้",
  "Internal admin note (optional)": "บันทึกภายในของผู้ดูแล (ไม่บังคับ)",
  "Reason required before applying": "ต้องระบุเหตุผลก่อนใช้งาน",
  "State the evidence and policy behind this penalty…": "ระบุหลักฐานและนโยบายที่รองรับบทลงโทษนี้…",
  "Add context for authorized moderators…": "เพิ่มบริบทสำหรับผู้ดูแลที่ได้รับอนุญาต…",
  "Enter at least 8 characters explaining this penalty.": "กรอกอย่างน้อย 8 ตัวอักษรเพื่ออธิบายบทลงโทษนี้",
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
  [/^Team quest · (.+) · created by (.+)$/, (match) => `งานทีม · ${match[1]} · สร้างโดย ${match[2]}`],
  [/^(.+) · filed (.+)$/, (match) => `${translations[match[1]] || categoryTranslations[match[1]] || match[1]} · ยื่นเมื่อ ${match[2]}`],
  [/^(.+) · submitted (.+)$/, (match) => `${translations[match[1]] || categoryTranslations[match[1]] || match[1]} · ส่งแล้ว ${match[2]}`],
  [/^Report against (.+)$/, (match) => `รายงานเกี่ยวกับ ${match[1]}`],
  [/^(.+) · disputed (.+)$/, (match) => `${match[1]} · เกิดข้อพิพาทเมื่อ ${match[2]}`],
  [/^Chat with (.+)$/, (match) => `แชทกับ ${({ hirer: "ผู้ว่าจ้าง", worker: "ผู้ทำงาน", reporter: "ผู้รายงาน", "reported user": "ผู้ถูกรายงาน" })[match[1].toLowerCase()] || match[1]}`],
  [/^Message (hirer|worker|reporter|reported user)…$/i, (match) => `ส่งข้อความถึง${({ hirer: "ผู้ว่าจ้าง", worker: "ผู้ทำงาน", reporter: "ผู้รายงาน", "reported user": "ผู้ถูกรายงาน" })[match[1].toLowerCase()]}…`],
  [/^Message (hirer|worker|reporter|reported user)$/i, (match) => `ส่งข้อความถึง${({ hirer: "ผู้ว่าจ้าง", worker: "ผู้ทำงาน", reporter: "ผู้รายงาน", "reported user": "ผู้ถูกรายงาน" })[match[1].toLowerCase()]}`],
  [/^Message (.+)…$/, (match) => `ส่งข้อความถึง ${match[1]}…`],
  [/^Message (.+)$/, (match) => `ส่งข้อความถึง ${match[1]}`],
  [/^(Hirer|Worker|Reporter|Reported user) · (.+)$/, (match) => `${translations[match[1]] || match[1]} · ${match[2]}`],
  [/^(.+) · (Hirer|Worker|Reporter|Reported user) · (.+)$/, (match) => `${match[1]} · ${translations[match[2]] || match[2]} · ${match[3]}`],
  [/^(.+) · (Hirer|Worker|Reporter|Reported user)$/, (match) => `${match[1]} · ${translations[match[2]] || ({ Reporter: "ผู้รายงาน", "Reported user": "ผู้ถูกรายงาน" })[match[2]] || match[2]}`],
  [/^(Hirer|Worker) wins · (.+)$/, (match) => `${match[1] === "Hirer" ? "ผู้ว่าจ้างชนะ" : "ผู้ทำงานชนะ"} · ${match[2]}`],
  [/^(.+) published this quest$/, (match) => `${match[1]} เผยแพร่งานนี้แล้ว`],
  [/^(.+) opened the dispute$/, (match) => `${match[1]} เปิดข้อพิพาทแล้ว`],
  [/^KuQuest placed ฿([\d,]+) on hold$/, (match) => `KuQuest พักเงิน ฿${match[1]} ไว้`],
  [/^(.+) has not changed the quest details since publication\.$/, (match) => `${match[1]} ยังไม่ได้เปลี่ยนแปลงรายละเอียดงานนับตั้งแต่เผยแพร่`],
  [/^(.+) · requested (.+)$/, (match) => `${match[1]} · ร้องขอเมื่อ ${match[2]}`],
  [/^(.+) · additional checkpoints$/, (match) => `${match[1]} · จุดตรวจเพิ่มเติม`],
  [/^(.+) · revised terms$/, (match) => `${match[1]} · ข้อกำหนดที่แก้ไข`],
  [/^Reports · (\d+)$/, (match) => `รายงาน · ${match[1]}`],
  [/^Open (\d+) · Closed (\d+)$/, (match) => `เปิด ${match[1]} · ปิด ${match[2]}`],
  [/^Earning sources · (\d+)$/, (match) => `แหล่งรายได้ · ${match[1]}`],
  [/^((?:Individual|Team) quest) · Completion status: (.+)$/, (match) => `${match[1] === "Individual quest" ? "งานเดี่ยว" : "งานทีม"} · สถานะการทำงาน: ${translations[match[2]] || match[2]}`],
  [/^By (.+)$/, (match) => `โดย ${match[1]}`],
  [/^Reported by (.+) · (.+)$/, (match) => `รายงานโดย ${match[1]} · ${match[2]}`],
  [/^Reason: (.+)$/, (match) => `เหตุผล: ${match[1]}`],
  [/^Role: (Hirer|Worker)$/, (match) => `บทบาท: ${translations[match[1]]}`],
  [/^Today · (.+)$/, (match) => `วันนี้ · ${match[1]}`],
  [/^Attached by (.+)$/, (match) => `แนบโดย ${match[1]}`],
  [/^(\d+) record$/, (match) => `${match[1]} รายการ`],
  [/^(\d+) payout records? · (\d+) completed\.$/, (match) => `${match[1]} รายการจ่ายเงิน · เสร็จสิ้น ${match[2]} รายการ`],
  [/^(.+) · (Individual|Team) quest$/, (match) => `${match[1]} · ${match[2] === "Individual" ? "งานเดี่ยว" : "งานทีม"}`],
  [/^Temporary ban for (\d+) days?$/, (match) => `ระงับชั่วคราว ${match[1]} วัน`],
  [/^(.+) · (\d+) days?$/, (match) => `${match[1]} · ${match[2]} วัน`],
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
  [/^PDF · (\d+) pages$/, (match) => `PDF · ${match[1]} หน้า`],
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
