// Tend — Service Worker
// Caches the app shell so Tend loads offline and feels native.

const CACHE = "tend-v1";

// Files to cache on install — update this list to match your actual build output
const PRECACHE = [
  "/",
  "/index.html",
  "/assets/index.css",
  "/assets/index.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: cache the app shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network (cache-first for app shell)
self.addEventListener("fetch", (e) => {
  // Don't intercept API or TTS calls — always go to network for those
  const url = new URL(e.request.url);
  const isApi = url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("anthropic.com") ||
    url.hostname.includes("elevenlabs.io") ||
    url.hostname.includes("supabase.co");

  if (isApi) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        // Cache new assets we haven't seen yet
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
