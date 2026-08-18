// OpenNext adapter config for COILSIDE on Cloudflare Workers.
// Cloud resource bindings (D1/R2) are exposed through Wrangler and read from
// route handlers with getCloudflareContext(). Keep this adapter config minimal.

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
