import type { PersistedAdminData } from "../data/admin-records";
import {
  MOCK_DEMO_RECORD_COUNT,
  mockDemoMemberRecord,
  mockDemoMemberSeeds,
} from "../data/mock-demo-fixtures";
import { mockDemoPayoutStatusFor } from "../payout/payout-mock-data";

export const dashboardSeedVersion = "dashboard-bootstrap-v4-expanded-mock-fixtures";
export const previousDashboardSeedVersion = "dashboard-bootstrap-v2-canonical-statuses";
export const previousCanonicalDashboardSeedVersion = "dashboard-bootstrap-v3-canonical-conduct-reports";

export const dashboardConductReportSeedData = [
  { id: "CND-8301", reportedMemberId: "68000020", reportedUserName: "Amara Ariyawat", reporterId: "68000000", reporterName: "Akarin Ariyawat", reasonCode: "CONDUCT_ABANDONED", questId: "QST-12001", questTitle: "Verify dorm fire exits", questState: "QUEST_FAILED", failedAt: "2026-08-27T08:30:00.000Z", questRecord: "Assignment accepted · Proof Submission not provided · dueAt 27 Aug 2026 15:00", details: "The Worker did not complete the assigned Quest and did not provide a Proof Submission.", reportedMemberStatus: "ACTIVE", previousReportCount: 0, confirmedViolationCount: 0, previousModerationActions: [], adminNotes: [], status: "CONDUCT_REPORT_PENDING", conductReportStatus: "CONDUCT_REPORT_PENDING", tone: "warning", reportedAt: "27 Aug 2026 15:30", version: 1 },
  { id: "CND-8302", reportedMemberId: "68000040", reportedUserName: "Benja Ariyawat", reporterId: "68000020", reporterName: "Amara Ariyawat", reasonCode: "CONDUCT_OUT_OF_SCOPE", questId: "QST-12002", questTitle: "Design orientation social cards", questState: "QUEST_IN_PROGRESS", questRecord: "Assignment completed · Quest reached terminal state", details: "The Hirer requested work outside the Quest Condition.", reportedMemberStatus: "FROZEN", previousReportCount: 0, confirmedViolationCount: 0, previousModerationActions: [], adminNotes: [], status: "CONDUCT_REPORT_UPHELD", conductReportStatus: "CONDUCT_REPORT_UPHELD", decision: "confirmed-violation", decisionLabel: "Violation confirmed", decisionReason: "The Quest record confirms the reported conduct violation.", resolution: "Violation confirmed; the Member Misconduct ladder was applied.", resolvedBy: "Admin", resolutionAt: "27 Aug 2026 16:47", closedAt: "27 Aug 2026 16:30", tone: "danger", reportedAt: "26 Aug 2026 10:20", version: 1 },
  { id: "CND-8303", reportedMemberId: "68000000", reportedUserName: "Akarin Ariyawat", reporterId: "68000040", reporterName: "Benja Ariyawat", reasonCode: "CONDUCT_NO_SHOW", questId: "QST-12003", questTitle: "Photograph library study areas", questState: "QUEST_COMPLETED", questRecord: "Assignment cancelled before the dueAt", details: "The reported conduct was reviewed against the Quest record.", reportedMemberStatus: "FROZEN", previousReportCount: 0, confirmedViolationCount: 0, previousModerationActions: [], adminNotes: [], status: "CONDUCT_REPORT_DISMISSED", conductReportStatus: "CONDUCT_REPORT_DISMISSED", decision: "no-violation", decisionLabel: "No violation", decisionReason: "The Quest record does not confirm a conduct violation.", resolution: "Conduct Report dismissed; no policy violation found.", resolvedBy: "Admin", resolutionAt: "27 Aug 2026 11:47", closedAt: "27 Aug 2026 11:30", tone: "neutral", reportedAt: "25 Aug 2026 09:10", version: 1 },
];

export const dashboardDisputeSeedData = [
  { id: "DSP-5201", displayId: "DSP-5201", questId: "QST-12001", questState: "QUEST_FAILED", title: "Verify dorm fire exits", disputeType: "Evidence", amount: 2483, amountAtRiskSatang: 248300, filerUserId: "68000000", filerRole: "Hirer", filerName: "Akarin Ariyawat", respondentUserId: "68000020", respondentRole: "Worker", respondentName: "Amara Ariyawat", filerStatement: "The submitted Proof Submission did not satisfy the Quest Condition.", respondentStatement: "The Proof Submission records the work completed before the Quest failed.", failedAt: "2026-08-27T08:30:00.000Z", reportedMemberStatus: "ACTIVE", previousReportCount: 0, confirmedViolationCount: 0, previousModerationActions: [], adminNotes: [], status: "DISPUTE_CASE_PENDING", disputeCaseStatus: "DISPUTE_CASE_PENDING", tone: "danger", disputeDate: "27 Aug 2026 15:30", evidenceRefs: ["evidence-dsp-5201"], version: 1 },
  { id: "DSP-5202", displayId: "DSP-5202", questId: "QST-12008", questState: "QUEST_FAILED", title: "Design orientation social cards", disputeType: "Quality", amount: 7871, amountAtRiskSatang: 787100, filerUserId: "68000020", filerRole: "Hirer", filerName: "Amara Ariyawat", respondentUserId: "68000040", respondentRole: "Worker", respondentName: "Benja Ariyawat", filerStatement: "The delivered social cards did not match the Quest Condition.", respondentStatement: "The requested changes were outside the agreed Quest Condition.", failedAt: "2026-08-27T02:00:00.000Z", reportedMemberStatus: "FROZEN", previousReportCount: 0, confirmedViolationCount: 0, previousModerationActions: [], adminNotes: [], status: "DISPUTE_CASE_PENDING", disputeCaseStatus: "DISPUTE_CASE_PENDING", tone: "danger", disputeDate: "27 Aug 2026 09:00", evidenceRefs: ["evidence-dsp-5202"], version: 1 },
];

const dashboardDemoMemberSeedData = mockDemoMemberSeeds.map((seed) => mockDemoMemberRecord(seed));

function demoIsoDate(daysAgo: number, hour = 9): string {
  return new Date(Date.UTC(2026, 8, 17 - daysAgo, hour, 0, 0)).toISOString();
}

const demoQuestStates = [
  "QUEST_OPEN",
  "QUEST_IN_PROGRESS",
  "QUEST_COMPLETED",
  "QUEST_DRAFT",
  "QUEST_CANCELLED",
] as const;

const dashboardDemoQuestSeedData = Array.from({ length: MOCK_DEMO_RECORD_COUNT }, (_, index) => {
  const seed = mockDemoMemberSeeds[index];
  const state = demoQuestStates[index % demoQuestStates.length];
  return {
    id: `QST-${12011 + index}`,
    title: `Demo Quest ${String(index + 1).padStart(2, "0")}`,
    status: state,
    questState: state,
    tone: state === "QUEST_COMPLETED" ? "success" : state === "QUEST_CANCELLED" ? "cancelled" : "info",
    amount: index % 7 === 0 ? null : 900 + index * 125,
    memberId: seed?.id,
    person: seed?.title,
    createdAt: demoIsoDate(index + 1),
    dueAt: index % 6 === 0 ? null : demoIsoDate(Math.max(0, index - 1), 15),
  };
});

const demoPayoutStatuses = [
  "SUBMITTED_TO_PROVIDER",
  "PROVIDER_PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

const dashboardDemoPayoutSeedData = Array.from({ length: MOCK_DEMO_RECORD_COUNT }, (_, index) => {
  const seed = mockDemoMemberSeeds[index];
  // The standalone Payout board has four canonical records plus 196 demo
  // records. Keep the Overview queue count aligned with that board while
  // retaining the existing 200 demo records here for broad dashboard data.
  const status = index < MOCK_DEMO_RECORD_COUNT - 4
    ? mockDemoPayoutStatusFor(index)
    : demoPayoutStatuses[(index - (MOCK_DEMO_RECORD_COUNT - 4)) % demoPayoutStatuses.length];
  return {
    id: `PAY-${9700 + index}`,
    title: seed?.title ?? `Demo Member ${String(index + 1).padStart(2, "0")}`,
    amount: 450 + index * 75,
    status,
    payoutStatus: status,
    tone: status === "SUCCEEDED" ? "success" : status === "CANCELLED" || status === "FAILED" ? "danger" : "info",
    createdAt: demoIsoDate(index + 2),
  };
});

const demoReportStatuses: readonly (
  | "REPORT_CASE_PENDING"
  | "REPORT_CASE_DISMISSED"
  | "REPORT_CASE_HIDDEN"
  | "REPORT_CASE_RESTORED"
)[] = [
  "REPORT_CASE_DISMISSED",
  "REPORT_CASE_HIDDEN",
  "REPORT_CASE_RESTORED",
] as const;

const dashboardDemoReportSeedData = Array.from({ length: MOCK_DEMO_RECORD_COUNT }, (_, index) => {
  const reported = mockDemoMemberSeeds[index];
  const reporter = mockDemoMemberSeeds[(index + 1) % mockDemoMemberSeeds.length];
  const status = demoReportStatuses[index % demoReportStatuses.length];
  const hasQuest = index % 7 !== 0;
  const hasEvidence = index % 5 !== 0;
  return {
    id: `RPT-${8210 + index}`,
    reportedMemberId: reported?.id,
    reportedUserName: reported?.title,
    reporterId: reporter?.id,
    reporterName: reporter?.title,
    category: ["Harassment or abuse", "Spam", "Fraud or payment issue", "Unsafe content"][index % 4],
    details: index % 4 === 0 ? "Demo Report Case with a short description." : "Demo Report Case requires Admin review of the supplied evidence.",
    ...(hasEvidence ? { evidence: "Demo message capture", evidenceRefs: [`evidence-rpt-${8210 + index}`] } : { evidenceRefs: [] }),
    ...(hasQuest ? { questId: `QST-${12011 + (index % MOCK_DEMO_RECORD_COUNT)}`, questTitle: `Demo Quest ${String((index % MOCK_DEMO_RECORD_COUNT) + 1).padStart(3, "0")}` } : {}),
    reportedMemberStatus: reported?.memberStatus,
    previousReportCount: index % 4,
    confirmedViolationCount: reported?.memberStatus === "Normal" ? 0 : index % 3,
    previousModerationActions: index % 4 === 0 ? [] : [`Previous ${reported?.memberStatus ?? "Normal"} review`],
    adminNotes: index % 4 === 1 ? ["Demo note: verify the related Member history."] : [],
    status,
    reportCaseStatus: status,
    ...(status === "REPORT_CASE_PENDING" ? {} : {
      decision: status === "REPORT_CASE_HIDDEN" ? "confirmed-violation" : status === "REPORT_CASE_RESTORED" ? "restore" : "no-violation",
      decisionLabel: status === "REPORT_CASE_HIDDEN" ? "Violation confirmed" : status === "REPORT_CASE_RESTORED" ? "Message restored" : "No violation",
      decisionReason: "Demo decision recorded for edge-case testing.",
      resolution: status === "REPORT_CASE_HIDDEN" ? "Message hidden; Report Case remains open for re-evaluation." : "Demo Report Case decision recorded.",
      resolvedBy: "admin-demo",
      resolutionAt: demoIsoDate(index + 1, 16),
      closedAt: demoIsoDate(index + 1, 16),
    }),
    tone: status === "REPORT_CASE_HIDDEN" ? "danger" : status === "REPORT_CASE_PENDING" ? "warning" : "neutral",
    reportedAt: demoIsoDate(index + 1, 10),
    version: 1,
  };
});

const demoConductStatuses: readonly (
  | "CONDUCT_REPORT_PENDING"
  | "CONDUCT_REPORT_UPHELD"
  | "CONDUCT_REPORT_DISMISSED"
)[] = [
  "CONDUCT_REPORT_UPHELD",
  "CONDUCT_REPORT_DISMISSED",
] as const;

const dashboardDemoConductReportSeedData = Array.from({ length: MOCK_DEMO_RECORD_COUNT }, (_, index) => {
  const reported = mockDemoMemberSeeds[(index + 2) % mockDemoMemberSeeds.length];
  const reporter = mockDemoMemberSeeds[(index + 3) % mockDemoMemberSeeds.length];
  const status = demoConductStatuses[index % demoConductStatuses.length];
  const questId = `QST-${12011 + (index % MOCK_DEMO_RECORD_COUNT)}`;
  const questTitle = `Demo Quest ${String((index % MOCK_DEMO_RECORD_COUNT) + 1).padStart(3, "0")}`;
  return {
    id: `CND-${8310 + index}`,
    reportedMemberId: reported?.id,
    reportedUserName: reported?.title,
    reporterId: reporter?.id,
    reporterName: reporter?.title,
    reasonCode: ["CONDUCT_ABANDONED", "CONDUCT_NO_SHOW", "CONDUCT_OUT_OF_SCOPE"][index % 3],
    questId,
    questTitle,
    questRecord: "Assignment accepted · Proof Submission record is available.",
    details: "Demo Conduct Report requires review of the Quest record.",
    reportedMemberStatus: reported?.memberStatus,
    previousReportCount: index % 5,
    confirmedViolationCount: reported?.memberStatus === "Normal" ? 0 : index % 3,
    previousModerationActions: index % 4 === 0 ? [] : ["Previous Conduct Report review"],
    adminNotes: index % 4 === 2 ? ["Demo note: compare the Quest timeline and Proof Submission."] : [],
    status,
    conductReportStatus: status,
    ...(status === "CONDUCT_REPORT_PENDING" ? {} : {
      decision: status === "CONDUCT_REPORT_UPHELD" ? "confirmed-violation" : "no-violation",
      decisionLabel: status === "CONDUCT_REPORT_UPHELD" ? "Violation confirmed" : "No violation",
      decisionReason: "Demo Conduct Report decision recorded for edge-case testing.",
      resolution: status === "CONDUCT_REPORT_UPHELD" ? "Violation confirmed; the Member Misconduct ladder was applied." : "Conduct Report dismissed; no policy violation found.",
      resolvedBy: "admin-demo",
      resolutionAt: demoIsoDate(index + 2, 16),
      closedAt: demoIsoDate(index + 2, 16),
    }),
    tone: status === "CONDUCT_REPORT_UPHELD" ? "danger" : status === "CONDUCT_REPORT_PENDING" ? "warning" : "neutral",
    reportedAt: demoIsoDate(index + 2, 11),
    version: 1,
  };
});

const demoDisputeStatuses = [
  "DISPUTE_CASE_DISMISSED",
  "DISPUTE_CASE_RESOLVED",
] as const;

const dashboardDemoDisputeSeedData = Array.from({ length: MOCK_DEMO_RECORD_COUNT }, (_, index) => {
  const filer = mockDemoMemberSeeds[index % mockDemoMemberSeeds.length];
  const respondent = mockDemoMemberSeeds[(index + 1) % mockDemoMemberSeeds.length];
  const status = demoDisputeStatuses[index % demoDisputeStatuses.length];
  const amountAtRiskSatang = 150000 + index * 25000;
  return {
    id: `DSP-${5210 + index}`,
    displayId: `DSP-${5210 + index}`,
    questId: `QST-${12011 + (index % MOCK_DEMO_RECORD_COUNT)}`,
    questState: "QUEST_FAILED",
    title: `Demo Quest ${String((index % MOCK_DEMO_RECORD_COUNT) + 1).padStart(3, "0")}`,
    disputeType: ["Evidence", "Quality", "Scope"][index % 3],
    amount: amountAtRiskSatang / 100,
    amountAtRiskSatang,
    filerUserId: filer?.id,
    filerRole: "Hirer",
    filerName: filer?.title,
    respondentUserId: respondent?.id,
    respondentRole: "Worker",
    respondentName: respondent?.title,
    filerStatement: "The submitted Proof Submission did not satisfy the Quest Condition.",
    respondentStatement: "The Proof Submission records the work completed before the Quest failed.",
    failedAt: demoIsoDate(index + 3, 8),
    reportedMemberStatus: respondent?.memberStatus,
    previousReportCount: index % 4,
    confirmedViolationCount: respondent?.memberStatus === "Normal" ? 0 : index % 3,
    previousModerationActions: index % 4 === 0 ? [] : ["Previous Dispute Case review"],
    adminNotes: index % 4 === 1 ? ["Demo note: check both Member statements before deciding."] : [],
    status,
    disputeCaseStatus: status,
    tone: "neutral",
    disputeDate: demoIsoDate(index + 3, 12),
    evidenceRefs: index % 5 === 0 ? [] : [`evidence-dsp-${5210 + index}`],
    ...(status === "DISPUTE_CASE_RESOLVED" ? { resolvedAmountSatang: amountAtRiskSatang, resolvedWorkerId: respondent?.id, resolvedBy: "admin-demo", resolutionAt: demoIsoDate(index + 3, 16), closedAt: demoIsoDate(index + 3, 16), decision: "resolve", decisionLabel: "Worker receives funds", decisionReason: "Demo Worker outcome recorded." } : {}),
    ...(status === "DISPUTE_CASE_DISMISSED" ? { resolvedAmountSatang: null, resolvedBy: "admin-demo", resolutionAt: demoIsoDate(index + 3, 16), closedAt: demoIsoDate(index + 3, 16), decision: "dismiss", decisionLabel: "Hirer retains funds", decisionReason: "Demo Dispute Case dismissed." } : {}),
    version: 1,
  };
});

// Keep a second, deterministic set of open cases available for Mock QA. The
// canonical records remain first so the queue still opens on its oldest case.
const dashboardOpenDisputeSeedData = Array.from({ length: 10 }, (_, index) => {
  const sequence = 5410 + index;
  const filer = mockDemoMemberSeeds[index % mockDemoMemberSeeds.length];
  const respondent = mockDemoMemberSeeds[(index + 1) % mockDemoMemberSeeds.length];
  const amountAtRiskSatang = 300000 + index * 25000;
  const questId = `QST-${12011 + index}`;
  return {
    id: `DSP-${sequence}`,
    displayId: `DSP-${sequence}`,
    questId,
    questState: "QUEST_FAILED",
    title: `Open Demo Dispute ${String(index + 1).padStart(2, "0")}`,
    disputeType: ["Evidence", "Quality", "Scope"][index % 3],
    amount: amountAtRiskSatang / 100,
    amountAtRiskSatang,
    filerUserId: filer?.id,
    filerRole: "Hirer",
    filerName: filer?.title,
    respondentUserId: respondent?.id,
    respondentRole: "Worker",
    respondentName: respondent?.title,
    filerStatement: "The submitted Proof Submission did not satisfy the Quest Condition.",
    respondentStatement: "The Proof Submission records the work completed before the Quest failed.",
    failedAt: demoIsoDate(index + 1, 8),
    reportedMemberStatus: respondent?.memberStatus,
    previousReportCount: index % 4,
    confirmedViolationCount: respondent?.memberStatus === "Normal" ? 0 : index % 3,
    previousModerationActions: index % 4 === 0 ? [] : ["Previous Dispute Case review"],
    adminNotes: index % 4 === 1 ? ["Demo note: check both Member statements before deciding."] : [],
    status: "DISPUTE_CASE_PENDING",
    disputeCaseStatus: "DISPUTE_CASE_PENDING",
    tone: "danger",
    disputeDate: demoIsoDate(index + 1, 12),
    evidenceRefs: [`evidence-dsp-${sequence}`],
    version: 1,
  };
});

const dashboardOpenReportSeedData = Array.from({ length: 10 }, (_, index) => {
  const sequence = 8410 + index;
  const reported = mockDemoMemberSeeds[(index + 12) % mockDemoMemberSeeds.length];
  const reporter = mockDemoMemberSeeds[(index + 13) % mockDemoMemberSeeds.length];
  const questIndex = index % MOCK_DEMO_RECORD_COUNT;
  return {
    id: `RPT-${sequence}`,
    reportedMemberId: reported?.id,
    reportedUserName: reported?.title,
    reporterId: reporter?.id,
    reporterName: reporter?.title,
    category: ["Harassment or abuse", "Spam", "Fraud or payment issue", "Unsafe content"][index % 4],
    details: "Open Demo Report Case requires Admin review of the supplied evidence.",
    evidence: "Demo message capture",
    evidenceRefs: [`evidence-rpt-${sequence}`],
    questId: `QST-${12011 + questIndex}`,
    questTitle: `Demo Quest ${String(questIndex + 1).padStart(3, "0")}`,
    reportedMemberStatus: reported?.memberStatus,
    previousReportCount: index % 4,
    confirmedViolationCount: reported?.memberStatus === "Normal" ? 0 : index % 3,
    previousModerationActions: index % 4 === 0 ? [] : ["Previous Report Case review"],
    adminNotes: index % 4 === 1 ? ["Demo note: verify the related Member history."] : [],
    status: "REPORT_CASE_PENDING",
    reportCaseStatus: "REPORT_CASE_PENDING",
    tone: "warning",
    reportedAt: demoIsoDate(index + 1, 10),
    version: 1,
  };
});

const dashboardOpenConductReportSeedData = Array.from({ length: 10 }, (_, index) => {
  const sequence = 8510 + index;
  const reported = mockDemoMemberSeeds[(index + 16) % mockDemoMemberSeeds.length];
  const reporter = mockDemoMemberSeeds[(index + 17) % mockDemoMemberSeeds.length];
  const relatedQuest = dashboardDemoQuestSeedData[index];
  return {
    id: `CND-${sequence}`,
    reportedMemberId: reported?.id,
    reportedUserName: reported?.title,
    reporterId: reporter?.id,
    reporterName: reporter?.title,
    reasonCode: ["CONDUCT_ABANDONED", "CONDUCT_NO_SHOW", "CONDUCT_OUT_OF_SCOPE"][index % 3],
    questId: relatedQuest?.id,
    questTitle: relatedQuest?.title,
    questState: relatedQuest?.questState,
    questRecord: "Assignment accepted · Proof Submission record is available.",
    details: "Open Demo Conduct Report requires review of the Quest record.",
    reportedMemberStatus: reported?.memberStatus,
    previousReportCount: index % 5,
    confirmedViolationCount: reported?.memberStatus === "Normal" ? 0 : index % 3,
    previousModerationActions: index % 4 === 0 ? [] : ["Previous Conduct Report review"],
    adminNotes: index % 4 === 2 ? ["Demo note: compare the Quest timeline and Proof Submission."] : [],
    status: "CONDUCT_REPORT_PENDING",
    conductReportStatus: "CONDUCT_REPORT_PENDING",
    tone: "warning",
    reportedAt: demoIsoDate(index + 1, 11),
    version: 1,
  };
});

export const dashboardSeedData: PersistedAdminData = {
  version: dashboardSeedVersion,
  collections: {
    users: [
      { id: "68000000", title: "Akarin Ariyawat", status: "FROZEN", walletStatus: "FROZEN", faculty: "Engineering", department: "Computer Engineering", occupation: "Student", tone: "danger", age: "Temporary all-quest ban · 6 days left" },
      { id: "68000020", title: "Amara Ariyawat", status: "ACTIVE", walletStatus: "ACTIVE", faculty: "Management Sciences", department: "Business Administration", occupation: "Student", tone: "warning", age: "1 active report" },
      { id: "68000040", title: "Benja Ariyawat", status: "FROZEN", walletStatus: "FROZEN", faculty: "Engineering", department: "Computer Engineering", occupation: "Student", tone: "danger", age: "Permanent all-quest ban" },
      ...dashboardDemoMemberSeedData,
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
      ...dashboardDemoQuestSeedData,
    ],
    payouts: [
      { id: "PAY-9637", title: "Darin Intharawong", amount: 283, status: "PENDING_ADMIN_APPROVAL", payoutStatus: "PENDING_ADMIN_APPROVAL", tone: "warning" },
      { id: "PAY-9631", title: "Fah Lertwiroj", amount: 1711, status: "PENDING_ADMIN_APPROVAL", payoutStatus: "PENDING_ADMIN_APPROVAL", tone: "warning" },
      { id: "PAY-9628", title: "Gunn Maneewan", amount: 850, status: "FAILED", payoutStatus: "FAILED", tone: "danger" },
      ...dashboardDemoPayoutSeedData,
    ],
    disputes: [...dashboardDisputeSeedData, ...dashboardDemoDisputeSeedData, ...dashboardOpenDisputeSeedData],
    reports: [
      { id: "RPT-8201", reportedMemberId: "68000020", reportedUserName: "Amara Ariyawat", reporterId: "68000000", reporterName: "Akarin Ariyawat", category: "Harassment or abuse", details: "The submitted report requires review.", evidence: "Message capture", evidenceRefs: ["evidence-rpt-8201"], questId: "QST-12001", questTitle: "Verify dorm fire exits", reportedMemberStatus: "ACTIVE", previousReportCount: 0, confirmedViolationCount: 0, previousModerationActions: [], adminNotes: [], status: "REPORT_CASE_PENDING", reportCaseStatus: "REPORT_CASE_PENDING", tone: "warning", reportedAt: "27 Aug 2026 08:40" },
      { id: "RPT-8202", reportedMemberId: "68000040", reportedUserName: "Benja Ariyawat", reporterId: "68000000", reporterName: "Akarin Ariyawat", category: "Fraud or payment issue", details: "The submitted report requires review.", evidence: "Payment message capture", evidenceRefs: ["evidence-rpt-8202"], reportedMemberStatus: "FROZEN", previousReportCount: 0, confirmedViolationCount: 0, previousModerationActions: [], adminNotes: [], status: "REPORT_CASE_PENDING", reportCaseStatus: "REPORT_CASE_PENDING", tone: "warning", reportedAt: "27 Aug 2026 08:20" },
      ...dashboardConductReportSeedData,
      ...dashboardDemoReportSeedData,
      ...dashboardDemoConductReportSeedData,
      ...dashboardOpenReportSeedData,
      ...dashboardOpenConductReportSeedData,
    ],
  },
};
