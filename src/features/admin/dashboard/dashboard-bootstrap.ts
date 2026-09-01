import {
  ADMIN_DEMO_DATA_KEY,
  readAdminData,
  type BrowserStorage,
} from "../data/legacy-admin-data-adapter";
import type { PersistedAdminData } from "../data/admin-records";

const dashboardSeedVersion = "dashboard-bootstrap-v2-canonical-statuses";

const dashboardSeedData: PersistedAdminData = {
  version: dashboardSeedVersion,
  collections: {
    users: [
      { id: "68000000", title: "Akarin Ariyawat", status: "FROZEN", walletStatus: "FROZEN", tone: "danger", age: "Temporary all-quest ban · 6 days left" },
      { id: "68000020", title: "Amara Ariyawat", status: "ACTIVE", walletStatus: "ACTIVE", tone: "warning", age: "1 active report" },
      { id: "68000040", title: "Benja Ariyawat", status: "FROZEN", walletStatus: "FROZEN", tone: "danger", age: "Permanent all-quest ban" },
    ],
    quests: [
      { id: "QST-12001", title: "Verify dorm fire exits", status: "QUEST_FAILED", questState: "QUEST_FAILED", tone: "danger", amount: 2483 },
      { id: "QST-12002", title: "Document campus water stations", status: "QUEST_IN_PROGRESS", questState: "QUEST_IN_PROGRESS", tone: "warning", amount: 1711 },
      { id: "QST-12003", title: "Review campus event accessibility", status: "QUEST_COMPLETED", questState: "QUEST_COMPLETED", tone: "success", amount: 3200 },
      { id: "QST-12004", title: "Catalogue student club handbooks", status: "QUEST_DRAFT", questState: "QUEST_DRAFT", tone: "neutral", amount: 1800 },
      { id: "QST-12005", title: "Map bicycle parking capacity", status: "QUEST_OPEN", questState: "QUEST_OPEN", tone: "success", amount: 1200 },
      { id: "QST-12006", title: "Transcribe oral history interviews", status: "QUEST_ASSIGNED", questState: "QUEST_ASSIGNED", tone: "assigned", amount: 2100 },
      { id: "QST-12007", title: "Test library room booking flow", status: "QUEST_IN_PROGRESS", questState: "QUEST_IN_PROGRESS", tone: "info", amount: 1900 },
      { id: "QST-12008", title: "Design orientation social cards", status: "QUEST_ASSIGNED", questState: "QUEST_ASSIGNED", editRequestStatus: "EDIT_REQUEST_PENDING", tone: "warning", amount: 2700 },
      { id: "QST-12009", title: "Prepare faculty event calendar", status: "QUEST_COMPLETED", questState: "QUEST_COMPLETED", tone: "success", amount: 1400 },
      { id: "QST-12010", title: "Create a campus map legend", status: "QUEST_CANCELLED", questState: "QUEST_CANCELLED", tone: "cancelled", amount: 900 },
    ],
    payouts: [
      { id: "PAY-9637", title: "Darin Intharawong", amount: 283, status: "PENDING_ADMIN_APPROVAL", payoutStatus: "PENDING_ADMIN_APPROVAL", tone: "warning" },
      { id: "PAY-9631", title: "Fah Lertwiroj", amount: 1711, status: "PENDING_ADMIN_APPROVAL", payoutStatus: "PENDING_ADMIN_APPROVAL", tone: "warning" },
      { id: "PAY-9628", title: "Gunn Maneewan", amount: 850, status: "PENDING_ADMIN_APPROVAL", payoutStatus: "PENDING_ADMIN_APPROVAL", tone: "warning" },
    ],
    disputes: [
      { id: "DSP-5201", title: "Verify dorm fire exits", disputeType: "Evidence", amount: 2483, status: "DISPUTE_CASE_PENDING", disputeCaseStatus: "DISPUTE_CASE_PENDING", tone: "danger", disputeDate: "27 Aug 2026 · 15:30" },
      { id: "DSP-5202", title: "Design orientation social cards", disputeType: "Quality", amount: 7871, status: "DISPUTE_CASE_PENDING", disputeCaseStatus: "DISPUTE_CASE_PENDING", tone: "danger", disputeDate: "27 Aug 2026 · 09:00" },
    ],
    reports: [
      { id: "RPT-8201", reportedUserName: "Amara Ariyawat", status: "REPORT_CASE_PENDING", reportCaseStatus: "REPORT_CASE_PENDING", tone: "warning", reportedAt: "27 Aug 2026 · 08:40" },
      { id: "RPT-8202", reportedUserName: "Benja Ariyawat", status: "REPORT_CASE_PENDING", reportCaseStatus: "REPORT_CASE_PENDING", tone: "warning", reportedAt: "27 Aug 2026 · 08:20" },
    ],
  },
};

export function loadDashboardData(storage: BrowserStorage): PersistedAdminData {
  const stored = readAdminData(storage);
  if (stored) return stored;

  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(dashboardSeedData));
  } catch {
    // Use the in-memory seed when browser storage is unavailable.
  }
  return dashboardSeedData;
}
