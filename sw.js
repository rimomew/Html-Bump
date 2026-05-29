const CACHE_NAME = "scraper-romania-v1";
const TILE_HOSTS = [
  "tile.openstreetmap.org",
  "basemaps.cartocdn.com",
  "arcgisonline.com",
  "tile.opentopomap.org",
];

// On install — cache the app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(["./", "./index.html"])
    )
  );
  self.skipWaiting();
});

// On activate — clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for tiles, network-first for everything else
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const isTile = TILE_HOSTS.some(h => url.hostname.includes(h));

  if (isTile) {
    // Cache-first: return cached tile instantly, fetch+cache if missing
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return new Response("", { status: 503 });
        }
      })
    );
  } else {
    // Network-first: try network, fall back to cache
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
