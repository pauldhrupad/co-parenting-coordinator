# Production Deployment Guide

This guide deploys the monorepo to MongoDB Atlas, Render, and Vercel. Complete it in order because the backend URL is needed by Vercel and the final Vercel URL is needed by backend CORS.

## 1. Credential safety gate

The MongoDB credential used during development has been shared outside its intended secret store. Treat it as compromised even if it was never committed.

- [ ] In Atlas, create a new application database user named `coparent-app`.
- [ ] Generate a unique password and grant only `readWrite` on database `coparent`.
- [ ] Replace the local `MONGODB_URI` and confirm the app connects.
- [ ] Delete the old database user only after the new connection succeeds.
- [ ] Never paste the replacement URI into source, documentation, screenshots, commits, or chat.

Changing a password or deleting a database user must be completed by the account owner in Atlas.

## 2. MongoDB Atlas checklist

Skip cluster creation when reusing the existing working cluster, but still complete the database-user and network steps.

### Create a Free cluster

- [ ] Sign in at [MongoDB Atlas](https://cloud.mongodb.com/) and create or select a project.
- [ ] Choose **Create** or **Build a Database**, then select Free/M0.
- [ ] Choose a region close to the API host; Singapore is preferred for this deployment.
- [ ] Name the cluster and wait until it is ready.

Atlas permits one Free cluster per project and describes it as suitable for learning and small proof-of-concept applications. See the [official Free cluster guide](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/).

### Create a least-privilege user

- [ ] Open **Security → Database Access → Add New Database User**.
- [ ] Use password authentication and username `coparent-app`.
- [ ] Generate and securely save a new password.
- [ ] Grant `readWrite` for database `coparent` only, then create the user.

### Configure network access

- [ ] Open **Security → Network Access → Add IP Address**.
- [ ] Add the current development IP for local administration.
- [ ] Add `0.0.0.0/0` with note `Render free dynamic egress`.

`0.0.0.0/0` permits connection attempts from any IPv4 address. It does not bypass database authentication or TLS, but it increases exposure. Use a unique password and database-scoped role, and remove this rule after moving to a host with static egress IPs.

### Obtain the connection string

- [ ] Open **Database → Connect → Drivers**, select Node.js, and copy the SRV URI.
- [ ] Replace the username/password placeholders and URL-encode special password characters.
- [ ] Set the database portion to `/coparent` and retain `retryWrites=true&w=majority`.
- [ ] Store the URI only in `server/.env` and Render's `MONGODB_URI` secret.

## 3. GitHub publication checklist

The project starts without Git metadata, so the first commit is also the entire public history.

- [ ] Run `npm test`, `npm run build`, and `npm audit`.
- [ ] Initialize Git on branch `main`.
- [ ] Confirm `.env`, `node_modules`, `dist`, `coverage`, and generated exports are ignored.
- [ ] Search staged content for connection strings, private keys, JWT values, Cloudinary secrets, and SMTP passwords.
- [ ] Create public repository `co-parenting-coordinator`; use `co-parenting-coordinator-btech` if unavailable.
- [ ] Add the remote, commit the verified files, and push `main`.
- [ ] Enable GitHub secret scanning if available.

Do not commit until every secret check is clean.

## 4. Render backend deployment

### Create the service

- [ ] Sign in to [Render](https://dashboard.render.com/) using the repository's GitHub account.
- [ ] Select **New → Blueprint**, connect the repository, and use the checked-in `render.yaml`.
- [ ] Confirm service `coparent-api`, Singapore, `main`, Free plan, and Node runtime.
- [ ] Confirm build `npm ci`, start `npm start -w server`, and health path `/api/health`.

If creating the Web Service manually, keep the repository root as the service root because the npm workspace command starts the server from there.

### Environment variables

| Key | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | New Atlas SRV URI |
| `JWT_SECRET` | At least 64 random characters; Render may generate it |
| `CLIENT_URL` | `http://localhost:5173` temporarily, then the exact Vercel origin |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard value |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard value |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard secret |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Gmail sender address |
| `SMTP_PASS` | Google App Password |
| `SMTP_FROM` | `Co-Parenting Coordinator <sender@gmail.com>` |

Do not define `PORT`; Render supplies it.

### Gmail App Password

- [ ] Enable two-step verification on the sender Google account.
- [ ] Create a Google App Password for this deployment.
- [ ] Copy it directly into Render as `SMTP_PASS`; never put it in GitHub.
- [ ] Use the same mailbox in `SMTP_USER` and `SMTP_FROM` unless an alias is authorized.

### Verify the API

- [ ] Deploy and inspect logs for a successful MongoDB connection and listening server.
- [ ] Open `https://<service>.onrender.com/api/health` and confirm HTTP 200 with `{"status":"ok"}`.
- [ ] Record the backend origin; the frontend setting will append `/api` explicitly.

Render Free services sleep after 15 minutes without inbound traffic and can take approximately one minute to wake. Do not add artificial keep-alive traffic to bypass this behavior. See [Render's Free service documentation](https://render.com/docs/free).

## 5. Vercel frontend deployment

- [ ] Sign in to [Vercel](https://vercel.com/) and import the GitHub repository.
- [ ] Name the project `co-parenting-coordinator`.
- [ ] Keep the root at repository root so `vercel.json` applies.
- [ ] Confirm build command `npm run build` and output `client/dist`.
- [ ] Set `VITE_API_BASE_URL=https://<render-service>.onrender.com/api` for Production and Preview, without a trailing slash.
- [ ] Deploy and open the stable production `vercel.app` URL.
- [ ] Test direct navigation to `/login`, `/calendar`, and `/expenses` to verify the SPA rewrite.

Vite embeds `VITE_` values in the public bundle. The API base URL is public configuration; secrets must never use this prefix.

## 6. Complete the CORS handshake

- [ ] Copy the exact Vercel production origin, such as `https://co-parenting-coordinator.vercel.app`.
- [ ] In Render, replace temporary `CLIENT_URL` with that origin and omit the trailing slash.
- [ ] Redeploy the backend.
- [ ] From Vercel, register/login and confirm API requests succeed.
- [ ] Send an API request with a different `Origin` header and confirm it is rejected.

Preview Vercel domains are intentionally not accepted. Add one temporarily only for a controlled preview test.

## 7. Production acceptance

- [ ] Health endpoint returns HTTP 200.
- [ ] Two parents can register, create/join one family, and see the same children.
- [ ] A custody overlap is rejected and a valid swap is accepted.
- [ ] A receipt uploads to Cloudinary and survives a backend restart.
- [ ] Expense proposal, dispute, resolution, settlement, and balance calculations are correct.
- [ ] Messages remain visible to both parents with no edit/delete actions.
- [ ] Audit entries contain correct actors, actions, timestamps, and before/after context.
- [ ] Swap, proposal, and dispute emails arrive at the intended mailbox.
- [ ] Pending badges count only actions awaiting the signed-in parent.
- [ ] PDF and CSV exports contain the selected chronological range.
- [ ] Atlas contains production records and Cloudinary contains uploaded assets.
- [ ] Complete the [two-browser E2E checklist](manual-e2e-checklist.md).
- [ ] Replace README's frontend, backend, clone URL, and screenshot placeholders.

## 8. Verification and secret audit

Run from the repository root before every release:

```bash
npm ci
npm test
npm run test:coverage
npm run build
npm audit
git status --short
git check-ignore -v server/.env client/.env
git grep -n -E "mongodb\+srv://|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|JWT_SECRET=.+|SMTP_PASS=.+|CLOUDINARY_API_SECRET=.+"
```

The final search should find no real credentials. Placeholder lines in `.env.example` must remain visibly fake.

## 9. Troubleshooting

| Symptom | Check |
|---|---|
| Render build fails | Node 22 selection, root directory, lockfile, and `npm ci` output |
| Health times out initially | Wait for the documented Render Free cold start and retry once |
| Database calls fail | Atlas user, URL-encoded password, `/coparent` database, and IP access list |
| Browser reports CORS error | Exact `CLIENT_URL`, HTTPS scheme, and no trailing slash |
| Frontend calls its own domain | Set `VITE_API_BASE_URL` before building, then redeploy |
| Upload returns 503 | Populate all three Cloudinary variables in Render |
| Gmail authentication fails | Check two-step verification, App Password, port 587, and `SMTP_SECURE=false` |
| Direct frontend route returns 404 | Confirm root `vercel.json` and output `client/dist` |
