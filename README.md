# TaPa Trust - Client (Web)

React web client for TaPa Trust, a trust-centered platform for finding, verifying, and rebooking
informal skilled workers in Kigali. It provides role-based interfaces for requesters and workers
(and a minimal admin view), talking to the TaPa Trust API over HTTPS.

Built with React and Vite. Responsive and phone-first.

## Related repository

- API server (Node/Express + PostgreSQL): **https://github.com/AngeNicole/tapa-trust-server**

## Live app

- Deployed URL: **[REPLACE WITH DEPLOYED CLIENT URL]** (e.g. `https://tapa-trust.vercel.app`)

> Placeholder above. Paste the live Vercel URL once deployed.

## Tech stack

- React 18 + Vite
- React Router
- Talks to the API via `fetch`, JWT sent as a Bearer header

## Prerequisites

- Node.js 18+ and npm
- The TaPa Trust API running and reachable (locally or deployed)

## Environment setup

The client reads the backend URL from an environment variable, so the same build works locally and
when deployed. Copy the example file and set the value:

```bash
cp .env.example .env
```

| Variable       | Required | Description                                                             |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `VITE_API_URL` | yes      | Base URL of the backend API, including the trailing `/api` path.        |

Examples:

```
# local
VITE_API_URL=http://localhost:4000/api

# deployed
VITE_API_URL=https://your-server.onrender.com/api
```

Only variables prefixed with `VITE_` are exposed to the client. There is no hardcoded localhost in
the source; the value always comes from `VITE_API_URL`.

## Run locally

```bash
npm install
cp .env.example .env        # then set VITE_API_URL (default points at localhost:4000/api)
npm run dev
```

The app runs at `http://localhost:5173`. The landing page calls the API health endpoint and shows
"Backend connected" when the server responds. Make sure the API server is running first.

## Build

```bash
npm run build      # output in dist/
npm run preview    # serve the production build locally
```

## Deployment (Vercel)

This client is intended to deploy on Vercel as a static Vite build.

High-level steps (full click-by-click guidance is provided separately during setup):

1. Import this repository into Vercel.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Set the environment variable `VITE_API_URL` to the deployed API base URL
   (e.g. `https://your-server.onrender.com/api`).
4. Deploy, then copy the resulting URL.

- Deployed URL: **[REPLACE WITH DEPLOYED CLIENT URL]**

After the client is deployed, set `CLIENT_ORIGIN` on the server to this URL so CORS allows it.
