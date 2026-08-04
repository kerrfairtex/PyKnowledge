/**
 * Navigation bar component with accessibility support.
 */

import { getCurrentRoute } from '../../core/router.js';

export function renderNavbar(container) {
  if (!container) return;

  const route = getCurrentRoute();

  container.innerHTML = `
    <ul class="nav-list" role="list">
      <li role="listitem">
        <a href="#/" class="nav-link ${route === '/' ? 'active' : ''}" ${route === '/' ? 'aria-current="page"' : ''}>Dashboard</a>
      </li>
      <li role="listitem">
        <a href="#/progress" class="nav-link ${route === '/progress' ? 'active' : ''}" ${route === '/progress' ? 'aria-current="page"' : ''}>Progress</a>
      </li>
    </ul>`;
}

export function updateNavbarActiveState() {
  const container = document.getElementById('main-nav');
  if (container) renderNavbar(container);
}
