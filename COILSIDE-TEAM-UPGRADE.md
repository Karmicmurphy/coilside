# COILSIDE — two-person field app upgrade

**Evidence:** Code candidate, not proof of live Android use. This repo is public and contains no private messages, phone records or keys.

## Locked owner outcome

- Public COILSIDE app, **no email signup, no sign-in screen**.
- Only Randy and Sean use two-person shared notes.
- Tim Johnson / Sean's Farmhouse / Jesse Johnson are **separate work/pay timesheets**, not three app users.
- Personal Sean Factor archive remains separate.
- Android phone, touch controls, offline local records and minimal steps are the governing use environment.

## Delivered in this candidate

1. Three separate Tim / Farmhouse / Jesse manual and voice-entry timesheets, Sunday–Saturday totals, and shareable PNGs.
2. Fixed duplicated voice controls, fixed edited start/end hour calculation, and added a regression suite.
3. **Team Notes**: one owner tap to create a cloud-backed room; one Sean invitation via a fragment-only private link; private device tokens persist in localStorage; no email or login page. Sean's token can read/write the room's notes but cannot read or change owner's timesheets. A read timestamp records receipt while the screen is open. Polls every 30 seconds and on focus, not background push notifications.
4. SHA-256 token digests and room-separated notes live in Cloudflare D1; only the two tokens can access that room. The invite token is stored on the owner's phone for re-sharing. The recovery link grants full owner access: keep it private.
5. Optional owner's D1 time-record backup now requires **owner token**, not old casual sync code. It uses optimistic compare-and-set timestamps to reject another-device overwrites (409). The app refuses to import an existing cloud snapshot over unsynced local records without an explicit backup/reconciliation.
6. Existing Android local storage remains authoritative until a successful remote upload. Photo bytes remain in IndexedDB; R2 cloud photo replication is intentionally deferred. The old Settings → Export Backup (JSON) remains the independent recovery method.
7. Existing Cloudflare Access **Everyone / Bypass** policy can remain on the Worker. The public UI is intentionally separate from token-guarded APIs.

## Provision/deploy gate

**As of October 15, 2026 the connected Cloudflare API returned error 10000 when asked to create a new D1 database/R2 bucket. No D1 was confirmed provisioned.**

To activate, the owner needs a Cloudflare connection that can create/bind D1 to the existing `coilside` Worker or a local/cloud CI Wrangler credential with those permissions.

Minimal required deployment:

1. Create dedicated D1 `coilside-team-2026` (or an equivalent dedicated COILSIDE database), record its actual UUID.
2. Add D1 binding `COILSIDE_DB` to `wrangler.jsonc` using that UUID; **never add a fake UUID**.
3. Apply migrations `0001_coilside_cloud.sql`, `0002_team_notes.sql`, and `0003_team_rooms.sql` against that dedicated database (fresh schema only).
4. Export the owner's existing JSON backup first. Deploy fresh build from the reviewed `main` commit. Do not clear the app's local data, uninstall PWA, or change URL.
5. On owner's Android: start Team Notes (the first successful D1 creation), share Sean invite, send a note. Open invite on Sean's phone, reply, verify both read it. Confirm owner hours cannot be accessed with Sean token.
6. On owner's phone: save Tim/Farmhouse/Jesse hours, correct an entry, reload, check weekly totals/PNG and backup recovery; verify D1 sync and 409 conflict denial with another owner device; verify private endpoints return 401/403 when unpaired.
7. Only then record `PROVEN_LIVE`. Green CI or a successful homepage load is not sufficient.

### Cost/abuse tradeoff

Creating team rooms is available to any public visitor with an unpaired browser, so an attacker could attempt many empty rooms and consume D1 requests. Before widespread public distribution, apply Cloudflare rate limiting/WAF or add an owner-only setup gate. This is a **two-person limited pilot**, not public self-service hosting.

### Authority / stop

- Incident: https://github.com/Karmicmurphy/Harness-card/issues/26
- FRIDAY read-only intake: https://github.com/Karmicmurphy/Ollie_Twis_Holo_workshop/issues/27
- COILSIDE candidate: https://github.com/Karmicmurphy/coilside/pull/5

This is a separate COILSIDE app, not Foundation's FRIDAY phone-job path. Don't touch machine authority pins or related production. Release remains **BLOCKED** at Cloudflare D1 provisioning and live Android proof until done.
