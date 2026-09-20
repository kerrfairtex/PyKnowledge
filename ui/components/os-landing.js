/**
 * PyKnowledge OS — landing boot log + typed headline.
 * Boot log lines are fed by REAL cache counts from the SW
 * (CACHE_PROGRESS messages / caches API probe). First visit only,
 * <=2s total, tap or Enter to skip. No fake values.
 */
import { initCacheProgress } from './cache-progress.js';

const SEEN_KEY = 'pk-bootlog-seen';
const MAX_MS = 2000;

export function initLandingFx() {
  initBootlog();
  initTypedHeadline();
}

/* ---- Boot log ---- */
function initBootlog() {
  const el = document.getElementById('osBootlog');
  const lines = document.getElementById('osBootlogLines');
  const skip = document.getElementById('osBootlogSkip');
  if (!el || !lines || !skip) return;

  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { }
  if (seen) return;

  el.hidden = false;
  const started = performance.now();
  let done = false;
  const log = (text) => {
    if (done) return;
    lines.textContent += text + '\n';
  };

  log('pyknowledge-os v0.12.0');
  log('checking offline assets…');

  // Real counts: probe the Cache API directly (works even without SW messages)
  const finish = () => {
    if (done) return;
    done = true;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { }
    el.classList.add('is-done');
    setTimeout(() => { el.hidden = true; }, 300);
  };

  if (typeof caches !== 'undefined' && caches) {
    caches.keys().then(async (keys) => {
      let count = 0;
      for (const key of keys) {
        if (!key.startsWith('pyknowledge-v')) continue;
        try {
          const cache = await caches.open(key);
          count += (await cache.keys()).length;
        } catch { }
      }
      log(`cache: ${count} assets verified`);
      finish();
    }).catch(() => { log('cache: probe unavailable'); finish(); });
  } else {
    log('cache: API unavailable');
    finish();
  }

  // Hard cap 2s regardless of cache speed
  setTimeout(finish, MAX_MS - (performance.now() - started));

  skip.addEventListener('click', finish);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      finish();
      document.removeEventListener('keydown', onKey);
    }
  });
}

/* ---- Typed headline (text stays in DOM for screen readers) ---- */
function initTypedHeadline() {
  const h1 = document.getElementById('heroHeadline');
  const target = h1 && h1.querySelector('.hl');
  if (!target) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = document.documentElement.getAttribute('data-fx') || 'off';
  if (reduced || fx === 'off') return; // static headline, full text intact

  const full = target.textContent;
  target.setAttribute('aria-label', full);
  target.textContent = '';
  let i = 0;
  const step = () => {
    if (i <= full.length) {
      target.textContent = full.slice(0, i);
      i++;
      setTimeout(step, 18);
    }
  };
  setTimeout(step, 200);
}
