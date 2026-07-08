# Verification evidence — backend spec

The worker onboarding now uploads real identity evidence so an admin can confirm
identity by eye:

- **ID document** — a photo/PDF of a national ID, passport or licence.
- **Selfie** — a captured face photo.
- **Certificates** — one or more photos/PDFs of qualifications.

The client sends these as **data URLs** (base64 strings). Images are downscaled
client-side (max 1000px, JPEG q0.8) so payloads stay small (typically 50–300 KB
each). The client is already shipping these fields; the backend just needs to
**persist and return** them. Until it does, the admin review screen shows
"No selfie/ID on file" and everything else keeps working.

## 1. Accept on submit — `POST /workers/me/verification`

Body now includes (in addition to the legacy `document` name string + `faceScan`):

```jsonc
{
  "document": "id.jpg",              // legacy: filename only (keep ignoring)
  "faceScan": "captured",            // legacy flag (keep ignoring)
  "idDocument": "data:image/jpeg;base64,…",   // NEW — the uploaded ID
  "selfie": "data:image/jpeg;base64,…",       // NEW — captured face
  "certificationFiles": [                       // NEW — 0..n files
    { "name": "plumbing-cert.jpg", "type": "image/jpeg", "dataUrl": "data:image/jpeg;base64,…" }
  ]
}
```

Persist `idDocument`, `selfie`, `certificationFiles` on the worker's verification
record (or worker row). Suggested columns: `id_document TEXT`, `selfie TEXT`,
`certification_files JSONB` (or TEXT holding JSON). Set `verification = 'pending'`
as today.

> The client also still sends certificate **names** via `PUT /workers/me`
> (`certifications` = newline-joined names) so the public profile keeps showing a
> plain certificate list. No change needed there.

## 2. Return to admins — `GET /workers/:id` (the admin `getWorker`)

Add to the response:

```jsonc
{
  "idDocument": "data:image/jpeg;base64,…" | null,
  "selfie": "data:image/jpeg;base64,…" | null,
  "certificationFiles": [ { "name", "type", "dataUrl" } ]   // [] if none
}
```

The admin Verifications → Review modal renders the selfie and ID side by side for
comparison and shows each certificate as a clickable thumbnail.

## 3. Keep evidence private + gate visibility

- **Do NOT** return `idDocument`, `selfie`, or `certificationFiles` from public
  endpoints (`GET /public/workers`, `GET /public/workers/:id`) or the requester
  worker fetch. These are admin-only.
- **Only `verification = 'verified'` workers** should be returned by public browse
  and the requester "Find workers" list. The client already filters to verified,
  and the public profile page blocks unverified workers — enforcing it server-side
  closes the gap for direct API access.

## Notes

- All of this is simulated identity checking for the capstone demo — no real KYC
  provider. Storing base64 in Postgres TEXT/JSONB is fine at demo scale.
- If payload size ever matters, swap data URLs for object-storage URLs later; the
  client contract (three fields above) can stay the same.
