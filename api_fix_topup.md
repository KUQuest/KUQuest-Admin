# Top-up Admin API Contract

Audience: API Server backend developers.

The Admin app now has a Top-up Review page. The page must read Top-up data from the Admin API. It must not use local mock Top-up records when the API data source is enabled.

The API Server was not changed for this work.

## Current available endpoints

### List Top-ups

`GET /api/v1/admin/top-ups`

Query parameters:

- `status`: `PENDING`, `PAID`, `EXPIRED`, or `FAILED`.
- `userId`: Member UUID.
- `limit`: integer from `1` to `100`.
- `cursor`: cursor returned by the previous response.

Current response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "top-up-uuid",
        "userId": "member-uuid",
        "member": {
          "firstName": "Ari",
          "lastName": "Wattanakul",
          "studentId": "68000001"
        },
        "topUpStatus": "PENDING",
        "creditAmountSatang": 10000,
        "providerFeeSatang": 200,
        "providerTaxSatang": 14,
        "paymentTotalSatang": 10214,
        "paymentMethod": "PROMPTPAY",
        "providerReference": null,
        "expiresAt": "2026-09-13T10:00:00.000Z",
        "paidAt": null,
        "createdAt": "2026-09-13T09:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

The Admin app uses this endpoint for the Top-up table, local status filters, search, sorting, and pagination display.

### Reconcile a Top-up

`POST /api/v1/admin/top-ups/:topUpId/reconcile`

Current response:

```json
{
  "success": true,
  "data": {
    "topUp": {
      "id": "top-up-uuid",
      "internalReference": "top-up:top-up-uuid",
      "principalUserId": "member-uuid",
      "quoteId": "quote-uuid",
      "provider": "PROMPTPAY",
      "providerReference": null,
      "providerApiVersion": null,
      "providerStatus": null,
      "providerAmountSatang": null,
      "providerChannelCode": "PROMPTPAY",
      "creditSatang": 10000,
      "chargedFeeSatang": 200,
      "chargedTaxSatang": 14,
      "paymentTotalSatang": 10214,
      "providerFeeSatang": 200,
      "providerTaxSatang": 14,
      "providerTotalSatang": 10214,
      "qrPayload": null,
      "qrDataUrl": null,
      "qrExpiresAt": "2026-09-13T10:00:00.000Z",
      "topUpStatus": "PENDING",
      "creditedLedgerTransactionId": null,
      "createdAt": "2026-09-13T09:00:00.000Z",
      "updatedAt": "2026-09-13T09:00:00.000Z"
    }
  }
}
```

This response already contains the financial values required to update the Top-up row after reconciliation. All amount fields are integer satang.

### Naming difference to resolve

The list response and the reconciliation response use different names for the same concepts:

- list: `userId`, `creditAmountSatang`, `paymentMethod`, `expiresAt`, `paidAt`
- reconcile: `principalUserId`, `creditSatang`, `providerChannelCode`, `qrExpiresAt`, and no `paidAt`

For the new detail endpoint, use one stable response shape. The required response below follows the list names because the table and detail drawer use the same display model. Do not add duplicate aliases unless the API team needs a documented migration period.

### Retry a Top-up Provider Event

`POST /api/v1/admin/top-ups/events/:eventId/retry`

This route exists. The current Top-up list does not return the related provider event ID. The Admin app therefore does not show a Retry button. It must not guess an event ID from a Top-up ID.

## Missing endpoint

### Get one Top-up

`GET /api/v1/admin/top-ups/:topUpId`

Purpose: return one complete Top-up review record for the Admin detail drawer. This is a read-only endpoint. It must use the Admin Session and the same authorization policy as the other Admin Top-up routes.

The member-facing route `GET /api/v1/top-ups/:topUpId` is not a replacement for this endpoint. The Admin app must not use a member-facing route for Admin review data.

Path parameter:

- `topUpId`: Top-up UUID.

Required response:

```json
{
  "success": true,
  "data": {
    "id": "top-up-uuid",
    "userId": "member-uuid",
    "member": {
      "firstName": "Ari",
      "lastName": "Wattanakul",
      "studentId": "68000001"
    },
    "topUpStatus": "PENDING",
    "creditAmountSatang": 10000,
    "providerFeeSatang": 200,
    "providerTaxSatang": 14,
    "paymentTotalSatang": 10214,
    "paymentMethod": "PROMPTPAY",
    "providerReference": null,
    "providerStatus": null,
    "expiresAt": "2026-09-13T10:00:00.000Z",
    "paidAt": null,
    "createdAt": "2026-09-13T09:00:00.000Z",
    "updatedAt": "2026-09-13T09:00:00.000Z",
    "creditedLedgerTransactionId": null
  }
}
```

The detail response must include these fields even when their value is `null`. Do not omit a field based on the Top-up status.

## Contract rules

1. `topUpStatus` must use only the canonical values `PENDING`, `PAID`, `EXPIRED`, and `FAILED`.
2. Amount fields must be integer satang. The Admin client converts satang to Baht for display only.
3. `creditAmountSatang` is the amount credited to the Member Spending balance.
4. `paymentTotalSatang` is the amount paid by the Member, including provider charges.
5. `providerFeeSatang` and `providerTaxSatang` must be values supplied by the API. The Admin client does not calculate them.
6. `paidAt` must be the provider-confirmed payment time. It must be `null` when the Top-up is not `PAID`.
7. `creditedLedgerTransactionId` must identify the Ledger Transaction that credited the Member Wallet. It is `null` before credit.
8. Do not return QR secrets, raw provider payloads, or private provider credentials in this Admin detail response.
9. A missing Top-up must return the existing API error envelope with HTTP `404` and a stable error code such as `TOP_UP_NOT_FOUND`.

## Provider-event retry gap

If the Admin UI must support provider-event retry, add this field to the list or detail response:

```json
{
  "latestProviderEventId": "provider-event-uuid"
}
```

This value must be the internal provider-event row UUID accepted by `POST /api/v1/admin/top-ups/events/:eventId/retry`. A provider event ID from the payment provider is not interchangeable with this UUID.

Until this relationship is available, the Admin app leaves provider-event retry disconnected. Reconciliation remains the supported Top-up action.
