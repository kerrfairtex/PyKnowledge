/**
 * PyKnowledge Service Worker
 * Cache-first strategy for offline learning after first install.
 */

importScripts('/core/sw-version.js');

const CACHE_NAME = `pyknowledge-v${SW_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/privacy.html',
  '/manifest.json',
  '/core/engine.js',
  '/core/api.js',
  '/core/loader.js',
  '/core/router.js',
  '/core/storage.js',
  '/core/idb.js',
  '/core/errors.js',
  '/core/version.js',
  '/app/dashboard/dashboard.js',
  '/app/lessons/lesson-viewer.js',
  '/app/quizzes/quiz-engine.js',
  '/app/progress/progress-dashboard.js',
  '/app/auth/auth-screen.js',
  '/app/home/front-page.js',
  '/app/library/reference-library.js',
  '/app/about/about-view.js',
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
  '/ui/themes/dashboard.css',
  '/ui/themes/library.css',
  '/ui/themes/about.css',
  '/ui/components/navbar.js',
  '/ui/components/progress-bar.js',
  '/ui/components/video-player.js',
  '/ui/components/toast.js',
  '/ui/components/offline-indicator.js',
  '/ui/components/install-prompt.js',
  '/ui/components/cache-progress.js',
  '/ui/components/loading.js',
  '/ui/components/update-notifier.js',
  '/ui/components/animations.js',
  '/ui/components/code-editor.js',
  '/lib/python-executor.js',
  '/lib/skulpt.min.js',
  '/lib/skulpt-stdlib.js',
  '/index.css',
  '/progress-bar.js',
  '/ui/themes/tokens.css',
  '/ui/themes/os-shell.css',
  '/ui/themes/os-auth.css',
  '/ui/themes/rain.css',
  '/ui/components/matrix-rain.js',
  '/ui/components/fx-detector.js',
  '/ui/components/command-registry.js',
  '/ui/components/os-shell.js',
  '/ui/components/os-landing.js',
  '/ui/components/os-fx.js',
  '/ui/assets/fonts/jetbrains-mono-400.woff2',
  '/ui/assets/fonts/jetbrains-mono-700.woff2',
  '/content/lessons.json',
  '/content/quizzes.json',
  '/content/reference.json',
  '/core/sw-version.js',
  '/ui/assets/icon-192.png',
  '/ui/assets/icon-512.png',
  '/ui/assets/maskable-icon-192.png',
  '/ui/assets/maskable-icon-512.png',
  '/ui/assets/logo.png',
  '/ui/assets/place/academic-building.jpg',
  '/ui/assets/place/island-aerial-view.jpg',
  '/ui/assets/place/street-festival-buntings.jpg',
  '/user-guidelines/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cacheAndReport(cache))
      .then(() => self.skipWaiting())
  );
});

/**
 * Cache every asset with per-file progress reporting, one retry pass for
 * transient failures, and a grounded verification at the end. Progress
 * counts are derived from actual cache contents — never estimated.
 */
async function cacheAndReport(cache) {
  const total = STATIC_ASSETS.length;
  const failed = [];

  // Pass 1
  await Promise.all(STATIC_ASSETS.map(async (asset) => {
    try {
      await cache.add(asset);
    } catch (err) {
      console.warn(`[SW] Failed to cache ${asset}:`, err);
      failed.push(asset);
    }
    broadcastCacheCount(cache, total, false);
  }));

  // Pass 2: retry transient failures (flaky mobile networks)
  await Promise.all(failed.map(async (asset) => {
    try {
      await cache.add(asset);
    } catch (err) {
      console.warn(`[SW] Retry failed for ${asset}:`, err);
    }
    broadcastCacheCount(cache, total, false);
  }));

  // Grounded completion check: compare the ACTUAL cached key set against
  // STATIC_ASSETS — not just counts. Duplicates or stray entries can't
  // fake a verified 100%.
  const keys = await cache.keys();
  const cachedUrls = new Set(keys.map((k) => k.url));
  const missing = STATIC_ASSETS.filter((asset) => {
    try {
      return !cachedUrls.has(new URL(asset, self.location.origin).href);
    } catch {
      return true;
    }
  });
  const done = total - missing.length;
  const verified = missing.length === 0;
  broadcastProgress(done, total, verified);

  if (!verified && missing.length > 0) {
    console.warn(`[SW] ${missing.length} asset(s) could not be cached; ` +
      'offline coverage incomplete:', missing);
  }
}

function broadcastCacheCount(cache, total, verified) {
  cache.keys().then((keys) => {
    broadcastProgress(Math.min(keys.length, total), total, verified);
  });
}

function broadcastProgress(done, total, verified) {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'CACHE_PROGRESS', done, total, verified });
    });
  });
}

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

  // Network-first for API data
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for the application shell and assets
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
          // Serve the shell from the CURRENT cache only, not stale versions.
          return caches.open(CACHE_NAME)
            .then((cache) => cache.match('/index.html'))
            .then((shell) => shell || new Response('Offline', { status: 503 }));
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
  if (event.data && event.data.type === 'GET_CACHE_PROGRESS') {
    caches.open(CACHE_NAME).then((cache) => cache.keys()).then((keys) => {
      const done = keys.length;
      const verified = done >= STATIC_ASSETS.length;
      broadcastProgress(done, STATIC_ASSETS.length, verified);
    });
  }
});
