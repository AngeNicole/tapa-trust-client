# TaPa Trust - Client (Frontend) Context

> Frontend-focused view of the project brief, distilled from the research proposal.
> The full proposal in `docs/research-proposal.pdf` is the source of truth.
> The backend-focused counterpart lives in the server repo:
> https://github.com/AngeNicole/tapa-trust-server
>
> Do not expand scope beyond what is defined here.

## 1. What we're building
TaPa Trust: a trust-centered worker profile and rebooking platform for informal
skilled services in Kigali (plumbing, cleaning, moving/lifting, electrical,
furniture assembly, mounting/installation, basic tech setup).

It is a two-sided platform:
- **Requesters** (demand side) evaluate whether a worker is skilled, available,
  and trustworthy before hiring.
- **Skilled workers** (supply side) make skills, reliability, work history, and
  earnings visible so they can be found and re-hired.

## 2. The core idea (do not lose this)
The contribution is the **closed trust-accountability loop** where each step
validates the next:

  verified identity -> recorded time -> mutual completion -> payment status -> rebook

Every screen exists to serve that loop. The UI must make each step short, obvious,
and confirmable. Build the loop end-to-end before anything else.

## 3. Stack (frontend)
Fixed by the proposal:
- **React.js** (web, responsive, low-bandwidth / phone-first)
- Talks to the backend REST API over HTTPS (JSON)
- Backend base URL comes from **VITE_API_URL** (never hardcode localhost), so the
  same build works locally and deployed
- Deploy frontend on **Vercel**
- Payments and identity verification are **SIMULATED** by the backend (the UI just
  shows status). Do NOT build MoMo/eKash/NIDA/Smile ID flows - future work.

## 4. Roles (role-based portals)
- **Requester** - posts tasks, evaluates/selects workers, confirms start,
  confirms completion, reviews, saves/rebooks workers.
- **Worker** - creates profile, lists skills, accepts tasks, records check-in/out,
  views earnings.
- **Admin** - oversight only (minimal UI): list users, manage skill categories.
  Admin never posts, accepts, or pays for tasks.

After login, a requester lands on the requester area and a worker on the worker
area; each role is gated to its own portal.

## 5. MVP scope - build exactly this (Tier 1)
1. **Auth + role-based profiles** - register/login as requester OR worker; role
   gating in the UI.
2. **Worker profiles** - skills, bio, rating, task history visible to requesters.
3. **Task posting + worker selection** - requester posts a task in a skill
   category; browses/evaluates workers; selects one; worker accepts.
4. **Mutual check-in / check-out** - single, clearly-labelled buttons for each
   step with immediate confirmation. Both sides confirm. This is the project's
   sharpest original mechanism; do not simplify it away.
5. **Simulated payment status + rebooking** - show payment status (pending ->
   confirmed -> released); save a worker and rebook in one tap.

## 6. Scope boundary - do NOT build these for the MVP (Tier 2/3 / future work)
Verification-tier badges (Unverified/Peer-Verified/Admin-Certified), dispute
reporting + admin review UI, worker earnings dashboard/charts, safety check-in
(notify-a-contact), real payment/identity integrations, escrow, insurance,
multilingual UI beyond simple labels.
If time remains, add them in the order listed, but never block submission on them.

## 7. Screens (Requester / Worker portals + minimal Admin)
Requester: signup/login -> browse & evaluate workers -> post task -> select worker
-> confirm start -> confirm completion -> review -> saved workers / rebook.
Worker: signup/login -> build profile + skills -> see assigned tasks -> accept
-> check-in -> check-out -> view simple earnings/history.
Admin (minimal): list users, manage skill categories.

## 8. API surface to consume (Tier 1)
The client calls these backend endpoints (base = VITE_API_URL):
- POST /auth/register, POST /auth/login, GET /auth/me
- GET /workers, GET /workers/:id
- POST /tasks, GET /tasks, GET /tasks/:id
- POST /bookings (select worker), POST /bookings/:id/accept
- POST /bookings/:id/checkin, /confirm-start, /checkout, /confirm-completion
- GET /bookings/:id/payment-status
- POST /reviews
- POST /saved-workers, GET /saved-workers, POST /bookings/rebook/:workerId

## 9. Demo-critical happy path (the video must show this loop working on screen)
Register worker -> build profile -> register requester -> post task -> select worker
-> worker accepts -> worker check-in -> requester confirm start -> worker check-out
-> requester confirm completion -> payment status flips to released -> requester
reviews -> requester rebooks the same worker in one tap.

## 10. UX principles (from proposal)
Short obvious flows; single clearly-labelled buttons for check-in/out and
completion with immediate confirmation; plain language (English, simple labels,
Kinyarwanda-friendly); recoverable errors; empty-state guidance for first use.
Seed realistic demo data so the app never looks empty.

## What lives in the server repo
The data model, REST endpoints, auth/RBAC, and the simulated payment/trust logic
are the server's concern. See https://github.com/AngeNicole/tapa-trust-server.
