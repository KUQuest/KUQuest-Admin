# Admin Member API Fix

Audience: KUQuest API Server developers

This document defines the Member data required by the Admin web app. The Admin
UI currently calls this area "Users", but the domain term is **Member**.

The Admin repository must not change the API Server to implement this
contract. Please implement the required changes in the API Server repository.

The current API already returns basic Member, academic, Wallet, and summary
statistics data. The missing moderation, report, activity, and history data
must come from the API Server. The Admin must not use local mock data when the
API returns a valid response.

## Contract rules

### Identity fields

For every resource that has an identifier, return both fields:

```text
id    the existing internal UUID field
uuid  an explicit alias of the same internal UUID
```

Do not change `id` to the readable KU identifier. `studentId` is the readable
KU Member identifier and is separate from the internal UUID.

Example:

```json
{
  "id": "member-uuid",
  "uuid": "member-uuid",
  "studentId": "68000080"
}
```

This is an additive change. Existing clients that use `id` must continue to
work.

### Money

- All API money fields must be integer Satang.
- The Admin converts Satang to Baht for display.
- Do not return formatted Baht strings from the API.
- `totalBalanceSatang` is the total of all four Wallet compartments:
  `spendingBalanceSatang + earningsBalanceSatang + fundingReservedSatang +
  reservedForPayoutsSatang`.
- The Admin label `Balance (Spending + Earning)` uses only the spending and
  earnings fields. Do not replace those fields with `totalBalanceSatang`.

### Status

Wallet status must use these canonical values:

```text
ACTIVE
FROZEN
SUSPENDED
CLOSED
```

The current Admin Member UI displays these Member status values:

```text
Normal
Flag
Temp Ban
Perm Ban
```

`memberStatus` must be derived from the accepted penalty state. It must not be
copied from `walletStatus`. A Wallet hold is not automatically a Member Ban.

The API Server should use `memberPenaltyRecord` as the source of truth and
project active expiry values from the Member auth record. If the backend team
uses machine enum values instead of the display values above, the Admin API
contract must define the mapping explicitly and the Admin client must map it
before display. Do not return mixed values such as `Flag`, `RED_FLAG`, and
`Red Flag` for the same field.

### Time, nulls, and pagination

- Use ISO 8601 UTC timestamps.
- Use `null` when a value is not applicable or does not exist.
- Use an empty array for an existing collection with no records.
- Use cursor pagination for Member history collections.
- `nextCursor` must be `null` when there is no next page.
- Cursors are opaque. The Admin must not parse them.
- Do not return `lastActiveAt`; the current Admin UI no longer requires it.

### Privacy

The Admin may read Member data because the Admin is authenticated. Do not
return password hashes, OAuth tokens, provider secrets, unmasked payout
destination values, or other authentication secrets.

## Current API routes

The API Server currently provides:

```text
GET /api/v1/admin/members
GET /api/v1/admin/members/:memberId
GET /api/v1/admin/finance/members/:userId
GET /api/v1/admin/finance/ledger/transactions?walletId=:walletId
```

The current Member implementation is under:

```text
src/modules/admin/admin-member.route.ts
src/modules/admin/admin-member.schema.ts
src/modules/admin/admin-member.controller.ts
src/modules/admin/admin-member.service.ts
```

Update the runtime schema, controller, service, and database mapping together.
Do not update only a TypeScript response type. Runtime validation must accept
and return the required fields.

## 1. List Members

### Endpoint

```text
GET /api/v1/admin/members
```

### Query parameters

```text
search       optional name, email, or Student ID search
walletStatus optional ACTIVE, FROZEN, SUSPENDED, or CLOSED
limit        optional integer from 1 to 100
cursor       optional opaque cursor
```

### Current response

The current response contains basic Member and Wallet summary data. It does
not contain `uuid` or `memberStatus`.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "member-uuid",
        "email": "darin.ariyawat@ku.th",
        "firstName": "Darin",
        "lastName": "Ariyawat",
        "studentId": "68000080",
        "telephone": "0812345678",
        "academicYear": 1,
        "faculty": "Economics",
        "department": "Business Economics",
        "occupation": "STUDENT",
        "wallet": {
          "id": "wallet-uuid",
          "walletStatus": "ACTIVE",
          "spendingBalanceSatang": 0,
          "earningsBalanceSatang": 1000000,
          "totalBalanceSatang": 1000000
        },
        "createdAt": "2026-02-15T08:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

### Required response

Keep all current fields and add `uuid` and `memberStatus`.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "member-uuid",
        "uuid": "member-uuid",
        "email": "darin.ariyawat@ku.th",
        "firstName": "Darin",
        "lastName": "Ariyawat",
        "studentId": "68000080",
        "telephone": "0812345678",
        "academicYear": 1,
        "faculty": "Economics",
        "department": "Business Economics",
        "occupation": "STUDENT",
        "memberStatus": "Normal",
        "wallet": {
          "id": "wallet-uuid",
          "uuid": "wallet-uuid",
          "walletStatus": "ACTIVE",
          "spendingBalanceSatang": 0,
          "earningsBalanceSatang": 1000000,
          "totalBalanceSatang": 1000000
        },
        "createdAt": "2026-02-15T08:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

The response is used for:

- Member table rows
- Member search
- Member status filters
- Academic profile display
- Initial Wallet status and balance display
- Member count and pagination

Do not add detail-only moderation history, reports, Reviews, or Quest history
to every list row. Keep the list response bounded for load performance.

## 2. Member detail

### Endpoint

```text
GET /api/v1/admin/members/:memberId
```

### Current response

The current response contains Member profile fields, all Wallet compartments,
Wallet projection verification, and aggregate marketplace statistics. It does
not contain `uuid`, Member status, moderation data, reports, activity details,
or Admin Notes.

```json
{
  "success": true,
  "data": {
    "member": {
      "id": "member-uuid",
      "email": "darin.ariyawat@ku.th",
      "firstName": "Darin",
      "lastName": "Ariyawat",
      "studentId": "68000080",
      "telephone": "0812345678",
      "bio": "Economics student.",
      "academicYear": 1,
      "faculty": "Economics",
      "department": "Business Economics",
      "occupation": "STUDENT",
      "createdAt": "2026-02-15T08:00:00.000Z"
    },
    "wallet": {
      "id": "wallet-uuid",
      "walletStatus": "ACTIVE",
      "spendingBalanceSatang": 0,
      "earningsBalanceSatang": 1000000,
      "fundingReservedSatang": 0,
      "reservedForPayoutsSatang": 0,
      "totalBalanceSatang": 1000000,
      "projectionMatchesLedger": true
    },
    "stats": {
      "questsCreatedCount": 2,
      "questsCompletedAsWorkerCount": 3,
      "reviewsReceivedCount": 4,
      "averageRating": 4.5,
      "payoutsCount": 2,
      "totalEarnedSatang": 1000000,
      "totalPaidOutSatang": 500000
    }
  }
}
```

### Required response

Keep all current fields and add the fields below.

```json
{
  "success": true,
  "data": {
    "member": {
      "id": "member-uuid",
      "uuid": "member-uuid",
      "email": "darin.ariyawat@ku.th",
      "firstName": "Darin",
      "lastName": "Ariyawat",
      "studentId": "68000080",
      "telephone": "0812345678",
      "bio": "Economics student.",
      "academicYear": 1,
      "faculty": "Economics",
      "department": "Business Economics",
      "occupation": "STUDENT",
      "emailVerified": true,
      "memberStatus": "Normal",
      "redFlagExpiresAt": null,
      "bannedUntil": null,
      "createdAt": "2026-02-15T08:00:00.000Z"
    },
    "wallet": {
      "id": "wallet-uuid",
      "uuid": "wallet-uuid",
      "walletStatus": "ACTIVE",
      "spendingBalanceSatang": 0,
      "earningsBalanceSatang": 1000000,
      "fundingReservedSatang": 0,
      "reservedForPayoutsSatang": 0,
      "totalBalanceSatang": 1000000,
      "projectionMatchesLedger": true
    },
    "moderation": {
      "confirmedViolationCount": 0,
      "nextOutcome": "RED_FLAG",
      "reason": null,
      "appliedAt": null,
      "appliedBy": null,
      "expiresAt": null,
      "history": []
    },
    "reports": {
      "total": 0,
      "open": 0,
      "closed": 0,
      "items": []
    },
    "activity": {
      "completedQuests": 3,
      "cancelledQuests": 0,
      "failedQuests": 1,
      "reportsReceived": 0
    },
    "stats": {
      "questsCreatedCount": 2,
      "questsCompletedAsWorkerCount": 3,
      "reviewsReceivedCount": 4,
      "averageRating": 4.5,
      "payoutsCount": 2,
      "totalEarnedSatang": 1000000,
      "totalPaidOutSatang": 500000
    },
    "adminNotes": []
  }
}
```

The Member detail response is used for:

- Member identity and academic profile
- Account creation date
- User Status
- Wallet record and Wallet Status
- Balance (Spending + Earning)
- Funding Reserved
- Reserved For Payouts
- Confirmed violations and next penalty outcome
- Red Flag or ban expiry
- Reports received
- Quest activity summary
- Moderation history
- Admin Notes
- Existing aggregate statistics

## 3. Moderation data

`memberStatus` must not be read from Wallet status. The API Server must derive
it from the accepted Admin penalty contract.

The API should use:

```text
memberPenaltyRecord       source of truth for confirmed violations and penalties
authUser.redFlagExpiresAt projected Red Flag expiry
authUser.bannedUntil       projected temporary-ban expiry
```

Required `moderation.history` item:

```json
{
  "id": "penalty-record-uuid",
  "uuid": "penalty-record-uuid",
  "event": "TEMPORARY_BAN_APPLIED",
  "previousStatus": "Flag",
  "newStatus": "Temp Ban",
  "reason": "Repeated confirmed violations.",
  "occurredAt": "2026-09-10T08:00:00.000Z",
  "actor": {
    "id": "admin-uuid",
    "uuid": "admin-uuid",
    "name": "YouTube Admin"
  }
}
```

Do not use Wallet Freeze or Wallet Suspend as a Member Ban. The two concepts
have different domain meanings.

## 4. Reports in Member detail

The detail response may contain a bounded recent list. It must not load every
Report Case into the Member list response.

Required report item:

```json
{
  "id": "report-uuid",
  "uuid": "report-uuid",
  "type": "REPORT_CASE",
  "status": "REPORT_CASE_PENDING",
  "category": "MESSAGE_CONTENT",
  "reportedAt": "2026-09-12T08:00:00.000Z",
  "reportedBy": {
    "id": "reporter-uuid",
    "uuid": "reporter-uuid",
    "firstName": "Nicha",
    "lastName": "P."
  }
}
```

Supported report status values must remain canonical:

```text
REPORT_CASE_PENDING
REPORT_CASE_DISMISSED
REPORT_CASE_HIDDEN
REPORT_CASE_RESTORED
CONDUCT_REPORT_PENDING
CONDUCT_REPORT_UPHELD
CONDUCT_REPORT_DISMISSED
```

Do not return UI labels such as `Open`, `Closed`, or `Acquitted` as API status
values.

## 5. Existing Wallet Statement response

The existing endpoint is sufficient for Wallet Statement:

```text
GET /api/v1/admin/finance/ledger/transactions?walletId=:walletId
```

Each transaction must contain:

```json
{
  "id": "transaction-uuid",
  "uuid": "transaction-uuid",
  "walletId": "wallet-uuid",
  "eventType": "QUEST_REWARD",
  "amountSatang": 50000,
  "balanceAfterSatang": 1050000,
  "occurredAt": "2026-09-11T10:00:00.000Z",
  "referenceId": "quest-uuid",
  "description": "Quest reward"
}
```

The Wallet Statement must contain committed and sealed Ledger Transactions,
ordered newest first. It must not contain uncommitted or provisional entries.

## 6. Member Payout history

The current API has aggregate Payout statistics but no Member-specific Payout
history route. Add:

```text
GET /api/v1/admin/members/:memberId/payouts
```

Required response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "payout-uuid",
        "uuid": "payout-uuid",
        "questId": "quest-uuid",
        "amountSatang": 500000,
        "payoutStatus": "SUCCEEDED",
        "createdAt": "2026-09-10T08:00:00.000Z",
        "updatedAt": "2026-09-10T08:05:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

Use the canonical Payout values:

```text
PENDING_ADMIN_APPROVAL
SUBMITTED_TO_PROVIDER
PROVIDER_PENDING
SUCCEEDED
FAILED
CANCELLED
```

## 7. Member Quest history

The current Member API has Quest counters but no Member-specific Quest history
route. Add:

```text
GET /api/v1/admin/members/:memberId/quests
```

Required response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "quest-uuid",
        "uuid": "quest-uuid",
        "title": "Check flood route markers",
        "questStatus": "QUEST_COMPLETED",
        "role": "WORKER",
        "createdAt": "2026-09-01T08:00:00.000Z",
        "startTime": "2026-09-02T08:00:00.000Z",
        "dueAt": "2026-09-05T08:00:00.000Z",
        "completedAt": "2026-09-05T08:00:00.000Z",
        "amountSatang": 50000
      }
    ],
    "nextCursor": null
  }
}
```

Use canonical Quest State values. Do not return display labels such as
`Completed` in `questStatus`.

## 8. Member Reviews

The current Member API returns only Review count and average rating. Add:

```text
GET /api/v1/admin/members/:memberId/reviews
```

Required response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "review-uuid",
        "uuid": "review-uuid",
        "questId": "quest-uuid",
        "reviewer": {
          "id": "reviewer-uuid",
          "uuid": "reviewer-uuid",
          "firstName": "Nicha",
          "lastName": "P."
        },
        "rating": 5,
        "comment": "Clear and reliable work.",
        "createdAt": "2026-09-06T08:00:00.000Z",
        "updatedAt": "2026-09-06T08:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

Reviews cannot be deleted. The API must not expose a delete operation for
Reviews.

## 9. Member penalty history

If `moderation.history` in the Member detail response is not sufficient for
the full Penalty History tab, add:

```text
GET /api/v1/admin/members/:memberId/penalty-history
```

Required response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "penalty-record-uuid",
        "uuid": "penalty-record-uuid",
        "ladder": "MISCONDUCT",
        "source": "REPORT_CASE",
        "event": "RED_FLAG_APPLIED",
        "previousStatus": "Normal",
        "newStatus": "Flag",
        "reason": "Confirmed Message violation.",
        "occurredAt": "2026-09-10T08:00:00.000Z",
        "reversedById": null,
        "actor": {
          "id": "admin-uuid",
          "uuid": "admin-uuid",
          "name": "YouTube Admin"
        }
      }
    ],
    "nextCursor": null
  }
}
```

The API must keep original penalty records. A reversal must be represented by
a linked record. Do not delete the original audit record.

## 10. Admin Notes

The current Admin UI displays Admin Notes. If these notes remain API-backed,
add:

```text
GET /api/v1/admin/members/:memberId/admin-notes
```

Required response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "admin-note-uuid",
        "uuid": "admin-note-uuid",
        "note": "Follow up after the temporary ban expires.",
        "createdAt": "2026-09-10T08:00:00.000Z",
        "createdBy": {
          "id": "admin-uuid",
          "uuid": "admin-uuid",
          "name": "YouTube Admin"
        }
      }
    ],
    "nextCursor": null
  }
}
```

Creating or editing Admin Notes is outside this read-response document. A
separate command contract is required before the Admin enables those writes.

## Backend implementation notes

1. Add fields to the runtime Elysia schemas, not only to TypeScript types.
2. Update database mapping and service projections in the same change.
3. Keep `id` backward-compatible as the internal UUID and add `uuid`.
4. Do not derive Member status from Wallet status.
5. Do not calculate or format money in the Admin client.
6. Keep list responses small. Load detail and history only after the Admin
   opens a Member record.
7. Keep all history endpoints cursor-paginated and bounded.
8. Return empty arrays and zero counters for valid records with no history.
9. Return `null` for a missing Wallet. Do not create a fake Wallet object.
10. Do not return `lastActiveAt`, password data, OAuth secrets, or raw payout
    destination values.
11. Use the accepted Admin Rulebook and Member penalty contract for status and
    penalty behavior. Legacy database fields do not define policy.
12. The Admin must be able to request a Member detail by either the existing
    UUID `id` or the explicit `uuid` value. These values identify the same
    Member.

## Current gaps

The current API provides:

- Basic Member identity and academic profile.
- Wallet status and Wallet compartments.
- Wallet projection verification.
- Aggregate Quest, Review, and Payout statistics.
- Wallet Statement transactions.

The current API does not provide all data required by the Admin UI:

- Explicit `uuid` fields.
- `memberStatus`.
- Red Flag and ban projection fields.
- Moderation history.
- Reports received by a Member.
- Member Quest history.
- Member Payout history.
- Full Reviews.
- Admin Notes.

These are API contract gaps. The Admin must not fill them with mock data when
`NEXT_PUBLIC_ADMIN_DATA_SOURCE=api`.

## Acceptance checklist

- [ ] `GET /api/v1/admin/members` returns `id` and `uuid`.
- [ ] The list returns `memberStatus` and Wallet summary data.
- [ ] `GET /api/v1/admin/members/:memberId` returns `id` and `uuid` for the
      Member and Wallet.
- [ ] Member detail returns moderation, report, and activity summaries.
- [ ] Member status is separate from Wallet status.
- [ ] Wallet compartments remain separate integer Satang fields.
- [ ] Wallet Statement returns committed and sealed Ledger Transactions.
- [ ] Member Payout history is cursor-paginated.
- [ ] Member Quest history is cursor-paginated.
- [ ] Member Reviews are cursor-paginated and cannot be deleted.
- [ ] Penalty history preserves original records and reversal links.
- [ ] Empty data uses empty arrays, zero counters, or `null` as specified.
- [ ] No API response requires `lastActiveAt`.
- [ ] No response contains authentication secrets or unmasked payout data.
