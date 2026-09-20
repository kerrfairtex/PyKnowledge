/**
 * Navigation bar with routes and a LearnHouse-style user menu.
 *
 * User menu pattern (from learnhouse/learnhouse DashLeftMenu.tsx):
 * the avatar is the MENU TRIGGER — click opens a dropdown with identity
 * info (name, profile meta) and actions (settings entry, sign out).
 * The avatar is never a dead decoration.
 */

import { getCurrentRoute } from '../../core/router.js';
import { getActiveUser, logout, hasProfiles } from '../../storage/auth.js';
import { escapeHtml } from '../../utils/sanitize.js';

let navbarDocHandlersBound = false;

function isActive(route, path) {
  if (path === '/') return route === '/';
  return route === path || route.startsWith(`${path}/`);
}

export function renderNavbar(container) {
  if (!container) return;

  const route = getCurrentRoute();
  const user = getActiveUser();
  const isRealUser = user && !user.isGuest;
  const isGuest = user && user.isGuest;

  // Real user: avatar dropdown trigger (LearnHouse pattern)
  // Guest: plain "Guest" pill + sign out
  // No one: show "Sign In" if profiles exist, else nothing
  const userMenu = isRealUser
    ? `
      <li role="listitem" class="nav-user">
        <button type="button" class="nav-avatar-trigger" id="btn-user-menu"
          aria-haspopup="true" aria-expanded="false"
          aria-label="Account menu for ${escapeHtml(user.displayName)}">
          <span class="nav-avatar" style="--avatar-color: ${escapeHtml(user.avatar)}" aria-hidden="true">
            ${escapeHtml(user.displayName.charAt(0).toUpperCase())}
          </span>
          <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="nav-dropdown" id="user-menu-dropdown" role="menu" aria-label="Account" hidden>
          <div class="nav-dropdown-header">
            <p class="nav-dropdown-name">${escapeHtml(user.displayName)}</p>
            <p class="nav-dropdown-meta">Local profile · saved on this device</p>
          </div>
          <a role="menuitem" href="#/progress" class="nav-dropdown-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M4 19.5V6.5"/></svg>
            <span>My progress</span>
          </a>
          <a role="menuitem" href="#/about" class="nav-dropdown-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
            <span>About this app</span>
          </a>
          <div class="nav-dropdown-separator" role="separator"></div>
          <button type="button" role="menuitem" class="nav-dropdown-item nav-dropdown-danger" id="btn-logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>
            <span>Sign out</span>
          </button>
        </div>
      </li>`
    : isGuest
      ? `<li role="listitem"><span class="nav-username">Guest</span></li>
         <li role="listitem"><button type="button" class="btn btn-ghost btn-sm" id="btn-logout" aria-label="Sign out">Sign out</button></li>`
      : hasProfiles()
        ? `<li role="listitem"><a href="#/login" class="nav-link">Sign In</a></li>`
        : '';

  container.innerHTML = `
    <ul class="nav-list" role="list">
      <li role="listitem">
        <a href="#top" class="nav-link nav-home-link" aria-label="Back to landing page">Home</a>
      </li>
      <li role="listitem">
        <a href="#/dashboard" class="nav-link ${isActive(route, '/dashboard') ? 'active' : ''}">Dashboard</a>
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

  // Document-level dropdown handlers: bind ONCE per page load, not per
  // render (renderNavbar re-runs on every route change via
  // updateNavbarActiveState — rebinding would leak listeners).
  if (!navbarDocHandlersBound) {
    navbarDocHandlersBound = true;
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('user-menu-dropdown');
      const trig = document.getElementById('btn-user-menu');
      if (dd && !dd.hidden && !dd.contains(e.target) && e.target !== trig) {
        dd.hidden = true;
        const t = document.getElementById('btn-user-menu');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      const dd = document.getElementById('user-menu-dropdown');
      if (e.key === 'Escape' && dd && !dd.hidden) {
        dd.hidden = true;
        const t = document.getElementById('btn-user-menu');
        if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); }
      }
    });
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      window.location.hash = '#/login';
      window.location.reload();
    });
  }

  // Avatar dropdown (only when the real-user menu rendered)
  const trigger = document.getElementById('btn-user-menu');
  const dropdown = document.getElementById('user-menu-dropdown');
  if (trigger && dropdown) {
    const setOpen = (open) => {
      dropdown.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
    };
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(dropdown.hidden);
    });
  }
}

export function updateNavbarActiveState() {
  const container = document.getElementById('main-nav');
  if (container) renderNavbar(container);
}
