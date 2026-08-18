// WTF STUPID SIMPLE service worker — offline shell without trapping users on stale deploys.
const CACHE = "wtf-stupid-simple-v3";
const PRECACHE = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/"));
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always prefer the newest deployed app shell and public metadata.
  if (
    request.mode === "navigate" ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Next.js static chunks are content-hashed, so cache-first is safe and fast.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then(async (response) => {
            if (response && response.ok) {
              const cache = await caches.open(CACHE);
              await cache.put(request, response.clone());
            }
            return response;
          })
      )
    );
    return;
  }

  // Everything else prefers the network, with cached fallback for offline use.
  event.respondWith(networkFirst(request));
});
