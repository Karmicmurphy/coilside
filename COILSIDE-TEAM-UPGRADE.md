# COILSIDE: Jesse Timesheets + Private Team Notes + Cloudflare Storage

Status: CANDIDATE — not deployed; production data and existing Worker unchanged.

## Owner experience

- **Work Hours** offers three independent payroll/job contexts: Tim Johnson Heating & Cooling, Sean's Farmhouse, and Jesse Johnson — Independent Projects.
- Each context has its own weekly view, edits, zero-hour days, voice entry, and shareable PNG. Historical Tim/Sean entries are preserved; the new employer key is `jesse`.
- **Team Notes** is a private, two-person in-app conversation between the owner and Sean. Each person can send a note; the other can read it by opening the app (and the open screen checks about every 30 seconds). Read status is saved. This is not push/SMS/email delivery. The existing **Sean Factor** personal archive remains separate.

## Privacy gate — absolutely required before live data bindings

The current deployed COILSIDE Worker has an **Everyone/Bypass** Access policy. Do not connect a database or photo bucket to that public deployment: the previous `/api/cloud` code accepted only a shareable profile code.

The candidate secures **all shared D1/R2 endpoints**, including existing `/api/cloud` and `/api/cloud/photos/*`, with cryptographic verification of the Cloudflare Access JWT from the `Cf-Access-Jwt-Assertion` header. Simply supplying an email, caller-owned HTTP header, or a copied profile code does not confer access. Access must actually protect this Worker and issue a valid signed JWT. The server checks the JWT signature against the Access issuer's public keys, issuer, audience, expiry, and email allowlist.

Current Access bypass MUST be replaced by a **Worker-only Allow** policy for exactly the owner and Sean, **after** both addresses are confirmed. The owner retains the right to approve the access change; other Workers stay untouched. Cloudflare Access must be verified in the real phone browser before activating D1/R2.

Cloudflare Worker environment variables to configure (no secrets/email values in GitHub):

| Binding | Meaning |
|---|---|
| `COILSIDE_ACCESS_ISSUER` | HTTPS Access team issuer, e.g. `https://your-team.cloudflareaccess.com` |
| `COILSIDE_ACCESS_AUD` | Exact JWT audience of the COILSIDE Access application |
| `COILSIDE_OWNER_EMAIL` | Owner's sign-in email |
| `COILSIDE_SEAN_EMAIL` | Sean's confirmed sign-in email |
| `COILSIDE_DB` | Dedicated Cloudflare D1 database for owner's state + shared notes |
| `COILSIDE_PHOTOS` | Dedicated Cloudflare R2 bucket for owner's field photos |

Missing Access config returns 503 and leaves local data intact. Missing/invalid JWT returns 401; other emails return 403. Without D1, the team screen stays in a clearly blocked state.

## Database/storage provisioning

1. Create a new dedicated D1 database and R2 bucket (do NOT reuse another project's resources). The suggested names are `coilside-team-2026` and `coilside-field-photos-2026`.
2. Copy the real D1 database UUID into `wrangler.jsonc` for `COILSIDE_DB`; add `COILSIDE_PHOTOS` R2 binding. Never commit fabricated IDs.
3. Apply migrations `0001_coilside_cloud.sql` and `0002_team_notes.sql` to **that database only**. The API also has safe `CREATE TABLE IF NOT EXISTS` guards.
4. Configure the identity bindings and the **specific** COILSIDE Access application, preserving protections on the All Workers application.
5. Back up existing Android records with **Settings → Export Backup (JSON)** before touching browser storage.
6. Build/test and deploy only after owner approval and authentication checks. On the owner's existing phone, sign in and let the first authenticated cloud sync upload its local data. Validate records and photos before linking another device.
7. Prove the owner can write/receive a team note, Sean can reply on a separate signed-in device, neither identity can read other users' state, and untrusted requests are denied. Confirm Jesse's hours remain separate and existing Tim/Sean hours are unchanged.

**Do not enable database bindings first while the current public bypass is active.** Do not silently merge or deploy this candidate.

## Current connection limitation

During candidate work on 2026-10-15, the connected Cloudflare tool successfully listed existing databases and buckets but **POST create D1/R2 was rejected with authentication error 10000**. Neither resource was confirmed created. Zero Trust/Access API writes were previously denied separately. Cloudflare account setup must be completed with a credential that has those specific write privileges or through the dashboard before live activation.

## Other known repair

Repository CI type-check had been failing on `PrismaClient` import due to the legacy Prisma client not being generated. CI now generates Prisma before type-check. This does not migrate or rewrite any existing database. Confirm the updated CI workflow passes before considering deployment.

## Why sync requires separate owner sign-in

The old per-install sync code is retained for syncing **one owner's own devices**, never used as a Sean identity or permission. Team Notes uses two named/verified people and its own D1 table. Jesse is a separate work/pay entity; he is **not** automatically granted a login. Add a third login only if explicitly requested.
