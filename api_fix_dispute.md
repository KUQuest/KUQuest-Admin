# Dispute Case API Fix

Audience: KUQuest API Server team

This document defines the response data required by the Admin web app for
Dispute Cases.

The Admin repository must not change the API Server. Please implement the API
changes in the API Server repository.

The values `case-id`, `quest-id`, and similar values below are examples. Real
API IDs remain UUID strings.

The response examples show only fields required by the Admin UI. Existing API
fields not shown in a target response must remain available unless the API
Server team agrees to a separate breaking-contract change.

## Required endpoints

### 1. List Dispute Cases

```text
GET /api/v1/admin/disputes
```

Current response is missing `quest.title`, `amountAtRiskSatang`, and
`category`.

Required response fields:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "case-id",
        "questId": "quest-id",
        "quest": {
          "title": "Verify quiet study room availability"
        },
        "status": "DISPUTE_CASE_PENDING",
        "amountAtRiskSatang": 50000,
        "category": "EVIDENCE",
        "createdAt": "2026-09-11T14:12:11.903Z",
        "version": 1
      }
    ],
    "nextCursor": null
  }
}
```

Supported `status` values are:

```text
DISPUTE_CASE_PENDING
DISPUTE_CASE_DISMISSED
DISPUTE_CASE_RESOLVED
```

The endpoint must keep cursor pagination. The `limit` must remain bounded by
the current API rule.

### 2. Dispute Case detail

```text
GET /api/v1/admin/disputes/:disputeCaseId
```

Current response is missing the case amount, case detail, party roles, the
respondent ID, and decision statements. `filerUserId` already exists and must
remain.

Required response fields:

```json
{
  "success": true,
  "data": {
    "id": "case-id",
    "questId": "quest-id",
    "status": "DISPUTE_CASE_PENDING",
    "version": 1,
    "amountAtRiskSatang": 50000,
    "category": "EVIDENCE",
    "detail": "The submitted work may not satisfy the Quest requirements.",
    "filerStatement": "The submitted work is incomplete.",
    "respondentStatement": "All required work was submitted.",
    "filerUserId": "filer-id",
    "filerRole": "HIRER",
    "respondentUserId": "respondent-id",
    "respondentRole": "WORKER",
    "resolvedWorkerId": null,
    "resolvedAmountSatang": null,
    "resolvedByAdminId": null,
    "resolvedAt": null,
    "createdAt": "2026-09-11T14:12:11.903Z",
    "updatedAt": "2026-09-11T14:12:11.903Z",
    "quest": {
      "id": "quest-id",
      "title": "Verify quiet study room availability",
      "questStatus": "QUEST_FAILED",
      "failedAt": "2026-09-11T13:40:00.000Z"
    }
  }
}
```

Do not add full nested Member objects or email addresses to this response.
The Admin app only needs the IDs and roles. Member information can use the
Member API when it is required.

`filerRole` and `respondentRole` must use only:

```text
HIRER
WORKER
```

The roles describe the Dispute parties. `openedByAdminId` describes the Admin
actor and is not a party role.

### 3. Case-scoped Evidence

```text
GET /api/v1/admin/disputes/:disputeCaseId/evidence
```

No response change is required for this endpoint. Keep the current concise
shape:

```json
{
  "success": true,
  "data": {
    "caseId": "case-id",
    "questId": "quest-id",
    "truncated": false,
    "quest": {
      "id": "quest-id",
      "questStatus": "QUEST_FAILED",
      "failedAt": "2026-09-11T13:40:00.000Z"
    },
    "assignments": [],
    "proofSubmissions": [],
    "adminActionId": "admin-action-id"
  }
}
```

Do not add `amountAtRiskSatang`, party statements, or resolution fields here.
Assignments, Proof Submissions, and file metadata remain case-scoped Evidence.

### 4. Open a Dispute Case

```text
POST /api/v1/admin/disputes/open/:questId
```

Current request body:

```json
{
  "workerId": "worker-id"
}
```

The `workerId` must identify an eligible Worker with an Assignment on the
failed Quest.

Required response:

```json
{
  "success": true,
  "data": {
    "id": "case-id",
    "questId": "quest-id",
    "status": "DISPUTE_CASE_PENDING",
    "version": 1,
    "amountAtRiskSatang": 50000,
    "createdAt": "2026-09-11T14:12:11.903Z",
    "quest": {
      "title": "Verify quiet study room availability",
      "questStatus": "QUEST_FAILED"
    }
  }
}
```

When the case is created, save `amountAtRiskSatang` as a historical snapshot.
Do not calculate it in the Admin client and do not replace it with
`resolvedAmountSatang`.

### 5. Resolve or dismiss a Dispute Case

```text
POST /api/v1/admin/disputes/:disputeCaseId/resolve
```

The request must include:

- a non-blank `Idempotency-Key` header;
- the current Dispute Case version through the existing version header;
- `outcome`;
- `reasonCode`;
- `workerId` and a positive `amountSatang` only when the outcome is
  `DISPUTE_CASE_RESOLVED`.

Dismiss request body:

```json
{
  "outcome": "DISPUTE_CASE_DISMISSED",
  "reasonCode": "DISPUTE_EVIDENCE_REVIEW"
}
```

Resolve request body:

```json
{
  "outcome": "DISPUTE_CASE_RESOLVED",
  "reasonCode": "DISPUTE_EVIDENCE_REVIEW",
  "workerId": "worker-id",
  "amountSatang": 10000
}
```

Required response for a resolved case:

```json
{
  "success": true,
  "data": {
    "resourceSummary": {
      "id": "case-id",
      "questId": "quest-id",
      "status": "DISPUTE_CASE_RESOLVED",
      "version": 2,
      "amountAtRiskSatang": 50000,
      "resolvedWorkerId": "worker-id",
      "resolvedAmountSatang": 10000,
      "resolvedByAdminId": "admin-id",
      "resolvedAt": "2026-09-11T14:12:11.778Z"
    },
    "resourceVersion": 2,
    "adminActionId": "admin-action-id"
  }
}
```

For `DISPUTE_CASE_DISMISSED`:

- `amountAtRiskSatang` remains the saved snapshot;
- `resolvedWorkerId` is `null`;
- `resolvedAmountSatang` is `null`;
- `resolvedByAdminId` and `resolvedAt` are set.

## Backend implementation requirements

### Persist the amount snapshot

Add a non-null integer field equivalent to:

```text
admin_dispute_cases.amount_at_risk_satang
```

Set it when the Dispute Case is opened. The value must not change when the
case is dismissed or resolved.

The value is an integer Satang amount. The Admin UI converts Satang to Baht
only for display.

When the API resolves a case, continue to enforce the Quest's shared Funding
Reservation cap. `amountAtRiskSatang` is a display and audit snapshot; it does
not remove the existing settlement validation.

### Persist or provide the party data

The current `admin_dispute_cases` record does not contain
`respondentUserId`, `filerRole`, or `respondentRole`.

The API must either persist these values or derive them from a deterministic
case relationship. `questId` alone is not enough when a Quest has more than
one Worker.

Use these rules:

- If the filer is the Hirer, `filerRole` is `HIRER` and the respondent is the
  affected Worker.
- If the filer is a Worker, `filerRole` is `WORKER` and the respondent is the
  Quest Hirer.
- `openedByAdminId` is not the respondent and must not be used as a party.

### Provide case detail data

The current API Server does not store or return:

- `category`;
- `detail`;
- `filerStatement`;
- `respondentStatement`.

If these fields are part of the API contract, store them as Dispute Case data
or return them from the authoritative case source. Do not generate them from
Admin mock data.

## Domain rules that must remain unchanged

- A Dispute Case can be opened only for `QUEST_FAILED`.
- `QUEST_CANCELLED` has no Dispute Case path.
- A Dispute Case uses only `DISPUTE_CASE_PENDING`,
  `DISPUTE_CASE_DISMISSED`, or `DISPUTE_CASE_RESOLVED`.
- A dismissed case moves no money.
- A resolved case redirects a positive Satang amount from the Hirer's failed
  Quest settlement to the named Worker's Earnings Balance.
- The first confirmed decision is final.
- `QUEST_FAILED` remains the Quest State during and after Dispute Case
  resolution.
- Resolution must remain idempotent and version-checked.

## Admin integration conflict

The Admin app currently cannot show `amountAtRiskSatang` for every Dispute Case
because the API Server does not currently persist or return that field. It
must not use `resolvedAmountSatang` as a substitute.

The Admin app also cannot show real category, case detail, party statements,
or respondent identity until the API Server provides them. These values must
not come from local mock data when the Admin data source is `api`.
