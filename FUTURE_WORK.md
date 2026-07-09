# Future work (design decisions, intentionally deferred)

These are specified and justified but deliberately **not** in the graded build.

## Verification: two paths, one status (built)
At verification the worker **chooses their path**, and both reach the same
`verified` status / tier:
- **In person** — an admin/office/agent confirms them; no device, no upload, no
  biometrics. The inclusive path for the no-smartphone worker.
- **Online** — the worker's ID + live selfie are compared **in their browser**
  (match-then-discard): the images are **never uploaded or stored**, only the
  match verdict (a score) is saved. Self-service from a phone.

The biometric compare is **built and offered on the online path**, but it is
**never an auto-gate** — the admin confirms either way, the images are
discarded after matching, and the in-person path needs no biometric at all.

## Real identity verification (NIDA / Smile ID) — future work
The online compare is currently selfie↔self-supplied-ID (the admin is the trusted
confirmer). Matching against a **trusted external reference** — Rwanda's **NIDA**
or a provider like **Smile ID** — is the optional top tier and is deferred: it
needs a provider account/keys and a government identity reference. For a synthetic
demonstration, run the compare on **AI-synthetic faces + a TaPa-branded demo
card** (cf. SFace / synthetic-data-for-FR literature), never real people's IDs.

## Real payments (MTN MoMo / Airtel / eKash)
- **MoMo sandbox** collection on deposit is built and gated (see server
  `MOMO_SETUP.md`) — activates with a sandbox key; no real money.
- **Real production** MoMo/Airtel/eKash (real funds, RWF, disbursement payouts to
  the worker, KYC/compliance) is future work. Escrow freeze-on-dispute and
  release-on-completion are already demonstrable on the simulated status.

## Safety alerts to a trusted contact
The in-app safety check-in alerts the platform operator (admin) when a worker is
overdue — data-minimizing, no location broadcast, no public link. Notifying an
external trusted contact would need an SMS/WhatsApp provider (Africa's Talking /
Twilio) and is deferred.
