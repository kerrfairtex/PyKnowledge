/**
 * Progress dashboard — achievements and detailed progress view.
 */

import { getOverallProgress, getModuleProgress } from '../../storage/progress.js';
import { getAchievements } from '../../storage/achievements.js';
import { getProgress } from '../../core/storage.js';
import { renderProgressBar } from '../../ui/components/progress-bar.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { animatePageEnter } from '../../ui/components/animations.js';

// SVG sparkline from REAL quiz scores, in lesson order. Empty state = flat baseline.
function quizScoresSparkline(lessonsData, progress) {
  const scores = lessonsData.modules
    .flatMap((m) => m.lessons)
    .map((l) => (progress.quizScores && progress.quizScores[l.id] !== null && progress.quizScores[l.id] !== undefined ? progress.quizScores[l.id] : null));
  const W = 240, H = 48, PAD = 4;
  const n = scores.length;
  const taken = scores.filter((s) => s !== null);
  const pts = scores.map((s, i) => {
    const x = PAD + (i / Math.max(n - 1, 1)) * (W - 2 * PAD);
    const y = s === null ? H - PAD : H - PAD - (s / 100) * (H - 2 * PAD);
    return { x, y, taken: s !== null };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dots = pts.filter((p) => p.taken)
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="var(--ok)" />`)
    .join('');
  const avg = taken.length ? Math.round(taken.reduce((a, b) => a + b, 0) / taken.length) : 0;
  return `
    <svg class="os-sparkline" viewBox="0 0 ${W} ${H}" role="img" aria-label="Quiz score trend: ${taken.length} quizzes taken, average ${avg}%">
      <polyline points="${line}" fill="none" stroke="var(--dim)" stroke-width="1" stroke-dasharray="2 2" />
      <polyline points="${pts.filter(p => p.taken).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"
        fill="none" stroke="var(--ok)" stroke-width="1.5" />
      ${dots}
    </svg>`;
}

export function renderProgressDashboard(main, lessonsData) {
  const overall = getOverallProgress(lessonsData);
  const achievements = getAchievements(lessonsData);
  const progress = getProgress();
  const quizTaken = Object.keys(progress.quizScores || {}).length;
  const quizScoresArr = Object.values(progress.quizScores || {});
  const avgScore = quizScoresArr.length
    ? Math.round(quizScoresArr.reduce((a, b) => a + b, 0) / quizScoresArr.length)
    : 0;
  const unlockedCount = (progress.unlockedModules || []).length;

  const modulesHtml = lessonsData.modules.map((mod) => {
    const modProgress = getModuleProgress(mod.id, lessonsData);
    return `
      <div class="progress-module">
        <h4>${escapeHtml(mod.title)}</h4>
        ${renderProgressBar(modProgress.percent, `${modProgress.completed}/${modProgress.total}`)}
      </div>`;
  }).join('');

  const achievementsHtml = achievements.map((a) => `
    <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}" role="listitem">
      <span class="achievement-icon" aria-hidden="true">${a.unlocked ? '[OK]' : '[..]'}</span>
      <div>
        <strong>${escapeHtml(a.title)}</strong>
        <p>${escapeHtml(a.description)}</p>
      </div>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="progress-dashboard page-content" aria-labelledby="progress-heading">
      <p class="os-boot-line" aria-hidden="true">$ progress --report</p>
      <h2 id="progress-heading">Your Progress</h2>
      <div class="os-telemetry-grid">
        <div class="os-stat"><strong class="os-stat-value"><span class="os-stat-num">${overall.percent}</span><span class="os-stat-unit">% DONE</span></strong><span class="os-stat-label">${overall.completedLessons}/${overall.totalLessons} lessons</span></div>
        <div class="os-stat"><strong class="os-stat-value"><span class="os-stat-num">${quizTaken}</span><span class="os-stat-unit">QUIZ</span></strong><span class="os-stat-label">quizzes taken</span></div>
        <div class="os-stat"><strong class="os-stat-value"><span class="os-stat-num">${avgScore}</span><span class="os-stat-unit">AVG %</span></strong><span class="os-stat-label">average quiz score</span></div>
        <div class="os-stat"><strong class="os-stat-value"><span class="os-stat-num">${unlockedCount}</span><span class="os-stat-unit">UNLOCK</span></strong><span class="os-stat-label">modules unlocked</span></div>
      </div>
      <div class="os-sparkline-wrap" aria-hidden="false">
        ${quizScoresSparkline(lessonsData, progress)}
      </div>
      <div class="overall-progress">
        ${renderProgressBar(overall.percent, `${overall.completedLessons} of ${overall.totalLessons} lessons`)}
      </div>
      <h3>Modules</h3>
      <div class="progress-modules">${modulesHtml}</div>
      <h3>Achievements</h3>
      <div class="achievements-grid" role="list">${achievementsHtml}</div>
      <a href="#/dashboard" class="btn btn-secondary">Back to Dashboard</a>
    </section>`;

  animatePageEnter(main.querySelector('.page-content'));
}
