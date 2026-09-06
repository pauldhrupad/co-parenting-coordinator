# Co-Parenting Coordinator — BTech Project Report Skeleton

Replace every bracketed prompt with project-specific writing, diagrams, measured results, and final screenshots. Keep terminology consistent: two parents per family, multiple children, append-only records, and externally recorded settlement.

## Front matter

### Title page

Include the project title, student name and roll number, degree and department, institution, supervisor, academic year, and submission date in the university's required format.

### Certificate and declaration

Use the institution-approved certificate and originality declaration, obtaining all required signatures before submission.

### Acknowledgements

Briefly recognize the supervisor, department, testers, and resources that directly supported the work.

### Abstract

Summarize the coordination problem, MERN solution, major workflows, standout overlap/audit mechanisms, evaluation method, and principal results in approximately 200–300 words.

### Table of contents and lists

Generate the table of contents after pagination is final, followed by lists of figures, tables, abbreviations, and symbols where required.

## Chapter 1 — Introduction

### 1.1 Background

Explain why separated parents need a shared, structured source of truth for custody, expenses, decisions, and communication.

### 1.2 Motivation

Describe how fragmented chats, spreadsheets, and personal calendars create ambiguity, missed responses, and incomplete historical records.

### 1.3 Aim and objectives

State the aim, then list measurable objectives: secure family onboarding, conflict-free scheduling, controlled expense transitions, append-only records, notifications, exports, and responsive access.

### 1.4 Scope and limitations

Define v1 as exactly two parents, multiple children, INR-oriented expense tracking, manual settlement, and web delivery. Clarify that it is not legal advice or cryptographically/court-certified evidence and excludes integrated payments, automated custody plans, and native apps.

### 1.5 Report organization

Give one sentence explaining the purpose of each remaining chapter.

## Chapter 2 — Problem Statement and Requirements

### 2.1 Problem definition

Express the engineering problem in terms of identity, family isolation, scheduling conflicts, workflow authorization, traceability, and portable records.

### 2.2 Stakeholders

Identify Parent A, Parent B, the evaluator, and deployment operator; explain their goals and expected technical familiarity.

### 2.3 Functional requirements

Tabulate registration, family invitation, custody/swaps, expenses, messages, audit history, notifications, uploads, summaries, and exports with IDs and acceptance criteria.

### 2.4 Non-functional requirements

Cover correctness, security, usability, responsiveness, maintainability, availability constraints, performance, auditability, and privacy.

### 2.5 Feasibility analysis

Discuss technical feasibility of MERN, operational feasibility for two-parent use, eight-week schedule feasibility, and student-tier hosting costs.

## Chapter 3 — Literature Review and Existing Systems

### 3.1 Digital family coordination

Review shared calendars, co-parenting platforms, structured expense logs, and audit trails using academic and primary product sources.

### 3.2 OurFamilyWizard

Describe its co-parenting calendar, messaging, expense, and payment-oriented tools from the [official feature overview](https://www.ourfamilywizard.com/product-features). Compare capabilities without claiming equivalence to its commercial, compliance, or legal positioning.

### 3.3 Cozi Family Organizer

Describe Cozi's general-purpose shared, colour-coded calendar and family lists using the [official Cozi site](https://www.cozi.com/). Explain that it targets household organization rather than dispute-oriented approvals and audit snapshots.

### 3.4 Comparative analysis and identified gap

Compare audience, calendar, conflict detection, expenses, immutable communication, audit history, notifications, exports, and payments. Identify the selected gap: an explainable educational implementation of conflict detection, state machines, and transactional auditing.

## Chapter 4 — System Analysis and Design

### 4.1 Development methodology

Describe the phase-based iterative process, where each phase produced a testable vertical capability before the next was added.

### 4.2 High-level architecture

Present a component/deployment diagram showing React/Vercel, Express/Render, Atlas, Cloudinary, and Gmail SMTP, followed by the request and data flow.

### 4.3 Use-case model

Add a use-case diagram for onboarding, custody management, expense review, communication, audit viewing, and export.

### 4.4 Data design

Include the Phase 0 MongoDB schemas and a document-reference diagram. Explain embedded children, parent references, family ownership, indexes, UTC dates, and currency handling.

### 4.5 Custody and expense state models

Insert both Phase 0 Mermaid state diagrams. Explain actor restrictions, valid transitions, and why enums are safer than independent booleans.

### 4.6 Overlap-detection design

Define the half-open interval rule `newStart < existingEnd && newEnd > existingStart`, child/family/status filters, and event self-exclusion during updates.

### 4.7 Audit and immutability design

Explain append-only model guards, omitted update/delete routes, semantic actions, before/after snapshots, and transaction boundaries, including the limits of application-level immutability.

### 4.8 Interface and security design

Include wireframes for the major screens and document password hashing, JWT verification, family authorization, validation, CORS, Helmet, secret management, and deployment trust boundaries.

## Chapter 5 — Implementation

### 5.1 Environment and project structure

Describe the npm-workspace monorepo, separate React/Express applications, directory responsibilities, and environment-variable strategy.

### 5.2 Authentication and onboarding

Explain bcrypt, JWT claims/lifetime, protected middleware, invite generation, duplicate-membership prevention, and the exactly-two-parent rule.

### 5.3 Custody calendar

Explain calendar data mapping, parent/status styling, server overlap queries, swap endpoints, authorization, client refresh behavior, and errors.

### 5.4 Expense workflow and aggregation

Explain validation, receipt upload, the pure transition service, controller enforcement, dispute resolution, and MongoDB balance aggregation.

### 5.5 Messaging and generic audit middleware

Explain cursor pagination and omitted mutation endpoints. Describe how the audited-route wrapper avoids duplicated controller logging and commits records transactionally.

### 5.6 Notifications and pending actions

Describe the Nodemailer service, after-commit delivery, recipient selection, badge endpoint, and polling interval.

### 5.7 PDF and CSV exports

Explain authorization, inclusive date filtering, chronological merging, CSV escaping, and streamed PDFKit output.

### 5.8 Deployment

Describe Atlas, Render, Vercel, Cloudinary, Gmail SMTP, exact-origin CORS, secret storage, health checks, and free-service cold starts.

## Chapter 6 — Testing and Validation

### 6.1 Test strategy

Explain the unit, integration, frontend, and manual E2E layers and why MongoDB Memory Server offers isolated realistic database behavior.

### 6.2 Custody-overlap tests

Present the before, after, partial, containing, contained, adjacent, self-exclusion, and different-child cases with expected and actual results.

### 6.3 Expense-state-machine tests

Present valid transitions, direct-settlement rejection, resolution requirements, self-approval rejection, and split-ratio validation.

### 6.4 Authentication and workflow integration tests

Cover login outcomes, duplicate email, invalid password, missing/invalid/expired JWTs, family boundaries, audit consistency, email helpers, and export behavior.

### 6.5 Automated results

Report 44 passing backend tests, 11 passing frontend tests, 90.75% backend statement coverage, and 100% statement coverage for both core rule services. Regenerate these values if final code changes.

### 6.6 Manual acceptance

Summarize the two-browser Parent A/Parent B run and include the completed checklist, defects, browser versions, date, environment, and retest results.

## Chapter 7 — Results and Discussion

### 7.1 Functional results

Map each objective to evidence, noting environment-dependent capabilities such as SMTP and Cloudinary.

### 7.2 Screenshots

Include captioned authentication, invitation, dashboard, calendar/swap, expense/dispute, messages, audit, badge, and export images with personal data removed.

### 7.3 Performance and usability observations

Record representative response observations, responsive-layout checks, and the Render Free cold-start experience without presenting informal measurements as formal benchmarks.

### 7.4 Design trade-offs

Discuss sessionStorage versus HttpOnly cookies, application-level versus cryptographic immutability, polling versus WebSockets, manual settlement versus payments, and free hosting constraints.

## Chapter 8 — Conclusion and Future Scope

### 8.1 Conclusion

Summarize how the system meets the identified need and highlight the demonstrably correct overlap, state-machine, and audit designs.

### 8.2 Future enhancements

Discuss secure-cookie authentication, cryptographic hash chaining/external timestamping, payments, recurring expenses, custom ratios, real-time updates, calendar import, accessibility testing, native apps, and multi-guardian support without claiming they are implemented.

### 8.3 Lessons learned

Reflect on workflow modeling, database transactions, authorization, integration testing, deployment, and scope management.

## References

Use the institution's required citation style consistently. Prefer official technical documentation, primary product pages, and peer-reviewed research, including access dates for web sources.

Suggested primary references include MongoDB/Mongoose, Express, React/Vite/React Router, react-big-calendar/date-fns, JWT/bcrypt, Cloudinary, Nodemailer, PDFKit, Render/Vercel, Vitest, Supertest, MongoDB Memory Server, OurFamilyWizard, and Cozi.

## Appendices

### Appendix A — API catalogue

Include routes, authentication requirements, representative bodies, and error conventions without live tokens.

### Appendix B — Schemas and state diagrams

Place full Mongoose schemas and readable copies of the Phase 0 Mermaid diagrams here if Chapter 4 would become too dense.

### Appendix C — Test evidence

Attach summarized output, coverage tables, the completed E2E checklist, and selected API verification evidence.

### Appendix D — Installation and deployment

Reference the README and deployment guide, recording only environment-variable names and placeholders—not secret values.
