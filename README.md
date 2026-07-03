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
| 🎬 **Demo video (5 min)** | ⬜ _REPLACE WITH VIDEO LINK_ |
| 🌐 **Live app (client)** | ⬜ _REPLACE WITH DEPLOYED VERCEL URL_ (e.g. `https://tapa-trust.vercel.app`) |
| 🔌 **Live API** | `https://tapa-trust-server.onrender.com` · health: `GET /api/health` |
| 💻 **Client repo** | https://github.com/AngeNicole/tapa-trust-client |
| 🗄️ **Server repo** | https://github.com/AngeNicole/tapa-trust-server |

> The API is on Render's free tier, which sleeps after inactivity — the **first request after idle
> can take ~30s** to wake. Load the site, wait a moment, and it connects.

---

## Core functionality

Grouped by the actor who uses it. The **trust loop** (verify → book → negotiate → track → pay →
review) is the heart of the product and the focus of the demo.

### Public (no account needed)
- **Landing + Browse workers** — search by name/skill, filter by trade, sort by rating / jobs / name.
- **Public worker profiles** — photo, skills, education, certifications, rating, completed jobs.
- Only **admin-verified** workers are shown publicly; unverified profiles never surface.

### Requester
- **Browse-and-book** — book a worker directly from their profile (no task posting).
- **Chat & price agreement** — a right-side chat drawer to message the worker, **propose / counter /
  accept a price**, and (optionally) call. The agreed price is pinned to the booking.
- **Trust loop** — confirm the worker's check-in, confirm completion; watch payment status advance
  `pending → confirmed → released` (simulated).
- **Reviews & rebooking**, **saved workers**, and in-app **notifications**.

### Worker
- **Profile** — photo, category-based skills + custom skills, education, certifications.
- **Availability toggle** and **simulated ID verification** submission.
- **Bookings** — accept, check in, check out; **job duration** is computed and shown.
- **Earnings wallet** with charts and an invoice table.

### Admin (oversight only)
- **Verifications** — a table (Name / Availability / Status / ⋯) with **Approve / Request redo /
  Reject**; redo & reject open a note modal explaining what was missing (the worker can resubmit).
  Tabs: All / Pending / Approved / Rejected.
- **Users** — All / Requesters / Workers tabs. **Categories** management.

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
2. Create a **Web Service** from `tapa-trust-server`. Build: `npm install`. Start: `npm start`.
3. Set env vars: `DATABASE_URL` (the Render DB), `JWT_SECRET`, `CLIENT_ORIGIN` (the Vercel URL).
4. **One-time DB setup** against the managed DB (run locally with `DATABASE_URL` pointed at Render):
   ```bash
   npm run migrate        # first deploy only — creates the schema
   npm run seed           # skill categories
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

---

## Testing strategies

The product is validated with **manual end-to-end scenarios**, **automated API tests**, **varied
data values / edge cases**, and **cross-environment** checks. Screenshots/recordings of each go in
the Canvas submission.

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

### 2. Automated tests (API)
The server ships a Jest suite covering auth, RBAC, and the booking lifecycle:
```bash
cd tapa-trust-server
createdb tapa_trust_test
npm test                 # runs against tapa_trust_test with a throwaway secret
```

### 3. Different data values & edge cases
- **Auth:** weak vs strong passwords (registration is blocked until strong); duplicate email;
  wrong password.
- **Booking order:** attempts to check out before check-in, or confirm completion before checkout,
  are rejected by the API with clear errors.
- **Price:** non-numeric / zero / negative offers are rejected; large amounts format correctly.
- **Empty states:** browse with no verified workers, a worker with no bookings, no notifications.
- **Authorization:** a user cannot read or act on a booking they aren't part of (403).

### 4. Performance across hardware/software
- **Browsers:** Chrome, Firefox, Safari.
- **Devices:** desktop (1440px) and mobile viewport (≤390px) — the layout is phone-first and
  responsive (drawer, tables, and hero all reflow).
- **Network:** first-load against the sleeping Render free tier (~30s cold start) vs. warm
  (sub-second API responses); production build is code-split and gzipped.

### Suggested 5-minute demo script (core functionality first)
> The brief asks to **avoid dwelling on sign-up/sign-in** and focus on core features.
1. (0:00) One line on the problem + show the public **Browse** page and a worker profile.
2. (0:45) As a requester, **book** a worker and run the **chat price negotiation** (propose →
   counter → accept).
3. (2:00) Switch to the worker: receive the **notification → open chat**, then run **check-in →
   check-out** (show tracked duration).
4. (3:15) Back to requester: **confirm completion**, watch **payment status**, leave a **review**.
5. (4:00) As admin: **Verifications** table — approve / request redo / reject with a note.
6. (4:45) Show it on a **mobile viewport** to demonstrate responsiveness.

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
