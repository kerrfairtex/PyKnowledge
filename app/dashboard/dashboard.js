/**
 * Dashboard — module selection and progress overview.
 */

import { checkPrerequisite, getModuleProgress, getOverallProgress } from '../../storage/progress.js';
import { renderProgressBar } from '../../ui/components/progress-bar.js';

export function renderDashboard(main, _params, _route, lessonsData) {
  const overall = getOverallProgress(lessonsData);

  const modulesHtml = lessonsData.modules.map((mod) => {
    const prereq = checkPrerequisite(mod.id, lessonsData);
    const modProgress = getModuleProgress(mod.id, lessonsData);
    const locked = !prereq.allowed;

    return `
      <article class="module-card ${locked ? 'locked' : ''}">
        <h3>${mod.title}</h3>
        <p>${mod.description}</p>
        ${renderProgressBar(modProgress.percent, `${modProgress.completed}/${modProgress.total} lessons`)}
        ${locked
          ? `<p class="lock-reason">${prereq.reason}</p>`
          : `<a href="#/module/${mod.id}" class="btn btn-primary">Start Module</a>`
        }
      </article>`;
  }).join('');

  main.innerHTML = `
    <section class="dashboard">
      <h2>Dashboard</h2>
      <div class="overall-progress">
        <h3>Overall Progress</h3>
        ${renderProgressBar(overall.percent, `${overall.completedLessons}/${overall.totalLessons} lessons complete`)}
      </div>
      <div class="module-grid">
        ${modulesHtml}
      </div>
    </section>`;
}
