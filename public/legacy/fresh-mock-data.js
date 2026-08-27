// A complete, self-contained demo dataset. Versioning resets browser-local
// decisions whenever the seeded marketplace scenario changes.
const freshDemoVersion = "2026-08-27-v26";
const freshDemoKey = "kuquest-admin-demo-data";

data.disputes = [
  {
    id: "DSP-4201",
    title: "Verify dorm fire exits",
    person: "Saran Jindapol",
    other: "Mayuree Nopparat",
    amount: 4500,
    status: "Active",
    tone: "danger",
    disputeDate: "27 Aug 2026",
    disputeType: "Evidence",
    age: "18 min",
    detail: "The submitted inspection confirms the exit signs but does not include the required nighttime checks for two residence halls.",
    evidence: ["Fire exit checklist · PDF · 9 pages", "Night inspection request · PDF", "Submitted photo set · JPG · 12 files"],
  },
  {
    id: "DSP-4202",
    title: "Translate clinic wayfinding signs",
    person: "Nicha Prasert",
    other: "Kittipong Manee",
    amount: 3300,
    status: "Active",
    tone: "danger",
    disputeDate: "27 Aug 2026",
    disputeType: "Quality",
    age: "42 min",
    detail: "Several translated clinic directions differ from the approved glossary and could send students to the wrong service desk.",
    evidence: ["Delivered sign set · PDF · 22 signs", "Approved clinic glossary · XLSX", "Correction notes · DOCX"],
  },
  {
    id: "DSP-4203",
    title: "Record student wellbeing interviews",
    person: "Mayuree Nopparat",
    other: "Chanon Preecha",
    amount: 5200,
    status: "Active",
    tone: "danger",
    disputeDate: "26 Aug 2026",
    disputeType: "Scope",
    age: "3 hr",
    detail: "The final video includes two interviews that were not included in the accepted consent register or shot plan.",
    evidence: ["Final interview cut · MP4 · 286 MB", "Consent register · XLSX · 14 entries", "Accepted shot plan · PDF"],
  },
  {
    id: "DSP-4204",
    title: "Map accessible lecture routes",
    person: "Kittipong Manee",
    other: "Ratchanon Srisai",
    amount: 7100,
    status: "Active",
    tone: "danger",
    disputeDate: "26 Aug 2026",
    disputeType: "Delivery",
    age: "6 hr",
    detail: "The route map covers the main library entrance but omits the alternate lift path required by the accepted accessibility brief.",
    evidence: ["Lecture route map · PDF · 7 pages", "Accessibility brief · PDF", "Hirer feedback · message export"],
  },
  {
    id: "DSP-4205",
    title: "Caption faculty welcome series",
    person: "Thanida Lertchai",
    other: "Ratchanon Srisai",
    amount: 2800,
    status: "Active",
    tone: "danger",
    disputeDate: "25 Aug 2026",
    disputeType: "Timing",
    age: "1 day",
    detail: "The hirer requested timing corrections after the review window, while the worker says the delivered captions match the approved transcript.",
    evidence: ["Caption bundle · VTT · 4 files", "Accepted transcript · DOCX", "Late correction request · PDF"],
  },
  {
    id: "DSP-4206",
    title: "Design recycling campaign posters",
    person: "Chanon Preecha",
    other: "Nicha Prasert",
    amount: 2100,
    status: "Closed",
    tone: "neutral",
    disputeDate: "22 Aug 2026",
    disputeType: "Rights",
    age: "5 days",
    detail: "The requested reuse covered an external event, but the accepted brief limited the posters to campus facilities.",
    evidence: ["Accepted poster set · PDF", "Usage terms · PDF", "External reuse request · email export"],
    resolution: "Worker wins; the original campus-only usage terms remain in force.",
    decisionReason: "The accepted quest terms did not grant external event usage.",
  },
];

data.quests = [
  { id: "QST-9501", title: "Map quiet study rooms", person: "Nicha Prasert", other: "Accessibility research", amount: 7200, status: "In progress", tone: "info", age: "Today", teamQuest: true, teamSize: 3, teamParticipants: [["Kittipong Manee", "Accessibility lead"], ["Ratchanon Srisai", "Survey recorder"], ["Saran Jindapol", "Route mapper"]] },
  { id: "QST-9502", title: "Catalogue lab safety equipment", person: "Ratchanon Srisai", other: "Field work", amount: 3100, status: "Open", tone: "success", age: "Today", selectedParticipant: "Mayuree Nopparat" },
  { id: "QST-9503", title: "Verify dorm fire exits", person: "Saran Jindapol", other: "Safety research", amount: 4500, status: "Disputed", tone: "danger", age: "Today" },
  { id: "QST-9504", title: "Edit international student handbook", person: "Thanida Lertchai", other: "Writing", amount: 2300, status: "Submitted", tone: "warning", age: "Today", selectedParticipant: "Saran Jindapol" },
  { id: "QST-9505", title: "Design recycling campaign posters", person: "Nicha Prasert", other: "Design", amount: 2100, status: "Completed", tone: "success", age: "Yesterday", selectedParticipant: "Nicha Prasert" },
  { id: "QST-9506", title: "Translate clinic wayfinding signs", person: "Nicha Prasert", other: "Translation", amount: 3300, status: "Disputed", tone: "danger", age: "Yesterday" },
  { id: "QST-9507", title: "Survey shaded study areas", person: "Kittipong Manee", other: "Field research", amount: 3900, status: "Change pending", tone: "warning", age: "Today" },
  { id: "QST-9508", title: "Record student wellbeing interviews", person: "Mayuree Nopparat", other: "Video", amount: 5200, status: "Disputed", tone: "danger", age: "Yesterday", selectedParticipant: "Thanida Lertchai" },
  { id: "QST-9509", title: "Audit faculty room inventory", person: "Chanon Preecha", other: "Data", amount: 1700, status: "Hidden", tone: "neutral", age: "2 days", selectedParticipant: "Ratchanon Srisai" },
  { id: "QST-9510", title: "Photograph campus pollinators", person: "Thanida Lertchai", other: "Photography", amount: 4100, status: "Disputed", tone: "danger", age: "2 days" },
  { id: "QST-9511", title: "Translate emergency response guide", person: "Ratchanon Srisai", other: "Translation", amount: 2900, status: "Submitted", tone: "warning", age: "Yesterday", selectedParticipant: "Mayuree Nopparat" },
  { id: "QST-9512", title: "Film sustainability fair recap", person: "Mayuree Nopparat", other: "Video", amount: 5700, status: "Rework", tone: "warning", age: "2 days", selectedParticipant: "Chanon Preecha" },
  { id: "QST-9513", title: "Clean scholarship application dataset", person: "Chanon Preecha", other: "Data", amount: 2600, status: "Completed", tone: "success", age: "3 days", selectedParticipant: "Chanon Preecha" },
  { id: "QST-9514", title: "Prepare orientation checklist", person: "Saran Jindapol", other: "Operations", amount: 1800, status: "Open", tone: "success", age: "3 days", selectedParticipant: "Kittipong Manee" },
  { id: "QST-9515", title: "Map accessible lecture routes", person: "Kittipong Manee", other: "Accessibility research", amount: 7100, status: "Disputed", tone: "danger", age: "3 days" },
  { id: "QST-9516", title: "Build bilingual lab directory", person: "Nicha Prasert", other: "Design", amount: 2700, status: "Change pending", tone: "warning", age: "Today", selectedParticipant: "Thanida Lertchai" },
  { id: "QST-9517", title: "Summarize commuter survey", person: "Ratchanon Srisai", other: "Research", amount: 3000, status: "Completed", tone: "success", age: "4 days", selectedParticipant: "Ratchanon Srisai" },
  { id: "QST-9518", title: "Edit new-student welcome video", person: "Thanida Lertchai", other: "Video", amount: 2800, status: "In progress", tone: "info", age: "4 days", selectedParticipant: "Saran Jindapol" },
  { id: "QST-9519", title: "Caption faculty welcome series", person: "Thanida Lertchai", other: "Writing", amount: 2800, status: "Disputed", tone: "danger", age: "4 days", selectedParticipant: "Ratchanon Srisai" },
  { id: "QST-9520", title: "Verify recycling station locations", person: "Chanon Preecha", other: "Field work", amount: 2000, status: "Completed", tone: "success", age: "5 days", selectedParticipant: "Mayuree Nopparat" },
  { id: "QST-9521", title: "Coordinate sustainability fair volunteers", person: "Nicha Prasert", other: "Event operations", amount: 7600, status: "Open", tone: "success", age: "Today", teamQuest: true, teamSize: 4, teamParticipants: [["Ratchanon Srisai", "Event coordinator"], ["Mayuree Nopparat", "Logistics lead"], ["Saran Jindapol", "Venue planner"], ["Thanida Lertchai", "Communications"]] },
  { id: "QST-9522", title: "Survey accessible campus entrances", person: "Ratchanon Srisai", other: "Field research", amount: 4800, status: "Submitted", tone: "warning", age: "Yesterday", teamQuest: true, teamSize: 3, teamParticipants: [["Kittipong Manee", "Site mapper"], ["Mayuree Nopparat", "Survey recorder"], ["Thanida Lertchai", "Evidence reviewer"]] },
  { id: "QST-9523", title: "Build campus wayfinding kit", person: "Thanida Lertchai", other: "Design and copy", amount: 6100, status: "Completed", tone: "success", age: "2 days", teamQuest: true, teamSize: 5, teamParticipants: [["Ratchanon Srisai", "Information architect"], ["Nicha Prasert", "Copy editor"], ["Mayuree Nopparat", "Illustrator"], ["Saran Jindapol", "Field checker"], ["Kittipong Manee", "Accessibility reviewer"]] },
  { id: "QST-9524", title: "Audit sports facility access", person: "Saran Jindapol", other: "Accessibility research", amount: 6600, status: "Change pending", tone: "warning", age: "Today", teamQuest: true, teamSize: 3, teamParticipants: [["Ratchanon Srisai", "Route mapper"], ["Mayuree Nopparat", "Facilities reviewer"], ["Thanida Lertchai", "Report writer"]] },
  { id: "QST-9525", title: "Prepare shuttle route guide", person: "Nicha Prasert", other: "Operations", amount: 2400, status: "Cancelled", tone: "cancelled", age: "Today", selectedParticipant: "Mayuree Nopparat", terminationReason: "The hirer withdrew the request before work began." },
  { id: "QST-9526", title: "Catalog student support services", person: "Ratchanon Srisai", other: "Research", amount: 2500, status: "Assigned", tone: "assigned", age: "Today", selectedParticipant: "Saran Jindapol" },
];

data.users = [
  { id: "66100428", title: "Ratchanon Srisai", person: "ratchanon.s@ku.th", other: "Environmental Science · Year 3", amount: null, status: "Normal", tone: "success", age: "Joined 2024" },
  { id: "66100817", title: "Nicha Prasert", person: "nicha.p@ku.th", other: "Communication Arts · Year 4", amount: null, status: "Flag", tone: "warning", age: "1 active report" },
  { id: "65020314", title: "Kittipong Manee", person: "kittipong.m@ku.th", other: "Architecture · Year 3", amount: null, status: "Temp ban", tone: "danger", age: "Temporary all-quest ban · 4 days left" },
  { id: "66031246", title: "Saran Jindapol", person: "saran.j@ku.th", other: "Engineering · Year 2", amount: null, status: "Flag", tone: "warning", age: "1 active dispute" },
  { id: "65017652", title: "Mayuree Nopparat", person: "mayuree.n@ku.th", other: "Agriculture · Year 4", amount: null, status: "Normal", tone: "success", age: "Joined 2023" },
  { id: "66022508", title: "Thanida Lertchai", person: "thanida.l@ku.th", other: "Liberal Arts · Year 3", amount: null, status: "Normal", tone: "success", age: "Joined 2025" },
  { id: "65011409", title: "Chanon Preecha", person: "chanon.p@ku.th", other: "Digital Media · Year 2", amount: null, status: "Perm ban", tone: "danger", age: "Permanent all-quest ban" },
];

data.reports = [
  {
    id: "RPT-7101",
    reporterId: "66100428",
    reporterName: "Ratchanon Srisai",
    reportedUserId: "66100817",
    reportedUserName: "Nicha Prasert",
    category: "Harassment or abuse",
    details: "The reported user repeatedly sent misleading payment instructions during a marketplace conversation.",
    evidence: "Conversation export · PDF",
    status: "Active",
    tone: "warning",
    reportedAt: "27 Aug 2026 · 11:26 ICT",
  },
  {
    id: "RPT-7102",
    reporterId: "66022508",
    reporterName: "Thanida Lertchai",
    reportedUserId: "65020314",
    reportedUserName: "Kittipong Manee",
    category: "Fraud or payment issue",
    details: "The reported user asked to move a quest payment outside KuQuest after the work was accepted.",
    evidence: "Payment request screenshot · PNG",
    status: "Closed",
    tone: "neutral",
    reportedAt: "26 Aug 2026 · 15:18 ICT",
    closedAt: "26 Aug 2026 · 15:47 ICT",
    decision: "temporary-ban",
    decisionLabel: "Temporary ban",
    decisionDays: 7,
    decisionReason: "The submitted payment request was reviewed and retained as a policy violation record.",
  },
  {
    id: "RPT-7103",
    reporterId: "65017652",
    reporterName: "Mayuree Nopparat",
    reportedUserId: "65011409",
    reportedUserName: "Chanon Preecha",
    category: "Misleading quest activity",
    details: "The reported user marked a campus dataset task complete while the shared folder still contained placeholder rows and missing source notes.",
    evidence: "Quest workspace export · ZIP",
    status: "Active",
    tone: "warning",
    reportedAt: "27 Aug 2026 · 10:42 ICT",
  },
  {
    id: "RPT-7104",
    reporterId: "65020314",
    reporterName: "Kittipong Manee",
    reportedUserId: "66031246",
    reportedUserName: "Saran Jindapol",
    category: "Harassment or abuse",
    details: "The reported user sent repeated personal messages after the quest conversation ended and continued contacting the reporter through unrelated listings.",
    evidence: "Message thread export · PDF",
    status: "Active",
    tone: "warning",
    reportedAt: "27 Aug 2026 · 09:18 ICT",
  },
  {
    id: "RPT-7105",
    reporterId: "66100817",
    reporterName: "Nicha Prasert",
    reportedUserId: "66022508",
    reportedUserName: "Thanida Lertchai",
    category: "Fraud or payment issue",
    details: "The reported user requested a second payment for the same deliverable and provided a bank account that did not match the accepted payout details.",
    evidence: "Payout instruction screenshot · PNG",
    status: "Active",
    tone: "warning",
    reportedAt: "26 Aug 2026 · 17:05 ICT",
  },
  {
    id: "RPT-7106",
    reporterId: "66031246",
    reporterName: "Saran Jindapol",
    reportedUserId: "65017652",
    reportedUserName: "Mayuree Nopparat",
    category: "Misleading quest activity",
    details: "The report claimed the quest description was changed after assignment, but the activity log shows the updated terms were accepted before work started.",
    evidence: "Quest activity log · PDF",
    status: "Closed",
    tone: "neutral",
    reportedAt: "25 Aug 2026 · 13:20 ICT",
    closedAt: "25 Aug 2026 · 14:02 ICT",
    decision: "do-nothing",
    decisionLabel: "Do nothing",
    decisionReason: "The activity log confirmed that the final quest terms were accepted before work began.",
  },
  {
    id: "RPT-7107",
    reporterId: "66100428",
    reporterName: "Ratchanon Srisai",
    reportedUserId: "65011409",
    reportedUserName: "Chanon Preecha",
    category: "Harassment or abuse",
    details: "The reported user used threatening language in a follow-up message after a disagreement about a submitted data deliverable.",
    evidence: "Conversation export · PDF",
    status: "Closed",
    tone: "neutral",
    reportedAt: "24 Aug 2026 · 16:12 ICT",
    closedAt: "24 Aug 2026 · 16:46 ICT",
    decision: "permanent-ban",
    decisionLabel: "Permanent ban",
    decisionReason: "The message record showed a repeated threat after a prior moderation warning.",
  },
];

data.payouts = [
  { id: "PAY-8714", questId: "QST-9513", title: "Chanon Preecha", person: "Kasikorn · •••• 3186", other: "Quest QST-9513", amount: 2600, status: "Needs approval", tone: "warning", age: "12 min" },
  { id: "PAY-8711", questId: "QST-9517", title: "Ratchanon Srisai", person: "SCB · •••• 5812", other: "Quest QST-9517", amount: 3000, status: "Needs approval", tone: "warning", age: "31 min" },
  { id: "PAY-8707", questId: "QST-9505", title: "Nicha Prasert", person: "Krungthai · •••• 7410", other: "Quest QST-9505", amount: 2100, status: "Needs approval", tone: "warning", age: "58 min" },
  { id: "PAY-8702", questId: "QST-9520", title: "Mayuree Nopparat", person: "Bangkok Bank · •••• 0924", other: "Quest QST-9520", amount: 2000, status: "Processing", tone: "info", age: "Today" },
  { id: "PAY-8698", questId: "QST-9513", title: "Chanon Preecha", person: "Kasikorn · •••• 3186", other: "Quest QST-9513", amount: 2600, status: "Completed", tone: "success", age: "Yesterday" },
  { id: "PAY-8692", questId: "QST-9505", title: "Nicha Prasert", person: "Krungthai · •••• 7410", other: "Quest QST-9505", amount: 2100, status: "Rejected", tone: "danger", age: "2 days" },
];

Object.keys(disputeCases).forEach((key) => delete disputeCases[key]);
Object.assign(disputeCases, {
  "DSP-4201": {
    questId: "QST-9503", category: "Evidence completeness", openedBy: "Saran Jindapol · Hirer", respondent: "Mayuree Nopparat · Worker", requested: "Add nighttime exit checks", claim: "The accepted safety brief required nighttime checks for every residence hall, but the submission covers only daytime inspections.", response: "The worker says access to the west residence hall was limited after hours and can return with a facilities escort.", recommended: "Compare the accepted checklist with the submitted evidence before requiring a supervised recheck.", policy: ["Accepted quest conditions control the decision", "Evidence timestamps are authoritative", "Administrative reasons are required"], signals: [["Evidence coverage", "74%", "warning"], ["Account risk", "Low", "success"], ["Response state", "Received", "info"]],
  },
  "DSP-4202": {
    questId: "QST-9506", category: "Translation accuracy", openedBy: "Nicha Prasert · Hirer", respondent: "Kittipong Manee · Worker", requested: "Correct clinic directions", claim: "Four translated directions differ from the approved glossary and could send students to the wrong clinic service desk.", response: "The worker accepts the correction list and asks for a one-day rework window.", recommended: "Require a corrected sign set and keep funds held until the revised terms are verified.", policy: ["Published glossary controls terminology", "Submitted revisions must be traceable", "Funds remain held during an active dispute"], signals: [["Evidence coverage", "86%", "warning"], ["Account risk", "Medium", "warning"], ["Response state", "Acknowledged", "info"]],
  },
  "DSP-4203": {
    questId: "QST-9510", category: "Scope compliance", openedBy: "Mayuree Nopparat · Hirer", respondent: "Chanon Preecha · Worker", requested: "Remove two unapproved interviews", claim: "Two interviews appear in the final wellbeing video but are absent from the accepted shot plan and consent register.", response: "The worker says both interviews were recorded at a public booth and can be removed from a revised export.", recommended: "Require a consent-safe export with the two interviews removed before releasing funds.", policy: ["Consent records govern publication", "The accepted shot plan defines scope", "Every resolution needs an evidence-based reason"], signals: [["Evidence coverage", "69%", "warning"], ["Account risk", "High", "danger"], ["Response state", "Responded", "info"]],
  },
  "DSP-4204": {
    questId: "QST-9515", category: "Delivery completeness", openedBy: "Kittipong Manee · Hirer", respondent: "Ratchanon Srisai · Worker", requested: "Complete the east-hall route", claim: "The accepted map required a continuous accessible route to the east lecture halls, but the alternate lift path is missing.", response: "The worker says the lift was under maintenance during the survey and proposes a follow-up visit.", recommended: "Request the missing route evidence and keep the quest blocked until the map is complete.", policy: ["Accepted scope controls completion", "Location evidence must be verifiable", "Disputes pause quest progression"], signals: [["Evidence coverage", "64%", "warning"], ["Account risk", "Low", "success"], ["Response state", "Received", "info"]],
  },
  "DSP-4205": {
    questId: "QST-9519", category: "Review-window timing", openedBy: "Thanida Lertchai · Hirer", respondent: "Ratchanon Srisai · Worker", requested: "Correct caption timing", claim: "The hirer requested timing corrections after the review window and says the delivered file is not usable for the welcome series.", response: "The worker says the delivered VTT matches the accepted transcript and the timing request arrived late.", recommended: "Compare the review-window timestamps with the accepted transcript before requiring any rework.", policy: ["Review windows apply to both parties", "Accepted transcripts define the requested output", "Resolution reasons must cite the record"], signals: [["Evidence coverage", "91%", "success"], ["Account risk", "Low", "success"], ["Response state", "Contested", "warning"]],
  },
  "DSP-4206": {
    questId: "QST-9505", category: "Usage rights", openedBy: "Chanon Preecha · Hirer", respondent: "Nicha Prasert · Worker", requested: "Permit external campaign reuse", claim: "The hirer requested to reuse the completed posters at an external event after delivery.", response: "The worker points to the accepted campus-only usage terms.", recommended: "Closed: retain the accepted campus-only rights and do not expand the license retroactively.", policy: ["Accepted usage terms control delivery", "Post-delivery scope changes require a new quest", "Closed cases are retained read-only"], signals: [["Evidence coverage", "100%", "success"], ["Account risk", "Low", "success"], ["Response state", "Resolved", "success"]],
  },
});

const savedFreshDemo = (() => {
  try { return JSON.parse(localStorage.getItem(freshDemoKey) || "null"); } catch { return null; }
})();
if (savedFreshDemo?.version === freshDemoVersion) {
  ["disputes", "quests", "users", "payouts", "reports"].forEach((collection) => {
    if (Array.isArray(savedFreshDemo.collections?.[collection]))
      data[collection] = savedFreshDemo.collections[collection];
  });
} else {
  localStorage.removeItem(freshDemoKey);
}

function persistAdminData() {
  localStorage.setItem(
    freshDemoKey,
    JSON.stringify({ version: freshDemoVersion, collections: data }),
  );
}

if (!savedFreshDemo || savedFreshDemo.version !== freshDemoVersion)
  persistAdminData();

document.querySelector('[data-view="disputes"] b').textContent = data.disputes.filter((record) => record.status === "Active").length;
document.querySelector('[data-view="payouts"] b').textContent = data.payouts.filter((record) => record.status === "Needs approval").length;
document.querySelector('[data-view="reports"] b').textContent = data.reports.filter((record) => record.status === "Active").length;
if (state.view === "home") renderHome();
