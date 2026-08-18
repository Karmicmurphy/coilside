# COILSIDE — Cloudflare Workers Deployment

COILSIDE is a **local-first PWA**. Cloudflare Workers only host the static assets + server-rendered HTML. **All user data stays in the browser** (localStorage). No backend, no database, no R2, no paid APIs.

## Required files (already in this repo)

| File | Purpose |
|------|---------|
| `open-next.config.ts` | OpenNext Cloudflare adapter config (no R2/Images overrides — keeps deployment free) |
| `wrangler.jsonc` | Cloudflare Workers config (worker name: `coilside`, `nodejs_compat` flag, free-plan friendly) |
| `.gitignore` | Ignores `.open-next/` and `.wrangler/` build output |
| `package.json` scripts | `cf:build`, `cf:preview`, `cf:deploy` |

## Local scripts

```bash
# Local Next.js dev (port 3000)
bun run dev

# Production Next.js build (verifies app compiles cleanly)
bun run build

# Lint
bun run lint

# Build the Cloudflare Worker bundle (runs `next build` first, then OpenNext)
bun run cf:build

# Build + run the Worker locally via `wrangler dev` (port 8787 by default)
bun run cf:preview
# or: bunx opennextjs-cloudflare preview

# Build + deploy to Cloudflare Workers
bun run cf:deploy
```

## Deploy from scratch (first time)

1. **Install the Cloudflare CLI** (already in `devDependencies`):
   ```bash
   bun install
   ```

2. **Authenticate with Cloudflare** (one-time):
   ```bash
   bunx wrangler login
   ```
   A browser window opens — approve the OAuth flow with your Cloudflare account.

3. **Build + preview locally** (optional sanity check):
   ```bash
   bun run cf:preview
   ```
   Visit `http://localhost:8787`. Verify the home screen renders, Sean Factor tab works, Add Note works, etc.

4. **Deploy to production**:
   ```bash
   bun run cf:deploy
   ```
   Wrangler prints the deployed URL, e.g. `https://coilside.<your-subdomain>.workers.dev`.

5. **(Optional) Custom domain**: In the Cloudflare dashboard → Workers & Pages → `coilside` → Settings → Domains & Routes → add your domain. The free `workers.dev` subdomain is fine for personal use.

## Deploy from GitHub (CI/CD)

Add a GitHub Actions workflow at `.github/workflows/deploy.yml`:

```yaml
name: Deploy COILSIDE to Cloudflare Workers
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run cf:build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

In your GitHub repo: Settings → Secrets and variables → Actions → add:
- `CLOUDFLARE_API_TOKEN` (create in Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers" template)
- `CLOUDFLARE_ACCOUNT_ID` (found in Cloudflare dashboard sidebar)

## What this deployment does NOT require

- ❌ Paid Workers plan (the free plan covers ~100k requests/day — far more than a personal app needs)
- ❌ R2 bucket (no `r2_buckets` in `wrangler.jsonc`)
- ❌ D1 database (no backend DB — all data is in the browser)
- ❌ KV namespace
- ❌ Cloudflare Images (uses inline `data:` URLs for user photos, SVG illustrations for built-in references)
- ❌ User authentication
- ❌ Any paid third-party API
- ❌ OpenAI / Anthropic / Gemini / Z.ai API keys

The `nodejs_compat` flag is required (OpenNext uses Node built-ins like `Buffer`, `process`, etc.).

## Install COILSIDE on Android (after deploy)

1. Open the deployed URL (`https://coilside.<your-subdomain>.workers.dev` or your custom domain) in **Chrome** on your Android phone
2. Use the app once — start a work timer, save a note (this installs the service worker)
3. Tap Chrome's **⋮ menu → Add to Home screen → Add**
4. Launch **COILSIDE** from your home screen — it opens full-screen as a standalone PWA, no browser chrome
5. To back up your data: open the app → **Settings → EXPORT BACKUP (JSON)** — saves a `coilside-backup-YYYYMMDD-HHMM.json` file to your phone

## Photo storage note

Equipment photos are stored **in IndexedDB** (browser-native, ~50 MB–1 GB quota on mobile Chrome — far larger than localStorage's ~5 MB cap). Only the metadata (name, brand, model, serial, tags, callouts) lives in localStorage. The runtime auto-hydrates image bytes from IndexedDB via the `<PhotoImage>` component when photos are displayed.

When you tap **EXPORT BACKUP (JSON)**, the export handler pulls the photo bytes back out of IndexedDB and inlines them as data URLs in the JSON file, so backups are self-contained. If IndexedDB is unavailable (older browser / private mode), photos fall back to being stored as data URLs directly in localStorage, and the export warns you about photo files that couldn't be included.

When you tap **IMPORT BACKUP**, the handler writes the photo bytes from the JSON back into IndexedDB and strips the dataUrl from the persisted record — so the import path is symmetric with the save path.

No Cloudflare R2 / Images / KV / D1 required. The Cloudflare Worker only serves the static app shell + server-rendered HTML.
