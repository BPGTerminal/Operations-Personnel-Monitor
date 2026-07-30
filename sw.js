/* ═══════════════════════════════════════════════════════════════
   OPM v2 — Enhanced Service Worker
   Cache strategy: stale-while-revalidate for assets,
   network-first for HTML, bypass for API endpoints.
   ═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'opm-v6';
const CACHE_NAME_STATIC = `${CACHE_VERSION}-static`;
const CACHE_NAME_DYNAMIC = `${CACHE_VERSION}-dynamic`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  './',
  './manifest.json',
  './opm-manifest.json',
  './icon-192.png',
  './icon-512.png',
  './opm-core.css',
  './opm-commander.css',
  './opm-core.js',
  './opm.html',
];

// Install: pre-cache static assets
self.addEventListener('install', event => {
  console.log('[OPM SW] Installing', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC)
      .then(cache => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn('[OPM SW] Failed to cache:', url, err.message);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches, claim clients
self.addEventListener('activate', event => {
  console.log('[OPM SW] Activating', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME_STATIC && key !== CACHE_NAME_DYNAMIC)
          .map(key => {
            console.log('[OPM SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: intelligent routing
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ── BYPASS: Google APIs (live data) ──────────────────────
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('docs.google.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('lh3.googleusercontent.com')) {
    return; // Let browser handle directly
  }

  // ── BYPASS: External CDNs (Leaflet, fonts) ───────────────
  if (url.hostname.includes('unpkg.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('nominatim.openstreetmap.org') ||
      url.hostname.includes('hazardhunter.georisk.gov.ph')) {
    // Stale-while-revalidate for CDN resources
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME_DYNAMIC));
    return;
  }

  // ── HTML: Network-first, fallback to cache ────────────────
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(request, CACHE_NAME_DYNAMIC));
    return;
  }

  // ── Static assets: Cache-first ────────────────────────────
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.ico')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Default: Network-first ────────────────────────────────
  event.respondWith(networkFirst(request, CACHE_NAME_DYNAMIC));
});

// ── Strategies ──────────────────────────────────────────────

// Cache-first: return cached, update cache from network in background
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Background refresh
    fetch(request).then(response => {
      if (response.ok) {
        caches.open(CACHE_NAME_STATIC).then(cache => cache.put(request, response));
      }
    }).catch(() => {});
    return cached;
  }
  return networkFirst(request);
}

// Network-first: try network, fallback to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const clone = response.clone();
      caches.open(cacheName).then(cache => cache.put(request, clone));
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline fallback page
    if (request.destination === 'document') {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OPM — Offline</title>
        <style>body{background:#0a0e1a;color:#c8d8e8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;text-align:center;padding:20px;}
        h1{color:#00e5ff;font-size:24px;}p{color:#5a7090;}</style></head>
        <body><h1>📴 OPM — OFFLINE</h1><p>No internet connection available.<br>The app will automatically refresh when your connection returns.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    throw error;
  }
}

// Stale-while-revalidate: return cached immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(cacheName).then(cache => cache.put(request, clone));
    }
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ── Periodic sync for offline queue (if supported) ──────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'opm-sync') {
    event.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  // Post message to all clients to flush their offline queues
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' });
  });
}

// ── Push notification support ───────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'New update from OPM',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'opm-notification',
    data: { url: data.url || './' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'OPM Alert', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
