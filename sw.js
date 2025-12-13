const CACHE = "macrow-v20";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
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
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;

    try {
      const fresh = await fetch(event.request);
      if (event.request.method === "GET" && fresh && fresh.ok) {
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch {
      return cached || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
