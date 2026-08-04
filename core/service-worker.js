/**
 * PyKnowledge Service Worker
 * Cache-first strategy for offline learning after first install.
 */

const CACHE_NAME = 'pyknowledge-v0.1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/core/engine.js',
  '/core/loader.js',
  '/core/router.js',
  '/core/storage.js',
  '/core/service-worker.js',
  '/app/dashboard/dashboard.js',
  '/app/lessons/lesson-viewer.js',
  '/app/quizzes/quiz-engine.js',
  '/app/progress/progress-dashboard.js',
  '/storage/progress.js',
  '/storage/achievements.js',
  '/utils/parser.js',
  '/utils/validator.js',
  '/ui/themes/default.css',
  '/ui/components/navbar.js',
  '/ui/components/progress-bar.js',
  '/ui/components/video-player.js',
  '/content/lessons.json',
  '/content/quizzes.json',
  '/ui/assets/icon-192.png',
  '/ui/assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

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
          return caches.match('/index.html');
        }
        return new Response('Offline — content not cached', { status: 503 });
      });
    })
  );
});
