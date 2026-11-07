/**
 * FX tier detector — sets <html data-fx="off|lite|full">.
 * off: prefers-reduced-motion
 * lite: deviceMemory<=2 or hardwareConcurrency<=2, or rAF probe <45fps
 * full: everything else
 * User override: localStorage 'pk-fx' wins, persisted choice.
 */
const KEY = 'pk-fx';
const TIERS = ['off', 'lite', 'full'];

export function readFxOverride() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function writeFxOverride(tier) {
  try { localStorage.setItem(KEY, tier); } catch { /* private mode */ }
}

export function getFxTier() {
  return document.documentElement.getAttribute('data-fx') || 'off';
}

function autoDetect() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) return 'off';
  const nav = navigator;
  if ((nav.deviceMemory && nav.deviceMemory <= 2) ||
      (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2)) return 'lite';
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = () => {
      frames++;
      if (performance.now() - start < 500) { requestAnimationFrame(tick); return; }
      resolve(frames / (performance.now() - start) * 1000 >= 45 ? 'full' : 'lite');
    };
    requestAnimationFrame(tick);
  });
}

export async function initFxTier() {
  const saved = readFxOverride();
  if (saved && TIERS.includes(saved)) {
    document.documentElement.setAttribute('data-fx', saved);
    return saved;
  }
  const tier = await autoDetect();
  document.documentElement.setAttribute('data-fx', tier);
  return tier;
}
