import {
  addUserHistory,
  adminDateTime,
  autoRejectUnavailablePayout,
  penaltyPolicy,
  recordActivity,
  seedGeneratedActivity,
} from "./runtime-seed";
import { data, disputeCases } from "./runtime-data";
import type { LegacyDomElement, LegacyHistoryEntry, LegacyRecord, LegacyRuntimeData } from "./runtime";

// Deterministic high-volume demo data. Versioning resets browser-local records
// whenever the synthetic marketplace scenario changes.
const freshDemoVersion = "2026-08-30-v50-dispute-role-eligibility";
const freshDemoKey = "kuquest-admin-demo-data";
const seedBaseDate = new Date("2026-08-28T08:00:00Z");

function seedDate(daysAgo: number, hour = 9, minute = 0): Date {
  const date = new Date(seedBaseDate);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function seedDateLabel(daysAgo: number, hour = 9, minute = 0): string {
  const date = seedDate(daysAgo, hour, minute);
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function seedDayLabel(daysAgo: number): string {
  return seedDate(daysAgo).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function relativeAge(daysAgo: number): string {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return `${daysAgo} days`;
}

const firstNames = [
  "Akarin", "Amara", "Benja", "Chayut", "Darin", "Emin", "Fah", "Gunn", "Hathaichanok", "Ingfa",
  "Jakkrit", "Kamonwan", "Lalin", "Mek", "Nalin", "Orapin", "Phurin", "Qilin", "Risa", "Saksit",
  "Thanya", "Uthai", "Vichuda", "Warin", "Xayla", "Yada", "Zirin", "Korn", "Ploy", "Nopphadon",
];
const lastNames = [
  "Ariyawat", "Boonprasert", "Chantarangsu", "Damrongchai", "Eiamsakul", "Fongfah", "Gerdsri", "Hemman",
  "Intharawong", "Jiraphan", "Kraisorn", "Lertwiroj", "Maneewan", "Nimman", "Onlamai", "Phanich",
  "Rattanaporn", "Saelim", "Tantipong", "Udomchai", "Vejjajiva", "Wattanakul", "Yindee", "Zamrin",
];
const faculties = [
  "Architecture", "Business Administration", "Communication Arts", "Computer Engineering", "Economics",
  "Education", "Environmental Science", "Food Science", "Forestry", "Geography", "Industrial Design",
  "Information Studies", "Landscape Architecture", "Liberal Arts", "Mathematics", "Political Science",
];
const accountStatuses = [
  "Normal", "Normal", "Normal", "Normal", "Normal", "Normal", "Normal", "Red Flag", "Normal", "Normal",
  "Temp ban", "Normal", "Normal", "Normal", "Perm ban", "Normal", "Normal", "Red Flag", "Normal", "Normal",
];
const adminNames = ["Nicha P.", "Pimchanok R.", "Worawut K."];

function statusTone(status: string): string {
  if (["Normal", "Completed", "Approved"].includes(status)) return "success";
  if (["Red Flag", "Submitted", "Change pending", "Needs approval"].includes(status)) return "warning";
  if (["Open"].includes(status)) return "success";
  if (["In progress", "Processing"].includes(status)) return "info";
  if (["Assigned"].includes(status)) return "assigned";
  if (["Cancelled"].includes(status)) return "cancelled";
  if (["Draft"].includes(status)) return "neutral";
  return "danger";
}

function userReviewRows(index: number): LegacyRecord[] {
  return Array.from({ length: 9 + (index % 7) }, (_, reviewIndex: number) => ({
    reviewer: `${firstNames[(index + reviewIndex + 4) % firstNames.length]} ${lastNames[(index + reviewIndex + 9) % lastNames.length]}`,
    rating: 3 + ((index + reviewIndex * 2) % 3),
    review: [
      "Clear updates and dependable delivery throughout the quest.",
      "The final work was accurate and easy for the team to use.",
      "Thoughtful questions helped clarify the project early.",
      "Well prepared, responsive, and professional from start to finish.",
    ][reviewIndex % 4],
    date: `${reviewIndex + 1} ${reviewIndex === 0 ? "week" : "month"}${reviewIndex === 0 ? "" : "s"} ago`,
    reports: reviewIndex === 4 && index % 5 === 0 ? 1 : 0,
    status: reviewIndex === 4 && index % 5 === 0 ? "Reported" : "Visible",
    tone: reviewIndex === 4 && index % 5 === 0 ? "warning" : "success",
  } as unknown as LegacyRecord));
}

const generatedUsers: LegacyRecord[] = Array.from({ length: 280 }, (_, index: number) => {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const title = `${firstName} ${lastName}`;
  const id = String(68000000 + index * 19 + (index % 7));
  const status = accountStatuses[index % accountStatuses.length];
  const createdDaysAgo = index === 1 ? 5 : 70 + ((index * 31) % 1_350);
  const activeDaysAgo = index % 15;
  const accountCreatedAt = seedDayLabel(createdDaysAgo);
  const activeAt = seedDateLabel(activeDaysAgo, 7 + (index % 11), (index * 11) % 60);
  const admin = adminNames[index % adminNames.length];
  const reason = status === "Normal"
    ? "No active moderation action."
    : status === "Red Flag"
      ? "An account activity report requires moderator review."
      : status === "Temp ban"
        ? "Repeated off-platform payment requests were recorded."
        : "Repeated policy violations were confirmed by an administrator.";
  const history: LegacyHistoryEntry[] = [{
    event: "Account created",
    at: accountCreatedAt,
    by: "System",
    note: "Account created.",
  }];
  if (status !== "Normal") {
    history.unshift({
      event: status === "Red Flag" ? "Red Flag applied" : status === "Temp ban" ? "Temporary ban applied" : "Permanent ban applied",
      at: activeAt,
      by: admin,
      reason,
      previousStatus: "Normal",
      newStatus: status,
    });
  }
  return {
    id,
    title,
    person: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ku.th`,
    other: `${faculties[index % faculties.length]} · Year ${(index % 4) + 1}`,
    status,
    tone: statusTone(status),
    age: status === "Normal"
      ? `Joined ${2022 + (index % 5)}`
      : status === "Temp ban"
        ? "Temporary all-quest ban · 6 days left"
        : status === "Perm ban"
          ? "Permanent all-quest ban"
          : "1 active report",
    accountCreatedAt,
    lastActiveAt: activeAt,
    statusReason: reason,
    statusAppliedAt: activeAt,
    statusAppliedBy: status === "Normal" ? "System" : admin,
    confirmedViolationCount: status === "Red Flag" ? 1 : status === "Temp ban" ? 2 : status === "Perm ban" ? 3 : 0,
    ...(index === 1 ? { newUserExemptionRemaining: penaltyPolicy.newUserExemptionCount } : {}),
    about: `${faculties[index % faculties.length]} student who helps university teams produce reliable research, documentation, and project support.`,
    tags: [faculties[index % faculties.length], ["Research", "Writing", "Field work", "Design"][index % 4], "University"],
    reviews: userReviewRows(index),
    ...(status === "Red Flag" ? {
      redFlagExpiresAt: seedDateLabel(-6, 16, 0),
      penalty: {
        label: "Red Flag",
        reason,
        recordedAt: activeAt,
        appliedBy: admin,
        durationDays: penaltyPolicy.redFlagDays,
        expiresAt: seedDateLabel(-6, 16, 0),
      },
    } : {}),
    ...(status === "Temp ban" ? {
      banExpiresAt: seedDateLabel(-6, 16, 0),
      penalty: {
        label: "Temporary ban",
        reason,
        recordedAt: activeAt,
        appliedBy: admin,
        durationDays: penaltyPolicy.temporaryBanDays,
        expiresAt: seedDateLabel(-6, 16, 0),
      },
    } : {}),
    ...(status === "Perm ban" ? {
      penalty: { label: "Permanent ban", reason, recordedAt: activeAt, appliedBy: admin },
    } : {}),
    moderationHistory: history,
    adminNotes: index % 13 === 0 ? [{
      at: activeAt,
      by: admin,
      note: "Synthetic review note retained for moderation testing.",
    }] : [],
  } as unknown as LegacyRecord;
});

data.users = generatedUsers;

const questTitles = [
  "Audit campus laboratory signage", "Map bicycle parking capacity", "Transcribe oral history interviews", "Test library room booking flow",
  "Photograph accessible entrances", "Build a campus biodiversity log", "Proofread scholarship guidance", "Compare cafeteria menu labels",
  "Survey evening shuttle demand", "Design orientation social cards", "Check emergency contact posters", "Clean research participant records",
  "Translate exchange student FAQs", "Record museum collection metadata", "Measure classroom daylight levels", "Create a student services index",
  "Review campus event accessibility", "Document campus water stations", "Catalogue student club handbooks", "Prepare faculty event calendar",
  "Verify quiet study room availability", "Organize community garden records", "Review student health resources", "Create a campus map legend",
  "Capture dorm maintenance evidence", "Summarize commuter survey results", "Build a bilingual lab directory", "Check flood route markers",
  "Design sustainable dining guide", "Classify library archive entries", "Review student orientation feedback", "Inventory shared equipment",
];
const questTags = [
  "Research", "Field work", "Writing", "Design", "Data", "Operations", "Accessibility research", "Translation", "Photography", "Video",
];
const questStatuses = [
  "Open", "Assigned", "In progress", "Submitted", "Change pending", "Completed", "Completed", "Cancelled", "Hidden", "Disputed", "Draft", "Approved",
];
const campusLocations = [
  "Kasetsart University, Bangkhen", "Central Library", "Student Activity Centre", "Faculty of Engineering", "Chalermphrakiat Building",
  "Kasetsart Innovation Centre", "Bangkhen Sports Complex", "Faculty of Agriculture", "Learning Resource Centre", "International College",
];

function createQuest(index: number): LegacyRecord {
  const status = questStatuses[index % questStatuses.length];
  const eligibleQuestUsers = data.users.filter(
    (candidate: LegacyRecord) => !["Temp ban", "Perm ban"].includes(candidate.status),
  );
  const hirer: LegacyRecord = eligibleQuestUsers[(index * 11 + 7) % eligibleQuestUsers.length];
  const eligibleParticipants = eligibleQuestUsers;
  const teamQuest = !["Draft", "Open", "Hidden", "Cancelled"].includes(status) && index % 9 === 0;
  const participantCount = teamQuest ? 3 : 1;
  const participants = Array.from({ length: participantCount }, (_, participantIndex: number) =>
    eligibleParticipants[(index * 13 + participantIndex * 17 + 5) % eligibleParticipants.length],
  ).filter((candidate: LegacyRecord | undefined, participantIndex: number, all: Array<LegacyRecord | undefined>) => candidate && candidate.id !== hirer.id && all.findIndex((item) => item?.id === candidate.id) === participantIndex) as LegacyRecord[];
  const amount = 1400 + ((index * 719) % 10_600);
  const createdDaysAgo = index < 12 ? index % 3 : 3 + ((index * 17) % 180);
  const createdAt = seedDateLabel(createdDaysAgo, 8 + (index % 9), (index * 13) % 60);
  const startsAt = seedDateLabel(Math.max(0, createdDaysAgo - 1), 8 + (index % 3), 30);
  const dueAt = seedDateLabel(Math.max(0, createdDaysAgo - 7), 18, 0);
  const title = questTitles[index % questTitles.length];
  const tag = questTags[index % questTags.length];
  const location = campusLocations[index % campusLocations.length];
  const hasApplicants = !["Draft", "Open", "Hidden"].includes(status);
  const selected = participants[0];
  const activityDate = seedDayLabel(createdDaysAgo);
  const applications = status === "Draft" || status === "Open"
    ? []
    : teamQuest
      ? participants.map((participant, participantIndex) => [participant.title, "Selected", ["Field lead", "Evidence reviewer", "Report writer"][participantIndex]])
      : selected
        ? [[selected.title, "Selected", "Assignment on record"]]
        : [];
  return {
    id: `QST-${String(12001 + index).padStart(5, "0")}`,
    title,
    person: hirer.title,
    other: tag,
    amount,
    createdAt,
    startsAt,
    dueAt,
    status,
    tone: statusTone(status),
    age: relativeAge(createdDaysAgo),
    description: `Complete the ${title.toLowerCase()} brief and submit a clear, verifiable record for the university marketplace team.`,
    giver: [hirer.title, hirer.id, hirer.other, `${4.4 + (index % 6) / 10} from ${4 + (index % 18)} quests`],
    location: [location, `${["Indoor and outdoor checkpoints", "Three campus zones", "Reference route confirmed"][index % 3]}`, `${13.84 + (index % 9) / 1000}, 100.${56 + (index % 20)}`],
    schedule: [startsAt, dueAt, status === "Draft" ? "Not published" : `Applications closed · ${activityDate}`],
    activity: [
      `Quest ${status === "Draft" ? "saved as draft" : "published"} · ${activityDate}, 09:10`,
      hasApplicants ? `Applications received · ${activityDate}, 12:30` : `Quest record created · ${activityDate}, 12:30`,
      `${status} · ${activityDate}, 16:45`,
    ],
    applications,
    ...(teamQuest ? {
      teamQuest: true,
      teamSize: 3,
      teamParticipants: participants.map((participant, participantIndex) => [participant.title, ["Field lead", "Evidence reviewer", "Report writer"][participantIndex]]),
    } : hasApplicants && selected ? { selectedParticipant: selected.title } : {}),
    giverAttachments: [
      { name: `${title} brief`, detail: `PDF · ${3 + (index % 8)} pages · added by ${hirer.title}` },
      { name: `${tag} reference notes`, detail: `XLSX · ${12 + (index % 40)} KB · added with quest` },
    ],
    ...( ["Submitted", "Completed", "Disputed"].includes(status) ? {
      proof: [`${title} delivery package · PDF · submitted ${relativeAge(Math.max(1, createdDaysAgo - 2)).toLowerCase()}`],
    } : { proof: [] }),
    candidateMode: status === "Draft" ? "Not published" : status === "Open" ? "FCFS" : "CANDIDATE",
    ...(status === "Cancelled" ? { terminationReason: "The hirer withdrew the request before work began." } : {}),
  } as unknown as LegacyRecord;
}

data.quests = Array.from({ length: 480 }, (_, index: number) => createQuest(index));

const disputeCategories = ["Evidence", "Quality", "Scope", "Delivery", "Timing", "Rights", "Payment", "Completion"];
Object.keys(disputeCases).forEach((key) => delete disputeCases[key]);
const disputableQuests = data.quests.filter((quest) => quest.status === "Disputed");

data.disputes = disputableQuests.map((quest: LegacyRecord, index: number) => {
  const hirer = data.users.find((user) => user.title === quest.person) || data.users[index % data.users.length];
  const workerName = quest.selectedParticipant || quest.teamParticipants?.[0]?.[0] || data.users[(index + 1) % data.users.length].title;
  const worker = data.users.find((user) => user.title === workerName) || data.users[(index + 1) % data.users.length];
  const category = disputeCategories[index % disputeCategories.length];
  const status = index % 3 === 2 ? "Closed" : "Active";
  const resolvedQuestStatus = index % 2 ? "Completed" : "Cancelled";
  if (status === "Closed") {
    quest.status = resolvedQuestStatus;
    quest.tone = statusTone(resolvedQuestStatus);
    const activity = quest.activity;
    if (Array.isArray(activity) && activity.every((event): event is string => typeof event === "string")) {
      quest.activity = activity.map((event) =>
        event.startsWith("Disputed ·")
          ? `${resolvedQuestStatus}${event.slice("Disputed".length)}`
          : event,
      );
    }
    if (resolvedQuestStatus === "Cancelled") {
      quest.terminationReason = "The dispute was resolved in the hirer's favor.";
    }
  }
  const record = {
    id: `DSP-${String(5201 + index).padStart(4, "0")}`,
    questId: quest.id,
    title: quest.title,
    person: hirer.title,
    other: worker.title,
    amount: quest.amount,
    status,
    tone: status === "Active" ? "danger" : "neutral",
    disputeDate: seedDateLabel((index % 30) + 1, 9 + (index % 8), (index * 7) % 60),
    disputeType: category,
    age: index < 2 ? `${18 + index * 24} min` : `${(index % 12) + 1} days`,
    detail: `The submitted record for ${quest.title.toLowerCase()} does not fully match the accepted quest conditions and requires an accountable review.`,
    evidence: [`${quest.title} submission · PDF · ${3 + (index % 8)} pages`, "Accepted quest conditions · PDF", "Participant message export · PDF"],
    ...(status === "Closed" ? {
      resolution: index % 2 ? "Worker wins; the accepted delivery remains on record." : "Hirer wins; the held amount was returned after review.",
      decisionReason: "The accepted quest terms and submitted evidence were compared before recording this outcome.",
    } : {}),
  };
  disputeCases[record.id] = {
    questId: quest.id,
    category: `${category} review`,
    openedBy: `${hirer.title} · Hirer`,
    respondent: `${worker.title} · Worker`,
    requested: "Admin review",
    claim: `The accepted brief for ${quest.title} requires a complete, verifiable delivery before funds can settle.`,
    response: "The responding party has acknowledged the case and is preparing supporting evidence.",
    recommended: "Review the accepted conditions and submitted evidence before resolving the held funds.",
    policy: ["Published quest condition controls scope", "Evidence timestamps are authoritative", "Administrative reason required"],
    signals: [["Evidence coverage", `${58 + (index % 38)}%`, "warning"], ["Account risk", index % 5 === 0 ? "High" : "Low", index % 5 === 0 ? "danger" : "success"], ["Response state", status, status === "Active" ? "info" : "neutral"]],
  };
  return record as LegacyRecord;
});

const reportCategories = ["Harassment or abuse", "Fraud or payment issue", "Misleading quest activity", "Other"];
data.reports = Array.from({ length: 180 }, (_, index: number) => {
  const reporter = data.users[(index * 5 + 13) % data.users.length];
  let reported = data.users[(index * 7 + 31) % data.users.length];
  if (reported.id === reporter.id) reported = data.users[(index * 7 + 32) % data.users.length];
  const quest = data.quests[(index * 3 + 19) % data.quests.length];
  const status = index % 5 === 0 ? "Active" : "Closed";
  const category = reportCategories[index % reportCategories.length];
  const reportedAt = seedDateLabel((index % 80) + 1, 8 + (index % 8), (index * 11) % 60);
  return {
    id: `RPT-${String(8201 + index).padStart(4, "0")}`,
    reporterId: reporter.id,
    reporterName: reporter.title,
    reportedUserId: reported.id,
    reportedUserName: reported.title,
    category,
    relatedQuestId: quest.id,
    relatedQuestTitle: quest.title,
    details: `The report concerns activity connected to ${quest.title}. The submitted record is retained for admin review and audit testing.`,
    evidence: index % 7 === 0 ? ["No attachment provided"] : [`${category} evidence · PDF`],
    status,
    tone: status === "Active" ? "warning" : "neutral",
    reportedAt,
    ...(status === "Closed" ? {
      closedAt: seedDateLabel((index % 70) + 1, 15, 30),
      decision: index % 3 === 0 ? "no-violation" : "confirmed-violation",
      decisionLabel: index % 3 === 0 ? "No violation" : "Violation confirmed",
      decisionReason: "The submitted activity and related quest history were reviewed before closing this report.",
      resolution: index % 3 === 0 ? "Report dismissed; no policy violation found." : "Violation confirmed; the account penalty ladder was applied.",
      resolvedBy: adminNames[index % adminNames.length],
      resolutionAt: seedDateLabel((index % 70) + 1, 15, 47),
    } : {}),
  } as unknown as LegacyRecord;
});

const payoutStatuses = ["Completed", "Processing", "Needs approval", "Rejected", "Completed", "Processing"];
type PayoutSource = { quest: LegacyRecord; recipientName: string };
const payoutSources: PayoutSource[] = data.quests
  .filter((quest) => quest.status === "Completed")
  .flatMap((quest) => {
    const recipients = quest.teamParticipants?.map(([name]) => name) || [quest.selectedParticipant];
    return recipients.filter((recipientName): recipientName is string => Boolean(recipientName)).map((recipientName) => ({ quest, recipientName }));
  });
const payoutRecipientSources: PayoutSource[] = [...new Map(payoutSources.map((source): [string, PayoutSource] => [source.recipientName, source])).values()];

function seedRecipientEarnings(recipientName: string): number {
  return data.quests
    .filter((quest) => quest.status === "Completed" && (quest.selectedParticipant === recipientName || quest.teamParticipants?.some(([name]) => name === recipientName)))
    .reduce((total: number, quest: LegacyRecord) => {
      const workerCount = quest.teamParticipants?.length || Number(quest.teamSize) || 1;
      return total + Math.round(Number(quest.amount || 0) / workerCount);
    }, 0);
}

const payoutLedgers = new Map<string, { committed: number; pending: number }>();
const generatedPayouts: LegacyRecord[] = Array.from({ length: 240 }, (_, index: number) => {
  const source = payoutRecipientSources[index % payoutRecipientSources.length];
  const quest = source.quest;
  const recipientName = source.recipientName;
  const earned = seedRecipientEarnings(recipientName);
  const ledger = payoutLedgers.get(recipientName) || { committed: 0, pending: 0 };
  const balance = Math.max(0, earned - ledger.committed - ledger.pending);
  let status = payoutStatuses[index % payoutStatuses.length];
  const requestedAmount = Math.max(1, Math.round(Math.max(balance, 1) * (status === "Rejected" ? 0.18 : 0.42)));
  const amount = Math.min(balance, requestedAmount);
  if (status === "Needs approval") ledger.pending += amount;
  if (["Processing", "Completed"].includes(status)) ledger.committed += amount;
  payoutLedgers.set(recipientName, ledger);
  const requestedAt = seedDateLabel(240 - index, 10 + (index % 7), (index * 13) % 60);
  return {
    id: `PAY-${String(9401 + index).padStart(4, "0")}`,
    questId: quest.id,
    title: recipientName,
    person: `${["Kasikorn", "SCB", "Krungthai", "Bangkok Bank"][index % 4]} · •••• ${String(1200 + ((index * 137) % 8800)).slice(-4)}`,
    other: `Quest ${quest.id}`,
    amount,
    status,
    tone: statusTone(status),
    age: `${240 - index} days`,
    requestedAt,
    ...(status === "Processing" || status === "Completed" ? { approvedAt: seedDateLabel(240 - index, 18, 15), approvedBy: adminNames[index % adminNames.length] } : {}),
    ...(status === "Rejected" ? { rejectedAt: seedDateLabel(240 - index, 19, 22), rejectedBy: adminNames[index % adminNames.length], rejectionReason: "The payout request requires additional account verification before funds can be released." } : {}),
  } as LegacyRecord;
});
data.payouts = generatedPayouts.reverse();

const savedFreshDemo = (() => {
  try {
    return JSON.parse(localStorage.getItem(freshDemoKey) || "null");
  } catch {
    return null;
  }
})();

if (savedFreshDemo?.version === freshDemoVersion) {
  ["disputes", "quests", "users", "payouts", "reports"].forEach((collection) => {
    const key = collection as keyof LegacyRuntimeData;
    const savedCollection = savedFreshDemo.collections?.[collection];
    if (Array.isArray(savedCollection)) data[key] = savedCollection as LegacyRecord[];
  });
} else {
  localStorage.removeItem(freshDemoKey);
}

function expirePenaltyIfDue(user: LegacyRecord): boolean {
  const expiry = user.status === "Red Flag" ? user.redFlagExpiresAt : user.status === "Temp ban" ? user.banExpiresAt : "";
  const expiryTimestamp = Date.parse(String(expiry || "").replace(" ยท ", " "));
  if (!expiry || !Number.isFinite(expiryTimestamp) || expiryTimestamp > Date.now()) return false;
  const previousStatus = user.status;
  const changedAt = adminDateTime();
  user.status = "Normal";
  user.tone = "success";
  user.statusReason = "No active moderation action.";
  user.statusAppliedAt = changedAt;
  user.statusAppliedBy = "System";
  user.age = "No active moderation action";
  delete user.redFlagExpiresAt;
  delete user.banExpiresAt;
  delete user.penalty;
  if (previousStatus === "Temp ban") user.postBanExemptionRemaining = penaltyPolicy.postBanExemptionCount;
  addUserHistory(user, {
    event: `${previousStatus} expired`,
    at: changedAt,
    by: "System",
    reason: previousStatus === "Temp ban" ? `The ${penaltyPolicy.temporaryBanDays}-day temporary ban ended.` : `The ${penaltyPolicy.redFlagDays}-day Red Flag period ended.`,
    previousStatus,
    newStatus: "Normal",
  });
  return true;
}

const expiredPenalties = data.users.filter(expirePenaltyIfDue);

export function persistAdminData(): void {
  localStorage.setItem(freshDemoKey, JSON.stringify({ version: freshDemoVersion, collections: data }));
}

const autoRejectedPayouts = typeof autoRejectUnavailablePayout === "function"
  ? data.payouts.filter((record) => autoRejectUnavailablePayout(record))
  : [];
if (!savedFreshDemo || savedFreshDemo.version !== freshDemoVersion || autoRejectedPayouts.length || expiredPenalties.length) persistAdminData();

if (typeof seedGeneratedActivity === "function") seedGeneratedActivity(data);

window.data = data;
window.persistAdminData = persistAdminData;
window.recordActivity = recordActivity;

function setSeedCounter(view: string, count: number): void {
  const counter = document.querySelector<LegacyDomElement>(`[data-view="${view}"] b`);
  if (counter) counter.textContent = String(count);
}

setSeedCounter("disputes", data.disputes.filter((record) => record.status === "Active").length);
setSeedCounter("payouts", data.payouts.filter((record) => record.status === "Needs approval").length);
setSeedCounter("reports", data.reports.filter((record) => record.status === "Active").length);
