# Co-Parenting Coordinator

> A shared workspace where separated parents coordinate custody, review child-related expenses, communicate through append-only records, and export a timestamped family history.

## Live demo

- **Frontend:** `https://YOUR-VERCEL-PROJECT.vercel.app`
- **Backend health check:** `https://YOUR-RENDER-SERVICE.onrender.com/api/health`

The links above are deployment placeholders. Replace them with verified production URLs after completing the [deployment checklist](docs/deployment.md). A free Render service may take approximately one minute to respond after it has been idle.

## Problem statement

Separated parents often coordinate schedules, reimbursements, and decisions across unrelated calendars, chats, and spreadsheets. That fragmentation makes responsibilities unclear and leaves no dependable chronological record when a disagreement occurs. Co-Parenting Coordinator brings these workflows into one family-scoped application with explicit permissions, state transitions, server timestamps, and append-only history.

This is an educational BTech project, not a legal-advice service or a cryptographically certified evidence platform.

## Features

### Phase 1 — Authentication and family onboarding

- Parent registration and login using bcrypt password hashes and eight-hour JWTs.
- Protected routes with consistent authorization errors.
- Six-character invitation flow linking exactly two parents to one family.
- Multiple embedded children per family.

### Phases 2–3 — Custody calendar

- Month, week, day, and agenda views powered by `react-big-calendar`.
- Parent colour coding and visually distinct pending swap requests.
- Conflict detection that prevents overlapping confirmed events for the same child.
- Audited swap proposal, acceptance, and rejection workflow with self-response prevention.

### Phase 4 — Expense tracking

- Receipt uploads through Cloudinary and percentage-based parent splits.
- Explicit proposed, approved, disputed, and settled states.
- Required dispute and manual-resolution notes.
- Family balance summaries by child and month that exclude unapproved amounts.

### Phase 5 — Messages and audit records

- Append-only family messages and recorded decisions with server timestamps.
- No message or audit update/delete API endpoints.
- Reusable audited-route wrapper that records semantic actions and before/after snapshots.
- MongoDB transactions commit business changes and their audit records together.

### Phase 6 — Notifications and exports

- Reusable Nodemailer service with Gmail or other SMTP transports.
- Email templates for swaps, expense proposals, and disputes.
- Per-parent pending-action navigation badges.
- Date-filtered family-history downloads in PDF and CSV formats.

### Phase 7 — Verification

- Isolated MongoDB Memory Server replica-set integration tests.
- Exhaustive custody-overlap and expense-state-machine unit tests.
- Authentication, workflow, immutability, notification, and export coverage.
- Repeatable two-browser [manual end-to-end checklist](docs/manual-e2e-checklist.md).

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, Vite, React Router | Responsive single-page application and client navigation |
| Calendar | react-big-calendar, date-fns | Calendar views, local date handling, and custom event presentation |
| Backend | Node.js 22, Express 5 | REST API, workflow enforcement, exports, and integrations |
| Database | MongoDB Atlas, Mongoose | Family-scoped persistence, validation, aggregation, and transactions |
| Authentication | JWT, bcryptjs | Stateless API authorization and password hashing |
| File storage | Cloudinary | Durable receipt and attachment storage |
| Notifications | Nodemailer over SMTP | Transactional email notifications |
| PDF export | PDFKit | Streaming printable history documents |
| Testing | Vitest, Supertest, MongoDB Memory Server | Unit, HTTP integration, and transaction tests |
| Hosting | Vercel, Render, MongoDB Atlas | Frontend, API, and managed database hosting |

## Architecture overview

```text
Browser / React (Vercel)
          |
          | HTTPS + JWT
          v
Express API (Render) ------> Cloudinary (receipts and attachments)
          |  \
          |   `-----------> Gmail SMTP (notifications)
          v
MongoDB Atlas
  |- users and families
  |- custody events and expenses
  `- append-only messages and audit snapshots
```

Routes handle HTTP concerns, controllers coordinate use cases, isolated services implement reusable business rules, and Mongoose models enforce document validation. Family membership is checked server-side for every family resource. State-changing audited routes use a MongoDB transaction so the domain record and its audit entry cannot diverge.

The schema rationale and state diagrams belong in the System Design chapter described by the [project report skeleton](docs/project-report-skeleton.md).

## Repository structure

```text
client/                React and Vite application
server/
  src/controllers/     Request-level use cases
  src/middleware/      Authentication, errors, and audited route wrapper
  src/models/          Mongoose schemas
  src/routes/          REST endpoint definitions
  src/services/        Overlap, state-machine, audit, and email logic
  tests/               Backend unit and integration tests
docs/                  API, testing, deployment, and report documentation
```

## Local setup

### Prerequisites

- Node.js 22 and npm 10 or later
- Git
- MongoDB replica set through Docker, or a MongoDB Atlas connection
- Optional Cloudinary and SMTP accounts for upload/email demonstrations

### Installation

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/co-parenting-coordinator.git
cd co-parenting-coordinator
npm ci
```

Copy the example files without placing real credentials in source control:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

For local MongoDB, start the included replica set:

```bash
docker compose up -d
```

Set a strong `JWT_SECRET` in `server/.env`, then start both applications:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API health: `http://localhost:5000/api/health`

For a disposable seeded demonstration that needs no installed database, run `npm run demo`. Its in-memory data disappears when the process stops.

## Environment variables

### Server

| Variable | Required in production | Description |
|---|---:|---|
| `NODE_ENV` | Yes | Set to `production` on Render |
| `PORT` | Provided by Render | HTTP listening port |
| `MONGODB_URI` | Yes | Atlas SRV URI for the `coparent` database |
| `JWT_SECRET` | Yes | Long random signing secret |
| `CLIENT_URL` | Yes | Exact Vercel origin allowed by CORS, without a trailing slash |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret |
| `SMTP_HOST` | For email | `smtp.gmail.com` for Gmail |
| `SMTP_PORT` | For email | `587` for Gmail STARTTLS |
| `SMTP_SECURE` | For email | `false` when using port 587 |
| `SMTP_USER` | For email | Gmail sender address |
| `SMTP_PASS` | For email | Google App Password, not the account password |
| `SMTP_FROM` | For email | Display name and sender address |

### Client

| Variable | Required in production | Description |
|---|---:|---|
| `VITE_API_BASE_URL` | Yes | Render API URL ending in `/api`, without a trailing slash |

Vite variables are embedded in the public browser bundle. Never place passwords, private API keys, JWT secrets, or database credentials in a `VITE_` variable.

## Verification

```bash
npm test
npm run test:coverage
npm run build
npm audit
```

The current suite contains 44 backend and 11 frontend tests. Backend statement coverage is 90.75%; the custody-overlap and expense-state-machine services each have 100% statement coverage. See [testing strategy](docs/testing.md) for the rationale and test layers.

## Deployment

The application is configured for MongoDB Atlas, a Render Node web service, and a Vercel static frontend. Follow [the complete deployment guide](docs/deployment.md), including the mandatory secret scan and two-pass CORS configuration.

## Security and evidence boundary

- Passwords are bcrypt hashes and JWT secrets remain server-side.
- JWTs use per-tab `sessionStorage`; a production legal or financial service should prefer hardened HttpOnly cookies with CSRF protection.
- Family membership and transition permissions are enforced by the API, not trusted to the UI.
- Message and audit records are append-only at the API and model layers, but this project does not claim cryptographic signing, independent timestamping, or court certification.
- Atlas access from a dynamic-IP free host may require `0.0.0.0/0`; compensate with TLS, a unique strong password, and a least-privilege database user.
- Render Free sleeps after inactivity, so the first request may be delayed.

## Screenshots

Add final production screenshots here before submission:

1. Registration and family invitation
2. Dashboard
3. Custody calendar and swap request
4. Expense proposal and balance summary
5. Immutable message thread
6. Audit timeline
7. PDF/CSV export screen

## Documentation

- [Deployment guide](docs/deployment.md)
- [Project report skeleton](docs/project-report-skeleton.md)
- [Testing strategy](docs/testing.md)
- [Manual E2E checklist](docs/manual-e2e-checklist.md)
- [Custody API guide](docs/custody-api.md)
- [Expense API and state machine](docs/expense-api.md)
- [Immutable records architecture](docs/immutable-records.md)
- [Notifications and export guide](docs/notifications-export.md)

## License

This repository is intended for academic demonstration. Add the institution-required license or usage statement before public submission.
