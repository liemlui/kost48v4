// KOST48 PWA service worker.
// Only the public app shell and explicitly public static assets are cached.
// API responses, authenticated requests, and business mutations stay network-only.
const CACHE_PREFIX = 'kost48-pwa-';
const BUILD_ID = '__KOST48_BUILD_ID__';
const PRECACHE_NAME = `${CACHE_PREFIX}precache-${BUILD_ID}`;
const STATIC_NAME = `${CACHE_PREFIX}static-${BUILD_ID}`;
const NAVIGATION_TIMEOUT_MS = 8000;
const MAX_CACHEABLE_ASSET_BYTES = 10 * 1024 * 1024;

const CORE_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/favicon-32.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then(async (cache) => {
      await precacheCoreAssets(cache);
      await precachePublicShell(cache);
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      self.registration.navigationPreload?.enable(),
    ]).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const publicRoomImage = url.pathname.startsWith('/uploads/room-images/')
    || url.pathname.startsWith('/api/uploads/room-images/');

  // Never intercept private/API traffic. The one API-prefix exception is the
  // explicitly public room-marketing image alias.
  if (
    request.headers.has('Authorization')
    || (url.pathname.startsWith('/api/') && !publicRoomImage)
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url, event.preloadResponse));
    return;
  }

  if (isPublicStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstPublicAsset(request));
  }
});

function isPublicStaticAsset(pathname) {
  return pathname === '/manifest.webmanifest'
    || pathname.startsWith('/assets/')
    || pathname.startsWith('/icons/')
    || pathname.startsWith('/uploads/room-images/')
    || pathname.startsWith('/api/uploads/room-images/');
}

async function cleanupOldCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .filter((key) => key !== PRECACHE_NAME && key !== STATIC_NAME)
      .map((key) => caches.delete(key)),
  );
}

async function precacheCoreAssets(cache) {
  await Promise.all(CORE_ASSETS.map(async (path) => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!isExpectedCoreAsset(path, response)) {
      throw new Error(`Unable to precache valid core asset: ${path}`);
    }
    await cache.put(path, response);
  }));
}

function isExpectedCoreAsset(path, response) {
  if (!response.ok || response.type !== 'basic') return false;
  const contentType = response.headers.get('Content-Type') || '';

  if (path.endsWith('.html')) return contentType.includes('text/html');
  if (path.endsWith('.webmanifest')) {
    return contentType.includes('json') || contentType.includes('manifest');
  }
  if (path.endsWith('.png')) return contentType.startsWith('image/png');
  return false;
}

async function precachePublicShell(precache) {
  const response = await fetch('/rooms', { cache: 'no-store' });
  const contentType = response.headers.get('Content-Type') || '';
  if (!response.ok || !contentType.includes('text/html')) {
    throw new Error(`Unable to precache app shell: ${response.status}`);
  }

  const html = await response.clone().text();
  await precache.put('/rooms', response.clone());
  await precache.put('/', response);

  const assetPaths = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)]
    .map((match) => match[1]);
  if (assetPaths.length) {
    const staticCache = await caches.open(STATIC_NAME);
    await staticCache.addAll([...new Set(assetPaths)]);
  }
}

function isPublicNavigation(pathname) {
  return pathname === '/'
    || pathname === '/rooms'
    || pathname === '/login'
    || pathname === '/forgot-password'
    || pathname === '/reset-password'
    || /^\/rooms\/[^/]+\/detail$/.test(pathname)
    || /^\/booking\/[^/]+$/.test(pathname);
}

async function cacheFirstPublicAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheablePublicAsset(request, response)) {
    const cache = await caches.open(STATIC_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

function isCacheablePublicAsset(request, response) {
  if (!response.ok || response.type !== 'basic') return false;

  const cacheControl = response.headers.get('Cache-Control') || '';
  if (/\b(?:no-store|private)\b/i.test(cacheControl)) return false;

  const contentLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_CACHEABLE_ASSET_BYTES) {
    return false;
  }

  const contentType = response.headers.get('Content-Type') || '';
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith('/icons/') || pathname.includes('/room-images/')) {
    return contentType.startsWith('image/');
  }
  if (pathname.endsWith('.webmanifest')) {
    return contentType.includes('json') || contentType.includes('manifest');
  }
  if (request.destination === 'script') {
    return contentType.includes('javascript');
  }
  if (request.destination === 'style') {
    return contentType.includes('text/css');
  }
  return pathname.startsWith('/assets/');
}

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new Request(request, { signal: controller.signal }));
  } finally {
    clearTimeout(timeout);
  }
}

async function handleNavigation(request, url, preloadResponse) {
  try {
    const response = await preloadResponse || await fetchWithTimeout(
      request,
      NAVIGATION_TIMEOUT_MS,
    );
    if (response.ok && isPublicNavigation(url.pathname)) {
      const cache = await caches.open(PRECACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const exact = isPublicNavigation(url.pathname)
      ? await caches.match(request)
      : null;
    if (exact) return exact;

    // The cached public SPA shell contains no user data. It can safely boot a
    // protected route offline while API/data requests remain network-only.
    const shell = await caches.match('/rooms') || await caches.match('/');
    if (shell) return shell;

    return caches.match('/offline.html');
  }
}

// F4-2 — Web Push. Backend kini menyediakan consent (subscribe/unsubscribe),
// subscription lifecycle (deactivate endpoint mati), idempotency (1 notif = 1 baris
// outbox), dan retry controls (sweeper PENDING→SENT/FAILED).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'KOST48', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'KOST48';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      linkTo: data.linkTo || '/notifications',
      notificationId: data.notificationId,
    },
    tag: data.notificationId ? `kost48-notif-${data.notificationId}` : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const linkTo = event.notification.data?.linkTo || '/notifications';
  const targetUrl = new URL(linkTo, self.location.origin).href;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        if ('navigate' in client) {
          try {
            await client.navigate(targetUrl);
          } catch {
            // safe: cross-origin/invalid navigate falls through to focus
          }
        }
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
    return undefined;
  })());
});
