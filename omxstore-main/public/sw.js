/**
 * OMEX service worker — deliberately conservative.
 *
 * Caches ONLY same-origin static assets (/assets/* are content-hashed and
 * immutable; /products/* images change rarely). Pages, API calls, and
 * everything else go straight to the network, so a new deployment is
 * always picked up immediately — zero staleness risk.
 */
const CACHE = "omex-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const cacheable =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/products/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/favicon.ico";

  if (!cacheable) return; // network as usual (pages, RPCs, everything dynamic)

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })(),
  );
});
