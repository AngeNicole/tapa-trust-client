# Future work (design decisions, intentionally deferred)

These are specified and justified but deliberately **not** in the graded build.

## Biometric identity matching
A face-match step (selfie ↔ ID) is **future work**, not in the live flow.

Reasoning:
- **Biometric without a trusted reference doesn't prove identity.** Matching a
  self-supplied selfie against a self-supplied ID photo is circular — both come
  from the same person. It only becomes meaningful against a *trusted* reference
  (e.g. Rwanda's NIDA), which is out of scope.
- **Inclusion first.** The no-device / no-biometric worker must have a fully
  valid path, so **admin verification is primary** and **Peer-Verified** (earned
  from completed, well-reviewed jobs) is the automatic Tier-2 — biometrics are an
  optional extra, **never a gate**.
- If demonstrated in future, it should run on **AI-synthetic faces + a
  TaPa-branded demo card**, framed as a *capability demonstration on
  privacy-preserving synthetic data* (cf. SFace / synthetic-data-for-FR
  literature), never on real people's IDs.

## Real identity verification (NIDA / Smile ID)
The optional top tier: match against Rwanda's national ID via NIDA or a provider
like Smile ID. Deferred — needs a provider account/keys and a trusted reference.

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
