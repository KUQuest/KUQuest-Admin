# Missing Admin API

Checked on 4 September 2026 against:

- Issue 67: the Admin API specification.
- The Admin client contract in `src/features/admin/api/admin-api.ts`.
- The running KUQuest API Server.

This file lists only the Admin API paths that the Admin client expects but the
API Server does not provide. These paths currently return `404`.

All endpoints require an authenticated Admin Session. The API uses this
response envelope:

```json
{ "success": true, "data": {} }
```

Errors use:

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

For list endpoints, use this page shape:

```ts
{
  items: T[];
  nextCursor: string | null;
}
```

Unless stated otherwise, `limit` is optional and must be an integer from 1 to
50. `cursor` is optional and is the cursor returned by the previous page.

## Overview

### `GET /api/v1/admin/overview`

Functionality: return the Admin dashboard counters and recent operational
records.

Request fields: none.

Response fields:

```ts
{
  activeDisputes: number;
  payoutsNeedingReview: number;
  openReports: number;
  totalWorkLeft: number;
  questStateCounts: Partial<Record<QuestState, number>>;
  recentDecisions?: Array<{
    id: string;
    kind: "DISPUTE_CASE" | "REPORT_CASE" | "CONDUCT_REPORT";
    title: string;
    detail: string;
    amountSatang?: number;
    occurredAt: string;
  }>;
  recentPayouts?: Array<{
    id: string;
    memberName: string;
    amountSatang: number;
    payoutStatus: string;
  }>;
  recentMemberPenalties?: Array<{
    memberId: string;
    memberName: string;
    status: "ACTIVE" | "FROZEN" | "SUSPENDED" | "CLOSED";
    occurredAt: string;
  }>;
}
```

Requirements:

- Calculate the counters from current API data.
- Do not use browser-local data.
- Use canonical Quest, Dispute Case, Report Case, Conduct Report, Payout,
  Wallet, and Penalty values.

## Activity Log

### `GET /api/v1/admin/activity-logs`

Functionality: return the cursor-paginated audit trail of Admin actions.

Query fields:

```ts
{
  limit?: number;
  cursor?: string;
}
```

Response fields:

```ts
{
  items: Array<{
    id: string;
    action: string;
    actorAdminId: string;
    occurredAt: string;
    subjectType: string;
    subjectId: string;
    detail?: string;
  }>;
  nextCursor: string | null;
}
```

## Dispute Cases

### `GET /api/v1/admin/disputes`

Functionality: return the Admin Dispute Case queue. Include Dispute Cases
linked to Quests with `QUEST_FAILED` state.

Query fields:

```ts
{
  status?:
    | "DISPUTE_CASE_PENDING"
    | "DISPUTE_CASE_DISMISSED"
    | "DISPUTE_CASE_RESOLVED";
  questId?: string;
  query?: string;
  limit?: number;
  cursor?: string;
}
```

Response fields:

```ts
{
  items: DisputeCase[];
  nextCursor: string | null;
}
```

`DisputeCase` fields:

```ts
{
  id: string;
  questId: string;
  status:
    | "DISPUTE_CASE_PENDING"
    | "DISPUTE_CASE_DISMISSED"
    | "DISPUTE_CASE_RESOLVED";
  workerId?: string;
  amountSatang?: number;
  evidenceRefs?: EvidenceReference[];
  questState?: "QUEST_FAILED";
  version?: number;
}
```

`EvidenceReference` is a non-blank reference token. The Admin uses it with
the Evidence endpoint.

### `GET /api/v1/admin/disputes/:disputeId`

Functionality: return one Dispute Case for the Admin detail view.

Path fields:

- `disputeId`: required Dispute Case identifier.

Response fields: one `DisputeCase` with the fields defined above.

## Report Cases and Conduct Reports

### `GET /api/v1/admin/reports`

Functionality: return Report Cases and Conduct Reports for Trust and Safety
review.

Query fields:

```ts
{
  status?:
    | "REPORT_CASE_PENDING"
    | "REPORT_CASE_DISMISSED"
    | "REPORT_CASE_HIDDEN"
    | "REPORT_CASE_RESTORED"
    | "CONDUCT_REPORT_PENDING"
    | "CONDUCT_REPORT_UPHELD"
    | "CONDUCT_REPORT_DISMISSED";
  reportedMemberId?: string;
  query?: string;
  limit?: number;
  cursor?: string;
}
```

Response fields:

```ts
{
  items: ReportCase[];
  nextCursor: string | null;
}
```

`ReportCase` fields:

```ts
{
  id: string;
  status:
    | "REPORT_CASE_PENDING"
    | "REPORT_CASE_DISMISSED"
    | "REPORT_CASE_HIDDEN"
    | "REPORT_CASE_RESTORED"
    | "CONDUCT_REPORT_PENDING"
    | "CONDUCT_REPORT_UPHELD"
    | "CONDUCT_REPORT_DISMISSED";
  reportedMemberId: string;
  evidenceRefs?: EvidenceReference[];
  questId?: string;
  version?: number;
}
```

### `GET /api/v1/admin/reports/:reportId`

Functionality: return one Report Case or Conduct Report for the Admin detail
view.

Path fields:

- `reportId`: required Report Case or Conduct Report identifier.

Response fields: one `ReportCase` with the fields defined above.

### `POST /api/v1/admin/reports/:reportId/decide`

Functionality: record a moderation decision for a Report Case or Conduct
Report.

Required headers:

```http
Idempotency-Key: non-blank unique command key
```

Path fields:

- `reportId`: required Report Case or Conduct Report identifier.

Request body:

```ts
{
  decision:
    | "REPORT_CASE_DISMISSED"
    | "REPORT_CASE_HIDDEN"
    | "REPORT_CASE_RESTORED"
    | "CONDUCT_REPORT_DISMISSED"
    | "CONDUCT_REPORT_UPHELD";
  reason: string; // required, non-blank
}
```

Response fields: the updated `ReportCase`.

Additional rule: `CONDUCT_REPORT_UPHELD` must create a confirmed violation
according to the Admin Member Penalty Contract.

## Evidence

### `GET /api/v1/admin/evidence/:evidenceRef`

Functionality: return read-only Message or Attachment context referenced by
an Evidence Reference. Do not provide a Chat composer or allow Admin message
creation.

Path fields:

- `evidenceRef`: required non-blank Evidence Reference token. URL-encode the
  token before placing it in the path.

Response fields:

```ts
{
  evidenceRef: string;
  context?: unknown;
  expiresAt?: string;
}
```

The response must contain only the bounded evidence context needed for the
moderation decision. Do not return unrelated private records, unbounded
Message history, file bytes, or an unrestricted signed URL.

## Members

### `GET /api/v1/admin/members`

Functionality: search and list Members for Admin review.

Query fields:

```ts
{
  query?: string;
  walletStatus?: "ACTIVE" | "FROZEN" | "SUSPENDED" | "CLOSED";
  limit?: number;
  cursor?: string;
}
```

Response fields:

```ts
{
  items: Member[];
  nextCursor: string | null;
}
```

`Member` fields:

```ts
{
  id: string;
  displayName: string;
  email?: string;
  walletStatus?: "ACTIVE" | "FROZEN" | "SUSPENDED" | "CLOSED";
  penaltyRecord?: PenaltyRecordEntry[];
  version?: number;
}
```

`PenaltyRecordEntry` must include:

- Member identity
- Ladder: `MISCONDUCT` or `REVIEW`
- Source: `REPORT_CASE`, `CONDUCT_REPORT`, or `REVIEW_AVERAGE`
- Sequence number
- Penalty result
- Actor
- Reason
- Occurred time
- Nullable reversal link

### `GET /api/v1/admin/members/:memberId`

Functionality: return one Member for the Admin detail view.

Path fields:

- `memberId`: required Member identifier.

Response fields: one `Member`, including the Member penalty record when it
exists.

### `POST /api/v1/admin/wallets/:memberId/status`

Functionality: change a Member Wallet Status and record the change in Wallet
status history. Preserve all active obligations.

Required headers:

```http
Idempotency-Key: non-blank unique command key
```

Path fields:

- `memberId`: required Member identifier.

Request body:

```ts
{
  status: "ACTIVE" | "FROZEN" | "SUSPENDED" | "CLOSED";
  reason: string; // required, non-blank
}
```

Response fields: the updated `Member`.

Red Flag and Member Ban state must remain separate from Wallet Status. This
endpoint does not replace the Member Penalty API.

## Admin Events

### `GET /api/v1/admin/events`

Functionality: provide a credentialed Server-Sent Events stream. The Admin
uses it to refresh changed resources.

Required request header:

```http
Accept: text/event-stream
```

Each event data payload may contain:

```ts
{
  id?: string;
  type: string;
  subjectType?: string;
  subjectId?: string;
  state?: string;
  version?: number;
  queueImpact?: string[];
  occurredAt?: string;
}
```

Requirements:

- Require the authenticated Admin Session.
- Support credentials on the connection.
- Close the stream safely when the client disconnects.
- Do not send private evidence or full resource bodies in an event.

## Dependencies and conflict

The Admin Rulebook requires Red Flag, temporary ban, permanent ban, strike
count, exemptions, and reversal records. The current API database has none of
these fields or tables. The API Server must add this persistence before the
Admin can load or apply real penalties.

Issue 67 and the Admin Rulebook state that `QUEST_FAILED` remains the Quest
State during Dispute Case resolution. The current available API response
schema for `/api/v1/admin/quests/:questId/dispute/resolve` allows
`QUEST_CANCELLED` or `QUEST_COMPLETED`. Backend behavior must be aligned with
Issue 67 before the Dispute Case flow is complete.
