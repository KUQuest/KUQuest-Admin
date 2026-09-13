# Quest Admin API Contract

Audience: KUQuest API Server developers

This document describes the Quest data required by the Admin web app. The
Admin repository must not change the API Server to implement this contract.
Please make these changes in the API Server repository.

The example IDs below are placeholders. Real IDs must remain UUID strings.
All existing response fields must remain available. The fields requested in
this document are additive.

## Current API routes

The API Server currently provides these routes:

```text
GET  /api/v1/admin/quests
GET  /api/v1/admin/quests/:questId
POST /api/v1/admin/quests/:questId/hide
POST /api/v1/admin/quests/:questId/restore
POST /api/v1/admin/quests/:questId/terminate
```

The current route and response schema are implemented in the API Server under:

```text
src/modules/quest/quest-admin.route.ts
src/modules/quest/quest-admin.schema.ts
src/modules/quest/quest-admin.controller.ts
```

Update the controller and its data/service mapping together with the schema.
Do not update only the TypeScript response type. The runtime response
validation must also accept and return the new fields.

## 1. List Quests

### Endpoint

```text
GET /api/v1/admin/quests
```

### Query parameters

```text
q             optional title or description search
status        optional canonical Quest State
mode          optional FIRST_COME_FIRST_SERVED or CANDIDATE
participation optional SINGLE or GROUP
hidden        optional true or false
limit         optional integer from 1 to 50
cursor        optional cursor from the previous response
sort          optional newest or oldest
```

### Current response

The current list response already contains the fields needed by the Quest
table. No detail-only fields should be added to this response. Keeping this
response small is important for table load time.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "quest-id",
        "apiVersion": "v1",
        "version": 1,
        "title": "Check flood route markers",
        "questStatus": "QUEST_OPEN",
        "mode": "FIRST_COME_FIRST_SERVED",
        "participation": "SINGLE",
        "headcount": 1,
        "rewardSatang": 50000,
        "questFundingTotalSatang": 50000,
        "startTime": "2026-09-17T08:48:00.000Z",
        "dueAt": "2026-09-24T08:48:00.000Z",
        "hiddenAt": null,
        "createdAt": "2026-09-14T08:48:00.000Z",
        "updatedAt": "2026-09-14T08:48:00.000Z",
        "hirer": {
          "id": "hirer-id",
          "firstName": "Kamonwan",
          "lastName": "Lertwiroj",
          "email": "hirer@ku.th"
        }
      }
    ],
    "nextCursor": null
  }
}
```

The endpoint must keep bounded cursor pagination. `nextCursor` must be `null`
when there is no next page. Do not return a local or generated Quest list
when this endpoint returns a valid response.

## 2. Get Quest detail

### Endpoint

```text
GET /api/v1/admin/quests/:questId
```

### Current response

The current response provides the core Quest record, locations, candidates,
Assignments, Proof Submissions, edit history, and Admin Action history. It
does not provide `tagName`, `hirerAttachments`, `timeline`, or
`disputeCase`.

```json
{
  "success": true,
  "data": {
    "id": "quest-id",
    "apiVersion": "v1",
    "version": 1,
    "title": "Check flood route markers",
    "description": "Inspect flood route and evacuation markers.",
    "condition": {
      "text": "Submit the requested inspection record.",
      "items": []
    },
    "questStatus": "QUEST_FAILED",
    "mode": "FIRST_COME_FIRST_SERVED",
    "participation": "SINGLE",
    "headcount": 1,
    "proofRequired": true,
    "tagId": "tag-id",
    "rewardSatang": 50000,
    "questFundingTotalSatang": 50000,
    "fundingReservationId": "reservation-id",
    "policyRevisionId": "policy-revision-id",
    "platformFeeBps": 500,
    "platformFeePerWorkerSatang": 2500,
    "questEscrowSatang": 50000,
    "startTime": "2026-09-17T08:48:00.000Z",
    "dueAt": "2026-09-24T08:48:00.000Z",
    "cancelledAt": null,
    "cancelledByUserId": null,
    "cancelledByAdminId": null,
    "hiddenAt": null,
    "hiddenByAdminId": null,
    "createdAt": "2026-09-14T08:48:00.000Z",
    "updatedAt": "2026-09-14T08:48:00.000Z",
    "locations": [
      {
        "label": "Kasetsart Innovation Centre"
      }
    ],
    "hirer": {
      "id": "hirer-id",
      "firstName": "Kamonwan",
      "lastName": "Lertwiroj",
      "email": "hirer@ku.th"
    },
    "candidates": {
      "applications": [],
      "teams": []
    },
    "assignments": [],
    "proofSubmissions": [],
    "editHistory": [],
    "adminActions": []
  }
}
```

### Required response

Keep every current field and add the following four fields:

```json
{
  "success": true,
  "data": {
    "id": "quest-id",
    "apiVersion": "v1",
    "version": 1,
    "title": "Check flood route markers",
    "description": "Inspect flood route and evacuation markers.",
    "condition": {
      "text": "Submit the requested inspection record.",
      "items": []
    },
    "questStatus": "QUEST_FAILED",
    "mode": "FIRST_COME_FIRST_SERVED",
    "participation": "SINGLE",
    "headcount": 1,
    "proofRequired": true,
    "tagId": "tag-id",
    "tagName": "Community Safety",
    "rewardSatang": 50000,
    "questFundingTotalSatang": 50000,
    "fundingReservationId": "reservation-id",
    "policyRevisionId": "policy-revision-id",
    "platformFeeBps": 500,
    "platformFeePerWorkerSatang": 2500,
    "questEscrowSatang": 50000,
    "startTime": "2026-09-17T08:48:00.000Z",
    "dueAt": "2026-09-24T08:48:00.000Z",
    "cancelledAt": null,
    "cancelledByUserId": null,
    "cancelledByAdminId": null,
    "hiddenAt": null,
    "hiddenByAdminId": null,
    "createdAt": "2026-09-14T08:48:00.000Z",
    "updatedAt": "2026-09-14T08:48:00.000Z",
    "locations": [
      {
        "label": "Kasetsart Innovation Centre"
      }
    ],
    "hirer": {
      "id": "hirer-id",
      "firstName": "Kamonwan",
      "lastName": "Lertwiroj",
      "email": "hirer@ku.th"
    },
    "hirerAttachments": [
      {
        "fileId": "file-id",
        "fileName": "inspection-guide.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 245760,
        "position": 0
      }
    ],
    "candidates": {
      "applications": [],
      "teams": []
    },
    "assignments": [],
    "proofSubmissions": [],
    "editHistory": [],
    "adminActions": [],
    "timeline": [
      {
        "event": "QUEST_CREATED",
        "status": "QUEST_DRAFT",
        "occurredAt": "2026-09-14T08:48:00.000Z",
        "actorId": "hirer-id",
        "reasonCode": null
      },
      {
        "event": "QUEST_FAILED",
        "status": "QUEST_FAILED",
        "occurredAt": "2026-09-15T10:00:00.000Z",
        "actorId": null,
        "reasonCode": "DEADLINE_PASSED"
      }
    ],
    "disputeCase": {
      "id": "dispute-case-id",
      "status": "DISPUTE_CASE_PENDING",
      "amountAtRiskSatang": 50000,
      "category": "EVIDENCE",
      "detail": "The submitted work requires administrative review."
    }
  }
}
```

### New field rules

#### `tagName`

```text
tagName: string | null
```

- Resolve the name from the Tag referenced by `tagId`.
- Keep `tagId` in the response as the stable relation ID.
- Return `null` when the Quest has no Tag.
- Do not return a generated name from the Admin client.

#### `hirerAttachments`

```text
hirerAttachments: array
```

Each item must contain:

```text
fileId      UUID
fileName    string
contentType string
sizeBytes   non-negative integer
position    non-negative integer
```

- Return only files attached to the Quest by the Hirer.
- Keep the array empty when there are no attachments.
- Do not return file bytes in the Quest detail response.
- Do not return a local demo file when the array is empty.
- If opening a file requires a signed URL or Evidence Reference, use the
  existing authorized file mechanism. Do not place a permanent public URL in
  this response.

#### `timeline`

```text
timeline: array
```

Each item must contain:

```text
event       canonical event code
status      canonical Quest State or null
occurredAt  ISO 8601 date-time
actorId     UUID or null
reasonCode  string or null
```

Requirements:

- Return the complete recorded Quest lifecycle in chronological order.
- Include system events and Admin Actions that affect the Quest.
- Use canonical event and status values. Do not return UI labels such as
  `Open` or `Failed` as the stored value.
- Return an empty array when no event exists. Do not create a timeline in the
  Admin client.
- `adminActions` may remain in the response for the existing Admin Action
  panel. It is not a replacement for the complete `timeline`.

#### `disputeCase`

```text
disputeCase: object | null
```

When a Dispute Case is related to the Quest, return:

```text
id                 UUID
status             canonical Dispute Case status
amountAtRiskSatang non-negative integer
category           string
detail             string
```

When no Dispute Case is related to the Quest, return `null`.

Requirements:

- Resolve the relation by `questId` in the API Server. The Admin client must
  not search a local Dispute Case map to find the relation.
- `amountAtRiskSatang` is the amount recorded when the Dispute Case opens.
- Do not use `resolvedAmountSatang` as the amount at risk.
- Keep `amountAtRiskSatang` unchanged after the case is dismissed or resolved.
- A Quest remains `QUEST_FAILED` while its Dispute Case is pending, dismissed,
  or resolved. Resolving a Dispute Case must not change `questStatus`.
- `category` and `detail` are required when a Dispute Case exists because the
  Quest detail displays them.

Supported Dispute Case statuses are:

```text
DISPUTE_CASE_PENDING
DISPUTE_CASE_DISMISSED
DISPUTE_CASE_RESOLVED
```

## 3. Hide a Quest

### Endpoint

```text
POST /api/v1/admin/quests/:questId/hide
```

### Request

Required headers:

```text
Idempotency-Key: unique-request-key
If-Match: current-resource-version
```

The API also accepts the existing `X-Resource-Version` form when supported by
the current API contract.

```json
{
  "reasonCode": "POLICY_REVIEW"
}
```

### Response

The current response shape is sufficient. Keep the response as a Quest
summary. The Admin client will request Quest detail again when it needs the
updated `timeline`.

```json
{
  "success": true,
  "data": {
    "resourceSummary": {
      "id": "quest-id",
      "apiVersion": "v1",
      "version": 2,
      "title": "Check flood route markers",
      "questStatus": "QUEST_OPEN",
      "mode": "FIRST_COME_FIRST_SERVED",
      "participation": "SINGLE",
      "headcount": 1,
      "rewardSatang": 50000,
      "questFundingTotalSatang": 50000,
      "startTime": "2026-09-17T08:48:00.000Z",
      "dueAt": "2026-09-24T08:48:00.000Z",
      "hiddenAt": "2026-09-16T12:00:00.000Z",
      "createdAt": "2026-09-14T08:48:00.000Z",
      "updatedAt": "2026-09-16T12:00:00.000Z",
      "hirer": {
        "id": "hirer-id",
        "firstName": "Kamonwan",
        "lastName": "Lertwiroj",
        "email": "hirer@ku.th"
      }
    },
    "resourceVersion": 2,
    "adminActionId": "admin-action-id"
  }
}
```

## 4. Restore a Quest

### Endpoint

```text
POST /api/v1/admin/quests/:questId/restore
```

### Request

Required headers:

```text
Idempotency-Key: unique-request-key
If-Match: current-resource-version
```

The body is optional:

```json
{
  "reasonCode": "POLICY_REVIEW"
}
```

### Response

Use the same response shape as Hide. `resourceSummary.hiddenAt` must be
`null` after a successful Restore.

```json
{
  "success": true,
  "data": {
    "resourceSummary": {
      "id": "quest-id",
      "apiVersion": "v1",
      "version": 3,
      "title": "Check flood route markers",
      "questStatus": "QUEST_OPEN",
      "mode": "FIRST_COME_FIRST_SERVED",
      "participation": "SINGLE",
      "headcount": 1,
      "rewardSatang": 50000,
      "questFundingTotalSatang": 50000,
      "startTime": "2026-09-17T08:48:00.000Z",
      "dueAt": "2026-09-24T08:48:00.000Z",
      "hiddenAt": null,
      "createdAt": "2026-09-14T08:48:00.000Z",
      "updatedAt": "2026-09-16T12:10:00.000Z",
      "hirer": {
        "id": "hirer-id",
        "firstName": "Kamonwan",
        "lastName": "Lertwiroj",
        "email": "hirer@ku.th"
      }
    },
    "resourceVersion": 3,
    "adminActionId": "admin-action-id"
  }
}
```

## 5. Terminate a Quest

### Endpoint

```text
POST /api/v1/admin/quests/:questId/terminate
```

### Request

Required headers:

```text
Idempotency-Key: unique-request-key
If-Match: current-resource-version
```

```json
{
  "reasonCode": "POLICY_VIOLATION"
}
```

### Response

Use the same response shape as Hide and Restore. The returned summary must
contain the new canonical Quest State and the new resource version.

```json
{
  "success": true,
  "data": {
    "resourceSummary": {
      "id": "quest-id",
      "apiVersion": "v1",
      "version": 4,
      "title": "Check flood route markers",
      "questStatus": "QUEST_CANCELLED",
      "mode": "FIRST_COME_FIRST_SERVED",
      "participation": "SINGLE",
      "headcount": 1,
      "rewardSatang": 50000,
      "questFundingTotalSatang": 50000,
      "startTime": "2026-09-17T08:48:00.000Z",
      "dueAt": "2026-09-24T08:48:00.000Z",
      "hiddenAt": null,
      "createdAt": "2026-09-14T08:48:00.000Z",
      "updatedAt": "2026-09-16T12:20:00.000Z",
      "hirer": {
        "id": "hirer-id",
        "firstName": "Kamonwan",
        "lastName": "Lertwiroj",
        "email": "hirer@ku.th"
      }
    },
    "resourceVersion": 4,
    "adminActionId": "admin-action-id"
  }
}
```

## Canonical values and display rules

The API must return canonical values. The Admin client is responsible only for
display translation.

Quest States currently used by the Admin contract include:

```text
QUEST_DRAFT
QUEST_OPEN
QUEST_AWAITING_CONSENT
QUEST_ASSIGNED
QUEST_IN_PROGRESS
QUEST_SUBMITTED
QUEST_APPROVED
QUEST_REWORK
QUEST_COMPLETED
QUEST_CANCELLED
QUEST_DISPUTED
QUEST_FAILED
```

The API must not return UI-only values such as `Open`, `Draft`, or
`In progress` in `questStatus`. The Admin may display those readable labels.

Although `QUEST_DISPUTED` exists in the current Quest status union, do not use
it as a replacement for `QUEST_FAILED` when a Dispute Case is opened or
resolved. Issue 67 requires the Quest to remain `QUEST_FAILED` during Dispute
Case review and after the Dispute Case decision.

Amounts remain in Satang in API responses. The Admin converts Satang to Baht
for display. `platformFeeBps` remains basis points in the API response; the
Admin converts it to a percentage for display.

## Required API Server work

The API Server must:

1. Add `tagName` to the Quest detail schema and controller mapping.
2. Add `hirerAttachments` to the Quest detail schema and controller mapping.
3. Add a complete chronological `timeline` to the Quest detail schema and
   controller mapping.
4. Add the related `disputeCase` summary to the Quest detail schema and
   controller mapping.
5. Load the fields from the database and related services. Do not generate
   demo values in the API response.
6. Return `null` or an empty array according to the rules above. Do not omit
   these fields from a successful detail response.
7. Keep the current authorization, UUID validation, bounded pagination,
   Idempotency-Key, and optimistic concurrency checks.
8. Add API tests for normal, empty, and related Dispute Case records.

## Conflicts and decisions

There is no breaking conflict if these fields are added to the detail response.
The current API already returns `tagId`, `locations`, `adminActions`, and the
Quest State.

The following gaps require API Server implementation:

- `tagName` requires a Tag lookup.
- `hirerAttachments` requires the Quest attachment relation and file metadata.
- `timeline` requires a complete event source. `adminActions` alone is not
  enough for the full Quest lifecycle.
- `disputeCase` requires a Quest-to-Dispute Case relation and the saved
  `amountAtRiskSatang` value.

The Admin repository has not changed the API Server. Until these fields exist,
the Admin cannot claim that these four detail sections are fully API-backed.
