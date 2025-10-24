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

  // Only handle HTTP/HTTPS requests
  if (!reqUrl.protocol.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        console.log("[SW] Loaded from cache:", event.request.url);
        return response;
      }

      return fetch(event.request)
        .then(networkResponse => {
          // Only cache successful GET requests
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            event.request.method !== "GET"
          ) {
            return networkResponse;
          }

          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));

          return networkResponse;
        })
        .catch(err => {
          // Optional fallback: serve index.html for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          console.warn("[SW] Fetch failed for:", event.request.url, err);
        });
    })
  );
});
