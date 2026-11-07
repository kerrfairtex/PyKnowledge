/**
 * Offline download progress — grounded in real cache state.
 *
 * The service worker posts {type:'CACHE_PROGRESS', done, total} during its
 * install phase. This component renders that as a 0–100% indicator with a
 * remaining-files countdown above it. 100% is ONLY shown after the SW's
 * verification pass confirms every expected asset is in the cache — never
 * estimated. On verified completion a CENTERED modal notification appears
 * (Chrome-standard: role=alertdialog, focus management, Esc/dismiss).
 */

import { escapeHtml } from '../../utils/sanitize.js';

const CONTAINER_ID = 'cacheProgress';
const BANNER_ID = 'cacheCompleteBanner';
const AUTO_DISMISS_MS = 8000;

export function initCacheProgress() {
  if (!('serviceWorker' in navigator)) return;

  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'cache-progress';
    document.body.appendChild(container);
  }

  let completed = false;

  function renderCountdown(done, total, pct) {
    const remaining = Math.max(total - done, 0);
    return `
      <div class="cache-countdown" aria-hidden="true">
        <span class="cache-countdown-num">${remaining}</span>
        <span class="cache-countdown-label">file${remaining === 1 ? '' : 's'} left</span>
      </div>
      <span class="cache-progress-label">Preparing offline mode…
        ${escapeHtml(String(done))}/${escapeHtml(String(total))} (${pct}%)</span>`;
  }

  function renderBar(pct) {
    return `
      <div class="cache-progress-track">
        <div class="cache-progress-fill" style="width:${pct}%"></div>
      </div>`;
  }

  function renderProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (completed) return;
    container.innerHTML = `
      <div class="cache-progress-inner" role="status"
        aria-label="Downloading app for offline use: ${pct}% complete">
        ${renderCountdown(done, total, pct)}
        ${renderBar(pct)}
      </div>`;
  }

  function showCenteredNotification(total) {
    completed = true;
    container.innerHTML = '';

    // Remove any previous banner (re-verification, repeat visits).
    document.getElementById(BANNER_ID)?.remove();

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'cache-complete-banner';
    banner.setAttribute('role', 'alertdialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cache-banner-title');
    banner.innerHTML = `
      <div class="cache-complete-card">
        <div class="cache-complete-icon" aria-hidden="true">✓</div>
        <h2 id="cache-banner-title">Ready for offline mode</h2>
        <p>All ${escapeHtml(String(total))} files saved to this device.
          PyKnowledge now works with zero internet connection.</p>
        <button type="button" class="btn btn-primary btn-sm" id="cache-banner-ok">Got it</button>
      </div>`;

    document.body.appendChild(banner);

    const dismiss = () => {
      banner.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };

    document.getElementById('cache-banner-ok').addEventListener('click', dismiss);
    document.addEventListener('keydown', onKey);

    // Auto-dismiss so it never blocks the UI if ignored.
    setTimeout(() => { if (document.body.contains(banner)) dismiss(); }, AUTO_DISMISS_MS);

    // Move focus to the action button (a11y: announce + keyboard-ready).
    requestAnimationFrame(() => document.getElementById('cache-banner-ok')?.focus());
  }

  function render(done, total, verified) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (verified && pct >= 100) {
      showCenteredNotification(total);
      return;
    }
    renderProgress(done, total);
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.type !== 'CACHE_PROGRESS') return;
    render(data.done, data.total, data.verified === true);
  });

  navigator.serviceWorker.ready.then(async (registration) => {
    // Ask the active SW for current state (handles page loaded mid-install).
    registration.active?.postMessage({ type: 'GET_CACHE_PROGRESS' });
  }).catch(() => { /* no SW — indicator stays silent */ });

  // Direct cache probe: covers SW already-installed-before-page-load and
  // offline reloads where the SW can't respond over the message channel.
  if ('caches' in window) {
    caches.keys().then(async (keys) => {
      for (const key of keys) {
        if (!key.startsWith('pyknowledge-v')) continue;
        try {
          const cache = await caches.open(key);
          const count = (await cache.keys()).length;
          if (count > 0 && !completed) {
            // Count-based fallback only; verified=true arrives via SW message
            // or GET_CACHE_PROGRESS. Show quiet complete state, no fanfare.
            if (count >= 62) {
              completed = true;
              container.innerHTML = '';
            } else {
              renderProgress(count, 62);
            }
          }
        } catch { /* cache unavailable — stay silent */ }
      }
    }).catch(() => { /* private-mode or disabled storage — silent */ });
  }
}
