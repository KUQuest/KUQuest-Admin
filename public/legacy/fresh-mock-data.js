// Deterministic high-volume demo data. Versioning resets browser-local records
// whenever the synthetic marketplace scenario changes.
const freshDemoVersion = "2026-08-28-v43-user-quest-history";
const freshDemoKey = "kuquest-admin-demo-data";
const seedBaseDate = new Date("2026-08-28T08:00:00Z");

function seedDate(daysAgo, hour = 9, minute = 0) {
  const date = new Date(seedBaseDate);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function seedDateLabel(daysAgo, hour = 9, minute = 0) {
  const date = seedDate(daysAgo, hour, minute);
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function seedDayLabel(daysAgo) {
  return seedDate(daysAgo).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const seededUsers = [
  {
    id: "66100428",
    title: "Ratchanon Srisai",
    person: "ratchanon.s@ku.th",
    other: "Environmental Science · Year 3",
    status: "Normal",
    tone: "success",
    age: "Joined 2024",
    accountCreatedAt: "12 Mar 2024",
    lastActiveAt: "28 Aug 2026 · 07:20",
    statusReason: "No active moderation action.",
    statusAppliedAt: "12 Mar 2024",
    statusAppliedBy: "System",
    moderationHistory: [{ event: "Account created", at: "12 Mar 2024", by: "System", note: "Account created." }],
    adminNotes: [],
  },
  {
    id: "66100817",
    title: "Nicha Prasert",
    person: "nicha.p@ku.th",
    other: "Communication Arts · Year 4",
    status: "Flag",
    tone: "warning",
    age: "1 active report",
    accountCreatedAt: "18 May 2023",
    lastActiveAt: "28 Aug 2026 · 06:12",
    statusReason: "An active harassment report requires moderator review.",
    statusAppliedAt: "28 Aug 2026 · 06:42",
    statusAppliedBy: "Nicha P.",
    moderationHistory: [
      { event: "Flag applied", at: "28 Aug 2026 · 06:42", by: "Nicha P.", reason: "An active harassment report requires moderator review.", previousStatus: "Normal", newStatus: "Flag" },
      { event: "Report received", at: "28 Aug 2026 · 06:26", by: "Ratchanon Srisai", note: "A synthetic report was submitted." },
      { event: "Account created", at: "18 May 2023", by: "System", note: "Account created." },
    ],
    adminNotes: [{ at: "28 Aug 2026 · 06:50", by: "Nicha P.", note: "Keep the account flagged while the active report is reviewed." }],
  },
  {
    id: "65020314",
    title: "Kittipong Manee",
    person: "kittipong.m@ku.th",
    other: "Architecture · Year 3",
    status: "Temp ban",
    tone: "danger",
    age: "Temporary all-quest ban · 6 days left",
    accountCreatedAt: "6 Feb 2024",
    lastActiveAt: "27 Aug 2026 · 15:41",
    statusReason: "Moved a quest payment discussion outside KuQuest after work was accepted.",
    statusAppliedAt: "27 Aug 2026 · 15:47",
    statusAppliedBy: "Nicha P.",
    banExpiresAt: "3 Sep 2026 · 15:47",
    penalty: { label: "Temporary ban", reason: "Moved a quest payment discussion outside KuQuest after work was accepted.", recordedAt: "27 Aug 2026 · 15:47", appliedBy: "Nicha P.", expiresAt: "3 Sep 2026 · 15:47" },
    moderationHistory: [
      { event: "Temporary ban applied", at: "27 Aug 2026 · 15:47", by: "Nicha P.", reason: "Moved a quest payment discussion outside KuQuest after work was accepted.", previousStatus: "Normal", newStatus: "Temp ban" },
      { event: "Report resolved", at: "27 Aug 2026 · 15:47", by: "Nicha P.", reason: "Fraud or payment issue confirmed." },
      { event: "Account created", at: "6 Feb 2024", by: "System", note: "Account created." },
    ],
    adminNotes: [],
  },
  {
    id: "66031246",
    title: "Saran Jindapol",
    person: "saran.j@ku.th",
    other: "Engineering · Year 2",
    status: "Flag",
    tone: "warning",
    age: "1 active report",
    accountCreatedAt: "21 Sep 2024",
    lastActiveAt: "28 Aug 2026 · 04:04",
    statusReason: "An active harassment report is awaiting review.",
    statusAppliedAt: "28 Aug 2026 · 04:31",
    statusAppliedBy: "Nicha P.",
    moderationHistory: [
      { event: "Flag applied", at: "28 Aug 2026 · 04:31", by: "Nicha P.", reason: "An active harassment report is awaiting review.", previousStatus: "Normal", newStatus: "Flag" },
      { event: "Report received", at: "28 Aug 2026 · 04:18", by: "Kittipong Manee", note: "A synthetic report was submitted." },
      { event: "Account created", at: "21 Sep 2024", by: "System", note: "Account created." },
    ],
    adminNotes: [],
  },
  {
    id: "65017652",
    title: "Mayuree Nopparat",
    person: "mayuree.n@ku.th",
    other: "Agriculture · Year 4",
    status: "Normal",
    tone: "success",
    age: "Joined 2023",
    accountCreatedAt: "4 Aug 2023",
    lastActiveAt: "28 Aug 2026 · 05:46",
    statusReason: "No active moderation action.",
    statusAppliedAt: "26 Aug 2026 · 14:02",
    statusAppliedBy: "Nicha P.",
    moderationHistory: [{ event: "Report dismissed", at: "26 Aug 2026 · 14:02", by: "Nicha P.", reason: "The activity log confirmed the final quest terms were accepted before work began.", previousStatus: "Normal", newStatus: "Normal" }, { event: "Account created", at: "4 Aug 2023", by: "System", note: "Account created." }],
    adminNotes: [],
  },
  {
    id: "66022508",
    title: "Thanida Lertchai",
    person: "thanida.l@ku.th",
    other: "Liberal Arts · Year 3",
    status: "Normal",
    tone: "success",
    age: "Joined 2025",
    accountCreatedAt: "11 Jan 2025",
    lastActiveAt: "27 Aug 2026 · 17:05",
    statusReason: "No penalty applied; the current report remains under review.",
    statusAppliedAt: "11 Jan 2025",
    statusAppliedBy: "System",
    moderationHistory: [{ event: "Report received", at: "27 Aug 2026 · 17:05", by: "Nicha Prasert", note: "A synthetic report was submitted." }, { event: "Account created", at: "11 Jan 2025", by: "System", note: "Account created." }],
    adminNotes: [],
  },
  {
    id: "65011409",
    title: "Chanon Preecha",
    person: "chanon.p@ku.th",
    other: "Digital Media · Year 2",
    status: "Perm ban",
    tone: "danger",
    age: "Permanent all-quest ban",
    accountCreatedAt: "9 Jul 2022",
    lastActiveAt: "26 Aug 2026 · 16:46",
    statusReason: "Repeated harassment after a previous warning.",
    statusAppliedAt: "26 Aug 2026 · 16:46",
    statusAppliedBy: "Nicha P.",
    penalty: { label: "Permanent ban", reason: "Repeated harassment after a previous warning.", recordedAt: "26 Aug 2026 · 16:46", appliedBy: "Nicha P." },
    moderationHistory: [{ event: "Permanent ban applied", at: "26 Aug 2026 · 16:46", by: "Nicha P.", reason: "Repeated harassment after a previous warning.", previousStatus: "Flag", newStatus: "Perm ban" }, { event: "Report resolved", at: "26 Aug 2026 · 16:46", by: "Nicha P.", reason: "Violation confirmed." }, { event: "Warning issued", at: "24 Aug 2026 · 10:15", by: "Nicha P.", reason: "Harassment report confirmed." }, { event: "Account created", at: "9 Jul 2022", by: "System", note: "Account created." }],
    adminNotes: [{ at: "26 Aug 2026 · 17:05", by: "Nicha P.", note: "Payouts require separate financial review after the permanent ban." }],
  },
];

const firstNames = [
  "Anan", "Arisa", "Boonmee", "Chalida", "Daranee", "Ekkachai", "Fahsai", "Jirawat", "Kanya", "Lalita",
  "Manat", "Narin", "Nattaya", "Orathai", "Pasin", "Rinrada", "Siriporn", "Teerawat", "Udom", "Waranya",
];
const lastNames = [
  "Boonma", "Chaiyapruk", "Charoensuk", "Dhanakij", "Inthanon", "Jantana", "Kanjana", "Kittisak", "Limsakul", "Maneerat",
  "Nakorn", "Phromphak", "Rattanakul", "Saengsawang", "Sakulchai", "Sangthong", "Sittichai", "Suwannarat", "Thaworn", "Wongsa",
];
const faculties = ["Computer Engineering", "Economics", "Forestry", "Food Science", "Geography", "Industrial Design", "Information Studies", "Landscape Architecture", "Mathematics", "Political Science"];
const accountStatuses = ["Normal", "Normal", "Normal", "Normal", "Normal", "Normal", "Flag", "Normal", "Normal", "Temp ban", "Normal", "Normal", "Normal", "Perm ban"];

function statusTone(status) {
  return status === "Normal" || status === "Completed" ? "success" : status === "Flag" || status === "Submitted" || status === "Change pending" || status === "Rework" || status === "Needs approval" ? "warning" : status === "Open" ? "success" : status === "In progress" || status === "Processing" ? "info" : status === "Assigned" ? "assigned" : status === "Cancelled" ? "cancelled" : "danger";
}

const generatedUsers = Array.from({ length: 133 }, (_, index) => {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const title = `${firstName} ${lastName}`;
  const id = String(67000000 + index * 17 + (index % 5));
  const status = accountStatuses[index % accountStatuses.length];
  const createdDaysAgo = 240 + ((index * 29) % 1_100);
  const accountCreatedAt = seedDayLabel(createdDaysAgo);
  const activeAt = seedDateLabel(index % 9, 7 + (index % 10), (index * 7) % 60);
  const reason = status === "Normal" ? "No active moderation action." : status === "Flag" ? "An account activity report requires moderator review." : status === "Temp ban" ? "Repeated off-platform payment requests were recorded." : "Repeated policy violations were confirmed by an administrator.";
  const history = [{ event: `${status === "Flag" ? "Flag" : status === "Temp ban" ? "Temporary ban" : status === "Perm ban" ? "Permanent ban" : "Account"} ${status === "Normal" ? "created" : "applied"}`, at: activeAt, by: status === "Normal" ? "System" : "Nicha P.", reason: status === "Normal" ? undefined : reason, previousStatus: status === "Normal" ? undefined : "Normal", newStatus: status }];
  history.push({ event: "Account created", at: accountCreatedAt, by: "System", note: "Account created." });
  return {
    id,
    title,
    person: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ku.th`,
    other: `${faculties[index % faculties.length]} · Year ${(index % 4) + 1}`,
    status,
    tone: statusTone(status),
    age: status === "Normal" ? `Joined ${2023 + (index % 4)}` : status === "Temp ban" ? "Temporary all-quest ban · 5 days left" : status === "Perm ban" ? "Permanent all-quest ban" : "1 active report",
    accountCreatedAt,
    lastActiveAt: activeAt,
    statusReason: reason,
    statusAppliedAt: activeAt,
    statusAppliedBy: status === "Normal" ? "System" : "Nicha P.",
    ...(status === "Temp ban" ? { banExpiresAt: seedDateLabel(Math.max(0, (index % 5) - 2), 7, 0), penalty: { label: "Temporary ban", reason, recordedAt: activeAt, appliedBy: "Nicha P.", expiresAt: seedDateLabel(0, 7, 0) } } : {}),
    ...(status === "Perm ban" ? { penalty: { label: "Permanent ban", reason, recordedAt: activeAt, appliedBy: "Nicha P." } } : {}),
    moderationHistory: history,
    adminNotes: index % 11 === 0 ? [{ at: activeAt, by: "Nicha P.", note: "Synthetic review note retained for moderation testing." }] : [],
  };
});

data.users = [...seededUsers, ...generatedUsers];

const questSeedSpecs = [
  ["QST-9401", "Map quiet study rooms", "Accessibility research", "In progress"],
  ["QST-9403", "Verify dorm fire exits", "Safety research", "Disputed"],
  ["QST-9404", "Edit international student handbook", "Writing", "Submitted"],
  ["QST-9406", "Translate clinic wayfinding signs", "Translation", "Disputed"],
  ["QST-9407", "Map accessible lecture routes", "Accessibility research", "Change pending"],
  ["QST-9412", "Record student wellbeing interviews", "Video", "Disputed"],
  ["QST-9415", "Survey shaded study areas", "Field research", "Disputed"],
  ["QST-9416", "Build bilingual lab directory", "Design", "Change pending"],
  ["QST-9419", "Caption faculty welcome series", "Writing", "Disputed"],
  ["QST-9424", "Audit sports facility access", "Accessibility research", "Change pending"],
  ["QST-9501", "Catalogue lab safety equipment", "Field work", "Open"],
  ["QST-9502", "Prepare orientation checklist", "Operations", "Assigned"],
  ["QST-9503", "Clean scholarship application dataset", "Data", "Completed"],
  ["QST-9504", "Photograph campus pollinators", "Photography", "Open"],
  ["QST-9505", "Design recycling campaign posters", "Design", "Completed"],
  ["QST-9506", "Summarize commuter survey", "Research", "Completed"],
  ["QST-9507", "Edit new-student welcome video", "Video", "In progress"],
  ["QST-9508", "Film sustainability fair recap", "Video", "Rework"],
  ["QST-9509", "Audit faculty room inventory", "Data", "Hidden"],
  ["QST-9510", "Verify recycling station locations", "Field work", "Completed"],
  ["QST-9511", "Coordinate sustainability fair volunteers", "Event operations", "Open"],
  ["QST-9512", "Survey accessible campus entrances", "Field research", "Submitted"],
  ["QST-9513", "Build campus wayfinding kit", "Design and copy", "Completed"],
  ["QST-9514", "Prepare shuttle route guide", "Operations", "Cancelled"],
  ["QST-9515", "Catalog student support services", "Research", "Assigned"],
  ["QST-9516", "Review campus tree inventory", "Research", "Disputed"],
];
const questTitles = [
  "Document campus water stations", "Review student club handbooks", "Create a faculty event calendar", "Audit laboratory signage", "Map bicycle parking capacity", "Transcribe oral history interviews", "Test library room booking flow", "Photograph accessible entrances", "Build a campus biodiversity log", "Proofread scholarship guidance", "Compare cafeteria menu labels", "Survey evening shuttle demand", "Design orientation social cards", "Check emergency contact posters", "Clean research participant records", "Translate exchange student FAQs", "Record museum collection metadata", "Measure classroom daylight levels", "Create a student services index", "Review campus event accessibility",
];
const questTags = ["Research", "Field work", "Writing", "Design", "Data", "Operations", "Accessibility research", "Translation", "Photography", "Video"];
const questStatuses = ["Open", "Assigned", "In progress", "Submitted", "Change pending", "Rework", "Completed", "Cancelled", "Hidden"];

function createQuest(id, title, tag, requestedStatus, index) {
  const status = requestedStatus || (index % 4 === 0 ? "Disputed" : questStatuses[index % questStatuses.length]);
  const hirer = data.users[(index * 7) % data.users.length];
  const teamQuest = index % 8 === 0 || index % 13 === 0;
  const eligibleParticipants = data.users.filter((candidate) => !["Temp ban", "Perm ban"].includes(candidate.status));
  const participants = [1, 2, 3, 4]
    .map((offset) => eligibleParticipants[(index * 11 + offset + 3) % eligibleParticipants.length])
    .filter((candidate) => candidate && candidate.id !== hirer.id);
  const amount = 1800 + ((index * 683) % 8_200);
  const hasParticipant = !["Open", "Hidden"].includes(status);
  const createdDaysAgo = index < 12 ? index % 3 : index < 24 ? 1 + (index % 2) : 3 + (index % 45);
  const createdAt = seedDateLabel(createdDaysAgo, 9 + (index % 6), (index * 13) % 60);
  const startsAt = seedDateLabel(Math.max(0, createdDaysAgo - 1), 8 + (index % 3), 30);
  const dueAt = seedDateLabel(Math.max(0, createdDaysAgo - 5), 18, 0);
  return {
    id,
    title,
    person: hirer.title,
    other: tag,
    amount,
    createdAt,
    startsAt,
    dueAt,
    status,
    tone: statusTone(status),
    age: index < 12 ? "Today" : index < 24 ? "Yesterday" : `${(index % 8) + 1} days`,
    ...(teamQuest ? { teamQuest: true, teamSize: 3, teamParticipants: participants.slice(0, 3).map((candidate, participantIndex) => [candidate.title, ["Field lead", "Evidence reviewer", "Report writer"][participantIndex]]) } : hasParticipant ? { selectedParticipant: participants[0].title } : {}),
    candidateMode: status === "Open" ? "FCFS" : "CANDIDATE",
    ...(status === "Cancelled" ? { terminationReason: "The hirer withdrew the request before work began." } : {}),
  };
}

data.quests = questSeedSpecs.map((spec, index) => createQuest(...spec, index)).concat(
  Array.from({ length: 174 }, (_, index) => {
    const sequence = index + 1;
    return createQuest(`QST-${String(9600 + sequence).padStart(4, "0")}`, questTitles[index % questTitles.length], questTags[index % questTags.length], null, questSeedSpecs.length + index);
  }),
);

const disputeCategories = ["Evidence", "Quality", "Scope", "Delivery", "Timing", "Rights", "Payment", "Completion"];
Object.keys(disputeCases).forEach((key) => delete disputeCases[key]);
const disputableQuests = data.quests.filter((quest) => quest.status === "Disputed").slice(0, 36);

data.disputes = disputableQuests.map((quest, index) => {
  const hirer = data.users.find((user) => user.title === quest.person) || data.users[index % data.users.length];
  const workerName = quest.selectedParticipant || quest.teamParticipants?.[0]?.[0] || data.users[(index + 1) % data.users.length].title;
  const worker = data.users.find((user) => user.title === workerName) || data.users[(index + 1) % data.users.length];
  const category = disputeCategories[index % disputeCategories.length];
  const status = index % 3 === 2 ? "Closed" : "Active";
  const amount = quest.amount;
  const record = {
    id: `DSP-${String(4201 + index).padStart(4, "0")}`,
    title: quest.title,
    person: hirer.title,
    other: worker.title,
    amount,
    status,
    tone: status === "Active" ? "danger" : "neutral",
    disputeDate: seedDateLabel((index % 12) + 1, 9 + (index % 8), (index * 7) % 60),
    disputeType: category,
    age: index < 2 ? `${18 + index * 24} min` : `${(index % 6) + 1} days`,
    detail: `The submitted record for ${quest.title.toLowerCase()} does not fully match the accepted quest conditions and requires an accountable review.`,
    evidence: [`${quest.title} submission · PDF · ${3 + (index % 8)} pages`, "Accepted quest conditions · PDF", "Participant message export · PDF"],
    ...(status === "Closed" ? { resolution: index % 2 ? "Worker wins; the accepted delivery remains on record." : "Hirer wins; the held amount was returned after review.", decisionReason: "The accepted quest terms and submitted evidence were compared before recording this outcome." } : {}),
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
  return record;
});

const reportCategories = ["Harassment or abuse", "Fraud or payment issue", "Misleading quest activity", "Other"];
data.reports = Array.from({ length: 48 }, (_, index) => {
  const reporter = data.users[(index * 5 + 2) % data.users.length];
  let reported = data.users[(index * 7 + 7) % data.users.length];
  if (reported.id === reporter.id) reported = data.users[(index * 7 + 8) % data.users.length];
  const quest = data.quests[(index * 3 + 2) % data.quests.length];
  const status = index % 4 === 0 ? "Active" : "Closed";
  const reportedAt = seedDateLabel((index % 18) + 1, 8 + (index % 8), (index * 11) % 60);
  return {
    id: `RPT-${String(7101 + index).padStart(4, "0")}`,
    reporterId: reporter.id,
    reporterName: reporter.title,
    reportedUserId: reported.id,
    reportedUserName: reported.title,
    category: reportCategories[index % reportCategories.length],
    relatedQuestId: quest.id,
    relatedQuestTitle: quest.title,
    details: `The report concerns activity connected to ${quest.title}. The submitted record is retained for admin review and audit testing.`,
    evidence: index % 7 === 0 ? "No attachment provided" : `${reportCategories[index % reportCategories.length]} evidence · PDF`,
    status,
    tone: status === "Active" ? "warning" : "neutral",
    reportedAt,
    ...(status === "Closed" ? { closedAt: seedDateLabel((index % 16) + 1, 15, 30), decision: index % 3 === 0 ? "flag" : "do-nothing", decisionLabel: index % 3 === 0 ? "Flag only" : "Do nothing", decisionReason: "The submitted activity and related quest history were reviewed before closing this report.", resolution: index % 3 === 0 ? "Flag only applied." : "Report dismissed; no policy violation found.", resolvedBy: "Nicha P.", resolutionAt: seedDateLabel((index % 16) + 1, 15, 47) } : {}),
  };
});

const payoutStatuses = ["Completed", "Processing", "Completed", "Rejected", "Needs approval"];
const payoutSources = data.quests
  .filter((quest) => quest.status === "Completed")
  .flatMap((quest) => {
    const recipients = quest.teamParticipants?.map(([name]) => name) || [quest.selectedParticipant];
    return recipients.filter(Boolean).map((recipientName) => ({ quest, recipientName }));
  });
const payoutRecipientSources = [...new Map(payoutSources.map((source) => [source.recipientName, source])).values()];
function seedRecipientEarnings(recipientName) {
  return data.quests
    .filter((quest) => quest.status === "Completed" && (quest.selectedParticipant === recipientName || quest.teamParticipants?.some(([name]) => name === recipientName)))
    .reduce((total, quest) => {
      const workerCount = quest.teamParticipants?.length || Number(quest.teamSize) || 1;
      return total + Math.round(Number(quest.amount || 0) / workerCount);
    }, 0);
}
const payoutLedgers = new Map();
const generatedPayouts = Array.from({ length: 90 }, (_, index) => {
  const source = payoutRecipientSources[index % payoutRecipientSources.length];
  const quest = source.quest;
  const recipientName = source.recipientName;
  const recipient = data.users.find((user) => user.title === recipientName) || data.users[(index + 4) % data.users.length];
  const earned = seedRecipientEarnings(recipient.title);
  const ledger = payoutLedgers.get(recipient.title) || { committed: 0, pending: 0 };
  const balance = Math.max(0, earned - ledger.committed - ledger.pending);
  let status = payoutStatuses[index % payoutStatuses.length];
  let amount;
  if (status === "Needs approval") {
    if (balance <= 0) {
      status = "Rejected";
      amount = Math.max(1, Math.round(earned * 0.2));
    } else {
      amount = Math.max(1, Math.min(balance, Math.round(balance * 0.6)));
      ledger.pending += amount;
    }
  } else if (status === "Processing" || status === "Completed") {
    if (balance <= 0) {
      status = "Rejected";
      amount = Math.max(1, Math.round(earned * 0.2));
    } else {
      amount = Math.max(1, Math.min(balance, Math.round(balance * 0.6)));
      ledger.committed += amount;
    }
  } else {
    amount = Math.max(1, Math.min(Math.max(balance, 1), Math.round(Math.max(earned, 1) * 0.2)));
  }
  payoutLedgers.set(recipient.title, ledger);
  const requestedAt = seedDateLabel(90 - index, 10 + (index % 7), (index * 13) % 60);
  return {
    id: `PAY-${String(8625 + index).padStart(4, "0")}`,
    questId: quest.id,
    title: recipient.title,
    person: `${["Kasikorn", "SCB", "Krungthai", "Bangkok Bank"][index % 4]} · •••• ${String(1200 + ((index * 137) % 8800)).slice(-4)}`,
    other: `Quest ${quest.id}`,
    amount,
    status,
    tone: statusTone(status),
    age: `${90 - index} days`,
    requestedAt,
    ...(status === "Processing" || status === "Completed" ? { approvedAt: seedDateLabel(90 - index, 18, 15), approvedBy: "Nicha P." } : {}),
    ...(status === "Rejected" ? { rejectedAt: seedDateLabel(90 - index, 19, 22), rejectedBy: "Nicha P.", rejectionReason: "The payout request requires additional account verification before funds can be released." } : {}),
  };
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
    if (Array.isArray(savedFreshDemo.collections?.[collection])) data[collection] = savedFreshDemo.collections[collection];
  });
} else {
  localStorage.removeItem(freshDemoKey);
}

function persistAdminData() {
  localStorage.setItem(freshDemoKey, JSON.stringify({ version: freshDemoVersion, collections: data }));
}

const autoRejectedPayouts = typeof autoRejectUnavailablePayout === "function"
  ? data.payouts.filter((record) => autoRejectUnavailablePayout(record))
  : [];
if (!savedFreshDemo || savedFreshDemo.version !== freshDemoVersion || autoRejectedPayouts.length) persistAdminData();

if (typeof seedGeneratedActivity === "function") seedGeneratedActivity(data);

function setSeedCounter(view, count) {
  const counter = document.querySelector(`[data-view="${view}"] b`);
  if (counter) counter.textContent = count;
}

setSeedCounter("disputes", data.disputes.filter((record) => record.status === "Active").length);
setSeedCounter("payouts", data.payouts.filter((record) => record.status === "Needs approval").length);
setSeedCounter("reports", data.reports.filter((record) => record.status === "Active").length);
if (state.view === "home") renderHome();
else if (state.view === "activity") renderActivity();
