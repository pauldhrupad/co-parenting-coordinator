# Manual End-to-End Test Checklist

Use this checklist before the project demo or viva. Run Parent A in a normal browser window and Parent B in a private/incognito window so each parent has an independent session.

## Test record

- [ ] Tester name: ______________________________
- [ ] Test date and time: ________________________
- [ ] App/API version: ___________________________
- [ ] Browser and version: _______________________
- [ ] Test environment: Local / Staging / Other: ______________
- [ ] Parent A email: ____________________________
- [ ] Parent B email: ____________________________
- [ ] Family name: _______________________________
- [ ] Child name: ________________________________

## 1. Preparation

- [ ] Start the API and frontend and confirm that the login page loads without console errors.
- [ ] Use a clean test family and two email addresses that can receive test notifications.
- [ ] Configure Cloudinary if receipt and attachment uploads will be demonstrated.
- [ ] Configure SMTP/Mailtrap and confirm the server reports that email is enabled.
- [ ] Keep the browser developer tools' Network tab open in at least one session so failed requests are visible.

## 2. Registration, login, and family invitation

- [ ] In session A, register Parent A with a valid name, unique email, and valid password.
- [ ] Confirm registration succeeds, Parent A is signed in, and no password appears in any API response.
- [ ] Sign out and sign back in as Parent A using the correct password.
- [ ] In session B, register Parent B with a different email.
- [ ] In session A, create a family with at least one child and record the six-character invite code.
- [ ] In session B, open **Join family**, enter that invite code, and join successfully.
- [ ] Refresh both sessions and confirm they show the same family, both parent names, and the same child.
- [ ] Try reusing the code with an account already in the family and confirm the action is rejected clearly.

## 3. Custody event and overlap protection

- [ ] In session A, create a confirmed custody event assigned to Parent A on a future date.
- [ ] Confirm the event appears in both calendars with the Parent A colour and correct local date/time.
- [ ] Attempt to create another confirmed event for the same child that partially overlaps it.
- [ ] Confirm the second event is rejected with a human-readable conflict message and is absent after refresh.
- [ ] If the family has another child, create an event for that child at the same time and confirm it is allowed.

## 4. Custody swap workflow

- [ ] In session B, open Parent A's confirmed event and propose replacement dates that do not overlap another confirmed event.
- [ ] Confirm the pending swap is visually distinct in both calendars.
- [ ] Confirm Parent A receives the **New swap request** email.
- [ ] Confirm Parent A's Calendar badge increases, while Parent B does not receive a badge for their own request.
- [ ] In session B, confirm no accept/reject controls are offered for Parent B's own request.
- [ ] In session A, accept the swap.
- [ ] Confirm the event becomes confirmed at the replacement date in both sessions without a manual page reload.
- [ ] Confirm the Calendar pending-action badge clears after navigation or the next badge refresh.
- [ ] Confirm the original date is no longer treated as the active custody event.

## 5. Expense proposal and dispute

- [ ] In session A, propose a positive child-related expense with a 50/50 split and receipt image.
- [ ] Confirm the amount is displayed correctly as currency and the receipt thumbnail opens.
- [ ] Confirm Parent B receives the **New expense proposed** email.
- [ ] Confirm Parent B's Expenses badge increases, while Parent A does not see an action badge for their own proposal.
- [ ] Before review, confirm the proposed expense is excluded from the net balance.
- [ ] In session A, confirm Parent A cannot approve their own proposal.
- [ ] In session B, choose **Dispute**, first verify an empty note is rejected, then submit a meaningful reason.
- [ ] Confirm Parent A receives the **Expense disputed** email and can see the exact dispute reason.
- [ ] Confirm the disputed expense remains excluded from the net balance.
- [ ] Confirm the Expenses pending-action badge clears for Parent B.

## 6. Manual resolution and settlement

- [ ] Attempt to settle a newly proposed expense and confirm the invalid transition is rejected.
- [ ] Attempt to settle the disputed expense without a resolution note and confirm it is rejected.
- [ ] Enter a resolution note describing the parents' agreement and settle the disputed expense.
- [ ] Confirm its status is **Settled** in both sessions.
- [ ] Confirm the expense is now included once, and only once, in totals by child and month.
- [ ] Confirm the net balance uses the recorded payer and split percentages and has the expected direction.

## 7. Immutable messages and decisions

- [ ] In session A, send a normal message; in session B, send a decision entry.
- [ ] Confirm both entries appear in chronological order in both sessions with server timestamps.
- [ ] Confirm there are no edit or delete buttons on either entry.
- [ ] Refresh both sessions and confirm the exact content and timestamps are unchanged.
- [ ] Attach a supported file if Cloudinary is configured and confirm the other parent can open it.

## 8. Audit timeline

- [ ] Open the audit timeline and confirm newest entries are displayed first.
- [ ] Confirm entries exist for custody event creation, swap request, and swap acceptance.
- [ ] Confirm entries exist for expense proposal, dispute, and dispute resolution/settlement.
- [ ] Confirm entries exist for the message and decision that were sent.
- [ ] Confirm each entry shows the correct actor, human-readable action, entity, and exact timestamp.
- [ ] Inspect representative custody and expense entries and confirm their before/after states match the action.
- [ ] Confirm the audit interface has no edit or delete controls.

## 9. Notifications

- [ ] Confirm each pending badge counts only work awaiting the currently signed-in parent.
- [ ] Leave a pending action open and verify the badge refreshes automatically within the configured polling interval.
- [ ] Resolve that action and verify its badge clears after navigation or the next poll.
- [ ] Confirm the swap-request, expense-proposal, and expense-dispute emails have the correct recipient, family context, actor, and relevant details.
- [ ] If SMTP is intentionally disabled, confirm the business action still succeeds and the server logs the delivery failure without exposing credentials.

## 10. PDF and CSV history export

- [ ] Open **Export History**, choose a range that includes this entire test, and download CSV.
- [ ] Confirm the CSV opens correctly and contains the columns `timestamp`, `actor`, `type`, and `description/content`.
- [ ] Confirm its rows are chronological and include the custody, expense, message, and decision lifecycle entries from this test.
- [ ] Download PDF for the same range.
- [ ] Confirm the PDF header shows the family name, selected date range, and generated-on timestamp.
- [ ] Confirm the PDF entries are readable, chronological, and contain the same relevant history as the CSV.
- [ ] Export a narrower range and confirm records outside that range are excluded.
- [ ] Confirm filenames and response formats are appropriate for the selected PDF/CSV option.

## 11. Authentication and authorization smoke checks

- [ ] Open a protected page in a new unsigned-in private tab and confirm it redirects to login.
- [ ] Sign out in one session and confirm protected API calls no longer succeed there.
- [ ] Confirm one parent cannot respond to their own custody swap or expense proposal by manipulating the UI or replaying a request.
- [ ] If using a third test account, confirm it cannot read the family's custody, expense, message, audit, or export data.

## 12. Final sign-off

- [ ] Both sessions show the same final custody event, expense state, messages, and audit history.
- [ ] No unexplained failed requests or browser console errors remain.
- [ ] All dates render in the expected local timezone while exported timestamps remain unambiguous.
- [ ] Record every defect below and rerun the affected section after it is fixed.

| Defect ID | Section | Expected | Actual | Status |
|---|---|---|---|---|
| | | | | |
| | | | | |

Overall result: **PASS / FAIL**

Tester signature: __________________________  Date: __________________
