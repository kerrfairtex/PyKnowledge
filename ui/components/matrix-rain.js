/**
 * PyKnowledge — Matrix rain background (unified, landing + SPA).
 * One canvas, one module. Loaded lazily; never blocks first paint.
 * Tier + mode + theme aware. ASCII glyphs, 30% Python-token streams.
 */
const FX_KEY = 'pyknowledge_fx';

const GLYPHS = '01{}[]()<>=+-*/\\|;:#_$%&abcdef0123456789'.split('');
const PY_TOKENS = ['def','class','for','in','if','else','while','return','import','print','range','len','True','False','None','lambda'];

// Route modes by hash prefix (spec section 8). Plain config object.
const ROUTE_MODES = { '#/lesson': 'dim', '#/quiz': 'dim', '#/progress': 'dim', '#/library': 'dim', '#/about': 'dim' };
const DEFAULT_MODE = 'full';
const TIERS = { lite: { cell: 20, scale: 0.5, alphaMul: 0.9 }, full: { cell: 16, scale: 1, alphaMul: 1 } };
const MODES = { full: { fps: 20, mul: 1 }, dim: { fps: 8, mul: 0.35 } };

let canvas = null, ctx = null;
let cols = 0, y = null, speed = null, stream = null;
let tier = 'full';        // off|lite|full
let mode = 'full';        // full|dim|off
let rafId = 0, last = 0, frames = 0;
const css = { trail: '#3dff9a', head: '#d8ffea', bg: '#04090b', fade: 0.09, alpha: 0.22 };
let resizeTimer = 0, themeObs = null, running = false;
const drawTimes = new Float32Array(60); let drawIdx = 0;
let burstUntil = 0;
let startupGraceUntil = performance.now() + 2000;

function readCss() {
  const s = getComputedStyle(document.documentElement);
  css.trail = s.getPropertyValue('--ok').trim() || css.trail;
  css.head = s.getPropertyValue('--rain-head').trim() || css.head;
  css.bg = s.getPropertyValue('--bg').trim() || css.bg;
  const f = parseFloat(s.getPropertyValue('--rain-fade'));
  if (!Number.isNaN(f)) css.fade = f;
  const a = parseFloat(s.getPropertyValue('--rain-alpha'));
  if (!Number.isNaN(a)) css.alpha = a;
}

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.id = 'rainCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  ctx = canvas.getContext('2d');
  return canvas;
}

function layout() {
  const c = TIERS[tier] || TIERS.full;
  const W = window.innerWidth, H = window.innerHeight;
  const scale = c.scale;
  canvas.width = Math.max(1, Math.floor(W * scale));
  canvas.height = Math.max(1, Math.floor(H * scale));
  cols = Math.max(1, Math.floor(canvas.width / c.cell));
  y = new Float32Array(cols);
  speed = new Float32Array(cols);
  stream = new Array(cols).fill(null);
  for (let i = 0; i < cols; i++) {
    y[i] = Math.random() * -40;
    speed[i] = 0.4 + Math.random() * 0.8;
  }
  // paint opaque bg so the page never flashes through
  ctx.fillStyle = css.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function pickStream() {
  if (Math.random() < 0.3) {
    const t = PY_TOKENS[(Math.random() * PY_TOKENS.length) | 0].split('');
    return { chars: t, i: 0 };
  }
  return null;
}

function glyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

function effective() {
  const t = TIERS[tier] || TIERS.full;
  const m = MODES[mode] || MODES.full;
  return { cell: t.cell, scale: t.scale, fps: m.fps, alphaMul: t.alphaMul * m.mul };
}

function frame(t) {
  rafId = requestAnimationFrame(frame);
  if (document.hidden) return;

  // Self-protect: sample EVERY tick (before fps throttle) so we catch
  // browser-scheduling jank too, not just our draw time. 2s startup grace
  // lets the JIT + cache settle before we measure.
  if (last > 0 && startupGraceUntil < performance.now()) {
    const interval = t - last;
    drawTimes[drawIdx++ % 60] = interval;
    if (drawIdx >= 60 && drawIdx % 60 === 0) {
      let sum = 0; for (let i = 0; i < 60; i++) sum += drawTimes[i];
      if (sum / 60 > 24) {
        // Session-only drop: never write to pyknowledge_fx (user choice wins).
        if (tier === 'full') { tier = 'lite'; applyState(); }
        else if (tier === 'lite') { tier = 'off'; applyState(); }
        drawIdx = 0;
      }
    }
  }

  const e = effective();
  if (t - last < 1000 / e.fps) return;
  last = t; frames++; if (frames % 300 === 0) console.debug('[rain] frames', frames);

  // trail fade (translucent bg) — no residue at fade .09
  ctx.globalAlpha = css.fade;
  ctx.fillStyle = css.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  const burst = performance.now() < burstUntil;
  ctx.font = `${14 * e.scale}px "JetBrains Mono", monospace`;
  ctx.fillStyle = css.head;

  // Head glyph in head color; the translucent bg fade above leaves the trail.
  for (let c = 0; c < cols; c++) {
    const x = c * e.cell;
    const py = (y[c] | 0) * e.cell;
    let ch;
    if (stream[c]) {
      ch = stream[c].chars[stream[c].i++];
      if (stream[c].i >= stream[c].chars.length) stream[c] = null;
    } else ch = glyph();
    ctx.fillText(ch, x, py + e.cell);
    y[c] += speed[c] * (burst ? 2 : 1);
    if (py > canvas.height && Math.random() > 0.975) {
      y[c] = 0; stream[c] = pickStream();
    }
  }
}

function startLoop() {
  if (running || tier === 'off' || mode === 'off') return;
  running = true;
  last = 0;
  rafId = requestAnimationFrame(frame);
}
function stopLoop() {
  running = false;
  cancelAnimationFrame(rafId);
}

function staticFrame() {
  // reduced-motion: one faint frame of columns, no loop
  readCss(); ensureCanvas(); layout();
  const e = effective();
  ctx.font = `${14 * e.scale}px "JetBrains Mono", monospace`;
  ctx.fillStyle = css.trail;
  ctx.globalAlpha = 0.35;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < canvas.height / e.cell; r += 3)
      if (Math.random() < 0.3) ctx.fillText(glyph(), c * e.cell, r * e.cell);
  ctx.globalAlpha = 1;
  canvas.style.opacity = String(css.alpha * 0.5);
}

function routeMode(hash) {
  for (const k in ROUTE_MODES) if (hash.startsWith(k)) return ROUTE_MODES[k];
  return DEFAULT_MODE;
}

function applyState() {
  const saved = readFx();
  if (saved) tier = saved;
  mode = routeMode(window.location.hash);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stopLoop(); staticFrame(); return;
  }
  if (tier === 'off' || mode === 'off') { stopLoop(); if (canvas) canvas.style.opacity = '0'; return; }
  readCss(); ensureCanvas(); layout();
  canvas.style.opacity = String(Math.min(1, css.alpha * effective().alphaMul));
  startLoop();
}

function readFx() {
  try { return localStorage.getItem(FX_KEY); } catch { return null; }
}
function writeFx(v) {
  try { localStorage.setItem(FX_KEY, v); } catch { /* private mode */ }
}

// ---- public API ----
export function startRain() {
  if (typeof performance !== 'undefined' && performance.mark) {
    try { performance.mark('rain-init'); } catch {}
  }
  applyState();
  if (!themeObs) {
    themeObs = new MutationObserver(() => { readCss(); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-fx'] });
  }
}
export function stopRain() {
  stopLoop();
  if (canvas) canvas.style.opacity = '0';
}
export function setRainMode(m) {
  mode = m;
  if (m === 'off') { stopRain(); return; }
  applyState();
}
export function setRainTier(t) {
  tier = t; writeFx(t);
  if (t === 'off') { stopRain(); if (canvas) canvas.style.opacity = '0'; return; }
  applyState();
}

// ---- events (listen only) ----
window.addEventListener('hashchange', () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const m = routeMode(window.location.hash);
  if (m !== mode) {
    drawIdx = 0; // reset jank window on route change
    startupGraceUntil = performance.now() + 500;
    setRainMode(m);
  }
});
window.addEventListener('pk:rain', (e) => {
  burstUntil = performance.now() + (e.detail?.burst || 600);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else if (tier !== 'off' && mode !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawIdx = 0; // reset jank window on resume
    startupGraceUntil = performance.now() + 500;
    startLoop();
  }
});
window.addEventListener('resize', () => {
  stopLoop();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (tier !== 'off' && mode !== 'off' && !document.hidden) { layout(); startLoop(); }
  }, 200);
});

// Watch for data-fx changes (palette toggle)
const fxObs = new MutationObserver(() => {
  const fx = document.documentElement.dataset.fx || 'full';
  if (fx === 'off') setRainTier('off');
  else if (fx === 'lite') setRainTier('lite');
  else setRainTier('full');
});
fxObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-fx'] });
