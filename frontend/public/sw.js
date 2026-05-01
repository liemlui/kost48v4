// KOST48 PWA — Safe Service Worker MVP
// Cache policy: static app shell only. No API/auth/private data caching.
// Cache name versioned for easy cleanup on updates.
const CACHE_NAME = 'kost48-pwa-v1';

// Static assets to precache on install (best-effort).
const PRECACHE_URLS = [
  '/rooms',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
];

// ---------------------------------------------------------------------------
// Install — precache static public assets (best-effort, ignore failures)
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Silently skip if a URL can't be cached (e.g. dev server returns HTML for /rooms)
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate — remove old caches, take control immediately
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch — network-only for API/auth; cache-first for static; network-first for navigation
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // --- RULE 1: NEVER cache /api/* — always network-only ---
  if (url.pathname.startsWith('/api/')) {
    // Do not call event.respondWith — browser handles normally.
    return;
  }

  // --- RULE 2: NEVER cache requests with Authorization header ---
  if (request.headers.has('Authorization')) {
    return;
  }

  // --- RULE 3: Cache-first for known static assets (icons, manifest, built JS/CSS) ---
  // We capture any same-origin GET that looks like a static resource.
  if (request.method === 'GET' && url.origin === self.location.origin) {
    // Don't cache navigation requests here — they get special handling below.
    if (request.mode === 'navigate') {
      event.respondWith(navigationHandler(request));
      return;
    }

    // Cache-first for static assets.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache successful same-origin static responses.
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // --- RULE 4: All other requests — browser default (network) ---
  // Service worker does not intercept cross-origin or non-GET requests.
});

// ---------------------------------------------------------------------------
// Navigation handler — network-first, fallback to cached /rooms, then to /
// ---------------------------------------------------------------------------
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache the successful navigation response for offline fallback.
    if (networkResponse.ok) {
      const clone = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return networkResponse;
  } catch (error) {
    // Network failed — try cached version of the request first.
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback to cached /rooms.
    const roomsCached = await caches.match('/rooms');
    if (roomsCached) return roomsCached;

    // Final fallback to cached /.
    const rootCached = await caches.match('/');
    if (rootCached) return rootCached;

    // Nothing available — let browser show its offline page.
    throw error;
  }
}

// No push event listener.
// No sync event listener.
// No notification logic.
// No IndexedDB.
// No API JSON cache.