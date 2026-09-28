# Admin UI: API data gaps and requested response shapes

## Scope and how to read this report

This report follows the Admin UI and the Admin frontend API types only. I did not inspect the API Server or any Rulebook.

Important: “Current frontend contract” below means the response shape declared or consumed by this Admin app. It is not a claim that this is the exact payload the running API Server returns. The API client uses TypeScript types but does not validate the JSON response at runtime. Please compare these points with the live API response before changing the server.

For IDs, keep both values when they serve different purposes:

- `id`: internal UUID. The Admin app uses this value for API paths and links.
- `displayId`: readable identifier for people, such as `QST-12011`, `DSP-5203`, `RPT-8202`, `PAY-9631`, or `WAL-1001`.
- Member ID shown in the UI: `studentId`, not the Member UUID.

Do not put a UUID in a display field. If a resource has no readable ID today, return `displayId: null` and let the UI show a blank marker. Do not copy `id` into `displayId`.

Some UUID display problems are also in the Admin UI mapping, so they do not need a new API field alone: the Member drawer currently labels `model.id` as “Member ID” even though `studentId` is present; the Quest helper truncates a UUID when no `displayId` is returned; and the Dispute model falls back to `id` for its displayed case ID. The API should return `displayId`, and the UI should render it rather than any UUID. See [Member drawer ID](src/features/admin/member/member-detail.tsx#L517), [Quest display fallback](src/features/admin/quest/quest-model.ts#L238), and [Dispute display fallback](src/features/admin/dispute/dispute-model.ts#L314).

## 1. Shared list response: total and filter counts

**UI need:** The Quest, Dispute, Report Case, and Conduct Report boards show result totals and a count on each status filter. The UI calculates these counts from records loaded so far. It fetches the first page with a limit of 50 and can load more pages.

**Current frontend contract:** `AdminPage<T>` has only `items` and `nextCursor`. Board tab counts use the loaded `page.items`, not a server total. For example, the Report Case board calculates every tab count from `page.items`.

**Requested response shape:** Add server counts to paginated list responses. Keep cursor paging and return counts for the full filtered result set, not only this page.

```json
{
  "items": [],
  "nextCursor": "opaque-cursor-or-null",
  "totalCount": 123,
  "countsByStatus": {
    "OPEN": 14,
    "DISMISSED": 3,
    "RESOLVED": 8
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

**Requested response shape:** The list and detail should include `displayId` and a stable Hirer summary with `studentId`. Detail should return empty arrays for collections with no records, rather than omit a collection. Return the complete timeline and attachment metadata when available. Preserve UUIDs separately for links.

```json
{
  "id": "<quest-uuid>",
  "displayId": "QST-12011",
  "title": "Verify dorm fire exits",
  "questStatus": "QUEST_FAILED",
  "hirer": {
    "id": "<member-uuid>",
    "studentId": "6510100001",
    "firstName": "Example",
    "lastName": "Hirer",
    "email": "hirer@ku.th"
  },
  "startTime": "<ISO-8601>",
  "dueAt": "<ISO-8601-or-null>",
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

**Quest finance need:** The finance endpoint must include the displayed reservation, transfer, and ledger data. The current frontend type already declares these collections. If the server returns no records, return `[]` and `reservation: null` rather than omitting them.

**UI evidence:** [Quest response types](src/features/admin/api/admin-api-types-quest.ts#L19), [optional detail collections](src/features/admin/api/admin-api-types-quest.ts#L55), [Quest endpoint paths](src/features/admin/api/admin-api-quest.ts#L20), [Quest detail fallback states](src/features/admin/quest/quest-page.tsx#L392), [Candidate and Worker display](src/features/admin/quest/quest-page.tsx#L480), [timeline fallback](src/features/admin/quest/quest-page.tsx#L281).

## 4. Dispute Case list and detail

**Endpoints:** `GET /api/v1/admin/disputes` and `GET /api/v1/admin/disputes/:disputeId`.

**UI need:** The table shows Dispute Case ID, readable Quest ID/title, Hirer, Worker, category, amount at risk, status, and opened time. Detail shows both parties and Student IDs, statements, Quest state/failure time, evidence references, decision result, resolved amount, Admin, and decision time.

**Current frontend contract and gaps:** `AdminDisputeCase` requires `id`, `displayId`, `questId`, and `status`, but the `questId` has no separate `questDisplayId`. Detail has a nested Quest with UUID, title, Hirer UUID, state, failed time, and reservation UUID. Filer/respondent identities, statements, category, opened time, and evidence are not declared as structured fields. The UI model reads optional aliases and renders “Not provided” when it cannot find them. `AdminDisputeEvidence` has Worker/Hirer UUIDs but no Member names or Student IDs.

**Requested response shape:** Return structured party and Quest summaries on both list and detail items. Keep ID values for linking, and add readable IDs for display.

```json
{
  "id": "<dispute-uuid>",
  "displayId": "DSP-5203",
  "status": "OPEN",
  "category": "SCOPE",
  "openedAt": "<ISO-8601>",
  "amountAtRiskSatang": 3250000,
  "version": 1,
  "quest": {
    "id": "<quest-uuid>",
    "displayId": "QST-12011",
    "title": "Verify dorm fire exits",
    "questStatus": "QUEST_FAILED",
    "failedAt": "<ISO-8601-or-null>"
  },
  "hirer": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Hirer" },
  "worker": { "id": "<member-uuid>", "studentId": "6510100002", "firstName": "Example", "lastName": "Worker" },
  "statements": { "hirer": "<text-or-null>", "worker": "<text-or-null>" },
  "evidenceReferences": []
}
```

For the resolution fields, return `resolvedWorker` as a Member summary (or `null`), `resolvedAmountSatang`, `resolvedByAdmin` as a name summary (or `null`), `resolvedAt`, and the decision reason. The UI needs these values to render the recorded outcome. Evidence reads should also include readable Member summaries for assignment/proof participants where the UI names those people.

**UI evidence:** [Dispute API types](src/features/admin/api/admin-api-types-dispute.ts#L2), [detail contract](src/features/admin/api/admin-api-types-dispute.ts#L16), [evidence contract](src/features/admin/api/admin-api-types-dispute.ts#L90), [model fallbacks and alias lookup](src/features/admin/dispute/dispute-model.ts#L243), [party and Quest panels](src/features/admin/dispute/dispute-detail.tsx#L160), [Dispute table columns](src/features/admin/dispute/dispute-board.tsx#L170).

## 5. Report Case and Conduct Report

**Endpoints:** Both use `GET /api/v1/admin/reports?kind=REPORT_CASE` or `?kind=CONDUCT_REPORT`, and `GET /api/v1/admin/reports/:reportId`. Report Case evidence uses `GET /api/v1/admin/evidence/:evidenceRef` after the Admin opens a reference.

### Report Case

**UI need:** The table shows Report Case ID, source, Reported Member name/Student ID, reporting Member name/Student ID, report type, status, and time. Detail shows the same identities, detail text, linked Quest, evidence references, and decision history.

**Current frontend contract and gaps:** `AdminReportCase` declares only `id`, `displayId`, status, `reportedMemberId`, optional evidence refs, optional `questId`, and version; other fields are hidden behind `[key: string]: unknown`. The model reads reporter data from `reporterEntries[0]`, but the response type does not define `reporterEntries`. The table needs both Member names and Student IDs before an evidence read. The Evidence endpoint returns the reported Message's sender, but that is a separate, deliberate read and does not provide a safe source for table rows without opening each Evidence Reference.

**Requested response shape:** Include the reported Message sender and reporter summaries in the Report Case summary. Do not include Message body/content in the list response; the UI reads message content only after an explicit Evidence Reference action.

```json
{
  "id": "<report-uuid>",
  "displayId": "RPT-8202",
  "kind": "REPORT_CASE",
  "status": "OPEN",
  "version": 1,
  "source": "MESSAGE",
  "reportType": "MESSAGE_CONTENT",
  "details": "<report detail>",
  "reportedAt": "<ISO-8601>",
  "reportedMember": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Reported" },
  "reporter": { "id": "<member-uuid>", "studentId": "6510100002", "firstName": "Example", "lastName": "Reporter" },
  "quest": { "id": "<quest-uuid>", "displayId": "QST-12011", "title": "Verify dorm fire exits" },
  "evidenceReferences": [{ "id": "<evidence-reference>", "displayId": "Evidence 1" }],
  "caseClosedAt": null
}
```

If multiple reporter entries are valid, return them all as structured entries. If the table needs one reporter label, also return a documented primary `reporter` summary rather than making the UI silently choose element zero.

### Conduct Report

**UI need:** The table shows readable Conduct Report ID, Quest ID/title, Reported Member, reporting Member, reason, status, and reported time. Detail also shows Quest state, assignments, Proof Submissions, evidence, and the moderation context needed to understand the reported event.

**Current frontend contract and gaps:** Conduct Reports share the generic `AdminReportCase` type. The Conduct Report model reads fields such as `reportedMember`, `reporter`, `reasonCode`, `quest`, `assignments`, `proofSubmissions`, and decision fields dynamically, but the shared response type does not describe these fields. The UI therefore falls back to “Member not provided”, “Reporter not provided”, “Quest not provided”, or “Reason not provided” when they are absent or named differently.

**Requested response shape:** Use a distinct Conduct Report shape, or a discriminated union keyed by `kind`. Return structured Member and Quest summaries, not only their UUIDs.

```json
{
  "id": "<conduct-report-uuid>",
  "displayId": "CR-<readable-number>",
  "kind": "CONDUCT_REPORT",
  "status": "OPEN",
  "version": 1,
  "reasonCode": "<reason-code>",
  "details": "<report detail-or-null>",
  "reportedAt": "<ISO-8601>",
  "reportedMember": { "id": "<member-uuid>", "studentId": "6510100001", "firstName": "Example", "lastName": "Reported" },
  "reporter": { "id": "<member-uuid>", "studentId": "6510100002", "firstName": "Example", "lastName": "Reporter" },
  "quest": { "id": "<quest-uuid>", "displayId": "QST-12011", "title": "Verify dorm fire exits", "questStatus": "QUEST_FAILED", "failedAt": "<ISO-8601-or-null>" },
  "assignments": [],
  "proofSubmissions": [],
  "evidenceReferences": [],
  "resolvedAt": null
}
```

Each assignment and Proof Submission shown in detail needs readable participant summaries (`id`, `studentId`, first and last name), event/status, and timestamps. Return empty arrays when there are no records. Do not use a UUID as the displayed Quest, Member, or case ID.

**UI evidence:** [Report response type](src/features/admin/api/admin-api-types-dispute.ts#L36), [Report endpoints](src/features/admin/api/admin-api-report.ts#L19), [Report Case table requirements](src/features/admin/report/report-board.tsx#L162), [Report Case field lookups](src/features/admin/report/report-model.ts#L216), [Conduct Report field lookups](src/features/admin/conduct-report/conduct-report-model.ts#L236), [Conduct Report table requirements](src/features/admin/conduct-report/conduct-report-board.tsx#L190), [Evidence message sender shape](src/features/admin/api/admin-api-types-dispute.ts#L47).

## 6. Member detail: moderation, related cases, Quests, Payouts, and Reviews

**Endpoints currently called:** `GET /api/v1/admin/members/:memberId`, `GET /api/v1/admin/finance/members/:memberId`, and `GET /api/v1/admin/reports?memberId=:memberId`. Wallet Statement uses the ledger transaction endpoint.

**UI need:** Member detail shows profile fields and Student ID, moderation status and confirmed violation count, moderation history, reports received, reports submitted, Quest history, Payout records, Reviews, and Wallet Statement.

**Current frontend contract and gaps:** `AdminMemberDetail` has profile, Wallet, and aggregate stats only. It has no moderation summary/history, Quest list, Payout list, or Review list. `memberModelFromApi` sets `reportsSubmitted`, `reviews`, `quests`, and `payouts` to empty arrays; it sets `confirmedViolationCount` to `null` and reports submitted as unavailable. `GET /reports?memberId=` is used for received reports only. `AdminReportListQuery` has one ambiguous `memberId` filter, not separate reported/reporter roles.

**Requested response shape:** Either include the related read-only detail collections in Member detail, or provide member-scoped paginated endpoints and call them from the UI. The response must distinguish cases where this Member is the target from cases where this Member filed the case. `GET /api/v1/admin/reports` should accept separate `reportedMemberId` and `reporterMemberId` filters. The Member UI also currently shows Experience, Tags, Admin Notes, and report/activity counts; these values are absent from the API-backed Member model. If these sections remain in the UI, include their data or provide Member-scoped read/write endpoints.

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
  "moderationHistory": [],
  "experience": [],
  "tags": [],
  "adminNotes": [],
  "stats": { "questsCreatedCount": 0, "questsCompletedAsWorkerCount": 0, "reviewsReceivedCount": 0, "averageRating": null, "payoutsCount": 0, "totalEarnedSatang": 0, "totalPaidOutSatang": 0 },
  "reportsReceived": { "items": [], "nextCursor": null, "totalCount": 0 },
  "reportsSubmitted": { "items": [], "nextCursor": null, "totalCount": 0 },
  "quests": { "items": [], "nextCursor": null, "totalCount": 0 },
  "payouts": { "items": [], "nextCursor": null, "totalCount": 0 },
  "reviews": { "items": [], "nextCursor": null, "totalCount": 0 }
}
```

Required row fields:

- `moderationHistory[]`: event/display label, time, Admin/member actor name, reason, previous/new status, outcome, duration/expiry, and related case `{ id, displayId, kind }` when present.
- `reportsReceived[]` and `reportsSubmitted[]`: case `{ id, displayId }`, kind, readable counterpart Member name/Student ID, reason/detail, status, and time.
- `quests[]`: `{ id, displayId, title, role, status, createdAt }`.
- `payouts[]`: `{ id, displayId, status, principalSatang, createdAt }`.
- `reviews[]`: `{ id, reviewer: { id, studentId, firstName, lastName }, rating, comment, createdAt }`.
- `experience[]`: `{ id, title, organization, description, startedAt, endedAt }`; `tags[]`: readable Tag names.
- `adminNotes[]`: `{ id, admin: { id, firstName, lastName }, note, createdAt }`, if Admin Notes remain part of the UI. The current API-backed action rejects “Add note”.
- Include `reportsReceivedCount` and `reportsSubmittedCount` in `stats`, or provide `totalCount` for each related-case list. The current Member route fetches one page with a limit of 50, but the UI uses loaded rows as counts.

The existing member stats can provide counts and totals, but they cannot replace the rows that the UI displays. Return a zero count as `0` and an empty list as `[]`; reserve `null` for a value that is genuinely unknown.

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

**Requested response shape:** Add `displayId` for Wallet, and include structured Member data with both internal `id` and `studentId`. For status history, include actor name (and `studentId` for a Member actor). For ledger business references that are shown to an Admin, return a readable reference field when the current reference is a UUID.

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

Do not remove UUIDs needed for lookups. Add separate display values.

**UI evidence:** [Wallet type](src/features/admin/api/admin-api-types-member-wallet.ts#L83), [status-history type](src/features/admin/api/admin-api-types-member-wallet.ts#L115), [Ledger Transaction types](src/features/admin/api/admin-api-types-queries.ts#L70), [Wallet endpoints](src/features/admin/api/admin-api-member-wallet.ts#L57), [Wallet table displayed IDs](src/features/admin/wallet/wallet-page.tsx#L345).

## 9. Activity Log target and state change

**Endpoint:** `GET /api/v1/admin/activity-log`.

**UI need:** Activity Log detail shows the Admin actor, human-readable target ID, reason, result version/time, and previous/new state when the action changes state. It also links to the target record.

**Current frontend contract and gaps:** `AdminActivityLog` has `resourceId` only, so the drawer displays that value as “Resource ID”; it has no `resourceDisplayId` or target title. The UI model explicitly calls previous/new state “fixture-only”; the API type does not include these fields. `note` is optional in the UI model but absent from the API type.

**Requested response shape:** Keep `resourceId` for the link and add `resourceDisplayId` and optionally `resourceTitle` for display. Return before/after values and note when the action has them; use `null` when the action does not change state.

```json
{
  "id": "<activity-uuid>",
  "displayId": "ACT-<readable-number>",
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

**UI need:** Search results show a readable record ID, title/name, type, status, and latest time, then open the record by its internal ID.

**Current frontend contract and gaps:** `AdminSearchResult` contains both `id` and `resourceId`, but the mapping uses `id` for the visible label and `resourceId` for navigation. The contract does not say that `id` must be human-readable, and it does not have `displayId` or a Member `studentId`.

**Requested response shape:** Name both fields by purpose. `resourceId` must remain the internal UUID. Add `displayId` (or make `id` explicitly the readable value) and Member Student ID where applicable.

```json
{
  "items": [
    {
      "kind": "quest",
      "resourceId": "<quest-uuid>",
      "displayId": "QST-12011",
      "title": "Verify dorm fire exits",
      "status": "QUEST_FAILED",
      "newestAt": "<ISO-8601>"
    }
  ]
}
```

**UI evidence:** [Search response type](src/features/admin/api/admin-api-types-core.ts#L158), [Search request path](src/features/admin/api/admin-api-core.ts#L76), [search result display/link mapping](src/features/admin/overview/overview-search-model.ts#L186).

## Backend implementation order

1. Add `displayId` fields and nested Member summaries to Dispute, Report, Conduct Report, Quest, Payout, Wallet, and Search responses. Keep UUID `id` values for links and commands; display Student ID for Members.
2. Add Member-scoped read data for moderation, both report directions, Quest history, Payout rows, and Reviews.
3. Make Overview return all count groups and all four queue summaries, including each oldest item's internal ID and display ID.
4. Add full-result page counts for boards so status-tab counts remain correct beyond the first 50 records.
5. Add Activity Log target display ID and before/after state fields.

## Items that need live-response confirmation

This is a UI-side contract audit. Before implementing, compare each requested shape with the actual JSON from the listed endpoint. In particular, the generic `AdminReportCase` type allows extra properties, so a field can be returned by the API but remain undocumented in the TypeScript type. A mismatch between a UI fallback and a real response may also be a frontend mapping issue, not a server omission.
