const CACHE_NAME = "wallet-pwa-v4";
const OFFLINE_ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/wasm_exec.js",
  "/main.wasm",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", event => {
  console.log("[SW] Installing and caching offline assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  console.log("[SW] Activating new service worker...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const reqUrl = new URL(event.request.url);

  // Only cache same-origin HTTP/HTTPS requests
  if (reqUrl.protocol.startsWith("http")) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(fetchRes => {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return fetchRes;
        });
      }).catch(() => {
        // Optional: fallback if offline
      })
    );
  } else {
    // For non-http/https requests, just let them go to network
    return;
  }
});

