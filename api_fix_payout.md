# Admin Payout API Fix

Audience: KUQuest API Server developers

This document defines the Payout data required by the Admin web app.

The Admin repository must not change the API Server to implement this contract.
Please implement the required API changes in the API Server repository.

The Admin Payout page must use API data. It must not use local mock Payout
records as a fallback when the API is enabled.

The Payout overlay contains:

- Payout identity and recipient
- Payout status
- Payout amount
- Payout timing
- Payout summary
- Payout history for the same Member
- Provider outcome or cancellation reason
- Admin approval, cancellation, and reconciliation actions

The old Earning sources section was removed. The API does not need to return
Quest earning-source data for a Payout.

## Current API routes

The API Server currently provides these Admin Payout routes:

~~~text
GET  /api/v1/admin/payouts
GET  /api/v1/admin/payouts/:payoutId
GET  /api/v1/admin/payouts/:payoutId/status-history
POST /api/v1/admin/payouts/:payoutId/approve
POST /api/v1/admin/payouts/:payoutId/cancel
POST /api/v1/admin/payouts/:payoutId/reconcile
POST /api/v1/admin/payouts/events/:eventId/retry
~~~

The current API Server implementation is under:

~~~text
src/modules/payout/payout.admin.route.ts
src/modules/payout/payout.admin.schema.ts
src/modules/payout/payout.admin.controller.ts
src/modules/payout/payout.admin.service.ts
~~~

Update the runtime schema, controller, service, and database mapping together.
Do not update only a TypeScript type. Runtime response validation must also
accept and return the required fields.

## Contract rules

### Money

- All API money fields use integer Satang.
- The Admin client converts Satang to Baht for display.
- The Admin client must not calculate fees, tax, or debit amounts.
- actualFeeSatang, actualTaxSatang, and actualDebitSatang may be null until
  the Provider reports an outcome.

### Status

Use these canonical Payout status values exactly:

~~~text
PENDING_ADMIN_APPROVAL
SUBMITTED_TO_PROVIDER
PROVIDER_PENDING
SUCCEEDED
FAILED
CANCELLED
~~~

Do not return COMPLETED, REJECTED, or UI labels as API status values.

### Destination privacy

The API may return only masked destination values. It must not return:

- Plaintext bank account numbers
- Plaintext PromptPay values
- Encrypted destination payloads
- Provider secrets
- Raw Provider payloads

### Pagination

List responses must keep cursor pagination:

~~~json
"nextCursor": "opaque-cursor-value"
~~~

Return null when there are no more records. The Admin client must be able to
request limit, cursor, and sort (newest or oldest).

## 1. List Payouts

### Endpoint

~~~text
GET /api/v1/admin/payouts
~~~

### Query parameters

~~~text
status  optional canonical Payout status
limit   optional integer from 1 to 50
cursor  optional opaque cursor
sort    optional newest or oldest
~~~

When status is provided, return only that status. The Admin page requests each
canonical status when it loads the complete Payout table. The default status
may remain PENDING_ADMIN_APPROVAL if that is the current API policy.

### Required response

~~~json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "payout-uuid",
        "student": {
          "id": "member-uuid",
          "email": "member@ku.th",
          "firstName": "Ari",
          "lastName": "Wattanakul"
        },
        "quoteId": "quote-uuid",
        "principalSatang": 300000,
        "receiptSatang": 300000,
        "maximumFeeSatang": 0,
        "maximumTaxSatang": 0,
        "maximumDebitSatang": 300000,
        "actualFeeSatang": null,
        "actualTaxSatang": null,
        "actualDebitSatang": null,
        "bankCode": "KBANK",
        "bankName": "Kasikornbank",
        "destinationType": "PROMPTPAY",
        "maskedDestinationValue": "xxx-x-xx123-x",
        "maskedRoutingValue": "xxx123",
        "providerReference": null,
        "providerStatus": null,
        "payoutStatus": "PENDING_ADMIN_APPROVAL",
        "cancellationReasonCode": null,
        "version": 1,
        "createdAt": "2026-09-02T08:30:00.000Z",
        "updatedAt": "2026-09-02T08:30:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
~~~

The list response is used for:

- Payout table rows
- Payout amount and status filters
- Sidebar pending-Payout count
- Recipient and destination display
- Initial data shown before the detail request completes

## 2. Payout detail

### Endpoint

~~~text
GET /api/v1/admin/payouts/:payoutId
~~~

### Required response

The detail response must return the same Payout fields as the list response,
plus the complete status history.

~~~json
{
  "success": true,
  "data": {
    "id": "payout-uuid",
    "student": {
      "id": "member-uuid",
      "email": "member@ku.th",
      "firstName": "Ari",
      "lastName": "Wattanakul"
    },
    "quoteId": "quote-uuid",
    "principalSatang": 300000,
    "receiptSatang": 300000,
    "maximumFeeSatang": 0,
    "maximumTaxSatang": 0,
    "maximumDebitSatang": 300000,
    "actualFeeSatang": null,
    "actualTaxSatang": null,
    "actualDebitSatang": null,
    "bankCode": "KBANK",
    "bankName": "Kasikornbank",
    "destinationType": "PROMPTPAY",
    "maskedDestinationValue": "xxx-x-xx123-x",
    "maskedRoutingValue": "xxx123",
    "providerReference": null,
    "providerStatus": null,
    "payoutStatus": "PENDING_ADMIN_APPROVAL",
    "cancellationReasonCode": null,
    "version": 1,
    "createdAt": "2026-09-02T08:30:00.000Z",
    "updatedAt": "2026-09-02T08:30:00.000Z",
    "history": [
      {
        "id": "history-uuid",
        "fromStatus": null,
        "toStatus": "PENDING_ADMIN_APPROVAL",
        "providerStatus": null,
        "actorUserId": "member-uuid",
        "actorAdminId": null,
        "source": "PAYOUT_REQUEST",
        "reason": null,
        "occurredAt": "2026-09-02T08:30:00.000Z"
      }
    ]
  }
}
~~~

The detail response is used for:

- Payout overlay identity
- Recipient and masked destination
- Payout summary
- Payout timing
- Provider status and reference
- Cancellation or failure information

The history array must be ordered from oldest to newest. Each status and its
occurredAt value must stay in the same history item.

## 3. Payout status history

### Endpoint

~~~text
GET /api/v1/admin/payouts/:payoutId/status-history
~~~

### Required response

~~~json
{
  "success": true,
  "data": [
    {
      "id": "history-uuid",
      "fromStatus": "PENDING_ADMIN_APPROVAL",
      "toStatus": "SUBMITTED_TO_PROVIDER",
      "providerStatus": null,
      "actorUserId": null,
      "actorAdminId": "admin-uuid",
      "source": "ADMIN_APPROVAL",
      "reason": "PAYOUT_POLICY_REVIEW",
      "occurredAt": "2026-09-02T08:45:00.000Z"
    }
  ]
}
~~~

This endpoint must return the same history item shape and ordering as the
history array in the detail response. The Admin client can use either source,
but the two responses must not disagree.

## 4. Payout history for one Member

The API Server currently does not provide a route for all Payouts belonging to
one Member. The Admin must not build this history by downloading unrelated
Payouts and filtering them in the browser.

### Required endpoint

~~~text
GET /api/v1/admin/members/:memberId/payouts
~~~

### Query parameters

~~~text
limit  optional integer from 1 to 50
cursor optional opaque cursor
sort   optional newest or oldest
~~~

memberId is the Member auth UUID. It is not the KU Student ID.

The endpoint must return all Payout statuses. It must not use the normal
Admin-review default of PENDING_ADMIN_APPROVAL.

### Required response

~~~json
{
  "success": true,
  "data": {
    "memberId": "member-uuid",
    "items": [
      {
        "id": "payout-uuid-1",
        "principalSatang": 300000,
        "payoutStatus": "SUCCEEDED",
        "createdAt": "2026-09-02T08:30:00.000Z"
      },
      {
        "id": "payout-uuid-2",
        "principalSatang": 150000,
        "payoutStatus": "FAILED",
        "createdAt": "2026-08-20T05:15:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
~~~

These are the minimum fields needed by the Admin Payout history section:

- id for the Payout record
- principalSatang for the displayed amount
- payoutStatus for the displayed status
- createdAt for the displayed date
- nextCursor for pagination

The response may reuse the full Admin Payout item shape from the list endpoint
if that is simpler for the API Server. It must not include Quest earning-source
data because that Admin section was removed.

## 5. Approve Payout

### Endpoint

~~~text
POST /api/v1/admin/payouts/:payoutId/approve
~~~

The request requires:

- Idempotency-Key header
- If-Match header containing the current Payout version
- reasonCode in the request body

### Required response

~~~json
{
  "success": true,
  "data": {
    "resourceSummary": {
      "id": "payout-uuid",
      "student": {
        "id": "member-uuid",
        "email": "member@ku.th",
        "firstName": "Ari",
        "lastName": "Wattanakul"
      },
      "quoteId": "quote-uuid",
      "principalSatang": 300000,
      "receiptSatang": 300000,
      "maximumFeeSatang": 0,
      "maximumTaxSatang": 0,
      "maximumDebitSatang": 300000,
      "actualFeeSatang": null,
      "actualTaxSatang": null,
      "actualDebitSatang": null,
      "bankCode": "KBANK",
      "bankName": "Kasikornbank",
      "destinationType": "PROMPTPAY",
      "maskedDestinationValue": "xxx-x-xx123-x",
      "maskedRoutingValue": "xxx123",
      "providerReference": null,
      "providerStatus": null,
      "payoutStatus": "SUBMITTED_TO_PROVIDER",
      "cancellationReasonCode": null,
      "version": 2,
      "createdAt": "2026-09-02T08:30:00.000Z",
      "updatedAt": "2026-09-02T08:45:00.000Z"
    },
    "resourceVersion": 2,
    "adminActionId": "admin-action-uuid"
  }
}
~~~

resourceSummary must contain the complete updated Payout record. The Admin
client uses it to update the table without a mock response.

## 6. Cancel Payout

### Endpoint

~~~text
POST /api/v1/admin/payouts/:payoutId/cancel
~~~

The request requires the same Idempotency-Key and If-Match headers as approval.
The request body must contain a controlled reasonCode.

The response must use the same shape as the approval response. The updated
resourceSummary.payoutStatus must be:

~~~text
CANCELLED
~~~

The response must include the cancellation reason:

~~~json
"cancellationReasonCode": "PAYOUT_POLICY_REVIEW"
~~~

Cancellation must release the full Payout Reserve according to the Finance
Rulebook. The API response must be committed only after the Payout status and
ledger release are committed together.

## 7. Reconcile Payout

### Endpoint

~~~text
POST /api/v1/admin/payouts/:payoutId/reconcile
~~~

### Required response

~~~json
{
  "success": true,
  "data": {
    "payout": {
      "id": "payout-uuid",
      "internalReference": "payout-internal-reference",
      "principalUserId": "member-uuid",
      "quoteId": "quote-uuid",
      "payoutDestinationId": "destination-uuid",
      "destinationRecipientType": "INDIVIDUAL",
      "destinationGivenName": "Ari",
      "destinationSurname": "Wattanakul",
      "destinationRelationship": "SELF",
      "destinationAccountCountry": "TH",
      "destinationAccountCurrency": "THB",
      "destinationBankCode": "KBANK",
      "destinationAccountHolderName": "Ari Wattanakul",
      "destinationRoutingType": "PROMPTPAY",
      "destinationMaskedLastFour": "1234",
      "destinationMaskedRoutingValue": "xxx123",
      "provider": "MockProvider",
      "providerReference": "provider-reference",
      "providerApiVersion": "v1",
      "providerStatus": "SUCCEEDED",
      "providerAmountSatang": 300000,
      "principalSatang": 300000,
      "receiptSatang": 300000,
      "maximumFeeSatang": 0,
      "maximumTaxSatang": 0,
      "maximumDebitSatang": 300000,
      "actualFeeSatang": 0,
      "actualTaxSatang": 0,
      "actualDebitSatang": 300000,
      "payoutStatus": "SUCCEEDED",
      "version": 3,
      "reserveLedgerTransactionId": "ledger-uuid-1",
      "finalLedgerTransactionId": "ledger-uuid-2",
      "createdAt": "2026-09-02T08:30:00.000Z",
      "updatedAt": "2026-09-02T09:00:00.000Z"
    }
  }
}
~~~

The Admin UI uses this response to update Provider status, actual fee, actual
tax, actual debit, and the final Payout status. All destination values must
remain masked.

## 8. Provider event retry

The API Server provides this route:

~~~text
POST /api/v1/admin/payouts/events/:eventId/retry
~~~

The current Admin UI has no retry button because a Payout response does not
contain a valid eventId. This route is not required for the current Payout
overlay. If a retry button is added later, the Payout detail response must
provide a safe Provider Event reference, or the UI must load the event through
a separate Admin API route.

## Error response

All Payout endpoints must keep the standard error shape:

~~~json
{
  "success": false,
  "error": {
    "code": "PAYOUT_NOT_FOUND",
    "message": "Payout does not exist."
  }
}
~~~

Important command errors include:

~~~text
401 or 403  Admin session is invalid or not allowed
404         Payout or Provider Event does not exist
409         Version or Idempotency-Key conflict
400         Invalid status, reason code, or request data
~~~

## Acceptance checklist

- [ ] List response returns the complete Payout item shape.
- [ ] Detail response returns the same Payout fields plus history.
- [ ] Status-history response matches detail history exactly.
- [ ] Member Payout history endpoint exists and returns all statuses.
- [ ] Member Payout history is cursor-paginated.
- [ ] Money remains integer Satang in every API response.
- [ ] Actual Provider amounts remain nullable until known.
- [ ] Status values remain canonical.
- [ ] Approve and cancel return the updated complete Payout record.
- [ ] Approve and cancel enforce Idempotency-Key and If-Match.
- [ ] Cancellation releases the full Payout Reserve atomically.
- [ ] Provider destination data remains masked.
- [ ] No Quest earning-source data is required by the Admin UI.

