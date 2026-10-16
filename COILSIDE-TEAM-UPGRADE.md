# COILSIDE — two-person field app upgrade: current authority

**Evidence state:** CANDIDATE / PROVEN_IN_TEST for repository checks when green; NOT DEPLOYED and NOT PROVEN_LIVE. Owner correction received 2026-10-15. This is a public GitHub repo: no secrets or raw private notes here.

## Locked owner outcome — do not reinterpret

- **One owner + one collaborator** use the app: Randy and Sean.
- The **application homepage remains public** for this stage. There is **no Cloudflare Access sign-in or email identity enrollment** now.
- **Tim Johnson** is an hours/pay category only, **Sean's Farmhouse** is another, and **Jesse Johnson — Independent Projects** is a third, independent hours/pay category. Neither Tim nor Jesse is being invited as a separate app user.
- Owner and Sean can leave and receive notes on separate phones with recognizable delivery, without requiring a normal sign-in flow. The legacy personal Sean Factor archive is **not** their shared inbox.
- Primary use is **Android, touch, short attention/tap budget, intermittent connectivity**. Simple visible UI outranks new infrastructure.
- Saved hours are income-critical. Existing browser localStorage and IndexedDB data must remain recoverable; backup before migration.

## Audit findings: keep, change, cut, defer

| Decision | Mechanism | Reason |
|---|---|---|
| **KEEP** | Existing Next.js/OpenNext Worker, local-first timesheets, Sunday–Saturday views, voice entry, downloadable JSON backup | Already deployed; owner's real use case |
| **KEEP** | Three independent work categories and PNG timesheet share | No new user accounts required |
| **KEEP** | Existing D1 route surface and proposed dedicated shared-notes table as reusable foundations | Minimal durable backend candidate |
| **FIX** | Updated timesheet editing total from patched start/end values + regression tests | An edited punch must not show old hours |
| **FIX** | Remove duplicated voice entry on Work Hours | Already fixed on candidate |
| **REVISE** | Candidate `src/lib/team-auth.ts` and email/JWT gating in `/api/team/notes`, `/api/cloud`, `/api/cloud/photos` | **Wrong user requirement**. This candidate currently **cannot be deployed while leaving the Worker public**. Needs replacement before merge |
| **TEST** | A one-time two-device pairing/invite code, no email signup, separate per-person device role keys stored on devices, least-privilege server access | Candidate only. An entirely unguarded public notes API would let strangers read/write/impersonate. Owner has not approved a particular pairing implementation |
| **TEST** | Full-state cloud sync and offline reload with two devices | Current state sync is last-write-wins oriented; test backup/merge behavior before enabling |
| **DEFER** | Formal email logins, teams/users administration, push notifications, role hierarchy | Not requested; increases friction |
| **DEFER** | Cloudflare R2 photo syncing | Only add when cross-device photos become a present user need. Dedicated D1 is higher priority |
| **CUT** | More frameworks, Workers, extra business entities as people, separate FRIDAY/Foundry involvement | Not part of the job |

## Release block and known evidence

1. **Current deployed COILSIDE is public and homepage reachable.** The Cloudflare Worker is not deployed from this branch.
2. Existing production Worker currently exposes only `ASSETS`; **no COILSIDE D1/R2** binding. Attempt to create fresh D1/R2 using connected Cloudflare tooling returned **authentication error 10000**. No new resource confirmed created.
3. GitHub PR: https://github.com/Karmicmurphy/coilside/pull/5 (DRAFT). The initial branch CI passed TS, lint and Cloudflare build. Work-edit tests added later; verify the latest run before calling new patches test-proven.
4. **Hard STOP:** The current branch's Cloudflare Access JWT sign-in implementation **conflicts with locked owner requirements**. Do not merge, deploy, attach D1 or replace the public Worker policy until the no-email two-device design and its data boundary are agreed, implemented and checked.
5. **Backup FIRST:** Existing phone app → Settings → Export Backup (JSON); do not clear app data or switch sync profiles without verifying restoration.
6. **Phone proof:** owner saves and corrects Tim/Sean/Jesse hours, checks accurate totals and PNG share, goes offline/reloads, restores hours; Sean receives a note on his Android and replies to the correct conversation, stranger without the invite cannot impersonate/read the channel. No assertion of full success until that path passes.

## External machine/harness issue handoff (not runtime activation)

- Canonical generalized incident: https://github.com/Karmicmurphy/Harness-card/issues/26
- FRIDAY/Workshop read-only intake pointer: https://github.com/Karmicmurphy/Ollie_Twis_Holo_workshop/issues/27

COILSIDE is a separate app. Issues and PRs are durable evidence; they do not cause the FRIDAY runtime to load them automatically, authorize production, or unblock Cloudflare provider permissions.

**Next bounded engineering decision:** Define the **lowest-friction two-device notes boundary** that works on a public Worker without formal sign-in; then revise only the candidate notes/auth cloud endpoints and verify on two phones. Avoid full app redesign.
