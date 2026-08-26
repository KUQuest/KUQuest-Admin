// A complete, self-contained demo dataset. Versioning resets browser-local
// decisions whenever the seeded marketplace scenario changes.
const freshDemoVersion = "2026-08-26-v24";
const freshDemoKey = "kuquest-admin-demo-data";

data.disputes = [
  {
    id: "DSP-4106",
    title: "Audit dorm emergency lighting",
    person: "Saran Jindapol",
    other: "Mayuree Nopparat",
    amount: 4200,
    status: "Active",
    tone: "danger",
    disputeDate: "26 Aug 2026",
    disputeType: "Evidence",
    age: "24 min",
    detail: "The submitted checklist confirms the fixtures but does not include the required nighttime photographs for two dorm buildings.",
    evidence: ["Lighting checklist · PDF · 8 pages", "Submitted photo set · JPG · 14 files", "Accepted scope · version 2"],
  },
  {
    id: "DSP-4102",
    title: "Create Thai-English clinic signage",
    person: "Nicha Prasert",
    other: "Kittipong Manee",
    amount: 3100,
    status: "Active",
    tone: "danger",
    disputeDate: "26 Aug 2026",
    disputeType: "Quality",
    age: "1 hr",
    detail: "The giver reports that three medical terms differ from the approved glossary and could confuse students using the campus clinic.",
    evidence: ["Delivered sign set · PDF · 18 signs", "Approved clinic glossary · XLSX", "Annotated correction list · PDF"],
  },
  {
    id: "DSP-4098",
    title: "Film student sustainability fair",
    person: "Mayuree Nopparat",
    other: "Chanon Preecha",
    amount: 5600,
    status: "Active",
    tone: "danger",
    disputeDate: "25 Aug 2026",
    disputeType: "Scope",
    age: "1 day",
    detail: "The final film includes two interviews that were not listed in the approved shot plan or consent register.",
    evidence: ["Final cut · MP4 · 312 MB", "Approved shot plan · PDF", "Consent register · XLSX · 11 entries"],
  },
  {
    id: "DSP-4095",
    title: "Map accessible routes to lecture halls",
    person: "Kittipong Manee",
    other: "Ratchanon Srisai",
    amount: 6800,
    status: "Active",
    tone: "danger",
    disputeDate: "24 Aug 2026",
    disputeType: "Delivery",
    age: "2 days",
    detail: "The route map covers the central library but omits the alternate lift path to the west lecture halls required by the accepted brief.",
    evidence: ["Route map · PDF · 6 pages", "Campus accessibility brief · PDF", "Giver feedback · message export"],
  },
  {
    id: "DSP-4091",
    title: "Prepare faculty welcome video captions",
    person: "Thanida Lertchai",
    other: "Ratchanon Srisai",
    amount: 2600,
    status: "Active",
    tone: "danger",
    disputeDate: "23 Aug 2026",
    disputeType: "Timing",
    age: "3 days",
    detail: "The giver requested caption corrections after the review window, while the hunter says the delivered file matches the accepted transcript.",
    evidence: ["Caption file · VTT", "Accepted transcript · DOCX", "Post-review correction request · PDF"],
  },
  {
    id: "DSP-4088",
    title: "Design recycling station labels",
    person: "Chanon Preecha",
    other: "Nicha Prasert",
    amount: 1800,
    status: "Closed",
    tone: "neutral",
    disputeDate: "20 Aug 2026",
    disputeType: "Rights",
    age: "6 days",
    detail: "The requested reuse covered an external event, but the accepted brief limited the labels to campus facilities.",
    evidence: ["Accepted label set · SVG", "Usage terms · PDF", "External reuse request · email export"],
    resolution: "Hunter wins; the original campus-only usage terms remain in force.",
    decisionReason: "The accepted quest terms did not grant external event usage.",
  },
];

data.quests = [
  { id: "QST-9401", title: "Review accessible campus routes", person: "Nicha Prasert", other: "Accessibility research", amount: 6800, status: "In progress", tone: "info", age: "Today", teamQuest: true, teamSize: 3, teamParticipants: [["Kittipong Manee", "Accessibility lead"], ["Ratchanon Srisai", "Survey recorder"], ["Saran Jindapol", "Route mapper"]] },
  { id: "QST-9402", title: "Inventory science lab equipment", person: "Ratchanon Srisai", other: "Field work", amount: 2900, status: "Open", tone: "success", age: "Today", selectedParticipant: "Mayuree Nopparat" },
  { id: "QST-9403", title: "Audit dorm emergency lighting", person: "Saran Jindapol", other: "Safety research", amount: 4200, status: "Disputed", tone: "danger", age: "Today" },
  { id: "QST-9404", title: "Proofread international student guide", person: "Thanida Lertchai", other: "Writing", amount: 2100, status: "Submitted", tone: "warning", age: "Today", selectedParticipant: "Saran Jindapol" },
  { id: "QST-9405", title: "Design recycling station labels", person: "Nicha Prasert", other: "Design", amount: 1800, status: "Completed", tone: "success", age: "Yesterday", selectedParticipant: "Nicha Prasert" },
  { id: "QST-9406", title: "Create Thai-English clinic signage", person: "Nicha Prasert", other: "Translation", amount: 3100, status: "Disputed", tone: "danger", age: "Yesterday" },
  { id: "QST-9407", title: "Map quiet study spaces", person: "Kittipong Manee", other: "Research", amount: 3400, status: "Change pending", tone: "warning", age: "Today" },
  { id: "QST-9408", title: "Record student wellbeing workshop", person: "Mayuree Nopparat", other: "Video", amount: 3600, status: "Disputed", tone: "danger", age: "Yesterday", selectedParticipant: "Thanida Lertchai" },
  { id: "QST-9409", title: "Refresh faculty event calendar", person: "Chanon Preecha", other: "Data", amount: 1500, status: "Hidden", tone: "neutral", age: "2 days", selectedParticipant: "Ratchanon Srisai" },
  { id: "QST-9410", title: "Photograph greenhouse specimens", person: "Thanida Lertchai", other: "Photography", amount: 3900, status: "Open", tone: "success", age: "2 days", selectedParticipant: "Ratchanon Srisai" },
  { id: "QST-9411", title: "Translate student safety briefing", person: "Ratchanon Srisai", other: "Translation", amount: 2700, status: "Submitted", tone: "warning", age: "Yesterday", selectedParticipant: "Mayuree Nopparat" },
  { id: "QST-9412", title: "Film student sustainability fair", person: "Mayuree Nopparat", other: "Video", amount: 5600, status: "Disputed", tone: "danger", age: "2 days" },
  { id: "QST-9413", title: "Format scholarship application data", person: "Chanon Preecha", other: "Data", amount: 2400, status: "Completed", tone: "success", age: "3 days", selectedParticipant: "Chanon Preecha" },
  { id: "QST-9414", title: "Prepare campus event checklist", person: "Saran Jindapol", other: "Operations", amount: 1700, status: "Open", tone: "success", age: "3 days", selectedParticipant: "Kittipong Manee" },
  { id: "QST-9415", title: "Map accessible routes to lecture halls", person: "Kittipong Manee", other: "Accessibility research", amount: 6800, status: "Disputed", tone: "danger", age: "3 days" },
  { id: "QST-9416", title: "Build bilingual lab signage", person: "Nicha Prasert", other: "Design", amount: 2500, status: "Change pending", tone: "warning", age: "Today", selectedParticipant: "Thanida Lertchai" },
  { id: "QST-9417", title: "Summarize student transport survey", person: "Ratchanon Srisai", other: "Research", amount: 2800, status: "Completed", tone: "success", age: "4 days", selectedParticipant: "Ratchanon Srisai" },
  { id: "QST-9418", title: "Edit new-student welcome reel", person: "Thanida Lertchai", other: "Video", amount: 2600, status: "In progress", tone: "info", age: "4 days", selectedParticipant: "Saran Jindapol" },
  { id: "QST-9419", title: "Prepare faculty welcome video captions", person: "Thanida Lertchai", other: "Writing", amount: 2600, status: "Disputed", tone: "danger", age: "4 days", selectedParticipant: "Ratchanon Srisai" },
  { id: "QST-9420", title: "Verify campus recycling stations", person: "Chanon Preecha", other: "Field work", amount: 1900, status: "Completed", tone: "success", age: "5 days", selectedParticipant: "Mayuree Nopparat" },
  { id: "QST-9421", title: "Coordinate campus sustainability fair", person: "Nicha Prasert", other: "Event operations", amount: 7200, status: "Open", tone: "success", age: "Today", teamQuest: true, teamSize: 4, teamParticipants: [["Ratchanon Srisai", "Event coordinator"], ["Mayuree Nopparat", "Logistics lead"], ["Saran Jindapol", "Venue planner"], ["Thanida Lertchai", "Communications"]] },
  { id: "QST-9422", title: "Survey shaded study areas", person: "Ratchanon Srisai", other: "Field research", amount: 4600, status: "Submitted", tone: "warning", age: "Yesterday", teamQuest: true, teamSize: 3, teamParticipants: [["Kittipong Manee", "Site mapper"], ["Mayuree Nopparat", "Survey recorder"], ["Thanida Lertchai", "Evidence reviewer"]] },
  { id: "QST-9423", title: "Build orientation wayfinding kit", person: "Thanida Lertchai", other: "Design and copy", amount: 5900, status: "Completed", tone: "success", age: "2 days", teamQuest: true, teamSize: 5, teamParticipants: [["Ratchanon Srisai", "Information architect"], ["Nicha Prasert", "Copy editor"], ["Mayuree Nopparat", "Illustrator"], ["Saran Jindapol", "Field checker"], ["Kittipong Manee", "Accessibility reviewer"]] },
  { id: "QST-9424", title: "Audit accessible sports facilities", person: "Saran Jindapol", other: "Accessibility research", amount: 6400, status: "Change pending", tone: "warning", age: "Today", teamQuest: true, teamSize: 3, teamParticipants: [["Ratchanon Srisai", "Route mapper"], ["Mayuree Nopparat", "Facilities reviewer"], ["Thanida Lertchai", "Report writer"]] },
  { id: "QST-9425", title: "Prepare campus shuttle route guide", person: "Nicha Prasert", other: "Operations", amount: 2200, status: "Cancelled", tone: "cancelled", age: "Today", selectedParticipant: "Mayuree Nopparat", terminationReason: "The giver withdrew the request before work began." },
  { id: "QST-9426", title: "Catalog student support services", person: "Ratchanon Srisai", other: "Research", amount: 2400, status: "Assigned", tone: "assigned", age: "Today", selectedParticipant: "Saran Jindapol" },
];

data.users = [
  { id: "66100428", title: "Ratchanon Srisai", person: "ratchanon.s@ku.th", other: "Environmental Science · Year 3", amount: null, status: "Normal", tone: "success", age: "Joined 2024" },
  { id: "66100817", title: "Nicha Prasert", person: "nicha.p@ku.th", other: "Communication Arts · Year 4", amount: null, status: "Flag", tone: "warning", age: "1 active dispute" },
  { id: "65020314", title: "Kittipong Manee", person: "kittipong.m@ku.th", other: "Architecture · Year 3", amount: null, status: "Temp ban", tone: "danger", age: "Temporary all-quest ban · 5 days left" },
  { id: "66031246", title: "Saran Jindapol", person: "saran.j@ku.th", other: "Engineering · Year 2", amount: null, status: "Flag", tone: "warning", age: "1 active dispute" },
  { id: "65017652", title: "Mayuree Nopparat", person: "mayuree.n@ku.th", other: "Agriculture · Year 4", amount: null, status: "Normal", tone: "success", age: "Joined 2023" },
  { id: "66022508", title: "Thanida Lertchai", person: "thanida.l@ku.th", other: "Liberal Arts · Year 3", amount: null, status: "Normal", tone: "success", age: "Joined 2025" },
  { id: "65011409", title: "Chanon Preecha", person: "chanon.p@ku.th", other: "Digital Media · Year 2", amount: null, status: "Perm ban", tone: "danger", age: "Permanent all-quest ban" },
];

data.reports = [
  {
    id: "RPT-7001",
    reporterId: "66100428",
    reporterName: "Ratchanon Srisai",
    reportedUserId: "66100817",
    reportedUserName: "Nicha Prasert",
    category: "Harassment or abuse",
    details: "The reported user repeatedly sent misleading payment instructions during a marketplace conversation.",
    evidence: "Conversation export · PDF",
    status: "Active",
    tone: "warning",
    reportedAt: "27 Aug 2026 · 10:18 ICT",
  },
  {
    id: "RPT-7002",
    reporterId: "66022508",
    reporterName: "Thanida Lertchai",
    reportedUserId: "65020314",
    reportedUserName: "Kittipong Manee",
    category: "Fraud or payment issue",
    details: "The reported user asked to move a quest payment outside KuQuest after the work was accepted.",
    evidence: "Payment request screenshot · PNG",
    status: "Closed",
    tone: "neutral",
    reportedAt: "26 Aug 2026 · 16:42 ICT",
    closedAt: "26 Aug 2026 · 17:05 ICT",
    decision: "temporary-ban",
    decisionLabel: "Temporary ban",
    decisionDays: 7,
    decisionReason: "The submitted payment request was reviewed and retained as a policy violation record.",
  },
];

data.payouts = [
  { id: "PAY-8614", questId: "QST-9413", title: "Chanon Preecha", person: "Kasikorn · •••• 3186", other: "Quest QST-9413", amount: 2400, status: "Needs approval", tone: "warning", age: "16 min" },
  { id: "PAY-8611", questId: "QST-9417", title: "Ratchanon Srisai", person: "SCB · •••• 5812", other: "Quest QST-9417", amount: 2800, status: "Needs approval", tone: "warning", age: "42 min" },
  { id: "PAY-8607", questId: "QST-9405", title: "Nicha Prasert", person: "Krungthai · •••• 7410", other: "Quest QST-9405", amount: 1800, status: "Needs approval", tone: "warning", age: "1 hr" },
  { id: "PAY-8602", questId: "QST-9420", title: "Chanon Preecha", person: "Bangkok Bank · •••• 0924", other: "Quest QST-9420", amount: 1900, status: "Processing", tone: "info", age: "Today" },
  { id: "PAY-8598", questId: "QST-9413", title: "Chanon Preecha", person: "Kasikorn · •••• 3186", other: "Quest QST-9413", amount: 2400, status: "Completed", tone: "success", age: "Yesterday" },
  { id: "PAY-8592", questId: "QST-9405", title: "Nicha Prasert", person: "Krungthai · •••• 7410", other: "Quest QST-9405", amount: 1800, status: "Rejected", tone: "danger", age: "2 days" },
];

Object.keys(disputeCases).forEach((key) => delete disputeCases[key]);
Object.assign(disputeCases, {
  "DSP-4106": {
    questId: "QST-9403", category: "Missing verification photos", openedBy: "Saran Jindapol · Giver", respondent: "Mayuree Nopparat · Hunter", requested: "Require nighttime photo set", claim: "The accepted safety brief required nighttime photos for every dorm building, but the submission covers only daytime fixtures.", response: "The hunter says access to the west dorm was limited after hours and can return with a facilities escort.", recommended: "Compare the accepted checklist with the submitted evidence before requiring a supervised recheck.", policy: ["Accepted quest conditions control the decision", "Evidence timestamps are authoritative", "Administrative reasons are required"], signals: [["Evidence coverage", "71%", "warning"], ["Account risk", "Low", "success"], ["Response state", "Received", "info"]],
  },
  "DSP-4102": {
    questId: "QST-9406", category: "Translation accuracy", openedBy: "Nicha Prasert · Giver", respondent: "Kittipong Manee · Hunter", requested: "Correct three clinic terms", claim: "Three translated medical terms differ from the approved glossary and could change the meaning of the clinic signs.", response: "The hunter accepts the correction list and asks for a one-day rework window.", recommended: "Require a corrected sign set and keep funds held until the revised terms are verified.", policy: ["Published glossary controls terminology", "Submitted revisions must be traceable", "Funds remain held during an active dispute"], signals: [["Evidence coverage", "84%", "warning"], ["Account risk", "Medium", "warning"], ["Response state", "Acknowledged", "info"]],
  },
  "DSP-4098": {
    questId: "QST-9412", category: "Unapproved footage", openedBy: "Mayuree Nopparat · Giver", respondent: "Chanon Preecha · Hunter", requested: "Remove two interviews", claim: "Two interviews appear in the final sustainability-fair film but are absent from the accepted shot plan and consent register.", response: "The hunter says both interviews were recorded at the public booth and can be removed from a revised export.", recommended: "Require a consent-safe export with the two interviews removed before releasing funds.", policy: ["Consent records govern publication", "The accepted shot plan defines scope", "Every resolution needs an evidence-based reason"], signals: [["Evidence coverage", "68%", "warning"], ["Account risk", "High", "danger"], ["Response state", "Responded", "info"]],
  },
  "DSP-4095": {
    questId: "QST-9415", category: "Incomplete delivery", openedBy: "Kittipong Manee · Giver", respondent: "Ratchanon Srisai · Hunter", requested: "Complete the west-hall route", claim: "The accepted map required a continuous accessible route to the west lecture halls, but the alternate lift path is missing.", response: "The hunter says the lift was under maintenance during the survey and proposes a follow-up visit.", recommended: "Request the missing route evidence and keep the quest blocked until the map is complete.", policy: ["Accepted scope controls completion", "Location evidence must be verifiable", "Disputes pause quest progression"], signals: [["Evidence coverage", "62%", "warning"], ["Account risk", "Low", "success"], ["Response state", "Received", "info"]],
  },
  "DSP-4091": {
    questId: "QST-9419", category: "Late rework request", openedBy: "Thanida Lertchai · Giver", respondent: "Ratchanon Srisai · Hunter", requested: "Correct caption timing", claim: "The giver requested timing corrections after the review window and says the captions are not usable for the welcome video.", response: "The hunter says the delivered VTT matches the accepted transcript and the timing request arrived late.", recommended: "Compare the review-window timestamps with the accepted transcript before requiring any rework.", policy: ["Review windows apply to both parties", "Accepted transcripts define the requested output", "Resolution reasons must cite the record"], signals: [["Evidence coverage", "90%", "success"], ["Account risk", "Low", "success"], ["Response state", "Contested", "warning"]],
  },
  "DSP-4088": {
    questId: "QST-9405", category: "Usage rights", openedBy: "Chanon Preecha · Giver", respondent: "Nicha Prasert · Hunter", requested: "Permit external event reuse", claim: "The giver requested to reuse the completed labels at an external event after delivery.", response: "The hunter points to the accepted campus-only usage terms.", recommended: "Closed: retain the accepted campus-only rights and do not expand the license retroactively.", policy: ["Accepted usage terms control delivery", "Post-delivery scope changes require a new quest", "Closed cases are retained read-only"], signals: [["Evidence coverage", "100%", "success"], ["Account risk", "Low", "success"], ["Response state", "Resolved", "success"]],
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
