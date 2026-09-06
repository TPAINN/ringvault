// RingVault service worker — offline app shell + catalog.
// Cross-origin audio (Mixkit/Commons) is left to the browser (not pre-cached: 2200+ files).
//
// Strategy (root-cause fix for "visitors stuck on old UI"):
//   · navigations (HTML)   → NETWORK FIRST, short timeout, cache fallback
//   · /sw.js, catalog.*    → NETWORK FIRST (must never be pinned stale)
//   · /assets/x.js?v=N     → CACHE FIRST (the ?v= query is our cache-buster)
//   · other same-origin    → STALE-WHILE-REVALIDATE
const CACHE = 'ringvault-v6';
const SHELL = ['app.html', 'catalog.js', 'catalog.json', 'manifest.json', 'icon.svg', 'icon-maskable.svg', 'favicon.ico', 'assets/app.js', 'assets/rail.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll is atomic (one 404 aborts the whole install) — cache per-file instead
      .then((c) => Promise.all(SHELL.map((u) =>
        c.add(u).catch((err) => console.warn('[sw] precache skipped:', u, String(err)))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request, timeoutMs) {
  return Promise.race([
    fetch(request).then((resp) => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
      }
      return resp;
    }),
    new Promise((resolve) => setTimeout(() => resolve(caches.match(request)), timeoutMs))
  ]).then((hit) => hit || caches.match(request));
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((hit) => {
    const refresh = fetch(request).then((resp) => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
      }
      return resp;
    }).catch(() => undefined);
    return hit || refresh;
  });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Don't intercept cross-origin audio — let the browser stream/cache it normally.
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  if (e.request.mode === 'navigate' || path === '/app' || path === '/app.html' || path === '/') {
    // Fresh HTML above all — this is what kept users on the old design.
    e.respondWith(networkFirst(e.request, 3500));
    return;
  }
  if (path === '/sw.js' || path === '/catalog.js' || path === '/catalog.json') {
    e.respondWith(networkFirst(e.request, 3000));
    return;
  }
  if (path.startsWith('/assets/') && url.searchParams.has('v')) {
    // Versioned by the page itself — immutable, safe to pin.
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      }))
    );
    return;
  }
  e.respondWith(staleWhileRevalidate(e.request));
});
