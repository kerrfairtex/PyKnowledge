/**
 * Progress dashboard — achievements and detailed progress view.
 */

import { getOverallProgress, getModuleProgress } from '../../storage/progress.js';
import { getAchievements } from '../../storage/achievements.js';
import { renderProgressBar } from '../../ui/components/progress-bar.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { animatePageEnter } from '../../ui/components/animations.js';

export function renderProgressDashboard(main, lessonsData) {
  const overall = getOverallProgress(lessonsData);
  const achievements = getAchievements(lessonsData);

  const modulesHtml = lessonsData.modules.map((mod) => {
    const modProgress = getModuleProgress(mod.id, lessonsData);
    return `
      <div class="progress-module">
        <h4>${escapeHtml(mod.title)}</h4>
        ${renderProgressBar(modProgress.percent, `${modProgress.completed}/${modProgress.total}`)}
      </div>`;
  }).join('');

  const achievementsHtml = achievements.map((a) => `
    <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
      <span class="achievement-icon" aria-hidden="true">${a.unlocked ? '🏆' : '🔒'}</span>
      <div>
        <strong>${escapeHtml(a.title)}</strong>
        <p>${escapeHtml(a.description)}</p>
      </div>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="progress-dashboard page-content" aria-labelledby="progress-heading">
      <h2 id="progress-heading">Your Progress</h2>
      <div class="overall-progress">
        ${renderProgressBar(overall.percent, `${overall.completedLessons} of ${overall.totalLessons} lessons`)}
      </div>
      <h3>Modules</h3>
      <div class="progress-modules">${modulesHtml}</div>
      <h3>Achievements</h3>
      <div class="achievements-grid" role="list">${achievementsHtml}</div>
      <a href="#/" class="btn btn-secondary">Back to Dashboard</a>
    </section>`;

  animatePageEnter(main.querySelector('.page-content'));
}
