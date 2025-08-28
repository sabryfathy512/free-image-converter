/* Free Image Converter — Service Worker
   - HTML: network-first (fallback to cache/offline)
   - Assets (CSS/JS/Images/Manifest): stale-while-revalidate
   - Supports EN + AR
*/
const VERSION = 'v4';
const CACHE_STATIC = `fic-static-${VERSION}`;

const SCOPE = self.registration?.scope || self.location.origin;
const u = (path) => new URL(path, SCOPE).toString();

// --- Core assets ---
const CORE_ASSETS = [
  // Home
  u('index.html'),
  u('ar/index.html'),
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
  // Blog articles (EN)
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
  // Offline fallback
  u('offline.html'),
];

// --- HTML fallbacks ---
function htmlFallbackFor(url) {
  const p = url.pathname.toLowerCase();
  if (p.startsWith('/ar')) return u('ar/index.html');
  return u('index.html');
}

// --- Install: cache core assets ---
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    try {
      await cache.addAll(CORE_ASSETS);
    } catch {
      // Fallback: add individually (don’t fail whole install)
      await Promise.allSettled(
        CORE_ASSETS.map((req) => cache.add(req).catch(() => null))
      );
    }
    self.skipWaiting();
  })());
});

// --- Activate: clean old caches + enable preload ---
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    } catch {}
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// --- Helper: put in cache ---
async function putInCache(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch {}
  return response;
}

// --- Fetch handler ---
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // GET فقط ونفس الأصل
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // تجاهل التحليلات
  if (/googletagmanager|google-analytics/i.test(url.href)) return;

  // --- HTML (network-first) ---
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith((async () => {
      try {
        // Preload response
        const preloaded = await event.preloadResponse;
        if (preloaded) {
          putInCache(CACHE_STATIC, req, preloaded.clone());
          return preloaded;
        }
        // Network
        const net = await fetch(req, { credentials: 'same-origin' });
        putInCache(CACHE_STATIC, req, net.clone());
        return net;
      } catch {
        // Cached page
        const cached = await caches.match(req);
        if (cached) return cached;
        // Fallback (AR/EN home)
        const fb = await caches.match(htmlFallbackFor(url));
        if (fb) return fb;
        // Offline fallback page
        return caches.match(u('offline.html')) || Response.error();
      }
    })());
    return;
  }

  // --- Static assets: stale-while-revalidate ---
  if (['style', 'script', 'image', 'font', 'manifest'].includes(req.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_STATIC);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          putInCache(CACHE_STATIC, req, res.clone());
        }
        return res;
      }).catch(() => null);
      return cached || (await netPromise) || new Response('', { status: 504 });
    })());
    return;
  }

  // --- Default: cache-first fallback to network ---
  event.respondWith(
    caches.match(req).then((c) => c || fetch(req).catch(() => c))
  );
});

// --- Message: SKIP_WAITING support ---
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
