# Admin UI: API data gaps and requested response shapes

## Scope and how to read this report

This report follows the Admin UI and the Admin frontend API types only. I did not inspect the API Server or any Rulebook.

Important: “Current frontend contract” below means the response shape declared or consumed by this Admin app. It is not a claim that this is the exact payload the running API Server returns. The API client uses TypeScript types but does not validate the JSON response at runtime. Please compare these points with the live API response before changing the server.

For IDs, keep system IDs separate from IDs that people read:

- `id`: internal UUID. The Admin app uses this value for API paths and links.
- `displayId`: readable identifier shown to people, such as `QST-12011`, `DSP-5203`, `RPT-8202`, `PAY-9631`, or `WAL-1001`.
- Member ID shown to people: `studentId`, not the Member UUID.

Keep `id` as a UUID. Do not use it as a readable ID. For each record type that has a readable ID, return `displayId` and show it in the UI. For a Member, return and show `studentId`. If a record truly has no readable ID, the UI should show `—`; do not invent an ID or copy the UUID into a display field.

Some UUID display problems are also in the Admin UI mapping, so they do not need a new API field alone: the Member drawer currently labels `model.id` as “Member ID” even though `studentId` is present; the Quest helper truncates a UUID when no `displayId` is returned; and the Dispute model falls back to `id` for its displayed case ID. The API should return `displayId`, and the UI should render it rather than any UUID. See [Member drawer ID](src/features/admin/member/member-detail.tsx#L517), [Quest display fallback](src/features/admin/quest/quest-model.ts#L238), and [Dispute display fallback](src/features/admin/dispute/dispute-model.ts#L314).

## 1. Shared list response: total and filter counts

**UI need:** The Quest, Dispute, Report Case, and Conduct Report boards show result totals and a count on each status filter. The UI calculates these counts from records loaded so far. It fetches the first page with a limit of 50 and can load more pages.

**Current frontend contract:** `AdminPage<T>` has only `items` and `nextCursor`. Board tab counts use the loaded `page.items`, not a server total. For example, the Report Case board calculates every tab count from `page.items`.

**Requested response shape:** Add server counts to paginated list responses. Keep cursor paging. Define the counts this way:

- `totalCount` counts records that match all request filters, including `status` when the request has one.
- `countsByStatus` counts records that match all the other request filters but ignores the selected `status`. This lets each status tab show its count for the same search and filter settings.
- Add a server-side `search` request filter for board search text. Apply it to the rows, `totalCount`, and `countsByStatus`. The UI must send the search text so counts cover records on every page, not only records already loaded in the browser.
- Return zero for a real count of zero. Do not omit a known count.

```json
{
  "items": [],
  "nextCursor": "opaque-cursor-or-null",
  "totalCount": 123,
  "countsByStatus": {
    "<open-status-value>": 14,
    "<dismissed-status-value>": 3,
    "<resolved-status-value>": 8
  }
}
```

The status keys must use each endpoint's current API status values. The UI must not guess a missing count as zero.

**UI evidence:** [`AdminPage<T>`](src/features/admin/api/admin-api-types-core.ts#L29), [Report Case page loading](src/features/admin/report/report-service.ts#L19), [Report Case count calculation](src/features/admin/report/report-board.tsx#L141), [Report Case status tabs](src/features/admin/report/report-board.tsx#L147), [Conduct Report count calculation](src/features/admin/conduct-report/conduct-report-board.tsx#L147), [Dispute list loading](src/features/admin/dispute/dispute-service.ts#L22).

## 2. Overview counts and oldest queue records

**UI need:** Overview shows counts for Payout Approvals, Dispute Cases, Report Cases, and Conduct Reports; status counts for Members and Wallets; and the oldest item in each open queue with a link to that item.

**Current frontend contract:** `GET /api/v1/admin/overview` declares `reports`, `conductReports`, `members.byStatus`, `wallets.byStatus`, and `queues` as optional. A queue's `oldest` item has only `id`, `title`, and `createdAt`. The UI displays fallback text when counts or oldest-item details are absent. It can show an incorrect/UUID-looking identifier under the oldest item because the same `oldest.id` is used for display and navigation.

**Requested response shape:** Return every count and queue summary on every successful response. Keep `id` for navigation and add `displayId` for display.

```json
{
  "quests": { "total": 120, "hidden": 2, "byState": { "QUEST_OPEN": 20 } },
  "disputes": { "total": 14, "awaitingResolution": 14 },
  "payouts": { "pendingAdminApproval": 3, "inFlight": 4 },
  "reports": { "open": 15 },
  "conductReports": { "open": 23 },
  "members": {
    "frozenWallets": 2,
    "suspendedWallets": 1,
    "byStatus": { "NORMAL": 90, "FLAG": 5, "TEMP_BAN": 2, "PERM_BAN": 1 }
  },
  "wallets": { "byStatus": { "ACTIVE": 90, "FROZEN": 2, "SUSPENDED": 1, "CLOSED": 0 } },
  "queues": {
    "disputes": {
      "count": 14,
      "state": "OPEN",
      "oldest": { "id": "<uuid>", "displayId": "DSP-5203", "title": "Quest settlement review", "createdAt": "<ISO-8601>" }
    }
  }
}
```

Use the same `queues.<name>` shape for `payouts`, `reports`, and `conductReports`. The example only expands one queue to keep it short. The current UI derives the waiting age from `oldest.createdAt`; it does not need a separate age field.

**UI evidence:** [Overview response type](src/features/admin/api/admin-api-types-core.ts#L34), [Overview route and requests](src/features/admin/overview/overview-service.ts#L17), [optional counts and fallback use](src/features/admin/overview/overview-model.ts#L631), [queue detail rendering](src/features/admin/overview/overview.tsx#L180), [Member/Wallet status count UI](src/features/admin/overview/overview.tsx#L230).

## 3. Quest list, detail, and Quest finance

**Endpoints:** `GET /api/v1/admin/quests`, `GET /api/v1/admin/quests/:questId`, and `GET /api/v1/admin/finance/quests/:questId`.

**UI need:** The Quest board and detail show a readable Quest ID, Hirer name and Student ID, Quest state, dates, location, reward/funding values, Candidates and Workers, attachments, Proof Submissions, edit history, timeline, and linked Dispute Case.

**Current frontend contract and gaps:** `AdminQuest.displayId` is optional. `AdminQuestMember` has an internal `id`, optional `memberId`, name, and email, but no explicit `studentId`. The detail contract makes `images` and `timeline` optional. The page has empty/fallback states for missing Hirer attachments, Candidate/Assignment records, Proof Submissions, edit history, Quest state history, location, and linked Dispute Case. Quest finance is loaded from a separate endpoint.

**Requested response shapes:** Keep the list row small. It needs the readable Quest ID, title, state, mode, dates, funding values, and Hirer summary. Include `displayId` for the Quest and `studentId` for the Hirer. The detail response must include these same fields plus the detail-only fields below. Keep UUIDs for links. Return `[]` for empty collections and `null` for a missing optional single record.

```json
{
  "id": "<quest-uuid>",
  "displayId": "QST-12011",
  "title": "Verify dorm fire exits",
  "questStatus": "QUEST_FAILED",
  "mode": "FIRST_COME_FIRST_SERVED",
  "startTime": "<ISO-8601>",
  "dueAt": "<ISO-8601-or-null>",
  "rewardSatang": 12000,
  "questFundingTotalSatang": 12240,
  "hirer": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Hirer", "email": "hirer@ku.th" }
}
```

The detail response adds fields such as:

```json
{
  "description": "Full description",
  "condition": { "text": "Complete the requested work", "items": [] },
  "locations": [{ "label": "Kasetsart Innovation Centre" }],
  "candidates": { "applications": [], "teams": [] },
  "assignments": [],
  "images": [],
  "proofSubmissions": [],
  "editHistory": [],
  "timeline": []
}
```

Each Candidate, Team Member, Worker, and Proof Submitter shown in the UI also needs `id`, `studentId`, `firstName`, `lastName`, and `email`. For each timeline item, return enough state-change context for the UI: event or previous/new state, time, actor identity, and reason code when present. The Quest detail also renders Hirer attachments from `images[]`; each item needs `imageId`, `fileId`, `position`, a usable URL, and URL expiry time. Return `images: []` when there are no attachments instead of omitting the field.

**Quest finance response shape:** The finance endpoint has `quest`, `reservation`, `transfers`, and `ledgerTransactions`. Return `reservation: null` when there is no reservation, and empty arrays when there are no transfers or Ledger Transactions. Include the fields displayed by the UI:

```json
{
  "quest": { "id": "<quest-uuid>", "title": "Verify dorm fire exits", "questStatus": "QUEST_FAILED", "headcount": 1, "rewardSatang": 12000, "platformFeePerWorkerSatang": 240, "questFundingTotalSatang": 12240, "hirer": { "id": "<member-uuid>", "firstName": "Example", "lastName": "Hirer", "studentId": "6510100001" } },
  "reservation": { "id": "<reservation-uuid>", "status": "ACTIVE", "totalReservedSatang": 12240, "remainingSatang": 12240, "createdAt": "<ISO-8601>" },
  "transfers": [{ "id": "<transfer-uuid>", "occurredAt": "<ISO-8601>", "type": "RESERVE", "from": { "type": "WALLET", "id": "<wallet-uuid>", "displayName": "Hirer Wallet" }, "to": { "type": "QUEST_ESCROW", "id": "<reservation-uuid>", "displayName": "Quest Escrow" }, "amountSatang": 12240, "platformFeeSatang": 240, "description": "Quest funding reserved", "ledgerTransactionId": "<ledger-transaction-uuid>", "businessReference": "QST-12011" }],
  "ledgerTransactions": [{ "id": "<ledger-transaction-uuid>", "businessReference": "QST-12011", "eventType": "FUNDING_RESERVE", "description": "Quest funding reserved", "createdAt": "<ISO-8601>", "sealedAt": "<ISO-8601-or-null>", "postings": [{ "id": "<posting-uuid>", "accountId": "<account-uuid>", "accountType": "FUNDING_RESERVED", "walletId": "<wallet-uuid-or-null>", "ownerUserId": "<member-uuid-or-null>", "amountSatang": 12240 }] }]
}
```

**UI evidence:** [Quest response types](src/features/admin/api/admin-api-types-quest.ts#L19), [optional detail collections](src/features/admin/api/admin-api-types-quest.ts#L55), [Quest endpoint paths](src/features/admin/api/admin-api-quest.ts#L20), [Quest detail fallback states](src/features/admin/quest/quest-page.tsx#L392), [Candidate and Worker display](src/features/admin/quest/quest-page.tsx#L480), [timeline fallback](src/features/admin/quest/quest-page.tsx#L281).

## 4. Dispute Case list and detail

**Endpoints:** `GET /api/v1/admin/disputes` and `GET /api/v1/admin/disputes/:disputeId`.

**UI need:** The table shows Dispute Case ID, readable Quest ID/title, Hirer, Worker, category, amount at risk, status, and opened time. Detail shows both parties and Student IDs, statements, Quest state/failure time, evidence references, decision result, resolved amount, Admin, and decision time.

**Current frontend contract and gaps:** `AdminDisputeCase` requires `id`, `displayId`, `questId`, and `status`, but the `questId` has no separate `questDisplayId`. Detail has a nested Quest with UUID, title, Hirer UUID, state, failed time, and reservation UUID. Filer/respondent identities, statements, category, opened time, and evidence are not declared as structured fields. The UI model reads optional aliases and renders “Not provided” when it cannot find them. `AdminDisputeEvidence` has Worker/Hirer UUIDs but no Member names or Student IDs.

**Requested response shapes:** The list row must include structured Hirer, Worker, and Quest summaries because the table shows them. Keep each UUID for links and return each readable ID for display. The detail response includes the same list fields plus statements, Evidence References, and decision fields. Do not require detail-only fields in every list row.

```json
{
  "id": "<dispute-uuid>",
  "displayId": "DSP-5203",
  "status": "<dispute-case-status>",
  "category": "SCOPE",
  "createdAt": "<ISO-8601>",
  "amountAtRiskSatang": 3250000,
  "version": 1,
  "quest": {
    "id": "<quest-uuid>",
    "displayId": "QST-12011",
    "title": "Verify dorm fire exits"
  },
  "filerRole": "Hirer",
  "filer": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Hirer" },
  "respondentRole": "Worker",
  "respondent": { "id": "<member-uuid>", "studentId": "6510100002", "firstName": "Example", "lastName": "Worker" }
}
```

The detail response adds fields such as:

```json
{
  "quest": { "id": "<quest-uuid>", "displayId": "QST-12011", "title": "Verify dorm fire exits", "questStatus": "QUEST_FAILED", "failedAt": "<ISO-8601-or-null>" },
  "filerStatement": "<text-or-null>",
  "respondentStatement": "<text-or-null>",
  "evidenceRefs": ["<evidence-reference-id>"],
  "reportedMemberStatus": "NORMAL",
  "previousReportCount": 0,
  "confirmedViolationCount": 0,
  "previousModerationActions": [],
  "resolvedWorkerId": null,
  "resolvedAmountSatang": null,
  "decisionLabel": null,
  "decisionReason": null,
  "resolution": null,
  "resolvedBy": null,
  "resolutionAt": null,
  "closedAt": null
}
```

For a resolved Dispute Case, return the resolved Worker ID, amount, decision label and reason, Admin name, and resolution/close times. Evidence reads should also include readable Member summaries for assignment/proof participants where the UI names those people.

**UI evidence:** [Dispute API types](src/features/admin/api/admin-api-types-dispute.ts#L2), [detail contract](src/features/admin/api/admin-api-types-dispute.ts#L16), [evidence contract](src/features/admin/api/admin-api-types-dispute.ts#L90), [model fallbacks and alias lookup](src/features/admin/dispute/dispute-model.ts#L243), [party and Quest panels](src/features/admin/dispute/dispute-detail.tsx#L160), [Dispute table columns](src/features/admin/dispute/dispute-board.tsx#L170).

## 5. Report Case and Conduct Report

**Endpoints:** Both use `GET /api/v1/admin/reports?kind=REPORT_CASE` or `?kind=CONDUCT_REPORT`, and `GET /api/v1/admin/reports/:reportId`. Report Case evidence uses `GET /api/v1/admin/evidence/:evidenceRef` after the Admin opens a reference.

### Report Case

**UI need:** The table shows Report Case ID, source, Reported Member name/Student ID, reporting Member name/Student ID, report type, status, and time. Detail also shows the report text, linked Quest, Evidence References, Member moderation context, and decision result and time.

**Current frontend contract and gaps:** `AdminReportCase` declares only `id`, `displayId`, status, `reportedMemberId`, optional evidence refs, optional `questId`, and version; other fields are hidden behind `[key: string]: unknown`. The model reads reporter data from `reporterEntries[0]`, but the response type does not define `reporterEntries`. The table needs both Member names and Student IDs before an evidence read. The Evidence endpoint returns the reported Message's sender, but that is a separate, deliberate read and does not provide a safe source for table rows without opening each Evidence Reference.

**Requested response shapes:** The list row must include the reported Member and reporting Member summaries. Do not include reported Message body/content in the list. The detail response includes the list fields plus report details, linked Quest, Evidence References, Member moderation context, and the recorded decision. The UI reads Message content only after an Admin opens an Evidence Reference.

List row:

```json
{
  "id": "<report-uuid>",
  "displayId": "RPT-8202",
  "kind": "REPORT_CASE",
  "status": "<report-case-status>",
  "version": 1,
  "source": "MESSAGE",
  "reportType": "MESSAGE_CONTENT",
  "reportedAt": "<ISO-8601>",
  "reportedMember": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Reported" },
  "reporter": { "id": "<member-uuid>", "studentId": "6510100002", "firstName": "Example", "lastName": "Reporter" }
}
```

The detail response adds fields such as:

```json
{
  "details": "<text entered with the Report Case; not the reported Message body>",
  "quest": { "id": "<quest-uuid>", "displayId": "QST-12011", "title": "Verify dorm fire exits" },
  "evidenceRefs": ["<evidence-reference-id>"],
  "reportedMemberStatus": "NORMAL",
  "previousReportCount": 0,
  "confirmedViolationCount": 0,
  "previousModerationActions": [],
  "decisionLabel": null,
  "decisionReason": null,
  "resolvedBy": null,
  "resolutionAt": null,
  "closedAt": null
}
```

If multiple reporter entries are valid, return them all as structured entries. If the table needs one reporter label, also return a documented primary `reporter` summary rather than making the UI silently choose element zero.

### Conduct Report

**UI need:** The table shows readable Conduct Report ID, Quest ID/title, Reported Member, reporting Member, reason, status, and reported time. Detail also shows Quest state, the related Assignment and Proof Submission, the Quest record evidence text, and the Member moderation context needed to understand the report.

**Current frontend contract and gaps:** Conduct Reports share the generic `AdminReportCase` type. The Conduct Report model reads `reportedMember`, `reporter`, `reasonCode`, `quest`, one `assignment`, one `proofSubmission`, `questRecord`, moderation fields, and decision fields dynamically, but the shared response type does not describe them. The UI therefore falls back to “Member not provided”, “Reporter not provided”, “Quest not provided”, or “Reason not provided” when they are absent or named differently.

**Requested response shapes:** Use a distinct Conduct Report shape, or a discriminated union keyed by `kind`. The list row must include the readable case and Quest IDs, Quest title, Reported Member and reporting Member summaries, reason, status, and time. The detail response includes the list fields plus an `assignment` object or `null`, a `proofSubmission` object or `null`, the `questRecord` text, resolution fields, and moderation-context fields. Return structured Member and Quest summaries, not only their UUIDs.

List row:

```json
{
  "id": "<conduct-report-uuid>",
  "displayId": "CR-<readable-number>",
  "kind": "CONDUCT_REPORT",
  "status": "<conduct-report-status>",
  "version": 1,
  "reasonCode": "<reason-code>",
  "reportedAt": "<ISO-8601>",
  "reportedMember": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Reported" },
  "reporter": { "id": "<member-uuid>", "studentId": "6510100002", "firstName": "Example", "lastName": "Reporter" },
  "quest": { "id": "<quest-uuid>", "displayId": "QST-12011", "title": "Verify dorm fire exits" }
}
```

The detail response adds fields such as:

```json
{
  "details": "<report detail-or-null>",
  "quest": { "id": "<quest-uuid>", "displayId": "QST-12011", "title": "Verify dorm fire exits", "questStatus": "QUEST_FAILED", "failedAt": "<ISO-8601-or-null>" },
  "assignment": { "id": "<assignment-uuid>", "worker": { "id": "<member-uuid>", "studentId": "6510100003", "firstName": "Example", "lastName": "Worker", "email": "worker@ku.th" }, "assignmentStatus": "ASSIGNED", "startedAt": "<ISO-8601-or-null>", "createdAt": "<ISO-8601>" },
  "proofSubmission": { "id": "<proof-submission-uuid>", "submittedBy": { "id": "<member-uuid>", "studentId": "6510100003", "firstName": "Example", "lastName": "Worker", "email": "worker@ku.th" }, "submissionStatus": "SUBMITTED", "description": "<description-or-null>", "workerMessage": "<message-or-null>", "content": "<content-or-null>", "reviewNote": null, "submittedAt": "<ISO-8601-or-null>", "sentAt": "<ISO-8601-or-null>", "reviewedAt": null },
  "questRecord": "<Quest record evidence text-or-null>",
  "reportedMemberStatus": "NORMAL",
  "previousReportCount": 0,
  "confirmedViolationCount": 0,
  "previousModerationActions": [],
  "decisionLabel": null,
  "decisionReason": null,
  "resolution": null,
  "resolvedBy": null,
  "resolutionAt": null,
  "closedAt": null
}
```

The `assignment` and `proofSubmission` shown in detail are single objects or `null`, not arrays. Include readable participant summaries (`id`, `studentId`, first and last name), status, and timestamps. Do not use a UUID as the displayed Quest, Member, or case ID.

**UI evidence:** [Report response type](src/features/admin/api/admin-api-types-dispute.ts#L36), [Report endpoints](src/features/admin/api/admin-api-report.ts#L19), [Report Case table requirements](src/features/admin/report/report-board.tsx#L162), [Report Case field lookups](src/features/admin/report/report-model.ts#L216), [Conduct Report field lookups](src/features/admin/conduct-report/conduct-report-model.ts#L236), [Conduct Report table requirements](src/features/admin/conduct-report/conduct-report-board.tsx#L190), [Evidence message sender shape](src/features/admin/api/admin-api-types-dispute.ts#L47).

## 6. Member detail: moderation, related cases, Quests, Payouts, and Reviews

**Endpoints currently called:** `GET /api/v1/admin/members/:memberId`, `GET /api/v1/admin/finance/members/:memberId`, and `GET /api/v1/admin/reports?memberId=:memberId`. Wallet Statement uses the ledger transaction endpoint.

**UI need:** Member detail shows profile fields and Student ID, moderation status and confirmed violation count, moderation history, reports received, reports submitted, Quest history, Payout records, Reviews, and Wallet Statement.

**Current frontend contract and gaps:** `AdminMemberDetail` has profile, Wallet, and aggregate stats only. It has no moderation summary/history, Quest list, Payout list, or Review list. `memberModelFromApi` sets `reportsSubmitted`, `reviews`, `quests`, and `payouts` to empty arrays; it sets `confirmedViolationCount` to `null` and reports submitted as unavailable. `GET /reports?memberId=` is used for received reports only. `AdminReportListQuery` has one ambiguous `memberId` filter, not separate reported/reporter roles.

**Requested response shape:** Either include the related read-only detail collections in Member detail, or provide member-scoped read endpoints and call them from the UI. Use `{ "items": [], "nextCursor": null, "totalCount": 0 }` for each collection that can have many rows. The response must distinguish cases where this Member is the target from cases where this Member filed the case. `GET /api/v1/admin/reports` should accept separate `reportedMemberId` and `reporterMemberId` filters. If Experience, Tags, or Admin Notes remain visible, include their rows in the read response. Admin Note create or edit actions are separate write requirements and are not part of this data-gap report.

```json
{
  "member": {
    "id": "<member-uuid>",
    "studentId": "6510100001",
    "firstName": "Example",
    "lastName": "Member",
    "email": "member@ku.th",
    "bio": null,
    "createdAt": "<ISO-8601>"
  },
  "moderation": {
    "memberStatus": "NORMAL",
    "confirmedViolationCount": 0,
    "activeRedFlagCount": 0,
    "activeBanCount": 0,
    "redFlagExpiresAt": null,
    "banExpiresAt": null
  },
  "moderationHistory": { "items": [], "nextCursor": null, "totalCount": 0 },
  "experience": { "items": [], "nextCursor": null, "totalCount": 0 },
  "tags": { "items": [], "nextCursor": null, "totalCount": 0 },
  "adminNotes": { "items": [], "nextCursor": null, "totalCount": 0 },
  "stats": { "questsCreatedCount": 0, "questsCompletedAsWorkerCount": 0, "reviewsReceivedCount": 0, "averageRating": null, "payoutsCount": 0, "totalEarnedSatang": 0, "totalPaidOutSatang": 0 },
  "reportsReceived": { "items": [], "nextCursor": null, "totalCount": 0 },
  "reportsSubmitted": { "items": [], "nextCursor": null, "totalCount": 0 },
  "quests": { "items": [], "nextCursor": null, "totalCount": 0 },
  "payouts": { "items": [], "nextCursor": null, "totalCount": 0 },
  "reviews": { "items": [], "nextCursor": null, "totalCount": 0 }
}
```

Required row fields:

- `moderationHistory.items[]`: event/display label, time, Admin/member actor name, reason, previous/new status, outcome, duration/expiry, and related case `{ id, displayId, kind }` when present. Example: `{ "id": "<event-uuid>", "event": "STATUS_CHANGED", "createdAt": "<ISO-8601>", "actor": { "kind": "ADMIN", "id": "<admin-uuid>", "displayName": "Example Admin" }, "reason": "<reason-or-null>", "previousStatus": "NORMAL", "newStatus": "FLAG", "outcome": "<outcome>", "durationDays": null, "expiresAt": null, "relatedCase": { "id": "<case-uuid>", "displayId": "CR-120", "kind": "CONDUCT_REPORT" } }`.
- `reportsReceived.items[]` and `reportsSubmitted.items[]`: case `{ id, displayId }`, kind, readable counterpart Member name/Student ID, reason/detail, status, and time.
- `quests.items[]`: `{ id, displayId, title, role, status, createdAt }`.
- `payouts.items[]`: `{ id, displayId, status, principalSatang, createdAt }`.
- `reviews.items[]`: `{ id, reviewer: { id, studentId, firstName, lastName }, rating, comment, createdAt }`.
- `experience.items[]`: `{ id, title, organization, description, startedAt, endedAt }`; `tags.items[]`: readable Tag names.
- `adminNotes.items[]`: `{ id, admin: { id, firstName, lastName }, note, createdAt }`, if Admin Notes remain part of the UI. This is a read-data requirement only; adding or editing a note needs a separate mutation contract.
- Include `reportsReceivedCount` and `reportsSubmittedCount` in `stats`, or provide `totalCount` for each related-case list. The current Member route fetches one page with a limit of 50, but the UI uses loaded rows as counts.

The existing member stats can provide counts and totals, but they cannot replace the rows that the UI displays. Return a zero count as `0` and an empty paginated collection as `items: []`, `totalCount: 0`, and `nextCursor: null`; reserve `null` for a value that is genuinely unknown.

**UI evidence:** [Member detail response type](src/features/admin/api/admin-api-types-member-wallet.ts#L24), [member-scoped requests](src/features/admin/member/member-service.ts#L21), [API model leaves sections empty](src/features/admin/member/member-model.ts#L549), [missing Reports Submitted data](src/features/admin/member/member-detail.tsx#L419), [missing Payout rows](src/features/admin/member/member-detail.tsx#L174), [missing Quest history](src/features/admin/member/member-detail.tsx#L201), [missing Reviews](src/features/admin/member/member-detail.tsx#L359), [Moderation context/history fields](src/features/admin/member/member-detail.tsx#L455), [Experience fallback](src/features/admin/member/member-detail.tsx#L161), [Admin Notes are mock-only](src/features/admin/member/member-detail.tsx#L155), [API rejects Admin Note writes](src/features/admin/member/member-query.ts#L119).

## 7. Payout and Top-up display IDs and Member links

**Endpoints:** `GET /api/v1/admin/payouts`, `GET /api/v1/admin/payouts/:payoutId`, `GET /api/v1/admin/top-ups`, and the existing Member Finance endpoint.

**UI need:** Payout and Top-up tables/details display readable record IDs and Member names/Student IDs. The Member Payouts panel also needs the Member's Payout rows.

**Current frontend contract and gaps:** `AdminPayout.id` and `AdminTopUpListItem.id` are used as the record identifier, but there is no `displayId`. `AdminPayout.student` has an internal `id`, name, and email, but no Student ID. `AdminPayoutListQuery` has no Member filter. Member detail has only Payout aggregates; it has no Payout rows.

**Requested response shape:** Add `displayId` while retaining `id` for API use. Include `student.studentId`. Add a member filter to the Payout list request or return Payout rows in Member detail.

```json
{
  "id": "<payout-uuid>",
  "displayId": "PAY-9631",
  "student": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Member", "email": "member@ku.th" },
  "payoutStatus": "PENDING_ADMIN_APPROVAL",
  "principalSatang": 10000,
  "createdAt": "<ISO-8601>"
}
```

Use the same pattern for Top-up records. `displayId` values should be actual readable identifiers selected by the API, not formatted UUIDs.

**UI evidence:** [Payout type](src/features/admin/api/admin-api-types-payout.ts#L1), [Payout list query](src/features/admin/api/admin-api-types-queries.ts#L10), [Top-up list type](src/features/admin/api/admin-api-types-payout.ts#L141), [Payout UI uses `id`](src/features/admin/payout/payout-page.tsx#L229), [Top-up UI uses `id` and Student ID](src/features/admin/finance/finance-page.tsx#L127).

## 8. Wallet and Wallet Statement IDs

**Endpoints:** `GET /api/v1/admin/wallets`, `GET /api/v1/admin/wallets/:walletId`, `GET /api/v1/admin/wallets/:walletId/status-history`, and `GET /api/v1/admin/finance/ledger/transactions`.

**UI need:** Wallet table and drawer show a readable Wallet ID (`WAL-...`), Member name and Student ID, balances, Wallet status, latest Ledger Transaction time, status history, and Statement rows.

**Current frontend contract and gaps:** `AdminWallet` has only `id` (also used as the API route key), `userId`, and optional Member data. It has no `displayId`. `AdminWalletStatusHistoryEntry` has Wallet UUID and Member/Admin actor UUIDs only. Ledger Transaction/posting types expose internal IDs and `businessReference`; they have no readable references for display beyond the business reference string.

**Requested response shapes:** Add `displayId` for Wallet, and include structured Member data with both internal `id` and `studentId`. The Status History response must include the actor's readable name, not only an actor UUID. The Wallet Statement must include the Ledger Transaction rows and postings that the UI uses to calculate movement and balance. Keep `businessReference` for system use and include `displayReference` for the value shown to an Admin.

```json
{
  "id": "<wallet-uuid>",
  "displayId": "WAL-1001",
  "userId": "<member-uuid>",
  "member": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Member", "email": "member@ku.th" },
  "walletStatus": "ACTIVE",
  "balances": { "spendingBalanceSatang": 120000, "earningsBalanceSatang": 80000, "fundingReservedSatang": 25000, "reservedForPayoutsSatang": 10000, "totalBalanceSatang": 235000 },
  "latestTransactionAt": "<ISO-8601-or-null>"
}
```

The Status History endpoint should return rows like this. If there is no actor, set the actor IDs and `actorDisplayName` to `null`. Do not show an actor UUID as the actor's name.

```json
{
  "history": [{ "id": "<history-uuid>", "walletId": "<wallet-uuid>", "fromStatus": "ACTIVE", "toStatus": "FROZEN", "reason": "<reason>", "actorUserId": null, "actorAdminId": "<admin-uuid>", "actorDisplayName": "Example Admin", "createdAt": "<ISO-8601>" }]
}
```

The Wallet Statement uses `GET /api/v1/admin/finance/ledger/transactions` filtered by `walletId`. Return newest Ledger Transactions first and include the postings for that Wallet. The UI calculates the signed amount, compartment movement, and resulting balance from these rows.

```json
{
  "items": [{
    "id": "<ledger-transaction-uuid>",
    "businessReference": "<system-reference>",
    "displayReference": "Top-up 7",
    "eventType": "TOP_UP",
    "description": "<description-or-null>",
    "createdAt": "<ISO-8601>",
    "sealedAt": "<ISO-8601>",
    "isBalanced": true,
    "postings": [{ "id": "<posting-uuid>", "accountId": "<account-uuid>", "accountType": "SPENDING", "walletId": "<wallet-uuid>", "amountSatang": 1000, "member": { "userId": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Member" } }]
  }],
  "nextCursor": null
}
```

Do not remove UUIDs needed for lookups. Add separate display values.

**UI evidence:** [Wallet type](src/features/admin/api/admin-api-types-member-wallet.ts#L83), [status-history type](src/features/admin/api/admin-api-types-member-wallet.ts#L115), [Ledger Transaction types](src/features/admin/api/admin-api-types-queries.ts#L70), [Wallet endpoints](src/features/admin/api/admin-api-member-wallet.ts#L57), [Wallet table displayed IDs](src/features/admin/wallet/wallet-page.tsx#L345).

## 9. Activity Log target and state change

**Endpoint:** `GET /api/v1/admin/activity-log`.

**UI need:** Activity Log detail shows the Admin actor, human-readable target ID, reason, result version/time, and previous/new state when the action changes state. It also links to the target record.

**Current frontend contract and gaps:** `AdminActivityLog` has `resourceId` only, so the drawer displays that value as “Resource ID”; it has no `resourceDisplayId` or target title. The Admin API still does not provide before/after state snapshots. The frontend now accepts an optional `note`, displays it when present, and keeps responses without a note readable; the Admin API must return decision notes when available.

**Requested response shape:** Keep `resourceId` for the link and add `resourceDisplayId` and optionally `resourceTitle` for display. Return before/after values and note when the action has them; use `null` when the action does not change state.

```json
{
  "id": "<activity-uuid>",
  "admin": { "id": "<admin-uuid>", "firstName": "Example", "lastName": "Admin" },
  "action": "DISPUTE_CASE_RESOLVED",
  "resourceType": "DISPUTE_CASE",
  "resourceId": "<dispute-uuid>",
  "resourceDisplayId": "DSP-5203",
  "resourceTitle": "Verify dorm fire exits",
  "reasonCode": "<reason-code-or-null>",
  "previousState": "OPEN",
  "newState": "RESOLVED",
  "note": null,
  "resultVersion": 2,
  "resultTimestamp": "<ISO-8601-or-null>",
  "createdAt": "<ISO-8601>"
}
```

**UI evidence:** [Activity Log response type](src/features/admin/api/admin-api-types-core.ts#L131), [API-to-UI mapping](src/features/admin/activity-log/activity-log-model.ts#L62), [UI documents missing state snapshots](src/features/admin/activity-log/activity-log-model.ts#L15), [drawer target and state fields](src/features/admin/activity-log/activity-log-board.tsx#L87).

## 10. Global Search result IDs and labels

**Endpoint:** `GET /api/v1/admin/search?q=...&kind=...`.

**UI need:** The Admin enters a readable ID, such as `QST-12011`, in Search. Search must match that `displayId` (and a Member's `studentId`). Each result shows the readable ID, title/name, type, status, and latest time. When the Admin opens a result, the app uses the internal UUID.

**Current frontend contract and gaps:** `AdminSearchResult` contains `id` and `resourceId`. The mapping currently shows `id` as the result label and uses `resourceId` for navigation. It does not define `displayId` or `studentId`, and the UI mapping must be changed to show the readable field instead of `id`.

**Requested response shape:** Keep `id` and `resourceId` as internal UUIDs; do not make either field readable text. When both refer to the same record, they contain the same UUID. Add `displayId` for record types with a readable ID and `studentId` for Members. Search the query `q` against `displayId` and, for Member results, `studentId`. The UI must show `displayId` (or the Member's `studentId`) and open the result by `resourceId`.

```json
{
  "items": [
    {
      "kind": "quest",
      "id": "<quest-uuid>",
      "resourceId": "<quest-uuid>",
      "displayId": "QST-12011",
      "title": "Verify dorm fire exits",
      "status": "QUEST_FAILED",
      "newestAt": "<ISO-8601>"
    },
    {
      "kind": "member",
      "id": "<member-uuid>",
      "resourceId": "<member-uuid>",
      "studentId": "6510100001",
      "title": "Example Member",
      "status": "NORMAL",
      "newestAt": "<ISO-8601>"
    }
  ]
}
```

**UI evidence:** [Search response type](src/features/admin/api/admin-api-types-core.ts#L158), [Search request path](src/features/admin/api/admin-api-core.ts#L76), [search result display/link mapping](src/features/admin/overview/overview-search-model.ts#L186).

## Backend implementation order

1. Keep UUIDs in `id` fields. Add readable `displayId` values and Member `studentId` values to the records shown in the UI.
2. Make Global Search match `displayId` and Member `studentId`; make the UI show those values and keep using UUIDs to open records.
3. Return full-result `totalCount` and `countsByStatus` for each board, using the same search and filters across all pages.
4. Return the Quest finance, Dispute, Report Case, Conduct Report, Member, Payout, Wallet, and Wallet Statement fields shown in this report. Keep list rows separate from detail-only fields.
5. Make Overview return all count groups and all four queue summaries, including each oldest item's internal UUID and display ID. Add Activity Log target display ID and before/after state fields.

## Items that need live-response confirmation

This is a UI-side contract audit. Before implementing, compare each requested shape with the actual JSON from the listed endpoint. In particular, the generic `AdminReportCase` type allows extra properties, so a field can be returned by the API but remain undocumented in the TypeScript type. A mismatch between a UI fallback and a real response may also be a frontend mapping issue, not a server omission.
