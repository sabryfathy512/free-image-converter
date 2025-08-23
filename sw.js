/* Free Image Converter — SW (cache-first للثوابت، network-first للتنقل) */
const CACHE = 'fic-v1';

const ASSETS = [
  '/', '/index.html', '/blog.html',
  '/og.png',
  '/jpg-to-png.html', '/jpg-vs-png-vs-webp.html', '/free-tools.html',
  '/png-to-ico.html', '/batch-conversion.html', '/webp-better.html',
  '/reduce-image-size.html', '/offline-vs-online.html', '/transparent-jpg.html',
  '/best-format-2025.html'
  // أضف أي ملفات/صور ثابتة أخرى إذا رغبت
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* HTML (تنقل) = شبكة أولًا مع رجوع للكاش — الباقي Cache-first مع تحديث */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // نفس النطاق فقط
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // static: cache first
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
    )
  );
});