/**
 * Navigation bar with user menu and logout.
 */

import { getCurrentRoute } from '../../core/router.js';
import { getActiveUser, logout, hasProfiles } from '../../storage/auth.js';
import { escapeHtml } from '../../utils/sanitize.js';

function isActive(route, path) {
  if (path === '/') return route === '/';
  return route === path || route.startsWith(`${path}/`);
}

export function renderNavbar(container) {
  if (!container) return;

  const route = getCurrentRoute();
  const user = getActiveUser();

  const userMenu = user
    ? `<li role="listitem" class="nav-user">
        <span class="nav-avatar" style="--avatar-color: ${escapeHtml(user.avatar)}" aria-hidden="true">
          ${escapeHtml(user.displayName.charAt(0).toUpperCase())}
        </span>
        <span class="nav-username">${escapeHtml(user.displayName)}</span>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-logout" aria-label="Sign out">Sign out</button>
      </li>`
    : hasProfiles()
      ? `<li role="listitem"><a href="#/login" class="nav-link">Sign In</a></li>`
      : '';

  container.innerHTML = `
    <ul class="nav-list" role="list">
      <li role="listitem">
        <a href="#/" class="nav-link ${isActive(route, '/') ? 'active' : ''}" ${route === '/' ? 'aria-current="page"' : ''}>Home</a>
      </li>
      <li role="listitem">
        <a href="#/dashboard" class="nav-link ${isActive(route, '/dashboard') ? 'active' : ''}" ${route === '/dashboard' ? 'aria-current="page"' : ''}>Dashboard</a>
      </li>
      <li role="listitem">
        <a href="#/progress" class="nav-link ${isActive(route, '/progress') ? 'active' : ''}" ${route === '/progress' ? 'aria-current="page"' : ''}>Progress</a>
      </li>
      <li role="listitem">
        <a href="#/library" class="nav-link ${isActive(route, '/library') ? 'active' : ''}" ${route.startsWith('/library') ? 'aria-current="page"' : ''}>Library</a>
      </li>
      <li role="listitem">
        <a href="#/about" class="nav-link ${route.startsWith('/about') ? 'active' : ''}" ${route.startsWith('/about') ? 'aria-current="page"' : ''}>About</a>
      </li>
      ${userMenu}
    </ul>`;

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      window.location.hash = '#/login';
      window.location.reload();
    });
  }
}

export function updateNavbarActiveState() {
  const container = document.getElementById('main-nav');
  if (container) renderNavbar(container);
}
