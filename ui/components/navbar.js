/**
 * Navigation bar component.
 */

export function renderNavbar(container) {
  if (!container) return;

  container.innerHTML = `
    <ul class="nav-list">
      <li><a href="#/">Dashboard</a></li>
      <li><a href="#/progress">Progress</a></li>
    </ul>`;
}
