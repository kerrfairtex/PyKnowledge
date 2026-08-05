/**
 * Page transition and entrance animation utilities.
 */

import { escapeHtml } from '../../utils/sanitize.js';

export function animatePageEnter(container) {
  if (!container) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  container.classList.remove('page-exit');
  container.classList.add('page-enter');
  requestAnimationFrame(() => {
    container.classList.add('page-enter-active');
  });

  const cleanup = () => {
    container.classList.remove('page-enter', 'page-enter-active');
    container.removeEventListener('transitionend', cleanup);
  };
  container.addEventListener('transitionend', cleanup);
}

export function staggerChildren(container, selector = '.animate-item') {
  if (!container) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const items = container.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.style.animationDelay = `${i * 80}ms`;
    el.classList.add('stagger-in');
  });
}

export function pulseElement(el) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.add('pulse-once');
  el.addEventListener('animationend', () => el.classList.remove('pulse-once'), { once: true });
}

export function celebrateAchievement(title) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `
    <div class="celebration-content">
      <div class="celebration-icon" aria-hidden="true">🏆</div>
      <p class="celebration-title">Achievement Unlocked!</p>
      <p class="celebration-name">${escapeHtml(title)}</p>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('celebration-active'));

  setTimeout(() => {
    overlay.classList.remove('celebration-active');
    setTimeout(() => overlay.remove(), 400);
  }, 2500);
}
