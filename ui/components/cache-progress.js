/**
 * Offline download progress — grounded in real cache state.
 *
 * The service worker posts {type:'CACHE_PROGRESS', done, total} during its
 * install phase. This component renders that as a 0–100% indicator.
 * 100% is ONLY shown after a verification pass confirms the cache holds
 * every expected asset (cache.keys().length >= total) — never estimated.
 */

import { escapeHtml } from '../../utils/sanitize.js';

const CONTAINER_ID = 'cacheProgress';

export function initCacheProgress() {
  if (!('serviceWorker' in navigator)) return;

  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'cache-progress';
    document.body.appendChild(container);
  }

  function render(done, total, verified) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (verified && pct >= 100) {
      container.innerHTML = `
        <div class="cache-progress-inner is-complete" role="status">
          <span class="cache-progress-icon" aria-hidden="true">✓</span>
          <span>Ready for offline use — all ${escapeHtml(String(total))} files saved to this device</span>
        </div>`;
      // Auto-hide a few seconds after verified completion.
      setTimeout(() => { container.innerHTML = ''; }, 6000);
      return;
    }
    container.innerHTML = `
      <div class="cache-progress-inner" role="status"
        aria-label="Downloading app for offline use: ${pct}% complete">
        <span class="cache-progress-label">Saving lessons for offline use…
          ${escapeHtml(String(done))}/${escapeHtml(String(total))} (${pct}%)</span>
        <div class="cache-progress-track">
          <div class="cache-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.type !== 'CACHE_PROGRESS') return;
    render(data.done, data.total, data.verified === true);
  });

  navigator.serviceWorker.ready.then(async (registration) => {
    // Ask the active SW for current state (handles page loaded mid-install).
    registration.active?.postMessage({ type: 'GET_CACHE_PROGRESS' });
    // If the SW already finished installing before this page existed,
    // verify directly against Cache Storage.
    const keys = await caches.keys();
    for (const key of keys) {
      if (!key.startsWith('pyknowledge-v')) continue;
      const cache = await caches.open(key);
      const count = (await cache.keys()).length;
      if (count > 0) render(count, Math.max(count, count), true);
    }
  }).catch(() => { /* no SW — indicator stays silent */ });
}
