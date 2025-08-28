/* Free Image Converter — SW
   - HTML: network-first (fallback to cache)
   - Assets (CSS/JS/Images/Manifest): stale-while-revalidate
   - Works at root or subpath
*/
const VERSION = 'v3';
const CACHE_STATIC = `fic-static-${VERSION}`;

const SCOPE = self.registration?.scope || self.location.origin;
const u = (path) => new URL(path, SCOPE).toString();

// --- Core assets (added index-ar.html) ---
const CORE_ASSETS = [
  u('index.html'),
  u('index-ar.html'),
  u('blog.html'),
  // CSS
  u('assets/css/app.css'),
  // JS
  u('assets/js/core.js'),
  u('assets/js/ui.js'),
  u('assets/js/files.js'),
  u('assets/js/convert.js'),
  u('assets/js/preview.js'),
  u('assets/js/main.js'),
  // Images / Manifest
  u('og.png'),
  u('icon-192.png'),
  u('icon-512.png'),
  u('maskable-512.png'),
  u('manifest.webmanifest'),
  // Articles
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

// HTML fallbacks depending on requested page
function htmlFallbackFor(url) {
  const p = url.pathname.toLowerCase();
  if (p.endsWith('/index-ar.html') || p.endsWith('index-ar.html')) return u('index-ar.html');
  // لو حد فتح الجذر أو أي صفحة إنجليزية
  return u('index.html');
}

// Enable navigation preload (optional but helpful)
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { if (self.registration.navigationPreload) await self.registration.navigationPreload.enable(); } catch {}
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    // حاول addAll أولاً
    try {
      await cache.addAll(CORE_ASSETS);
    } catch {
      // لو فشل عنصر، أضفه فرديًا بدون إفشال التنصيب كله
      const results = await Promise.allSettled(
        CORE_ASSETS.map((req) => cache.add(req))
      );
      // (اختياري) ممكن تسجّل العناصر اللي فشلت لكن مش ضروري
    }
    self.skipWaiting();
  })());
});

// helper: put in cache
async function putInCache(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch {}
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // GET فقط ونفس الأصل
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // تجاهل التحليلات
  if (/googletagmanager|google-analytics/i.test(url.href)) return;

  // وثائق/تنقّل: network-first + preload + fallback مناسب
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith((async () => {
      try {
        // جرّب navigation preload أولًا
        const preloaded = await event.preloadResponse;
        if (preloaded) {
          putInCache(CACHE_STATIC, req, preloaded.clone());
          return preloaded;
        }
        // الشبكة
        const net = await fetch(req, { credentials: 'same-origin' });
        putInCache(CACHE_STATIC, req, net.clone());
        return net;
      } catch {
        // كاش لنفس الطلب
        const cached = await caches.match(req);
        if (cached) return cached;
        // fallback بحسب الصفحة المطلوبة (ar أو en)
        const fb = await caches.match(htmlFallbackFor(url));
        return fb || Response.error();
      }
    })());
    return;
  }

  // باقي الأصول: stale-while-revalidate
  if (['style', 'script', 'image', 'font', 'manifest'].includes(req.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_STATIC);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then((res) => {
        // لا تضع الردود الغامقة عادةً
        if (res && res.status === 200 && res.type !== 'opaque') {
          putInCache(CACHE_STATIC, req, res.clone());
        }
        return res;
      }).catch(() => null);
      return cached || (await netPromise) || new Response('', { status: 504 });
    })());
    return;
  }

  // الافتراضي: حاول كاش ثم شبكة
  event.respondWith(
    caches.match(req).then((c) => c || fetch(req).catch(() => c))
  );
});

// رسالة تفعيل فوري
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
