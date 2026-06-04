// OPM Service Worker v3 — Network-first, no stale HTML ever
// Bump CACHE_VERSION any time you deploy new files to force all devices to refresh
const CACHE_VERSION = 'opm-v3';

// Only cache icons and manifest — NOT HTML files
// HTML always fetches fresh from network
const CACHE_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Install: cache only static assets (not HTML)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => Promise.allSettled(
        CACHE_ASSETS.map(url => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())  // activate immediately
  );
});

// Activate: delete ALL old caches, claim all clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => {
          console.log('[OPM SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - HTML files (.html)   → ALWAYS network, never cache
// - Apps Script / Sheets → ALWAYS network, bypass SW
// - Icons / manifest     → Cache first (they don't change often)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always bypass SW for live data endpoints
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('docs.google.com') ||
      url.hostname.includes('googleapis.com')) {
    return; // let browser handle normally
  }

  // HTML pages: ALWAYS fetch from network, no cache
  if (e.request.destination === 'document' ||
      url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => {
          // Only use cache as last resort (offline)
          return caches.match(e.request);
        })
    );
    return;
  }

  // Icons / manifest: cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
