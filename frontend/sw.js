/* sw.js — app shell precache. API calls are never cached: stale macros are worse than no macros. */
const VERSION = 'nutrivision-v3';
const SHELL = [
  '/', '/index.html', '/css/styles.css',
  '/js/app.js', '/js/camera.js', '/js/api.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;              // always hit the network
  if (url.pathname === '/js/config.js') return;               // rewritten every deploy
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match('/index.html')),
    ),
  );
});
