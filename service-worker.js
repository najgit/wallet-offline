const CACHE_NAME = "wallet-pwa-v3";
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

// Pre-cache files during install
self.addEventListener("install", event => {
    console.log("[SW] Installing and caching offline assets...");
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>{
                    console.log("[SW] Adding to cache:", OFFLINE_ASSETS);
                    return cache.addAll(OFFLINE_ASSETS)
                }
            )
    );
  self.skipWaiting();
});

// Remove old caches when new version activates
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Main offline-first fetch handler
self.addEventListener("fetch", event => {
  // Always serve cached index.html for navigation requests (reloads, startup)
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then(response => response || fetch(event.request))
    );
    return;
  }

  // For other requests (JS, CSS, WASM, icons, etc.)
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return from cache or fetch and update cache
      return (
        response ||
        fetch(event.request)
          .then(fetchRes => {
            // Cache new responses
            const clone = fetchRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return fetchRes;
          })
          .catch(() => caches.match("./index.html")) // fallback offline page
      );
    })
  );
});
