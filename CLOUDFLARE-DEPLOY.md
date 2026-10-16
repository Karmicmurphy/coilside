# COILSIDE — Cloudflare Worker release

The production app runs at `https://coilside.ollie-twis.workers.dev/`.

**The currently deployed Worker is not necessarily the latest GitHub `main`.** GitHub Actions verifies source/build but does not deploy to Cloudflare. Never equate merge or passing CI with a live release.

## Design

- Next.js via OpenNext on existing Cloudflare Worker `coilside`.
- Public app shell (current Cloudflare Access **Bypass → Everyone** for the COILSIDE app only). Do not change the shared account-wide All Workers policy.
- Hours, field notes and equipment photos continue saving locally (localStorage + IndexedDB).
- A **dedicated Cloudflare D1 database**, binding `COILSIDE_DB`, enables paired private team notes and optional protected owner-record sync. Sean's invitation never grants timesheet access.
- No email signup or Cloudflare Access login flow is required for this two-person phase.
- R2 photo cloud backup is deferred; phone/JSON backup remains essential.
- CI checks unit regression tests, type-check, lint and Workers build. Passing source tests does NOT prove Android runtime or data saving.

## Provider preparation (write access required)

1. Create a dedicated D1 database named `coilside-team-2026`; copy its real UUID.
2. Add to `wrangler.jsonc` only after real provision:
   ```jsonc
   "d1_databases": [{
     "binding": "COILSIDE_DB",
     "database_name": "coilside-team-2026",
     "database_id": "<actual UUID from the Cloudflare account>",
     "migrations_dir": "migrations"
   }]
   ```
3. Apply migrations to this database only, in order:
   ```sh
   bunx wrangler d1 migrations apply coilside-team-2026 --remote
   ```
4. Confirm `COILSIDE_DB` appears as an actual runtime binding on the COILSIDE Worker after deployment. Avoid deploying a D1-dependent version without the database: team notes should report unavailable rather than erase anything.

The connected Cloudflare integration returned **error 10000 (Authentication error)** for D1 creation on October 15, 2026. This must be resolved via provider write permissions; do not reuse unrelated databases or invent UUIDs.

## Source + deployment

```sh
bun install --frozen-lockfile
bunx prisma generate
bunx next typegen
bun test tests/work-hours.test.ts tests/team-pair.test.ts
bunx tsc --noEmit
bun run lint
bun run cf:build
bun run cf:deploy
```

These commands require a prepared environment with Cloudflare Wrangler permission to deploy the existing Worker, and an actual D1 binding in `wrangler.jsonc`. Never put credentials in the repo.

## Release proof (Android)

1. **Before upgrading**, owner opens existing app → Settings → **EXPORT BACKUP (JSON)**. Confirm the downloaded file exists before deleting browser data (ideally never delete it).
2. Deploy source, verify public URL returns app and home has **START WORK**, **TEAM NOTES**, field tools.
3. Create and correct work entries for Tim, Farmhouse and Jesse, confirm accurate three separate Sunday–Saturday timesheets and shareable PNG.
4. Owner opens TEAM NOTES, starts a private room, shares Sean invitation. Sean opens it on a separate phone, reads and replies; owner sees it on refresh. Verify nobody with just the public URL can read that room.
5. Confirm the owner-only cloud API refuses Sean's token, accepts owner's token, and concurrent stale writes return 409 without overwriting.
6. Reload app/offline, confirm local hours remain and both directions of notes persist. Check cloud D1 state exists, but never copy private records into GitHub.
7. Only then record **PROVEN_LIVE** in COILSIDE/Harness issue; preserve Worker deployment ID, exact commit and test receipt.

## App installed on Android

Chrome → open URL → menu → Add to Home screen. Browser/PWA cache may delay visible updates, but **do not clear storage blindly**—it contains income-critical records and pairing keys. Use the source-version and Worker deployment checks before suggesting cache resets.

Further current scope/constraints: `COILSIDE-TEAM-UPGRADE.md` and `CLOUDFLARE-CLOUD-SYNC.md`.
