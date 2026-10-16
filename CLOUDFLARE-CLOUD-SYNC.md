# COILSIDE Cloudflare data contract (two-person pilot)

**The COILSIDE homepage stays public.** There is no mandatory email sign-in. Private messages and the owner's records require *different* high-entropy device-held tokens; the app shares Sean's token in a URL fragment and never a normal URL query.

## Minimal storage

- A **dedicated D1 database** bound as `COILSIDE_DB` stores room-token hashes, two-person notes, and the owner's structured backup.
- `wrangler.jsonc` intentionally contains NO invented database UUID. Provision the actual database first, then add its true ID and apply the `migrations/` files in order.
- Owner's browser still persists all hours/notes locally. Sean's room token has **no access to owner's hours**, photos or cloud backups.
- Equipment photo bytes stay in browser IndexedDB for now. R2 is optional and not a prerequisite for two-person notes. If added later, bind `COILSIDE_PHOTOS` and verify bytes before relying on it.
- Cloud backup uses conditional updates: if an older device attempts to overwrite a newer cloud version, the server returns **409**, and the owner must reconcile/backup instead. Do not silently overwrite local data on first link.
- Existing `Settings → EXPORT BACKUP (JSON)` is the independent recovery path. Export from the owner's phone before any migration or cache clearing.

## Phone steps once storage is deployed

1. Owner opens TEAM NOTES, taps **Start Team Notes** (generates two strong random tokens, creates a private D1 room).
2. Owner taps **Share invitation with Sean** and sends the private link.
3. Sean opens the invitation. It pairs his browser automatically (no signup). Each can send notes and press Refresh; open screen checks every 30 seconds.
4. Owner taps **Copy my recovery link** and stores it securely. Anyone possessing that link has owner access.
5. Owner verifies backed-up work hours and images before ever clearing local browser storage.

## Boundaries and operational caveats

- An invite link is a **persistent private access key**, not a literally single-use link. Treat it like a password; it is not printed in GitHub.
- Team messages are received **when the app is opened/active**; no background push notification is promised.
- Public creation is lightly rate-limited to five workspaces per Cloudflare IP address per UTC day; this is a pilot mitigation, **not** broad public abuse defense. For public distribution add provider WAF/rate limits or a private setup gate.
- Secure data APIs fail closed if D1 is missing, if the room/token is invalid, or if Sean attempts owner-only endpoints.
- The earlier documentation about sharing the same `x-coilside-profile` code without auth is obsolete. That code is **not** a team collaboration credential.
- Cloudflare D1 provisioning and Worker deployment are **not implied by a GitHub merge**. Confirm live Worker binding, deployed source and two-device Android path before declaring the upgrade live.
