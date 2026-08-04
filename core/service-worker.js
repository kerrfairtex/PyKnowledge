/**
 * PyKnowledge Service Worker
 * Cache-first strategy for offline learning after first install.
 */

const APP_VERSION = '0.3.1';
const CACHE_NAME = `pyknowledge-v${APP_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/core/engine.js',
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
  '/ui/components/loading.js',
  '/ui/components/update-notifier.js',
  '/ui/components/animations.js',
  '/content/lessons.json',
  '/content/quizzes.json',
  '/ui/assets/icon-192.png',
  '/ui/assets/icon-512.png'
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
        return new Response('Offline — content not cached', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
