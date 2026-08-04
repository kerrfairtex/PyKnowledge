/**
 * PyKnowledge Application Kernel
 * Core functions: loadModule(), calculateScore(), checkPrerequisite(), ServiceWorker
 */

import { loadAllContent } from './loader.js';
import { registerRoute, initRouter, navigate } from './router.js';
import { getProgress } from './storage.js';
import { checkPrerequisite } from '../storage/progress.js';
import { calculateScore } from '../app/quizzes/quiz-engine.js';
import { renderDashboard } from '../app/dashboard/dashboard.js';
import { renderLessonViewer } from '../app/lessons/lesson-viewer.js';
import { renderQuiz } from '../app/quizzes/quiz-engine.js';
import { renderProgressDashboard } from '../app/progress/progress-dashboard.js';
import { renderNavbar, updateNavbarActiveState } from '../ui/components/navbar.js';
import { initOfflineIndicator } from '../ui/components/offline-indicator.js';
import { initUpdateNotifier, checkForUpdates } from '../ui/components/update-notifier.js';
import { renderError, withErrorHandling } from './errors.js';
import { escapeHtml } from '../utils/sanitize.js';
import { APP_VERSION } from './version.js';

let lessonsData = null;
let quizzesData = null;

export async function loadModule(moduleId) {
  if (!lessonsData) {
    const content = await loadAllContent();
    lessonsData = content.lessons;
    quizzesData = content.quizzes;
  }

  const module = lessonsData.modules.find((m) => m.id === moduleId);
  if (!module) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  const prereqCheck = checkPrerequisite(moduleId, lessonsData);
  if (!prereqCheck.allowed) {
    return { module: null, error: prereqCheck.reason, prereqCheck };
  }

  return { module, error: null, prereqCheck };
}

async function initApp() {
  const main = document.getElementById('main-content');
  const loading = document.getElementById('loading');

  try {
    await registerServiceWorker();
    initOfflineIndicator();
    initUpdateNotifier();

    const content = await loadAllContent();
    lessonsData = content.lessons;
    quizzesData = content.quizzes;

    if (loading) loading.remove();

    renderNavbar(document.getElementById('main-nav'));

    registerRoute('/', (m, p, r) => {
      renderDashboard(m, p, r, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/module', async (m, params) => {
      await withErrorHandling(m, async () => {
        const moduleId = params[0];
        if (!moduleId) {
          navigate('/');
          return;
        }
        const result = await loadModule(moduleId);
        if (result.error) {
          m.innerHTML = `
            <div class="error-card" role="alert">
              <h2>Module Locked</h2>
              <p>${escapeHtml(result.error)}</p>
              <a href="#/" class="btn btn-primary">Back to Dashboard</a>
            </div>`;
          return;
        }
        renderModuleLessons(m, result.module);
      });
      updateNavbarActiveState();
    });

    registerRoute('/lesson', async (m, params) => {
      const lessonId = params[0];
      if (!lessonId) {
        navigate('/');
        return;
      }
      renderLessonViewer(m, lessonId, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/quiz', async (m, params) => {
      const quizId = params[0];
      if (!quizId) {
        navigate('/');
        return;
      }
      renderQuiz(m, quizId, quizzesData, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/progress', (m) => {
      renderProgressDashboard(m, lessonsData);
      updateNavbarActiveState();
    });

    await initRouter();

    if (navigator.onLine) {
      checkForUpdates();
    }

    console.info(`PyKnowledge v${APP_VERSION} initialized`);
  } catch (err) {
    if (loading) loading.remove();
    renderError(main, err, {
      title: 'Failed to start PyKnowledge',
      onRetry: () => window.location.reload()
    });
    console.error('PyKnowledge init error:', err);
  }
}

function renderModuleLessons(main, module) {
  const progress = getProgress();
  main.innerHTML = `
    <section class="module-detail" aria-labelledby="module-title">
      <h2 id="module-title">${escapeHtml(module.title)}</h2>
      <p>${escapeHtml(module.description)}</p>
      <ul class="lesson-list" role="list">
        ${module.lessons.map((lesson, i) => {
          const complete = progress.completedLessons.includes(lesson.id);
          const locked = i > 0 && !progress.completedLessons.includes(module.lessons[i - 1].id);
          return `
            <li class="lesson-item ${complete ? 'complete' : ''} ${locked ? 'locked' : ''}" role="listitem">
              ${locked
                ? `<span class="lesson-locked" aria-label="Locked">${escapeHtml(lesson.title)} (locked)</span>`
                : `<a href="#/lesson/${escapeHtml(lesson.id)}">${escapeHtml(lesson.title)}</a>`
              }
              ${complete ? '<span class="badge" aria-label="Completed">Done</span>' : ''}
            </li>`;
        }).join('')}
      </ul>
      <a href="#/" class="btn btn-secondary">Back to Dashboard</a>
    </section>`;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('/core/service-worker.js', {
      scope: '/'
    });
    console.log('Service Worker registered:', registration.scope);
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
  }
}

export { calculateScore, checkPrerequisite, lessonsData, quizzesData, APP_VERSION };

document.addEventListener('DOMContentLoaded', initApp);
