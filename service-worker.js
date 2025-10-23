const CACHE_NAME = 'slip39-pwa-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/wasm_exec.js',
  '/main.wasm',
];

// Install service worker and cache files
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate service worker and clean old caches
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler - serve from cache, fallback to network
self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(response => {
      return response || fetch(evt.request);
    })
  );
});
