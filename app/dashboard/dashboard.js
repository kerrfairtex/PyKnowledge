/**
 * Dashboard — module selection and progress overview.
 */

import { checkPrerequisite, getModuleProgress, getOverallProgress } from '../../storage/progress.js';
import { renderProgressBar } from '../../ui/components/progress-bar.js';
import { escapeHtml } from '../../utils/sanitize.js';

export function renderDashboard(main, _params, _route, lessonsData) {
  const overall = getOverallProgress(lessonsData);

  const modulesHtml = lessonsData.modules.map((mod) => {
    const prereq = checkPrerequisite(mod.id, lessonsData);
    const modProgress = getModuleProgress(mod.id, lessonsData);
    const locked = !prereq.allowed;

    return `
      <article class="module-card ${locked ? 'locked' : ''}" aria-labelledby="mod-${escapeHtml(mod.id)}">
        <h3 id="mod-${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</h3>
        <p>${escapeHtml(mod.description)}</p>
        ${renderProgressBar(modProgress.percent, `${modProgress.completed}/${modProgress.total} lessons`)}
        ${locked
          ? `<p class="lock-reason" role="note">${escapeHtml(prereq.reason)}</p>`
          : `<a href="#/module/${escapeHtml(mod.id)}" class="btn btn-primary">Start Module</a>`
        }
      </article>`;
  }).join('');

  main.innerHTML = `
    <section class="dashboard" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading">Dashboard</h2>
      <div class="overall-progress">
        <h3>Overall Progress</h3>
        ${renderProgressBar(overall.percent, `${overall.completedLessons}/${overall.totalLessons} lessons complete`)}
      </div>
      <div class="module-grid" role="list">
        ${modulesHtml}
      </div>
    </section>`;
}
