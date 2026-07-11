const CACHE_NAME = "vektra-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy: try network first, fallback to cache if offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the request was successful, clone and store it in cache
        if (response.ok) {
          const url = new URL(event.request.url);
          if (ASSETS_TO_CACHE.includes(url.pathname) || url.pathname === "/") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
        }
        return response;
      })
      .catch(() => {
        // Network failed (offline): return cached asset if available
        return caches.match(event.request);
      })
  );
});
