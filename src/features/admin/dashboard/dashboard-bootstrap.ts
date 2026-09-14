import {
  ADMIN_DEMO_DATA_KEY,
  readAdminData,
  type BrowserStorage,
} from "../data/legacy-admin-data-adapter";
import type { PersistedAdminData } from "../data/admin-records";
import { isConductReportStatus } from "../domain/rulebook";

const dashboardSeedVersion = "dashboard-bootstrap-v3-canonical-conduct-reports";
const previousDashboardSeedVersion = "dashboard-bootstrap-v2-canonical-statuses";

const dashboardConductReportSeedData = [
  { id: "CND-8301", reportedMemberId: "68000020", reportedUserName: "Amara Ariyawat", reporterId: "68000000", reporterName: "Akarin Ariyawat", reasonCode: "CONDUCT_ABANDONED", questId: "QST-12001", questTitle: "Verify dorm fire exits", questRecord: "Assignment accepted · Proof Submission not provided · dueAt 27 Aug 2026 · 15:00", details: "The Worker did not complete the assigned Quest and did not provide a Proof Submission.", status: "CONDUCT_REPORT_PENDING", conductReportStatus: "CONDUCT_REPORT_PENDING", tone: "warning", reportedAt: "27 Aug 2026 · 15:30", version: 1 },
  { id: "CND-8302", reportedMemberId: "68000040", reportedUserName: "Benja Ariyawat", reporterId: "68000020", reporterName: "Amara Ariyawat", reasonCode: "CONDUCT_OUT_OF_SCOPE", questId: "QST-12002", questTitle: "Design orientation social cards", questRecord: "Assignment completed · Quest reached terminal state", details: "The Hirer requested work outside the Quest Condition.", status: "CONDUCT_REPORT_UPHELD", conductReportStatus: "CONDUCT_REPORT_UPHELD", decision: "confirmed-violation", decisionLabel: "Violation confirmed", decisionReason: "The Quest record confirms the reported conduct violation.", resolution: "Violation confirmed; the Member Misconduct ladder was applied.", resolvedBy: "Admin", resolutionAt: "27 Aug 2026 · 16:47", closedAt: "27 Aug 2026 · 16:30", tone: "danger", reportedAt: "26 Aug 2026 · 10:20", version: 1 },
  { id: "CND-8303", reportedMemberId: "68000000", reportedUserName: "Akarin Ariyawat", reporterId: "68000040", reporterName: "Benja Ariyawat", reasonCode: "CONDUCT_NO_SHOW", questId: "QST-12003", questTitle: "Photograph library study areas", questRecord: "Assignment cancelled before the dueAt", details: "The reported conduct was reviewed against the Quest record.", status: "CONDUCT_REPORT_DISMISSED", conductReportStatus: "CONDUCT_REPORT_DISMISSED", decision: "no-violation", decisionLabel: "No violation", decisionReason: "The Quest record does not confirm a conduct violation.", resolution: "Conduct Report dismissed; no policy violation found.", resolvedBy: "Admin", resolutionAt: "27 Aug 2026 · 11:47", closedAt: "27 Aug 2026 · 11:30", tone: "neutral", reportedAt: "25 Aug 2026 · 09:10", version: 1 },
];

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
      { id: "RPT-8201", reportedMemberId: "68000020", reportedUserName: "Amara Ariyawat", reporterId: "68000000", reporterName: "Akarin Ariyawat", category: "Harassment or abuse", details: "The submitted report requires review.", evidence: "Message capture", evidenceRefs: ["evidence-rpt-8201"], status: "REPORT_CASE_PENDING", reportCaseStatus: "REPORT_CASE_PENDING", tone: "warning", reportedAt: "27 Aug 2026 · 08:40" },
      { id: "RPT-8202", reportedMemberId: "68000040", reportedUserName: "Benja Ariyawat", reporterId: "68000000", reporterName: "Akarin Ariyawat", category: "Fraud or payment issue", details: "The submitted report requires review.", evidence: "Payment message capture", evidenceRefs: ["evidence-rpt-8202"], status: "REPORT_CASE_PENDING", reportCaseStatus: "REPORT_CASE_PENDING", tone: "warning", reportedAt: "27 Aug 2026 · 08:20" },
      ...dashboardConductReportSeedData,
    ],
  },
};

function hasConductReports(data: PersistedAdminData): boolean {
  return data.collections.reports.some((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const candidate = record as Record<string, unknown>;
    return isConductReportStatus(candidate.status) || isConductReportStatus(candidate.conductReportStatus);
  });
}

function migrateConductReportSeed(storage: BrowserStorage, data: PersistedAdminData): PersistedAdminData {
  if (data.version !== previousDashboardSeedVersion || hasConductReports(data)) return data;

  const migrated: PersistedAdminData = {
    ...data,
    version: dashboardSeedVersion,
    collections: {
      ...data.collections,
      reports: [...data.collections.reports, ...dashboardConductReportSeedData],
    },
  };
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(migrated));
  } catch {
    // The migrated data remains useful for the current render.
  }
  return migrated;
}

export function loadDashboardData(storage: BrowserStorage): PersistedAdminData {
  const stored = readAdminData(storage);
  if (stored) return migrateConductReportSeed(storage, stored);

  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(dashboardSeedData));
  } catch {
    // Use the in-memory seed when browser storage is unavailable.
  }
  return dashboardSeedData;
}
