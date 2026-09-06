# Testing Strategy

## Tools and test database

The project uses **Vitest** for unit and integration tests, **Supertest** for HTTP assertions, and **MongoDB Memory Server** for database-backed tests. Vitest was selected because it supports the project's ES modules without a separate transpilation setup and uses the same test conventions as Jest.

Backend integration tests start an isolated `MongoMemoryReplSet`. This is preferable to using the development or production MongoDB Atlas database because it:

- starts with a known empty state and is discarded after the test run;
- cannot overwrite real family, custody, expense, message, or audit data;
- does not require Atlas credentials or a network connection;
- remains a real MongoDB process, so Mongoose queries, indexes, aggregation operators, and validation behave realistically; and
- runs as a replica set, allowing the same transactions used by audited application workflows to be tested.

Mocks alone would be faster but could hide errors in MongoDB queries and transaction behavior. Atlas is still appropriate for a final deployment smoke test, but not for repeatable automated tests.

## Test layers

| Test file | Purpose |
|---|---|
| `server/tests/custody-overlap.test.js` | Proves every overlap shape, self-exclusion during updates, and child/family scoping. |
| `server/tests/expense-state-machine.test.js` | Unit-tests the allowed and forbidden expense transitions and split-ratio schema rule. |
| `server/tests/phase1-auth-family.test.js` | Uses Supertest to verify registration, login, family invitation, and protected-route authentication. |
| `server/tests/workflows.test.js` | Covers custody, expense, messaging, audit, notification, and export workflows against MongoDB. |
| `server/tests/email.test.js` | Verifies notification rendering and delivery-service behavior without sending real email. |
| `client/src/**/*.test.*` | Verifies routing, calendar behavior, and frontend data-formatting helpers in jsdom. |

The expense transition policy lives in `server/src/services/expenseStateMachine.js`. It is deliberately independent of Express and Mongoose writes: the same function is called by the controllers and directly by unit tests, preventing the tests from proving a second, unused implementation.

## Commands

Run these from the project root:

```bash
npm test
npm run test:watch
npm run test:coverage
```

- `npm test` runs the backend and frontend once and exits.
- `npm run test:watch` reruns affected tests while code changes.
- `npm run test:coverage` generates separate HTML reports in `server/coverage` and `client/coverage`.

Coverage is used to reveal untested paths, not as a substitute for scenario selection. The project prioritizes complete branch coverage of the custody overlap and expense transition rules over an arbitrary application-wide percentage.

For the final demonstration, also complete [the manual end-to-end checklist](manual-e2e-checklist.md).
