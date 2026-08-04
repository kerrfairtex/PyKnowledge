/**
 * Client-side hash router for PyKnowledge SPA.
 */

const routes = new Map();

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

export async function handleRoute() {
  const route = getCurrentRoute();
  const main = document.getElementById('main-content');
  if (!main) return;

  const parts = route.split('/').filter(Boolean);
  const base = parts.length > 0 ? `/${parts[0]}` : '/';

  const handler = routes.get(base) || routes.get('/');
  if (handler) {
    const params = parts.slice(1);
    await handler(main, params, route);
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  return handleRoute();
}
