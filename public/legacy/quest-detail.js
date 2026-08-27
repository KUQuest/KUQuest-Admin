const pendingQuestChanges = {
  "QST-9407": {
    id: "EDT-402",
    status: "Awaiting participant consent",
    requestedBy: "Kittipong Manee · Hirer",
    requestedAt: "Today, 09:26",
    reason:
      "The library asked for quiet-floor opening hours and accessible route notes to be included in the handover.",
    responses: [
      ["Ratchanon Srisai", "Pending", "Worker"],
      ["Kittipong Manee", "Approved", "Hirer"],
    ],
    changes: [
      [
        "Quest description",
        "Map five library floors and identify quiet study areas",
        "Add quiet-floor opening hours and accessibility route notes",
        "Scope increase",
      ],
      [
        "Location",
        "Main library, floors 1–5",
        "Main library, floors 1–5 + accessible routes",
        "Scope increase",
      ],
      [
        "Due date",
        "30 Aug 2026 · 18:00",
        "1 Sep 2026 · 18:00",
        "2 days later",
      ],
    ],
  },
  "QST-9416": {
    id: "EDT-403",
    status: "Awaiting participant consent",
    requestedBy: "Nicha Prasert · Hirer",
    requestedAt: "Today, 08:52",
    reason:
      "The lab requested bilingual wording and QR directions for the additional entrances.",
    responses: [
      ["Thanida Lertchai", "Pending", "Worker"],
      ["Nicha Prasert", "Approved", "Hirer"],
    ],
    changes: [
      [
        "Quest description",
        "Create signs for three lab entrances",
        "Add bilingual wording and QR directions for six entrances",
        "Scope increase",
      ],
      [
        "Deliverables",
        "6 sign layouts",
        "6 final sign layouts + print-ready QR labels",
        "New deliverable",
      ],
      [
        "Due date",
        "29 Aug 2026 · 18:00",
        "31 Aug 2026 · 18:00",
        "2 days later",
      ],
    ],
  },
  "QST-9424": {
    id: "EDT-404",
    status: "Awaiting participant consent",
    requestedBy: "Saran Jindapol · Hirer",
    requestedAt: "Today, 09:04",
    reason:
      "Facilities access expanded to include changing-room routes and slope measurements.",
    responses: [
      ["Ratchanon Srisai", "Approved", "Route mapper"],
      ["Mayuree Nopparat", "Pending", "Facilities reviewer"],
      ["Thanida Lertchai", "Pending", "Report writer"],
      ["Saran Jindapol", "Approved", "Hirer"],
    ],
    changes: [
      [
        "Quest description",
        "Audit ramps, lifts, and accessible entrances",
        "Add changing-room routes and slope measurements",
        "Scope increase",
      ],
      [
        "Deliverables",
        "Facility checklist and route notes",
        "Checklist, route notes, and photo evidence",
        "New deliverable",
      ],
      [
        "Due date",
        "31 Aug 2026 · 18:00",
        "2 Sep 2026 · 18:00",
        "2 days later",
      ],
    ],
  },
  "QST-9507": {
    id: "EDT-405",
    status: "Awaiting participant consent",
    requestedBy: "Kittipong Manee · Hirer",
    requestedAt: "Today, 10:14",
    reason:
      "The study-area request expanded to include shaded outdoor seating and noise-level readings.",
    responses: [
      ["Ratchanon Srisai", "Pending", "Worker"],
      ["Kittipong Manee", "Approved", "Hirer"],
    ],
    changes: [
      [
        "Quest description",
        "Survey shaded study areas around the main library",
        "Add outdoor seating capacity and noise-level readings",
        "Scope increase",
      ],
      [
        "Location",
        "Main library grounds and reading garden",
        "Main library grounds, reading garden, and west courtyard",
        "Scope increase",
      ],
      [
        "Due date",
        "30 Aug 2026 · 18:00",
        "1 Sep 2026 · 18:00",
        "2 days later",
      ],
    ],
  },
  "QST-9516": {
    id: "EDT-406",
    status: "Awaiting participant consent",
    requestedBy: "Nicha Prasert · Hirer",
    requestedAt: "Today, 09:48",
    reason:
      "The faculty asked for accessible copy and a bilingual lab directory before publication.",
    responses: [
      ["Thanida Lertchai", "Pending", "Worker"],
      ["Nicha Prasert", "Approved", "Hirer"],
    ],
    changes: [
      [
        "Quest description",
        "Build a directory for six campus labs",
        "Add accessible descriptions and bilingual labels for all six labs",
        "Scope increase",
      ],
      [
        "Deliverables",
        "Lab directory draft",
        "Accessible bilingual directory + label sheet",
        "New deliverable",
      ],
      [
        "Due date",
        "31 Aug 2026 · 18:00",
        "2 Sep 2026 · 18:00",
        "2 days later",
      ],
    ],
  },
  "QST-9524": {
    id: "EDT-407",
    status: "Awaiting participant consent",
    requestedBy: "Saran Jindapol · Hirer",
    requestedAt: "Today, 09:32",
    reason:
      "Facilities requested a second route pass through the sports complex and updated slope measurements.",
    responses: [
      ["Ratchanon Srisai", "Approved", "Route mapper"],
      ["Mayuree Nopparat", "Pending", "Facilities reviewer"],
      ["Thanida Lertchai", "Pending", "Report writer"],
      ["Saran Jindapol", "Approved", "Hirer"],
    ],
    changes: [
      [
        "Quest description",
        "Audit sports facility access",
        "Add changing-room routes and slope measurements",
        "Scope increase",
      ],
      [
        "Deliverables",
        "Facility checklist and route notes",
        "Checklist, route notes, and photo evidence",
        "New deliverable",
      ],
      [
        "Due date",
        "2 Sep 2026 · 18:00",
        "4 Sep 2026 · 18:00",
        "2 days later",
      ],
    ],
  },
};

const questRelations = {
  "QST-9401": {
    description:
      "Review accessible routes between student services, the central library, and the west lecture halls. The team must document ramps, lifts, surface barriers, and alternate paths.",
    giver: ["Nicha Prasert", "66031246", "Communication Arts · Year 4", "4.8 from 14 quests"],
    location: ["Kasetsart University, Bangkhen", "Five campus zones · indoor and outdoor routes", "Route checkpoints on file"],
    schedule: ["26 Aug 2026 · 08:30", "30 Aug 2026 · 18:00", "Applications closed 25 Aug"],
    activity: ["Quest published · 24 Aug, 10:15", "Applications closed · 25 Aug, 16:00", "Three-person team selected · 25 Aug, 17:20", "Field work started · Today, 08:34"],
    applications: [["Kittipong Manee", "Selected", "Accessibility lead"], ["Ratchanon Srisai", "Selected", "Survey recorder"], ["Saran Jindapol", "Selected", "Route mapper"], ["Chanon Preecha", "Not selected", "Application retained"]],
    proof: [],
  },
  "QST-9407": {
    description:
      "Map quiet study areas across the main library and document accessibility routes, opening hours, and noise-level guidance for students.",
    giver: ["Kittipong Manee", "65020314", "Architecture · Year 3", "4.7 from 9 quests"],
    location: ["Kasetsart University Main Library", "Bangkhen campus · floors 1–5", "13.8466, 100.5696"],
    schedule: ["30 Aug 2026 · 09:00", "1 Sep 2026 · 18:00", "Applications closed 23 Aug"],
    activity: ["Quest published · 22 Aug, 09:10", "Applications received · 23 Aug, 16:20", "Ratchanon Srisai selected · 23 Aug, 17:04", "Hirer proposed terms change · Today, 09:26"],
    applications: [["Ratchanon Srisai", "Selected", "4.8 rating"], ["Saran Jindapol", "Not selected", "4.6 rating"]],
    proof: [],
  },
};

const giverAttachmentFixtures = {
  "QST-9401": [
    {
      name: "Campus route zones",
      detail: "PDF · 5 marked zones · added by Nicha Prasert",
    },
    {
      name: "Accessibility checkpoint list",
      detail: "XLSX · 32 checkpoints · added with quest",
    },
  ],
  "QST-9403": [
    {
      name: "Dorm lighting checklist",
      detail: "PDF · 8 pages · added by Saran Jindapol",
    },
    {
      name: "Building floor plan",
      detail: "PDF · 2 pages · added with quest",
    },
  ],
  "QST-9406": [
    {
      name: "Clinic terminology glossary",
      detail: "XLSX · 46 terms · added by Nicha Prasert",
    },
    {
      name: "Approved sign layout",
      detail: "PDF · 18 signs · added with quest",
    },
  ],
  "QST-9407": [
    {
      name: "Main library floor plan",
      detail: "PDF · 5 floors · added by Kittipong Manee",
    },
    {
      name: "Quiet-zone opening hours",
      detail: "XLSX · 18 KB · added with quest",
    },
  ],
  "QST-9412": [
    {
      name: "Sustainability fair shot plan",
      detail: "PDF · 5 pages · source document",
    },
    {
      name: "Consent register",
      detail: "XLSX · 11 entries · added with quest",
    },
  ],
};

const submissionFixtures = {
  "QST-9403": ["Dorm lighting checklist · PDF · submitted Today, 10:42"],
  "QST-9404": [
    "International student guide · DOCX · 86 pages",
    "Style sheet · PDF · submitted Today, 08:55",
  ],
  "QST-9406": [
    "Clinic sign set · PDF · submitted Yesterday, 17:20",
    "Translator notes · PDF · 3 pages",
  ],
  "QST-9412": [
    "Sustainability fair final cut · MP4 · 428 MB",
    "Consent log · XLSX · 11 participants",
  ],
  "QST-9415": ["Accessible route map · PDF · submitted 3 days ago"],
  "QST-9419": ["Welcome video captions · VTT · submitted 4 days ago"],
};

function submissionFilesFor(record) {
  if (submissionFixtures[record.id]) return submissionFixtures[record.id];
  if (!["Submitted", "Disputed", "Completed", "Rework"].includes(record.status))
    return [];
  return [`Completed work package · ZIP · submitted ${record.age.toLowerCase()}`];
}

function questActivityDate(age) {
  const date = new Date("2026-08-27T12:00:00Z"),
    daysAgo = String(age).match(/^(\d+)\s+days?$/);
  if (age === "Yesterday") date.setUTCDate(date.getUTCDate() - 1);
  else if (daysAgo) date.setUTCDate(date.getUTCDate() - Number(daysAgo[1]));
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function defaultQuestActivity(record) {
  const date = questActivityDate(record.age);
  return [
    `Quest published · ${date}, 09:10 · The quest became available under its published terms`,
    `Applications received · ${date}, 12:30 · Applications were recorded for review`,
    `${record.status} · ${date}, 16:45 · The current quest state was recorded in the audit trail`,
  ];
}

function questDetails(record) {
  const linkedCase = Object.values(disputeCases).find(
      (caseData) => caseData.questId === record.id,
    ),
    linkedPayout = data.payouts.find(
      (payout) => payoutQuestId(payout) === record.id,
    ),
    selectedParticipant =
      linkedCase?.respondent?.split(" · ")[0] ||
      linkedPayout?.title ||
      record.selectedParticipant ||
      "Selected worker",
    relation = questRelations[record.id] || {
      description: `Operational details for “${record.title},” including the full marketplace lifecycle and linked records.`,
      giver: [
        record.person,
        "Verified university account",
        record.other,
        "No unresolved account flags",
      ],
      location: [
        "Kasetsart University, Bangkhen",
        "Campus location confirmed",
        "Map coordinates on file",
      ],
      schedule: [
        "26 Aug 2026 · 09:00",
        "30 Aug 2026 · 18:00",
        "Applications closed · 25 Aug 2026 · 18:00",
      ],
      activity: defaultQuestActivity(record),
      applications: [
        ...(record.teamQuest && record.teamParticipants?.length
          ? record.teamParticipants.map(([name, role]) => [name, "Selected", role])
          : [[selectedParticipant, "Selected", "Assignment on record"]]),
      ],
      relation: ["No open dispute", "—", `฿${fmt(record.amount)} funded`],
    };
  return {
    ...relation,
    giverAttachments:
      relation.giverAttachments ||
      giverAttachmentFixtures[record.id] || [
        {
          name: `${record.title} requirements`,
          detail: `PDF · reference brief · added by ${record.person}`,
        },
      ],
    proof: relation.proof ?? submissionFilesFor(record),
  };
}

function questHasStarted(record) {
  return [
    "Assigned",
    "Change pending",
    "In progress",
    "Submitted",
    "Completed",
    "Disputed",
    "Rework",
  ].includes(record.status);
}

function participantsForQuest(record, detail) {
  if (!questHasStarted(record)) return detail.applications;
  return detail.applications.filter(
    (participant) => participant[1] === "Selected",
  );
}

function participantSectionTitle(record, participants, started) {
  if (!started) return "Application";
  return record.teamQuest || participants.length > 1
    ? "Selected participants"
    : "Selected participant";
}

function giverProfile(detail) {
  const hirer = data.users.find((user) => user.title === detail.giver[0]),
    status = hirer?.status || "Normal",
    statusTone = hirer?.tone || (status === "Normal" ? "success" : status === "Flag" ? "warning" : "danger");
  return `<div class="hirer-profile"><div class="hirer-profile-summary"><strong>${escapeActivityText(detail.giver[0])}</strong>${badge(status, statusTone)}</div></div>`;
}

function relatedRows(rows) {
  return `<div class="related-list">${rows
    .map((row) => {
      const statusTone = row[1] === "Selected" ? "success" : row[1] === "Not selected" ? "neutral" : "warning";
      return `<button class="related-row"><strong>${escapeActivityText(row[0])}</strong><span>${badge(row[1], statusTone)}</span></button>`;
    })
    .join("")}</div>`;
}

function fileRows(files) {
  return files
    .map((file) => {
      const attachment =
          typeof file === "string"
            ? {
                name: file.split(" · ")[0],
                detail: file.split(" · ").slice(1).join(" · "),
              }
            : file,
        preview = attachment.src
          ? `<img class="attachment-thumbnail" src="${attachment.src}" alt="${attachment.alt || ""}" loading="lazy">`
          : `<span class="file-icon">${ico("quest")}</span>`;
      return `<button class="file-row ${attachment.src ? "image-attachment" : ""}">${preview}<span><strong>${escapeActivityText(attachment.name)}</strong><small>${escapeActivityText(attachment.detail)}</small></span><span>Open</span></button>`;
    })
    .join("");
}

function giverAttachmentsPanel(files) {
  return `<section class="record-panel"><div class="record-panel-head"><div><h2>Files from hirer</h2><p>Reference material supplied with the quest.</p></div><span class="section-count">${files.length}</span></div>${files.length ? fileRows(files) : '<div class="submission-empty"><strong>No files from hirer</strong><p>This quest was published using text details only.</p></div>'}</section>`;
}

function giverAttachmentsSection(files) {
  return `<section class="section"><div class="section-title"><h3>Files from hirer</h3><span class="section-count">${files.length}</span></div>${files.length ? fileRows(files) : '<div class="submission-empty"><strong>No files from hirer</strong><p>This quest was published using text details only.</p></div>'}</section>`;
}

function proofEmptyState(record) {
  if (record.teamQuest)
    return "The selected participants have not uploaded any proof files.";
  return questHasStarted(record)
    ? "The selected participant has not uploaded any proof files."
    : "No participant has been selected, so no proof submission exists.";
}

function proofSubmissionsPanel(files, record) {
  return `<section class="record-panel"><div class="record-panel-head"><div><h2>Proof submissions</h2><p>Files uploaded by the selected ${record.teamQuest ? "participants" : "participant"}.</p></div>${files.length ? '<button class="link">Download all</button>' : ""}</div>${files.length ? fileRows(files) : `<div class="submission-empty"><strong>No submission yet</strong><p>${proofEmptyState(record)}</p></div>`}</section>`;
}

function proofSubmissionsSection(files, record) {
  return `<section class="section"><div class="section-title"><h3>Proof submissions</h3><span class="section-count">${files.length}</span></div>${files.length ? fileRows(files) : `<div class="submission-empty"><strong>No submission yet</strong><p>${proofEmptyState(record)}</p></div>`}</section>`;
}

function participantConsentRows(responses) {
  return `<div class="response-table"><div class="response-row response-head"><span>Participant</span><span>Status</span></div>${responses
    .map((response) => {
      const role = response[2] === "Hirer" ? "Hirer" : "Worker";
      return `<div class="response-row"><span><strong>${escapeActivityText(response[0])}</strong><small>Role: ${role}</small></span><span class="response-status">${badge(response[1], response[1] === "Approved" ? "success" : "warning")}</span></div>`;
    })
    .join("")}</div>`;
}

function pendingChangeSummary(request) {
  if (!request) return "";
  return `<section class="section change-review"><div class="section-title"><h3>Pending hirer changes</h3>${badge(request.status, "warning")}</div><div class="change-warning">${ico("history")}<div><strong>Current accepted terms remain active</strong><p>This proposal does not change the participant’s agreement until both parties consent.</p></div></div><div class="change-meta"><div><span>Requested by</span><strong>${escapeActivityText(request.requestedBy)}</strong></div><div><span>Reason</span><strong>${escapeActivityText(request.reason)}</strong></div></div><div class="change-table"><div class="change-row change-head"><span>Field</span><span>Accepted value</span><span>Proposed value</span></div>${request.changes.map((change) => `<div class="change-row"><strong>${escapeActivityText(change[0])}</strong><span>${escapeActivityText(change[1])}</span><span>${escapeActivityText(change[2])}</span></div>`).join("")}</div><div class="response-block"><h3>Participant consent</h3>${participantConsentRows(request.responses)}</div><div class="change-oversight"><strong>Admin oversight only</strong><p>Do not approve or reject this edit. Intervene only if a participant files a dispute or the proposed terms violate marketplace policy.</p></div></section>`;
}

function questEditHistory(record) {
  const request = pendingQuestChanges[record.id];
  if (!request) return [];
  return [
    {
      time: request.requestedAt,
      title: `${request.changes.length} quest details proposed for change`,
      actor: request.requestedBy,
      status: request.status,
      tone: "warning",
      effect:
        "Not active. The currently accepted quest details remain in force until both parties consent.",
      responses: request.responses,
      changes: request.changes.map(([field, accepted, proposed]) => ({
        field,
        accepted,
        proposed,
      })),
    },
  ];
}

function renderQuestEditHistory(record) {
  const entries = questEditHistory(record);
  if (!entries.length)
    return `<section class="record-panel edit-history-panel"><div class="record-panel-head"><div><h2>Edit history</h2><p>Changes to the quest description, wage, schedule, location, or deliverables appear here.</p></div></div><div class="edit-history-empty"><strong>No edits recorded</strong><p>${escapeActivityText(record.person)} has not changed the quest details since publication.</p></div></section>`;
  return `<section class="record-panel edit-history-panel"><div class="record-panel-head"><div><h2>Edit history</h2><p>Shows proposed and accepted changes to the quest details.</p></div></div><ol class="edit-history-list">${entries
    .map(
      (entry) => `<li class="edit-history-entry"><div class="edit-history-meta"><time>${escapeActivityText(entry.time)}</time></div><div class="edit-history-content"><div class="change-table"><div class="change-row change-head"><span>Field</span><span>Accepted value</span><span>Proposed value</span></div>${entry.changes
        .map(
          (change) => `<div class="change-row"><strong>${escapeActivityText(change.field)}</strong><span>${escapeActivityText(change.accepted)}</span><span>${escapeActivityText(change.proposed)}</span></div>`,
        )
        .join("")}</div></div></li>`,
    )
    .join("")}</ol></section>`;
}

function openQuestDrawer(index) {
  const record = data.quests[index];
  const detail = questDetails(record),
    participants = participantsForQuest(record, detail),
    started = questHasStarted(record);
  const relatedDispute = data.disputes.find(
    (dispute) =>
      dispute.status === "Active" &&
      (disputeCases[dispute.id]?.questId || "") === record.id,
  );
  showDrawerLayer();
  drawer.innerHTML = `
    <div class="drawer-top"><div><strong>${escapeActivityText(record.id)}</strong><small>Full quest record</small></div><button class="icon" id="close" aria-label="Close"><span class="close-lines"></span></button></div>
    <div class="drawer-body quest-record">
      <div class="drawer-title"><span class="att-icon info">${ico("quest")}</span><div><h2>${escapeActivityText(record.title)}</h2><p>${record.teamQuest ? "Team quest · " : ""}${escapeActivityText(record.other)} · created by ${escapeActivityText(record.person)}</p></div></div>
      <div class="facts quest-summary">
        <div class="fact"><span>Status</span>${badge(record.status, record.tone)}</div><div class="fact"><span>Funded wage</span><strong>฿${fmt(record.amount)}</strong></div>
        <div class="fact"><span>Participant mode</span><strong>${record.teamQuest ? "Team" : "Single"}</strong></div><div class="fact"><span>Candidate mode</span><strong>${escapeActivityText(record.candidateMode || (record.status === "Open" ? "FCFS" : "CANDIDATE"))}</strong></div><div class="fact"><span>Tag</span><strong>${escapeActivityText(record.other)}</strong></div>
      </div>
      ${record.status === "Disputed" ? `<section class="section quest-dispute-reason"><div class="section-title"><h3>Why this quest is disputed</h3>${relatedDispute ? badge(relatedDispute.status, relatedDispute.tone) : badge("Needs case review", "warning")}</div>${relatedDispute ? `<dl class="dispute-summary-context"><div><dt>Case</dt><dd>${escapeActivityText(relatedDispute.id)}</dd></div><div><dt>Category</dt><dd>${escapeActivityText(disputeTypeLabel(relatedDispute))}</dd></div><div><dt>Description</dt><dd>${escapeActivityText(relatedDispute.detail)}</dd></div></dl><a class="btn full-width" href="/disputes/${encodeURIComponent(relatedDispute.id)}">Open full dispute</a>` : '<p class="audit-note">This quest is marked as disputed, but no active dispute record is linked. Review the record relationship before taking action.</p>'}</section>` : ""}
      <section class="section"><h3>Quest description</h3><p>${escapeActivityText(detail.description)}</p><div class="requirement-box"><strong>Completion requirements</strong><ul><li>Submit work before the recorded deadline</li><li>Attach verifiable proof files</li><li>Keep all payment inside KuQuest</li></ul></div></section>
      ${giverAttachmentsSection(detail.giverAttachments)}
      ${pendingChangeSummary(pendingQuestChanges[record.id])}
      <section class="section"><div class="section-title"><h3>Hirer</h3><button class="link">View user</button></div>${giverProfile(detail)}</section>
      <section class="section"><h3>Schedule and location</h3><div class="facts"><div class="fact"><span>Starts</span><strong>${escapeActivityText(detail.schedule[0])}</strong></div><div class="fact"><span>Due</span><strong>${escapeActivityText(detail.schedule[1])}</strong></div><div class="fact"><span>Application window</span><strong>${escapeActivityText(detail.schedule[2])}</strong></div><div class="fact"><span>Location</span><strong>${escapeActivityText(detail.location[0])}</strong><small>${escapeActivityText(detail.location[1])}</small></div></div></section>
      <section class="section"><div class="section-title"><h3>${participantSectionTitle(record, participants, started)}</h3><span class="section-count">${participants.length}</span></div>${relatedRows(participants)}</section>
      ${proofSubmissionsSection(detail.proof, record)}
      <section class="section"><h3>Financial record</h3><div class="financial-line"><span>Funded by hirer</span><strong>฿${fmt(record.amount)}</strong></div><div class="financial-line"><span>Platform fee on completion</span><strong>฿${fmt(Math.round(record.amount * 0.05))}</strong></div><div class="financial-line total"><span>${record.teamQuest ? "Team receives (total)" : "Worker receives"}</span><strong>฿${fmt(Math.round(record.amount * 0.95))}</strong></div><p class="audit-note">Funds are held in the quest ledger until approval or dispute resolution.</p></section>
      <section class="section"><h3>Overall quest timeline</h3>${timeline(detail.activity, { showDetails: false })}</section>
    </div>
    <div class="drawer-actions"><button class="btn" data-action="Hide quest">Hide quest</button><a class="btn" href="/quests/${encodeURIComponent(record.id)}">Full quest detail</a>${record.status === "Disputed" && relatedDispute ? `<a class="btn primary" href="/disputes/${encodeURIComponent(relatedDispute.id)}">Review dispute</a>` : ""}</div>`;
  document.querySelector("#close").onclick = closeDrawer;
  scrim.onclick = closeDrawer;
  const defaultFinancialNote = [...drawer.querySelectorAll(".section")]
    .find((section) => section.querySelector("h3")?.textContent === "Financial record")
    ?.querySelector(".audit-note");
  if (defaultFinancialNote)
    defaultFinancialNote.textContent =
      "Funds remain held until submitted proof is accepted or a dispute is resolved.";
  if (record.status === "Rework") {
    const financialSection = [...drawer.querySelectorAll(".section")].find(
      (section) => section.querySelector("h3")?.textContent === "Financial record",
    );
    const financialNote = financialSection?.querySelector(".audit-note");
    if (financialNote)
      financialNote.textContent =
        "Funds remain held until the revised proof is accepted or another dispute is opened.";
  }
  drawer
    .querySelectorAll("[data-action]")
    .forEach(
      (button) =>
        (button.onclick = () => confirmAction(button.dataset.action, record)),
    );
}
