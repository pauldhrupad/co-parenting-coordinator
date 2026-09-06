# Expense API and state machine

`Family.parents[0]` is `splitRatio.parent1` and `Family.parents[1]` is `splitRatio.parent2`. Percentages may vary per expense but must total exactly 100.

## Valid transitions

| Current state | Action | Actor and required data | Next state |
|---|---|---|---|
| `proposed` | Approve | Parent other than `proposedBy` | `approved` |
| `proposed` | Dispute | Parent other than `proposedBy`; non-empty `note` | `disputed` |
| `approved` | Settle | Either family parent | `settled` |
| `disputed` | Resolve and settle | Either family parent; non-empty `resolutionNote` | `settled` |
| `settled` | Any transition | Never allowed; the state is terminal | — |

There is intentionally no `disputed → approved` shortcut. A contested record can only close through the explicit manual-resolution route, preserving both the dispute and its resolution in the audit history.

## Example requests

Set `TOKEN_A`, `TOKEN_B`, `FAMILY_ID`, `CHILD_ID`, and `PARENT_A_ID` in your API client before using these examples.

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"familyId":"'$FAMILY_ID'","childId":"'$CHILD_ID'","title":"School books","amount":1200,"paidBy":"'$PARENT_A_ID'","splitRatio":{"parent1":50,"parent2":50}}'
```

```bash
curl -X PATCH http://localhost:5000/api/expenses/EXPENSE_ID/dispute \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"note":"Please attach the itemized receipt."}'
```

```bash
curl -X PATCH http://localhost:5000/api/expenses/EXPENSE_ID/settle \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"resolutionNote":"The itemized receipt was reviewed and both parents agreed."}'
```

## Balance rule

Only `approved` and `settled` records are recognized. Proposed records are unreviewed and disputed records are contested, so including either would make the displayed debt look authoritative before both parents have accepted or resolved it.

For an expense paid by parent 1, parent 2 owes `amount × parent2 percentage`. For an expense paid by parent 2, parent 1 owes `amount × parent1 percentage`. These signed obligations are summed into one net balance, while the same recognized records are grouped independently by child and UTC creation month.
