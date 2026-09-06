# Custody Calendar API — Verification Guide

Run the server with `npm run dev -w server`, then run these commands in Git Bash or a VS Code Bash terminal. Replace the placeholder values with IDs and JWTs returned by the authentication and family endpoints.

```bash
API_URL="http://localhost:5000/api"
PARENT_A_TOKEN="paste-parent-a-jwt"
PARENT_B_TOKEN="paste-parent-b-jwt"
FAMILY_ID="paste-family-id"
CHILD_ID="paste-embedded-child-id"
PARENT_A_ID="paste-parent-a-user-id"
PARENT_B_ID="paste-parent-b-user-id"
```

## 1. Create a valid confirmed event

```bash
curl -i -X POST "$API_URL/custody" \
  -H "Authorization: Bearer $PARENT_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"familyId\":\"$FAMILY_ID\",\"childId\":\"$CHILD_ID\",\"startDate\":\"2030-01-10T09:00:00.000Z\",\"endDate\":\"2030-01-10T17:00:00.000Z\",\"assignedParent\":\"$PARENT_A_ID\",\"type\":\"regular\"}"
```

Expected: `201 Created`. Copy `event._id` from the response into `ORIGINAL_EVENT_ID`.

## 2. Verify that an overlap is rejected

```bash
curl -i -X POST "$API_URL/custody" \
  -H "Authorization: Bearer $PARENT_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"familyId\":\"$FAMILY_ID\",\"childId\":\"$CHILD_ID\",\"startDate\":\"2030-01-10T16:00:00.000Z\",\"endDate\":\"2030-01-10T20:00:00.000Z\",\"assignedParent\":\"$PARENT_B_ID\",\"type\":\"holiday\"}"
```

Expected: `409 Conflict` with this response shape:

```json
{
  "success": false,
  "message": "Custody conflict: this child already has a confirmed event in that date range"
}
```

## 3. Propose a swap as the non-assigned parent

```bash
ORIGINAL_EVENT_ID="paste-created-event-id"

curl -i -X POST "$API_URL/custody/$ORIGINAL_EVENT_ID/swap-request" \
  -H "Authorization: Bearer $PARENT_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"startDate\":\"2030-01-11T09:00:00.000Z\",\"endDate\":\"2030-01-11T17:00:00.000Z\",\"assignedParent\":\"$PARENT_B_ID\"}"
```

Expected: `201 Created` and an event with `type: "swap-request"` and `status: "pending-swap"`. Copy its `event._id` into `PENDING_SWAP_ID`.

## 4. Verify that the requester cannot accept their own request

```bash
PENDING_SWAP_ID="paste-pending-swap-id"

curl -i -X PATCH "$API_URL/custody/$PENDING_SWAP_ID/respond" \
  -H "Authorization: Bearer $PARENT_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'
```

Expected: `403 Forbidden` with `You cannot respond to your own swap request`.

## 5. Accept as the parent assigned to the original event

```bash
curl -i -X PATCH "$API_URL/custody/$PENDING_SWAP_ID/respond" \
  -H "Authorization: Bearer $PARENT_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'
```

Expected: `200 OK`; the original event is removed and the proposed event is now `confirmed`.

## 6. List the family schedule

```bash
curl -i "$API_URL/custody/$FAMILY_ID?sort=asc" \
  -H "Authorization: Bearer $PARENT_A_TOKEN"
```

## Automated verification

```bash
npm run test -w server
```

Intervals are treated as half-open ranges: `[startDate, endDate)`. An event ending exactly when another begins is allowed. Confirmed-schedule writes increment the family’s internal schedule revision inside the same MongoDB transaction; this serializes concurrent checks for a family and prevents two simultaneous requests from both passing the overlap query.
