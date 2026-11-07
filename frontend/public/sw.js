// High-speed PWA Service Worker: Offline Caching & Background Sync
const SHELL_CACHE = 'cricket-shell-v4';
const API_CACHE = 'cricket-api-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('Pre-cache warning during install:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests (mutations are handled by application queue)
  if (req.method !== 'GET') return;

  // 1. Navigation (HTML pages) - Cache-First with Network Revalidation for instant offline load
  if (req.mode === 'navigate') {
    event.respondWith(
      caches
        .match('/index.html')
        .then((cached) => cached || caches.match('/'))
        .then((cached) => {
          const networkPromise = fetch(req)
            .then((res) => {
              if (res.ok) {
                const clone = res.clone();
                caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', clone));
              }
              return res;
            })
            .catch(() => cached);
          return cached || networkPromise;
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images, Icons, Fonts)
  if (
    url.origin === location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js'))
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 3. API Requests (/api/...) - Network-First, with Cache Fallback for offline viewing!
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          // If offline / network failed, return cached response if available
          return caches.match(req);
        })
    );
    return;
  }

  // 4. Default: Network-First with Cache Fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
