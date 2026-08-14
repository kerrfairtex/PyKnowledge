/**
 * Dashboard — module selection and progress overview.
 */

import { checkPrerequisite, getModuleProgress, getOverallProgress } from '../../storage/progress.js';
import { renderProgressBar } from '../../ui/components/progress-bar.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { getActiveUser } from '../../storage/auth.js';
import { animatePageEnter, staggerChildren } from '../../ui/components/animations.js';

export function renderDashboard(main, _params, _route, lessonsData) {
  const overall = getOverallProgress(lessonsData);
  const user = getActiveUser();
  const greeting = user ? `Welcome back, ${escapeHtml(user.displayName)}` : 'Welcome';

  const modulesHtml = lessonsData.modules.map((mod) => {
    const prereq = checkPrerequisite(mod.id, lessonsData);
    const modProgress = getModuleProgress(mod.id, lessonsData);
    const locked = !prereq.allowed;

    return `
      <article class="module-card animate-item ${locked ? 'locked' : ''}" aria-labelledby="mod-${escapeHtml(mod.id)}">
        <div class="module-card-header">
          <h3 id="mod-${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</h3>
          ${locked ? '<span class="module-lock-icon" aria-hidden="true">🔒</span>' : ''}
        </div>
        <p>${escapeHtml(mod.description)}</p>
        ${renderProgressBar(modProgress.percent, `${modProgress.completed}/${modProgress.total} lessons`)}
        ${locked
          ? `<p class="lock-reason" role="note">${escapeHtml(prereq.reason)}</p>`
          : `<a href="#/module/${escapeHtml(mod.id)}" class="btn btn-primary">Start Module</a>`
        }
      </article>`;
  }).join('');

  main.innerHTML = `
    <section class="dashboard page-content" aria-labelledby="dashboard-heading">
      <div class="dashboard-hero animate-item">
        <h2 id="dashboard-heading">${greeting}</h2>
        <p class="dashboard-subtitle">Continue your Python learning journey</p>
      </div>
      <div class="overall-progress animate-item">
        <h3>Overall Progress</h3>
        ${renderProgressBar(overall.percent, `${overall.completedLessons}/${overall.totalLessons} lessons complete`)}
      </div>
      <div class="module-grid" role="list">
        ${modulesHtml}
      </div>
    </section>`;

  animatePageEnter(main);
  staggerChildren(main, '.animate-item');
}
