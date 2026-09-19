/**
 * Client-side hash router for PyKnowledge SPA.
 */

import { renderNotFound } from './errors.js';
import { showSkeleton } from '../ui/components/loading.js';
import { animatePageEnter } from '../ui/components/animations.js';
import { observeScrollAnimations } from '../ui/components/scroll-animations.js';

const routes = new Map();
let currentRoute = '/';

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

export function getCurrentRoute() {
  const hash = window.location.hash.slice(1) || '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getRouteParts() {
  const route = getCurrentRoute();
  const parts = route.split('/').filter(Boolean);
  const base = parts.length > 0 ? `/${parts[0]}` : '/';
  return { route, parts, base };
}

export async function handleRoute() {
  const main = document.getElementById('main-content');
  if (!main) return;

  const { route, parts, base } = getRouteParts();
  currentRoute = route;

  const handler = routes.get(base);
  if (!handler) {
    renderNotFound(main);
    document.title = 'Not Found — PyKnowledge';
    return;
  }

  // Exit current content
  const current = main.querySelector('.page-content');
  if (current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    current.classList.add('view-exit');
    await new Promise(r => setTimeout(r, 200));
  }

  showSkeleton(main);

  const params = parts.slice(1);
  await handler(main, params, route);
  updatePageTitle(base, params);
  focusMainContent();

  const pageContent = main.querySelector('.page-content') || main.firstElementChild;
  if (pageContent && !pageContent.classList.contains('auth-screen')) {
    // Enter new content
    pageContent.classList.add('view-enter');
    requestAnimationFrame(() => {
      pageContent.classList.add('view-enter-active');
      pageContent.addEventListener('transitionend', () => {
        pageContent.classList.remove('view-enter', 'view-enter-active');
      }, { once: true });
    });
    
    // Stagger children
    const items = pageContent.querySelectorAll('.animate-item');
    items.forEach((item, i) => {
      item.style.transitionDelay = `${i * 60}ms`;
      requestAnimationFrame(() => item.classList.add('is-visible'));
    });
    
    // Observe scroll animations
    observeScrollAnimations(main);
  }
}

function updatePageTitle(base, _params) {
  const titles = {
    '/': 'Home',
    '/dashboard': 'Dashboard',
    '/module': 'Module',
    '/lesson': 'Lesson',
    '/quiz': 'Quiz',
    '/progress': 'Progress',
    '/login': 'Sign In'
  };
  const section = titles[base] || 'PyKnowledge';
  document.title = `${section} — PyKnowledge`;
}

function focusMainContent() {
  const main = document.getElementById('main-content');
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  }
}

export function initRouter() {
  window.addEventListener('hashchange', () => handleRoute().catch(console.error));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.location.hash !== '#/') {
      navigate('/');
    }
  });

  return handleRoute();
}

export { currentRoute };
