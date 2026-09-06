// RingVault service worker — offline app shell + catalog.
// Cross-origin audio (Mixkit/Commons) is left to the browser (not pre-cached: 2200+ files).
const CACHE = 'ringvault-v4';
const SHELL = ['app.html', 'catalog.js', 'catalog.json', 'manifest.json', 'icon.svg', 'icon-maskable.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Don't intercept cross-origin audio — let the browser stream/cache it normally.
  if (url.origin !== self.location.origin) return;

  // Same-origin app shell: cache-first, fall back to network, then to app.html for navigations.
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => (e.request.mode === 'navigate' ? caches.match('app.html') : undefined));
    })
  );
});
