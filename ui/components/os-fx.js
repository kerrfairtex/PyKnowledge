/**
 * PyKnowledge OS — FULL-tier effects (glitch + token rain).
 * Only active at data-fx="full". All overlays pointer-events:none.
 * Glitch: <=300ms, transform/opacity only, 2 layers (info/glitch split).
 * Rain: <=20 columns, <=15fps, paused when offscreen (IntersectionObserver),
 *       paused on reduced-motion, only on the landing hero.
 */
export function initOsFx() {
  const fx = document.documentElement.getAttribute('data-fx');
  if (fx !== 'full') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  initGlitch();
  // Rain is now the unified matrix-rain.js module (landing + SPA, one canvas).
}

/* ---- RGB-split glitch ---- */
function glitchEl(el) {
  if (!el || el.dataset.osGlitching === '1') return;
  el.dataset.osGlitching = '1';
  // pseudo-layers read this for the RGB-split text
  el.setAttribute('data-os-label', (el.textContent || '').slice(0, 120));
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

