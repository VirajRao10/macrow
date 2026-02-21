const CACHE = "macrow-v22";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./js/calculations.js",
  "./js/storage.js",
  "./js/assessments.js",
  "./manifest.webmanifest",
  "./assets/macrow-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    const request = event.request;
    const cache = await caches.open(CACHE);
    const isSameOrigin = new URL(request.url).origin === self.location.origin;
    const canCache = request.method === "GET" && isSameOrigin;
    const cached = canCache ? await cache.match(request) : null;

    try {
      // Network-first prevents stale UI/JS after local edits.
      const fresh = await fetch(request);
      if (canCache && fresh && fresh.ok) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      return cached || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
