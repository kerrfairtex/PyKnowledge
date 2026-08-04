/**
 * Client-side hash router for PyKnowledge SPA.
 */

import { renderNotFound } from './errors.js';
import { showSkeleton } from '../ui/components/loading.js';

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

  showSkeleton(main);

  const params = parts.slice(1);
  await handler(main, params, route);
  updatePageTitle(base, params);
  focusMainContent();
}

function updatePageTitle(base, _params) {
  const titles = {
    '/': 'Dashboard',
    '/module': 'Module',
    '/lesson': 'Lesson',
    '/quiz': 'Quiz',
    '/progress': 'Progress'
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
