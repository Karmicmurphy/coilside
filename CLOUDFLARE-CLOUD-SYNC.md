# COILSIDE Cloud Sync

COILSIDE now supports optional Cloudflare-backed sync while keeping the browser copy as an offline cache.

## Architecture

- **D1 (`COILSIDE_DB`)** stores the structured COILSIDE state as JSON per sync profile.
- **R2 (`COILSIDE_PHOTOS`)** stores field-photo bytes by sync profile and photo id.
- **localStorage + IndexedDB** remain the offline cache so the app still works with no signal.
- A per-install **sync code** is generated in the app. Use the same code on another device to load the same cloud data.

## Create the Cloudflare resources

From a machine already authenticated to the same Cloudflare account:

```bash
npx wrangler d1 create coilside-db
npx wrangler r2 bucket create coilside-photos
```

The D1 command prints the database UUID. Keep it.

## Add the real bindings to `wrangler.jsonc`

Add the returned D1 UUID and the R2 bucket name to the existing config:

```jsonc
"d1_databases": [
  {
    "binding": "COILSIDE_DB",
    "database_name": "coilside-db",
    "database_id": "<REAL-D1-UUID>",
    "migrations_dir": "migrations"
  }
],
"r2_buckets": [
  {
    "binding": "COILSIDE_PHOTOS",
    "bucket_name": "coilside-photos"
  }
]
```

Do not invent or placeholder the D1 UUID in production. The app deliberately leaves these bindings out until the real resources exist so a normal deploy cannot be broken by fake IDs.

## Apply the D1 migration

```bash
npx wrangler d1 migrations apply coilside-db --remote
```

The API routes also use `CREATE TABLE IF NOT EXISTS` defensively, but the migration is the preferred source of truth.

## Verify before deploy

```bash
bun run verify
bun run cf:build
```

Then deploy through the existing Cloudflare/GitHub pipeline.

## App behavior

When bindings are missing, the app reports cloud sync as unavailable and continues using the browser copy. When bindings are present, it automatically syncs state after changes and uploads new field-photo blobs to R2. The cloud button in the lower-left corner shows status and lets you copy/link the sync code or force a sync.

The sync code is intentionally lightweight rather than full authentication. Treat it like a casual password; anyone who knows the code and can access the app endpoint could target that profile. If this app later needs real multi-user security, add Cloudflare Access or another authentication layer before treating it as private data storage.
