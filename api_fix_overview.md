# Admin Overview API Fix

Audience: KUQuest API Server developers

This document describes the data required by the active Admin Overview page.

The active page is the Overview Clone rendered at the Admin root route:

~~~text
/
~~~

The Admin repository must not change the API Server to implement this
contract. Please implement the required API changes in the API Server
repository.

The example IDs and counts are examples. Real IDs must remain UUID strings.
All existing response fields must remain available. The requested fields are
additive unless this document says otherwise.

## Current API routes

The API Server currently provides:

~~~text
GET /api/v1/admin/overview
GET /api/v1/admin/activity-log
GET /api/v1/admin/activity-logs
~~~

The singular and plural Activity Log paths currently use the same handler.
The Admin currently calls the singular path.

The current API Server implementation is under:

~~~text
src/modules/admin/admin-overview.route.ts
src/modules/admin/admin-overview.schema.ts
src/modules/admin/admin-overview.service.ts
src/modules/admin/admin-activity-log.route.ts
src/modules/admin/admin-activity-log.schema.ts
src/modules/admin/admin-activity-log.service.ts
~~~

Update the runtime schema, controller, service, and database mapping together.
Do not update only a TypeScript type. The runtime response validation must
also accept and return the required fields.

## 1. Current Overview response

Endpoint:

~~~text
GET /api/v1/admin/overview
~~~

The current response is:

~~~json
{
  "success": true,
  "data": {
    "quests": {
      "total": 488,
      "hidden": 12,
      "byState": {
        "QUEST_DRAFT": 42,
        "QUEST_OPEN": 120,
        "QUEST_ASSIGNED": 65,
        "QUEST_IN_PROGRESS": 80,
        "QUEST_COMPLETED": 140,
        "QUEST_CANCELLED": 20,
        "QUEST_FAILED": 21
      }
    },
    "disputes": {
      "total": 41,
      "awaitingResolution": 28
    },
    "payouts": {
      "pendingAdminApproval": 3,
      "inFlight": 4
    },
    "members": {
      "frozenWallets": 7,
      "suspendedWallets": 2
    }
  }
}
~~~

The current response does not contain:

- Open Report Case count
- Open Conduct Report count
- Member counts by Member status
- Wallet counts for Active and Closed
- The oldest record in each review queue
- Queue state for each queue
- The time that the oldest record has been waiting

## 2. Required complete Overview response

Endpoint:

~~~text
GET /api/v1/admin/overview
~~~

The required response is:

~~~json
{
  "success": true,
  "data": {
    "quests": {
      "total": 488,
      "hidden": 12,
      "byState": {
        "QUEST_DRAFT": 42,
        "QUEST_OPEN": 120,
        "QUEST_ASSIGNED": 65,
        "QUEST_IN_PROGRESS": 80,
        "QUEST_COMPLETED": 140,
        "QUEST_CANCELLED": 20,
        "QUEST_FAILED": 21
      }
    },

    "disputes": {
      "total": 41,
      "awaitingResolution": 28
    },

    "payouts": {
      "pendingAdminApproval": 3,
      "inFlight": 4
    },

    "reports": {
      "open": 36
    },

    "conductReports": {
      "open": 12
    },

    "members": {
      "byStatus": {
        "NORMAL": 100,
        "FLAG": 5,
        "TEMP_BAN": 2,
        "PERM_BAN": 1
      }
    },

    "wallets": {
      "byStatus": {
        "ACTIVE": 270,
        "FROZEN": 7,
        "SUSPENDED": 2,
        "CLOSED": 1
      }
    },

    "queues": {
      "payouts": {
        "count": 3,
        "state": "OPEN",
        "oldest": {
          "id": "payout-id",
          "title": "Payout to Ari Wattanakul",
          "createdAt": "2026-09-10T08:00:00.000Z"
        }
      },
      "disputes": {
        "count": 28,
        "state": "OPEN",
        "oldest": {
          "id": "dispute-case-id",
          "title": "Verify quiet study room availability",
          "createdAt": "2026-09-09T08:00:00.000Z"
        }
      },
      "reports": {
        "count": 36,
        "state": "OPEN",
        "oldest": {
          "id": "report-case-id",
          "title": "Message content report",
          "createdAt": "2026-09-08T08:00:00.000Z"
        }
      },
      "conductReports": {
        "count": 12,
        "state": "OPEN",
        "oldest": {
          "id": "conduct-report-id",
          "title": "Quest conduct report",
          "createdAt": "2026-09-07T08:00:00.000Z"
        }
      }
    }
  }
}
~~~

The API keeps `reports` and `conductReports` as separate queue objects. The
active Admin Overview combines them into one visible `Report` row. The Admin
uses the sum of both queue counts for that row and selects the earlier
`oldest.createdAt` when both queues have an oldest record. The separate API
objects remain necessary because Report Case and Conduct Report have different
status values and queue eligibility rules.

If a queue has no open records, return:

~~~json
{
  "count": 0,
  "state": "CLEAR",
  "oldest": null
}
~~~

The Admin calculates the Waiting display from oldest.createdAt. The API does
not need to return a second calculated waiting value.

## 3. Overview field requirements

### 3.1 Quest counters

The quests object must contain:

~~~text
total   non-negative integer
hidden  non-negative integer
byState object
~~~

byState must contain a counter for every Quest State displayed by the active
Overview page:

~~~text
QUEST_DRAFT
QUEST_OPEN
QUEST_ASSIGNED
QUEST_IN_PROGRESS
QUEST_COMPLETED
QUEST_CANCELLED
QUEST_FAILED
~~~

Important decision for the API Server team:

The current API service filters Quest rows to these seven states before it
calculates total. The general Quest API also supports states such as
QUEST_AWAITING_CONSENT, QUEST_SUBMITTED, QUEST_APPROVED, QUEST_REWORK, and
QUEST_DISPUTED.

Please confirm one of these behaviors:

1. total and byState count every stored Quest State, with all canonical states
   returned; or
2. the Overview contract intentionally excludes the intermediate states and
   documents that total means only the seven displayed states.

The Admin must not silently show a total that excludes stored Quests. This is a
contract decision, not a frontend calculation.

The hidden counter must count the Admin visibility overlay. Hiding a Quest
must not change its Quest State.

### 3.2 Dispute counters

The disputes object must contain:

~~~text
total               count of all Dispute Cases
awaitingResolution  count where status is DISPUTE_CASE_PENDING
~~~

The active Overview uses awaitingResolution for the Dispute review queue.

The API already returns both fields. The active Admin Overview Clone reads
awaitingResolution for the Dispute queue count. The queue detail fields remain
optional in the current API response until queues.disputes is implemented.

### 3.3 Payout counters

The payouts object must contain:

~~~text
pendingAdminApproval  count where payoutStatus is PENDING_ADMIN_APPROVAL
inFlight              count where payoutStatus is SUBMITTED_TO_PROVIDER or
                      PROVIDER_PENDING
~~~

The values remain counts only. Payout amounts are not required by the current
Overview Clone.

### 3.4 Report Case counter

The reports object must contain:

~~~text
open  count where Report Case status is REPORT_CASE_PENDING
~~~

The current API Server has no Report Case route or persistent Report Case
source. The API Server must add the data source before it can return this
counter.

Do not count dismissed, confirmed, or restored Report Cases as open.

### 3.5 Conduct Report counter

The conductReports object must contain:

~~~text
open  count where Conduct Report status is CONDUCT_REPORT_PENDING
~~~

The current API Server has no Conduct Report route or persistent Conduct
Report source. The API Server must add the data source before it can return
this counter.

Do not count upheld or dismissed Conduct Reports as open.

### 3.6 Member status counters

The members object must contain counts for all Member moderation statuses:

~~~text
NORMAL
FLAG
TEMP_BAN
PERM_BAN
~~~

These are API status codes. The Admin displays them as:

~~~text
NORMAL   → Normal
FLAG     → Flag
TEMP_BAN → Temp Ban
PERM_BAN → Perm Ban
~~~

The current Member API response does not contain Member moderation status.
Its wallet object contains Wallet status, which is a different concept.

The API Server must choose one supported source:

- return members.byStatus directly from the Overview query; or
- add memberStatus to GET /api/v1/admin/members and let the Admin aggregate
  the paginated Member list.

The direct Overview counter is preferred because it avoids loading every
Member record only to draw counters.

### 3.7 Wallet status counters

The wallets object must contain:

~~~text
ACTIVE
FROZEN
SUSPENDED
CLOSED
~~~

The current Overview response only contains frozenWallets and
suspendedWallets. The current Wallet list API returns walletStatus per record,
but the Overview does not call that endpoint.

The direct Overview counter is preferred:

~~~json
"wallets": {
  "byStatus": {
    "ACTIVE": 270,
    "FROZEN": 7,
    "SUSPENDED": 2,
    "CLOSED": 1
  }
}
~~~

The Wallet counters must count Wallet records, not Member moderation status.

### 3.8 Review queue details

The queues object must contain these four queue keys:

~~~text
payouts
disputes
reports
conductReports
~~~

The API queue keys remain separate. The active Admin Overview displays the
`reports` and `conductReports` queues as one `Report` row. This is a display
merge only; the API must still return each queue independently so the Admin
can preserve the queue-specific status filters and audit meaning.

### Queue eligibility filters

Only records with the following status may enter the Queue Map:

~~~text
payouts         payoutStatus = PENDING_ADMIN_APPROVAL
disputes        status = DISPUTE_CASE_PENDING
reports         status = REPORT_CASE_PENDING
conductReports  status = CONDUCT_REPORT_PENDING
~~~

The oldest record must be selected after applying the queue filter. For
example, the oldest Dispute Case means the oldest record whose status is
DISPUTE_CASE_PENDING. Records with another status must not affect the queue
count, state, oldest record, or waiting display.

Each queue must contain:

~~~text
count   non-negative integer
state   OPEN or CLEAR
oldest  object or null
~~~

The oldest object must contain:

~~~text
id         UUID or stable record ID
title      short safe display title
createdAt  ISO 8601 date-time
~~~

Rules:

- count must equal the number of open records in that queue;
- state must be OPEN when count is greater than zero;
- state must be CLEAR when count is zero;
- oldest must be the oldest currently open record;
- oldest must be null when count is zero;
- createdAt must be the record creation time used to calculate waiting;
- do not return a local demo record;
- do not return a misleading placeholder such as API path not available;
- do not expose private report content in the queue summary.

The current UI columns are Queue, Detail, State, and Waiting. The Admin maps
the API fields as follows:

~~~text
Queue    queues.<name>
Detail   queues.<name>.oldest.title
State    queues.<name>.state
Waiting  current time minus queues.<name>.oldest.createdAt
~~~

The API may return the oldest record as null. The Admin must display a clear
empty state instead of a fake record.

## 4. Current Activity Log response

Endpoint:

~~~text
GET /api/v1/admin/activity-log
~~~

Current response:

~~~json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "activity-id",
        "admin": {
          "id": "admin-id",
          "firstName": "YouTube",
          "lastName": "Admin"
        },
        "action": "PAYOUT_APPROVED",
        "resourceType": "PAYOUT",
        "resourceId": "payout-id",
        "reasonCode": "PAYOUT_POLICY_REVIEW",
        "reasonCatalogVersion": 1,
        "resultVersion": 2,
        "resultTimestamp": "2026-09-11T10:00:00.000Z",
        "createdAt": "2026-09-11T10:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
~~~

No response fields are missing for the current Activity Log section.

The current Overview requests the newest four entries. Keep cursor pagination
and the existing maximum limit of 50.

The API must return canonical action and reason codes. The Admin translates
them for display:

~~~text
PAYOUT_APPROVED       → Payout approved
PAYOUT_POLICY_REVIEW  → Payout policy review
~~~

The API must not replace canonical codes with UI text.

## 5. Data consistency rules

All counters in one Overview response must come from one consistent database
read. A queue count and its oldest record must represent the same read moment.

The response must satisfy these checks:

~~~text
queues.payouts.count
  = payouts.pendingAdminApproval

queues.disputes.count
  = disputes.awaitingResolution

queues.reports.count
  = reports.open

queues.conductReports.count
  = conductReports.open

~~~

The combined `Report` row shown by the Admin uses:

~~~text
Report count
  = queues.reports.count + queues.conductReports.count

Report oldest
  = the earlier non-null oldest.createdAt from those two queues
~~~

If members.byStatus represents all Members, the sum of its values must equal
the Member total used by the Admin contract. If wallets.byStatus represents
all Wallets, the sum of its values must equal the total Wallet count.

Do not use local mock data to complete a successful API response.

## 6. Authorization and errors

Keep the existing Admin authorization guard.

The endpoint must continue to return:

~~~text
401 when the Admin session is missing or invalid
403 when the authenticated user is not allowed to read Admin data
~~~

A successful response must always include all required objects and counters.
Use zero for an empty count and null for an empty oldest record. Do not omit
required keys.

## 7. API Server work required

The API Server team must:

1. Keep the current Quest, Dispute, and Payout counters.
2. Decide whether Quest total includes all canonical Quest States or only the
   seven currently displayed states.
3. Add Report Case persistence and the reports.open counter.
4. Add Conduct Report persistence and the conductReports.open counter.
5. Add members.byStatus or add Member moderation status to the Member API.
6. Add wallets.byStatus for Active, Frozen, Suspended, and Closed.
7. Add queue summaries with count, state, and oldest record.
8. Update the runtime response schemas.
9. Add service/controller tests for populated and empty queues.
10. Add consistency tests between queue counts and section counters.
11. Keep the existing Admin authorization and read-only transaction behavior.

## 8. Admin integration work after the API change

The following current Admin behavior must be removed after the API fields are
available:

- Report Case count from local fallback data
- Conduct Report count from local fallback data
- Member status counts from local fallback data
- Wallet status counts from local fallback data
- Queue labels such as API path not available for Report and Conduct Report
- Queue labels such as Queue detail not provided for queues without oldest data
- Waiting value of — for queues without oldest data

The Admin must then read:

~~~text
disputes.awaitingResolution
reports.open
conductReports.open
members.byStatus
wallets.byStatus
queues
~~~

This document requests API changes only. No API Server code was changed in the
Admin repository.
