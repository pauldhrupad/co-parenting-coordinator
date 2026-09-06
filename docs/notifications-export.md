# Notifications and history export

## Email configuration

All email delivery passes through `sendNotificationEmail(to, subject, templateName, data)`. Controllers select a template and supply data; they never construct a Nodemailer transport or call `sendMail` directly.

Configure either Gmail SMTP, Mailtrap, or another SMTP provider in `server/.env`:

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=CoParent <no-reply@example.com>
CLIENT_URL=http://localhost:5173
```

For Gmail, use `smtp.gmail.com`, port `465` with `SMTP_SECURE=true`, or port `587` with `SMTP_SECURE=false`. Use an app password rather than an account password.

Templates are provided for:

- `newSwapRequest`: sent to the parent assigned to the original custody event.
- `newExpenseProposed`: sent to the family parent other than the proposer.
- `expenseDisputed`: sent to the original expense proposer with the dispute reason.

Email jobs are queued by the audited route and start only after the MongoDB transaction commits. SMTP failure is logged but does not roll back an already valid business action. When SMTP is not configured, delivery is safely skipped so local development continues to work.

## Pending badges

`GET /api/notifications/pending-count` returns:

```json
{
  "success": true,
  "counts": {
    "pendingSwaps": 1,
    "proposedExpenses": 2,
    "total": 3
  }
}
```

A swap is counted only when the signed-in parent is assigned to the original event and did not request the swap. An expense is counted only when its status is `proposed` and the signed-in parent is not its proposer. The navigation refreshes immediately after page navigation and every 45 seconds.

## Export rules

`GET /api/export/:familyId?startDate=2026-09-01&endDate=2026-09-30&format=pdf`

- Only a member of the requested family may export it.
- Date-only boundaries are interpreted as inclusive UTC calendar days.
- Audit and message entries are combined and sorted oldest first.
- CSV columns are `timestamp`, `actor`, `type`, and `description/content`.
- CSV output includes a UTF-8 byte-order marker for Excel and neutralizes spreadsheet-formula prefixes.
- PDF output is generated with PDFKit because it is deterministic, lightweight, and does not require a headless browser process.
- Responses use attachment headers and `Cache-Control: private, no-store`.

## Demo flow

1. Sign in as Parent A and propose an expense.
2. Sign in as Parent B; the Expenses navigation badge increments and the configured test inbox receives the proposal email.
3. Dispute the expense with a reason; Parent A receives the dispute email.
4. Open **Export**, choose the date range and PDF or CSV, then download the complete chronological history.
