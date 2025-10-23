const CACHE_NAME = "wallet-pwa-v1";
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./main.wasm",
  "./wasm_exec.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install: cache everything
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting(); // Activate immediately
});

// Activate: cleanup old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim(); // Control open pages immediately
});

// Fetch: always serve from cache (offline-first)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).then(fetchRes => {
        // Optionally update cache in background
        const clone = fetchRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return fetchRes;
      }).catch(() =>
        caches.match("./index.html") // fallback
      )
    )
  );
});
