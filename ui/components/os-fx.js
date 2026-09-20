/**
 * PyKnowledge OS — FULL-tier effects (glitch + token rain).
 * Only active at data-fx="full". All overlays pointer-events:none.
 * Glitch: <=300ms, transform/opacity only, 2 layers (info/glitch split).
 * Rain: <=20 columns, <=15fps, paused when offscreen (IntersectionObserver),
 *       paused on reduced-motion, only on the landing hero.
 */
const RAIN_TOKENS = ['def', 'for', '>>>', '0', '1', ';', 'import', 'return', 'if', 'print'];

export function initOsFx() {
  const fx = document.documentElement.getAttribute('data-fx');
  if (fx !== 'full') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  initGlitch();
  initRain();
}

/* ---- RGB-split glitch ---- */
function glitchEl(el) {
  if (!el || el.dataset.osGlitching === '1') return;
  el.dataset.osGlitching = '1';
  el.classList.add('os-glitch');
  setTimeout(() => {
    el.classList.remove('os-glitch');
    delete el.dataset.osGlitching;
  }, 300);
}

function initGlitch() {
  // Route change: glitch the page content container
  window.addEventListener('hashchange', () => {
    const main = document.getElementById('main-content');
    if (main) requestAnimationFrame(() => glitchEl(main));
  });
  // Wrong answer / unlock: glitch elements that get [FAIL]/ACCESS DENIED text
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const text = node.textContent || '';
        if (text.includes('[FAIL]') || text.includes('ACCESS DENIED')) glitchEl(node);
        if (text.includes('UNLOCKED') || text.includes('ACCESS GRANTED')) glitchEl(node);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ---- Landing token rain (hero only) ---- */
function initRain() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  if (typeof IntersectionObserver === 'undefined') return;

  const cols = Math.min(20, Math.max(8, Math.floor(hero.clientWidth / 48)));
  const rain = document.createElement('div');
  rain.className = 'os-rain';
  rain.setAttribute('aria-hidden', 'true');
  const spans = [];
  for (let i = 0; i < cols; i++) {
    const col = document.createElement('span');
    col.className = 'os-rain-col';
    col.style.left = `${(i / cols) * 100}%`;
    col.style.animationDelay = `${(i * 0.37) % 3}s`;
    col.textContent = Array.from({ length: 12 }, () =>
      RAIN_TOKENS[Math.floor(Math.random() * RAIN_TOKENS.length)]).join('\n');
    rain.appendChild(col);
    spans.push(col);
  }
  hero.appendChild(rain);

  // Pause when hero offscreen (and on visibilitychange)
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    rain.classList.toggle('is-paused', !visible);
  });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => {
    rain.classList.toggle('is-paused', document.hidden || !visible);
  });
}
