const CACHE_NAME = "wallet-pwa-v2";
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

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// self.addEventListener("fetch", event => {
//   // Serve all requests from cache, fall back to network only if missing
//   event.respondWith(
//     caches.match(event.request).then(response =>
//       response || fetch(event.request).then(fetchRes => {
//         // Optionally cache any new responses
//         const clone = fetchRes.clone();
//         caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
//         return fetchRes;
//       })
//     )
//   );
// });
