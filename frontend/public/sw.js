// High-speed PWA Service Worker: Cache-First for shell assets & instant navigation
const CACHE = 'cricket-shell-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Do not intercept non-GET requests or backend API requests
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;

  // Navigation (HTML shell): Return cached HTML immediately for instant app open, revalidate in background
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html')
        .then((cached) => cached || caches.match('/'))
        .then((cached) => {
          const networkFetch = fetch(e.request)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put('/index.html', copy));
              }
              return res;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
    );
    return;
  }

  // Static hashed assets (/assets/, images, icons): Cache-first for lightning speed
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.ico')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Default fallback for other requests: Network-first with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
