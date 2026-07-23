# TaPa Trust — Web Client

**TaPa Trust** is a trust-centered marketplace for finding, verifying, and rebooking informal
skilled workers (plumbers, cleaners, electricians, movers, and more) in Kigali. The problem it
addresses: hiring informal workers is risky — you don't know who is reliable, what a fair price is,
how long a job actually took, or whether the person is who they claim to be. TaPa Trust makes every
step **accountable**: verified identities, an in-app price negotiation, mutually confirmed
check-in/check-out with tracked duration, simulated payment status, and reviews that feed back into
each worker's reputation.

This repository is the **React web client**. It talks to the **TaPa Trust API**
(Node/Express + PostgreSQL) over HTTPS.

## Links

| | |
| --- | --- |
| 🎬 **Demo video (5 min)** | [Watch the 5-min demo](https://drive.google.com/drive/folders/1vcwAf0Zi6MBi6FW-jBYfpLlhrzUUgNg4?usp=sharing) |
| 🌐 **Live app (client)** | **https://tapa-trust-client.vercel.app** |
| 🔌 **Live API** | `https://tapa-trust-server.onrender.com` · health: `GET /api/health` |
| 💻 **Client repo** | https://github.com/AngeNicole/tapa-trust-client |
| 🗄️ **Server repo** | https://github.com/AngeNicole/tapa-trust-server |

> The API is on Render's free tier, which sleeps after inactivity — the **first request after idle
> can take ~30s** to wake. Load the site, wait a moment, and it connects.

## Related files & repositories

The project spans **two repositories** plus its deployment and demo artefacts:

| Item | Where |
| --- | --- |
| **Web client** (this repo — React/Vite) | https://github.com/AngeNicole/tapa-trust-client |
| **API server** (Node/Express + PostgreSQL) | https://github.com/AngeNicole/tapa-trust-server |
| **Deployed app** | https://tapa-trust-client.vercel.app |
| **Deployed API** | https://tapa-trust-server.onrender.com |
| **Demo video (5 min)** | [Watch the 5-min demo](https://drive.google.com/drive/folders/1vcwAf0Zi6MBi6FW-jBYfpLlhrzUUgNg4?usp=sharing) |

**Key files**
- Client: `src/routes.jsx` (routes + role gating), `src/api/client.js` (API calls), `src/context/` (Auth/Chat/Toast), `src/pages/` (public, auth, requester, worker, admin), `src/components/` (shared UI, `BookingStepper`, `DashShell`), `src/styles.css` (Tailwind + design tokens), `vercel.json` (SPA config).
- Server: `src/routes/` + `src/controllers/` (auth, workers, bookings, disputes, admin, public), `src/middleware/` (`auth`, `requireRole`), `src/lib/trust.js`, `db/schema.sql`, `src/startupMigrations.js`, and the **`tests/` suite** (`npm test` — 115 tests).

---

## Core functionality

Grouped by the actor who uses it. The **trust loop** (verify → book → negotiate → track → pay →
review) is the heart of the product and the focus of the demo.

### Public (no account needed)
- **Landing + Browse workers** — search by name/skill, filter by trade, sort by rating / jobs / name.
- **Public worker profiles** — photo, skills, education, certifications, rating, completed jobs.
- Only **admin-verified** workers are shown publicly; unverified profiles never surface.

### Requester
- **Browse-and-book verified workers** — browse **admin-verified** workers and book directly from a
  profile (no task posting). Unverified workers never appear and can't be booked.
- **Chat & price agreement** — one composer to message and **propose / counter / accept a price**.
  A **price must be agreed before the worker can accept** the job.
- **Digital agreement** — both parties **draw a signature** (canvas), then the requester **pays**;
  funds are held in **escrow** (`held → released`), shown as a banner to both sides.
- **Unified booking stepper** — one vertical stepper drives the whole journey (agree price → accept →
  sign → pay → check-in → confirm-start → check-out → confirm-completion), telling each party what's
  next; only the current booking is expanded.
- **Dispute resolution** — "Report an issue" freezes payment; an admin mediates (see below).
- **Reviews & rebooking**, **saved workers**, a **Dashboard** (KPIs/charts/activity), in-app
  **notifications**.

### Worker
- **Two-path verification (non-skippable)** — choose **In-person** (admin confirms; no device/upload)
  or **Online** (upload ID + live **face scan**). On the online path the selfie↔ID comparison runs
  **entirely in the browser** (face-api.js) and must exceed **65%** — **match-then-discard**: the
  identity images never leave the device; only the **match score + pass/fail verdict** are
  submitted. The admin reviews that score and the certificates — never the images. Both paths reach
  the same **Verified** status.
- **Trust status** — **Unverified** (can't be booked or browsed) → **Admin-Certified** once an admin
  approves. Admin verification is the single gate to appear in Browse and take bookings.
- **Profile** — upload a **profile picture**, skills, education, certificate uploads.
- **Availability toggle** (always visible in the top bar).
- **Bookings + History**, **check-in/out** with tracked **duration**, a data-minimizing
  **safety check-in** (overdue → the platform is alerted; no location broadcast).
- **Earnings** — weekly chart, by-category breakdown, average rating, **exportable PDF income
  summary** (financial-inclusion / SDG 8).

### Admin (oversight only)
- **Verifications** — review each worker (path chosen, biometric verdict, certificate previews);
  **Approve / Request redo / Reject** with a note.
- **Disputes** — a queue with **auto-attached evidence** (timestamped confirmation timeline, agreed
  price, chat thread, each party's repeat-dispute count). The admin **schedules a mediation meeting**
  (**in-app discussion / Google Meet link / physical meetup**) and can **propose a different method**
  if one isn't working; **ruling is blocked until both sides are heard**, then release / refund /
  dismiss.
- **Dashboard** (platform KPIs), **Users**, **Categories** management.

### Cross-cutting
- **In-app notifications** (a bell + toast alerts, polled live). Chat/offer notifications carry a
  chat icon and **open the relevant booking's chat** on click.
- Role-based routing, JWT auth, strong-password enforcement, responsive/phone-first UI.

---

## Tech stack

- **React 18 + Vite**, **React Router v6**
- **Tailwind CSS v4** with the AlignUI design system + Plus Jakarta Sans; Phosphor icons
- State via React context (`Auth`, `Chat`, `Toast`); data via `fetch` with a JWT `Bearer` header
- Backend: **Node.js + Express + PostgreSQL**, JWT auth, bcrypt hashing (separate repo)

## Architecture

```
Browser ──HTTPS──▶  React client (Vercel)  ──/api──▶  Express API (Render)  ──▶  PostgreSQL (Render)
                    this repo                          tapa-trust-server            managed instance
```

The client is a static Vite build; the backend URL is injected at build time via `VITE_API_URL`, so
the same code runs locally or in production with no hardcoded hosts.

---

## Run the full stack locally (step by step)

You need **two repos** running: the API server (+ PostgreSQL) and this client.

### 0. Prerequisites
- **Node.js 18+** and npm
- **PostgreSQL 14+** running locally (e.g. `brew install postgresql@16` on macOS)
- git

### 1. Database
```bash
createdb tapa_trust          # create an empty local database
```

### 2. API server
```bash
git clone https://github.com/AngeNicole/tapa-trust-server.git
cd tapa-trust-server
npm install

cp .env.example .env         # then edit .env:
#   DATABASE_URL=postgres://localhost:5432/tapa_trust
#   JWT_SECRET=<any long random string>
#   PORT=4000

npm run migrate              # creates all tables (DESTRUCTIVE: drops & recreates)
npm run seed                 # seeds the skill categories
npm run dev                  # API on http://localhost:4000  (health: /api/health)
```
> `npm run migrate` applies `db/schema.sql`, which **drops and recreates all tables** — only run it
> on a database you're happy to wipe. For an existing database, apply incremental migrations instead
> with `npm run alter <file>` (e.g. `npm run alter alter-add-booking-chat.sql`).

### 3. Web client (this repo)
```bash
git clone https://github.com/AngeNicole/tapa-trust-client.git
cd tapa-trust-client
npm install

cp .env.example .env         # default already points at the local API:
#   VITE_API_URL=http://localhost:4000/api

npm run dev                  # client on http://localhost:5173
```
Open **http://localhost:5173**. Register a **worker** and a **requester** in two browser profiles
(or one normal + one incognito window) to exercise both sides of the trust loop.

### 4. Create an admin (for the Verifications / Users views)
Admins aren't self-registerable. Register a normal account, then promote it:
```bash
psql tapa_trust -c "UPDATE users SET role='admin' WHERE email='you@example.com';"
```
Log out and back in; `/admin` is now available.

### 5. Environment variables

**Client** (`tapa-trust-client/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | yes | API base URL **including** the trailing `/api` (e.g. `http://localhost:4000/api`). |

**Server** (`tapa-trust-server/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `JWT_SECRET` | yes | Long random string used to sign JWTs. |
| `PORT` | no | API port (default `4000`). |
| `CLIENT_ORIGIN` | prod | Allowed browser origin for CORS (the deployed client URL). |
| `DATABASE_SSL` | no | Force SSL on/off; auto-detected (off local, on managed). |

---

## Build

```bash
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

---

## Deployment plan & execution

The project deploys as three managed pieces: a Postgres database and the Express API on **Render**,
and this client on **Vercel**.

### A. Database + API — Render
1. Create a **PostgreSQL** instance on Render; copy its connection string.
2. Create a **Web Service** from `tapa-trust-server`.
   - Build: **`npm install && npm run face:models`** — the second step fetches the face-recognition
     model weights (~12 MB) that server-side verification needs. With only `npm install`, the app
     runs but the online face match fails on first use (weights are gitignored, so the build fetches
     them).
   - Start: `npm start`.
3. Set env vars: `DATABASE_URL` (the Render DB), `JWT_SECRET`, `CLIENT_ORIGIN` (the Vercel URL).
4. **One-time DB + account setup** against the managed DB (run locally with `DATABASE_URL` pointed at
   Render):
   ```bash
   npm run migrate        # first deploy only — creates the schema
   npm run seed           # skill categories
   npm run seed:admin     # admin login (admins can't self-register)
   npm run seed:demo      # optional: demo requester + a bookable, verified worker
   ```
   For later feature migrations on a live DB, use `npm run alter <file>` (non-destructive), e.g.
   `npm run alter alter-add-booking-chat.sql`.
5. **Verify:** `GET https://tapa-trust-server.onrender.com/api/health` → `{ "status": "ok" }`.

### B. Client — Vercel
1. Import `tapa-trust-client` into Vercel. Framework preset: **Vite** (Build `npm run build`,
   Output `dist`).
2. Set env var `VITE_API_URL = https://tapa-trust-server.onrender.com/api`.
3. Deploy, then copy the URL into the **Links** table above and into the server's `CLIENT_ORIGIN`.
4. **Verify:** open the deployed URL, confirm the browse page loads real workers and that
   login/booking/chat work end-to-end against the live API.

> ✅ **Deployed & verified.** Client live at **https://tapa-trust-client.vercel.app**, talking to the
> live API at `https://tapa-trust-server.onrender.com/api`. CORS on the server is locked to the
> Vercel origin. All client↔API contract checks pass in production.

---

## Testing strategies

The product is validated with **manual end-to-end scenarios**, **automated tests** (API + client),
**varied data values / edge cases**, **load/performance testing**, and **cross-environment** checks
on real devices. Screenshots/recordings of each go in the Canvas submission.

### 1. End-to-end functional flows (manual)
Run these with a **requester** and a **worker** side-by-side (two windows), plus an **admin**:

1. **Verification loop** — worker submits ID verification → admin sees it under **Pending** →
   **Approve** (worker now appears in public Browse) **or Request redo / Reject** with a note
   (worker returns to unverified, sees the note, resubmits).
2. **Browse-and-book** — requester browses, opens a verified worker, books.
3. **Chat & price negotiation** — requester opens the chat drawer, proposes a price; worker
   **counters**; requester **accepts** → agreed price pins to the booking. Verify the worker gets a
   notification that **opens the chat**.
4. **Trust loop** — worker checks in → requester confirms start → worker checks out (duration is
   shown) → requester confirms completion → payment status advances to `released`.
5. **Review & rebook** — requester leaves a rating/review; rebooks the worker in one tap.

### 2. Automated tests
Two layers, run independently:

**API integration (server) — Jest + supertest, `115 tests across 12 suites`.** True integration
tests: `supertest` drives the real Express app → controllers → a **real PostgreSQL** database (not
mocks). Covers auth, RBAC, the full
booking lifecycle, and every trust feature: price-before-accept, dispute freeze/mediation/ruling,
verification, the **verified-only gate** (an unverified worker is hidden from browse and returns
`403` on booking), match-then-discard verification (identity images never persisted), safety
check-in, 24h auto-release, and earnings. Runs against an isolated test DB, auto-created + migrated:
```bash
cd tapa-trust-server
npm test                 # spins up tapa_trust_test, applies schema + startup migrations, runs all suites
```

**Client — Vitest + Testing Library, `27 tests`.** Unit tests for the custom logic (face-match
distance→score calibration, pending-booking session flow, currency/duration formatting) and
component tests for the access guards (`ProtectedRoute`/`RoleGate` redirect by auth + role), the
status/tier/verify badges, and the first-run welcome screen:
```bash
cd tapa-trust-client
npm test                 # vitest run (jsdom)
```

### 3. Different data values & edge cases
- **Auth:** weak vs strong passwords (registration is blocked until strong); duplicate email;
  wrong password.
- **Booking order:** attempts to check out before check-in, or confirm completion before checkout,
  are rejected by the API with clear errors.
- **Price:** non-numeric / zero / negative offers are rejected; large amounts format correctly.
- **Empty states:** browse with no verified workers, a worker with no bookings, no notifications.
- **Authorization:** a user cannot read or act on a booking they aren't part of (403).

### 4. Cross-environment (hardware / software) & performance
**Responsive on real devices.** The app is phone-first: on narrow screens the dashboard sidebar
collapses into an off-canvas drawer, and the hero, grids, and tables reflow. Verified by loading the
live site on real hardware and walking through landing → Browse → login → dashboard → booking
stepper (screenshots in the Canvas submission):

| Device | OS | Browser | Viewport | Result |
| --- | --- | --- | --- | --- |
| _e.g. iPhone 13_ | _iOS 17_ | _Safari_ | _390×844_ | _✅ drawer nav, no h-scroll_ |
| _e.g. Samsung A14_ | _Android 14_ | _Chrome_ | _360×800_ | _✅_ |
| _Laptop_ | _macOS_ | _Chrome / Firefox_ | _1440_ | _✅_ |

**Frontend (from the production build).** Route-level code-splitting means the first paint
downloads only what it needs, then remaining chunks prefetch on idle; fonts preconnect and images
lazy-load. Real `vite build` output: main bundle ≈ **94 KB gzipped**, per-route chunks ≈ 0.4–7 KB
gzipped.

**API load test.** The server ships a reproducible load test (`npm run perf`, autocannon) that hits
a static route and a real DB-backed query under concurrency. Measured on the local stack (20
concurrent connections, 10 s each, **0 errors**):

| Endpoint | Requests/sec (avg) | Latency avg | p99 | max |
| --- | --- | --- | --- | --- |
| `GET /api/health` (no DB) | **≈ 21,900** | 0.15 ms | 1 ms | 22 ms |
| `GET /api/public/workers` (DB query) | **≈ 12,400** | 1.08 ms | 2 ms | 78 ms |

Point it at any environment: `TARGET=https://tapa-trust-server.onrender.com npm run perf`. On the
deployed **Render free tier**, the first request after idle cold-starts in ~30 s; once warm, API
responses are sub-second.

**Stress test.** `npm run stress` ramps concurrency past normal to find where it degrades (the DB
endpoint, local stack, 8 s per level). It **degrades gracefully — no errors even at 1,000
concurrent connections**:

| Connections | Requests/sec | Latency avg | p99 | Errors |
| --- | --- | --- | --- | --- |
| 50 | ≈ 12,500 | 3.4 ms | 6 ms | 0 |
| 200 | ≈ 12,100 | 16 ms | 19 ms | 0 |
| 500 | ≈ 10,900 | 45 ms | 52 ms | 0 |
| 1,000 | ≈ 10,400 | 95 ms | 174 ms | 0 |

### 5-minute demo script (core functionality first)
> Avoid dwelling on sign-up/sign-in; lead with the trust loop.
1. **(0:00) Verification** — worker picks **Online**: upload ID → ID face-check → **face scan** →
   biometric match must exceed **65%** (matched server-side; ID + selfie are kept for the **admin to
   review**, never shown publicly). Mention the **In-person** path for no-device workers. Then show
   the **admin** approving from the ID + selfie, which flips the worker to **Admin-Certified**.
2. **(1:00) Book + agree price** — requester books; in chat, show **accept is blocked until a price
   is agreed**; agree it → worker **accepts**.
3. **(1:45) Sign + pay + escrow** — both **draw signatures**; requester **pays** → **"held in
   escrow"** banner on both sides.
4. **(2:30) Track work** — check-in → confirm-start → check-out → confirm-completion → **"released"**
   banner; show **Earnings** + the **PDF income summary**.
5. **(3:15) Dispute (different data values)** — raise an issue (a category) → **payment frozen** →
   admin schedules **mediation** (in-app / Google Meet / physical), **proposes a different method**,
   then **rules** → released/refunded.
6. **(4:00) Testing + performance** — run **`npm test`**: **107 passing** on the server + **23 on
   the client** (automated + edge/negative + security); then show the app on your **real phone** and
   desktop, **light/dark**, on the **live Vercel/Render** deployment.
7. **(4:40) Analysis / discussion / recommendations** — narrate objectives met vs deferred, why the
   milestones matter, and future work (see the video-narration notes provided with this submission).

---

## Repository structure

```
src/
  api/            API client (fetch wrapper) + hooks (useAsync, booking alerts)
  context/        AuthContext, ChatContext (app-level chat drawer), Toast
  components/     Shared UI (Avatar, badges, DashShell, NotificationsBell, BookingChat, …)
  pages/
    public/       Landing, Browse workers, public worker profile
    auth/         Login, Register (split-screen AuthLayout)
    requester/    Requester dashboard (bookings, saved, profile)
    worker/       Worker dashboard (profile, bookings, earnings)
    admin/        Admin dashboard (verifications, users, categories)
  routes.jsx      Route table + role gating
  styles.css      Tailwind v4 + AlignUI tokens + component styles
```

## License

Academic project — TaPa Trust capstone.
