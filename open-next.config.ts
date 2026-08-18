// open-next.config.ts — COILSIDE Cloudflare Workers config via @opennextjs/cloudflare
//
// COILSIDE is local-first: all data lives in the user's browser (localStorage).
// The Worker only serves the static + server-rendered app — no backend, no DB,
// no R2 required. We deliberately skip the R2 incremental cache and Cloudflare
// Images so the deployment works on the free Workers plan.
//
// See: https://opennext.js.org/cloudflare

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // No `incrementalCache` override → uses the default in-memory/none cache.
  // COILSIDE doesn't need ISR/PPR caching — it's a single mostly-static page.
  //
  // No `images` override → Cloudflare Images is NOT required. The app uses
  // plain <img src="data:..."> for user-uploaded equipment photos and SVG
  // illustrations for the built-in Field Guide fallbacks.
  //
  // This keeps the deployment free.
});
