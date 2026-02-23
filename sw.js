const CACHE = "macrow-v23";
const OFFLINE_URL = "./offline.html";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./js/calculations.js",
  "./js/storage.js",
  "./js/assessments.js",
  "./manifest.webmanifest",
  "./assets/macrow-logo.png",
  "./assets/favicon.png",
  "./assets/apple-touch-icon.png",
  OFFLINE_URL
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
  if (event.request.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;

    try {
      const fresh = await fetch(event.request);
      if (fresh && fresh.ok) {
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch {
      if (event.request.mode === "navigate") {
        return (await cache.match(OFFLINE_URL)) || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      return cached || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
