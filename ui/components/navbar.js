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

function isActive(route, path) {
  if (path === '/') return route === '/';
  return route === path || route.startsWith(`${path}/`);
}

let tabBarInitialized = false;

export function renderNavbar(container) {
  if (!container) return;

  const route = getCurrentRoute();
  const user = getActiveUser();
  const isRealUser = user && !user.isGuest;
  const isGuest = user && user.isGuest;

  if (!tabBarInitialized) {
    initTabBar();
    initStatusPill();
    tabBarInitialized = true;
  }

  // Real user: avatar dropdown trigger (LearnHouse pattern)
  // Guest: plain "Guest" pill + sign out
  // No one: show "Sign In" if profiles exist, else nothing
  const userMenu = isRealUser
    ? `
      <li role="listitem" class="nav-user">
        <button type="button" class="nav-avatar-trigger" id="btn-user-menu"
          aria-expanded="false"
          aria-label="Account menu for ${escapeHtml(user.displayName)}">
          <span class="nav-avatar" style="--avatar-color: ${escapeHtml(user.avatar)}" aria-hidden="true">
            ${escapeHtml(user.displayName.charAt(0).toUpperCase())}
          </span>
          <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <dialog class="nav-dialog" id="user-menu-dialog" aria-label="Account menu">
          <div class="nav-dialog-pane">
            <div class="nav-dialog-header">
              <p class="nav-dialog-name">${escapeHtml(user.displayName)}</p>
              <p class="nav-dialog-meta">Local profile · saved on this device</p>
            </div>
            <a role="menuitem" href="#/progress" class="nav-dialog-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M4 19.5V6.5"/></svg>
              <span>My progress</span>
            </a>
            <a role="menuitem" href="#/about" class="nav-dialog-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
              <span>About this app</span>
            </a>
            <div class="nav-dialog-separator" role="separator"></div>
            <button type="button" role="menuitem" class="nav-dialog-item nav-dialog-danger" id="btn-logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>
              <span>Sign out</span>
            </button>
          </div>
        </dialog>
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

  // Dialog handlers: bound per-render on the elements. renderNavbar
  // re-runs on every route change, so we (re)attach — cheap and idempotent.
  const dlg = document.getElementById('user-menu-dialog');
  const trig = document.getElementById('btn-user-menu');
  if (dlg && trig && !trig.dataset.dialogWired) {
    trig.dataset.dialogWired = '1';
    trig.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dlg.open) {
        dlg.close();
      } else {
        dlg.showModal();
        const first = dlg.querySelector('[role="menuitem"]');
        if (first) first.focus();
      }
    });
    dlg.addEventListener('close', () => {
      trig.setAttribute('aria-expanded', 'false');
      trig.focus();
    });
    dlg.addEventListener('cancel', () => trig.focus());
  }

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

// Tab bar navigation
export function initTabBar() {
  const tabBar = document.getElementById('osTabBar');
  if (!tabBar) return;

  tabBar.addEventListener('click', (e) => {
    const tab = e.target.closest('.os-tab');
    if (!tab) return;

    const route = tab.getAttribute('data-route');
    const action = tab.getAttribute('data-action');

    if (route) {
      window.location.hash = route;
    } else if (action === 'open-sheet') {
      const dlg = document.getElementById('user-menu-dialog');
      if (dlg) {
        dlg.showModal();
        const first = dlg.querySelector('[role="menuitem"]');
        if (first) first.focus();
      }
    }
  });
}

// Status pill in header
function initStatusPill() {
  const header = document.querySelector('.app-header');
  if (!header) return;

  // Don't add if already exists
  if (document.getElementById('osShellStatus')) return;

  const pill = document.createElement('span');
  pill.className = 'os-shell-status';
  pill.id = 'osShellStatus';
  pill.textContent = 'OFFLINE';
  header.appendChild(pill);

  function updatePill() {
    const offlineEl = document.getElementById('offlineIndicator');
    const syncEl = document.getElementById('syncStatus');
    if (offlineEl && !offlineEl.hidden) {
      pill.textContent = 'OFFLINE';
      pill.style.color = 'var(--warn, #f59e0b)';
    } else if (syncEl) {
      pill.textContent = syncEl.textContent.trim().toUpperCase();
    }
  }

  setInterval(updatePill, 1000);
  updatePill();
}


