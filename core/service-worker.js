/**
 * PyKnowledge Service Worker
 * Cache-first strategy for offline learning after first install.
 */

const APP_VERSION = '0.4.2';
const CACHE_NAME = `pyknowledge-v${APP_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/app-shell.html',
  '/manifest.json',
  '/core/engine.js',
  '/core/api.js',
  '/core/loader.js',
  '/core/router.js',
  '/core/storage.js',
  '/core/errors.js',
  '/core/version.js',
  '/core/service-worker.js',
  '/app/dashboard/dashboard.js',
  '/app/lessons/lesson-viewer.js',
  '/app/quizzes/quiz-engine.js',
  '/app/progress/progress-dashboard.js',
  '/app/auth/auth-screen.js',
  '/app/home/front-page.js',
  '/storage/progress.js',
  '/storage/achievements.js',
  '/storage/auth.js',
  '/utils/parser.js',
  '/utils/validator.js',
  '/utils/sanitize.js',
  '/utils/schema.js',
  '/utils/crypto.js',
  '/ui/themes/default.css',
  '/ui/themes/animations.css',
  '/ui/themes/landing.css',
  '/ui/components/navbar.js',
  '/ui/components/progress-bar.js',
  '/ui/components/video-player.js',
  '/ui/components/toast.js',
  '/ui/components/offline-indicator.js',
  '/ui/components/install-prompt.js',
  '/ui/components/loading.js',
  '/ui/components/update-notifier.js',
  '/ui/components/animations.js',
  '/ui/components/code-editor.js',
  '/lib/python-executor.js',
  '/content/lessons.json',
  '/content/quizzes.json',
  '/ui/assets/icon-192.png',
  '/ui/assets/icon-512.png',
  '/ui/assets/logo.png',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/skulpt.min.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/sys.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/math.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/random.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/datetime.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/json.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/re.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/itertools.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/collections.js',
  'https://cdn.jsdelivr.net/npm/skulpt@1.3.0/dist/string.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first for API data (spec: API data → network-first),
  // so live content wins when online and cache is the offline fallback.
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for the application shell, CSS, JS, images and lesson
  // content (spec: cache-first with versioning via CACHE_NAME).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/app-shell.html');
        }
        return new Response('Offline — content not cached', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// Network-first: try the network, fall back to cache when offline.
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
