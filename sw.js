/* Free Image Converter — SW
   - HTML: network-first (fallback to cache)
   - Assets (CSS/JS/Images/Manifest): stale-while-revalidate
   - Scoped paths (تعمل في الجذر أو مجلد فرعي)
*/
const VERSION = 'v2';
const CACHE_STATIC = `fic-static-${VERSION}`;

const SCOPE = self.registration?.scope || self.location.origin;

// ساعدني أبني URL صحيح داخل نطاق الموقع (حتى لو بمجلد فرعي)
const u = (path) => new URL(path, SCOPE).toString();

// الأصول الأساسية (أضف/احذف حسب حاجتك)
const CORE_ASSETS = [
  u('index.html'),
  u('blog.html'),
  // CSS
  u('assets/css/app.css'),
  // JS (ES Modules)
  u('assets/js/core.js'),
  u('assets/js/ui.js'),
  u('assets/js/files.js'),
  u('assets/js/convert.js'),
  u('assets/js/preview.js'),
  u('assets/js/main.js'),
  // صور وأيقونات ومانيفست
  u('og.png'),
  u('icon-192.png'),
  u('icon-512.png'),
  u('maskable-512.png'),
  u('manifest.webmanifest'),
  // صفحات المقالات
  u('jpg-to-png.html'),
  u('jpg-vs-png-vs-webp.html'),
  u('free-tools.html'),
  u('png-to-ico.html'),
  u('batch-conversion.html'),
  u('webp-better.html'),
  u('reduce-image-size.html'),
  u('offline-vs-online.html'),
  u('transparent-jpg.html'),
  u('best-format-2025.html'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k !== CACHE_STATIC)
        .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// مساعد: تحديث الكاش في الخلفية
async function putInCache(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  try { await cache.put(request, response.clone()); } catch (_) {}
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // GET فقط ونفس الأصل
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // تجاهل التحليلات أو طلبات لا نحتاجها
  if (/googletagmanager|google-analytics/i.test(url.href)) return;

  // HTML تنقل: network-first مع fallback للكاش
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          putInCache(CACHE_STATIC, req, net.clone());
          return net;
        } catch (_) {
          const cached = await caches.match(req);
          if (cached) return cached;
          // كمل بفال باك لـ index.html لو لازم
          const fallback = await caches.match(u('index.html'));
          return fallback || Response.error();
        }
      })()
    );
    return;
  }

  // باقي الأصول: stale-while-revalidate
  if (['style','script','image','font','manifest'].includes(req.destination)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_STATIC);
        const cached = await cache.match(req);
        const netPromise = fetch(req).then((res) => {
          // لا تضع الردود الغامقة (opaque) في الكاش عادةً
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          putInCache(CACHE_STATIC, req, res.clone());
          return res;
        }).catch(() => null);
        // رجّع الكاش فورًا لو موجود، وخلّي الشبكة تحدّث
        return cached || (await netPromise) || new Response('', {status: 504});
      })()
    );
    return;
  }

  // الافتراضي: جرّب الكاش ثم الشبكة
  event.respondWith(
    caches.match(req).then((c) => c || fetch(req).catch(() => c))
  );
});

// تفعيل التحديث الفوري عند نشر إصدار جديد
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
