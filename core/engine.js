/**
 * PyKnowledge Application Kernel
 */

import { loadAllContent } from './loader.js';
import { registerRoute, initRouter, navigate } from './router.js';
import { getProgress, initStorage } from './storage.js';
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
import { renderAuthGate, renderProfilePicker } from '../app/auth/auth-screen.js';
import { isAuthenticated, hasProfiles } from '../storage/auth.js';
import { renderFrontPage, clearFrontPageLayout } from '../app/home/front-page.js';
import { animatePageEnter } from '../ui/components/animations.js';

let lessonsData = null;
let quizzesData = null;
let appReady = false;

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

function startApp() {
  appReady = true;
  const header = document.querySelector('.app-header');
  const footer = document.querySelector('.app-footer');
  if (header) header.hidden = false;
  if (footer) footer.hidden = false;
  renderNavbar(document.getElementById('main-nav'));
  initRouter();
}

function showAuthScreen() {
  const main = document.getElementById('main-content');
  const header = document.querySelector('.app-header');
  const footer = document.querySelector('.app-footer');
  if (header) header.hidden = true;
  if (footer) footer.hidden = true;

  renderAuthGate(main, () => {
    startApp();
  });
}

async function initApp() {
  const main = document.getElementById('main-content');
  const loading = document.getElementById('loading');

  try {
    await registerServiceWorker();
    await initStorage();
    initOfflineIndicator();
    initUpdateNotifier();

    const content = await loadAllContent();
    lessonsData = content.lessons;
    quizzesData = content.quizzes;

    if (loading) loading.remove();

    registerRoute('/', (m, p, r) => {
      renderFrontPage(m, p, r, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/dashboard', (m, p, r) => {
      clearFrontPageLayout();
      renderDashboard(m, p, r, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/module', async (m, params) => {
      await withErrorHandling(m, async () => {
        const moduleId = params[0];
        if (!moduleId) { navigate('/dashboard'); return; }
        const result = await loadModule(moduleId);
        if (result.error) {
          m.innerHTML = `
            <div class="error-card page-content" role="alert">
              <h2>Module Locked</h2>
              <p>${escapeHtml(result.error)}</p>
              <a href="#/dashboard" class="btn btn-primary">Back to Dashboard</a>
            </div>`;
          animatePageEnter(m);
          return;
        }
        renderModuleLessons(m, result.module);
      });
      updateNavbarActiveState();
    });

    registerRoute('/lesson', async (m, params) => {
      const lessonId = params[0];
      if (!lessonId) { navigate('/dashboard'); return; }
      renderLessonViewer(m, lessonId, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/quiz', async (m, params) => {
      const quizId = params[0];
      if (!quizId) { navigate('/dashboard'); return; }
      renderQuiz(m, quizId, quizzesData, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/progress', (m) => {
      renderProgressDashboard(m, lessonsData);
      updateNavbarActiveState();
    });

    registerRoute('/login', (m) => {
      if (isAuthenticated()) {
        navigate('/dashboard');
        return;
      }
      const header = document.querySelector('.app-header');
      const footer = document.querySelector('.app-footer');
      if (header) header.hidden = true;
      if (footer) footer.hidden = true;
      if (hasProfiles()) {
        renderProfilePicker(m, () => {
          if (header) header.hidden = false;
          if (footer) footer.hidden = false;
          startApp();
          navigate('/dashboard');
        });
      } else {
        renderAuthGate(m, () => {
          if (header) header.hidden = false;
          if (footer) footer.hidden = false;
          startApp();
          navigate('/dashboard');
        });
      }
    });

    const route = window.location.hash.slice(1) || '/';
    const needsAuth = hasProfiles() && !isAuthenticated() && route !== '/login';

    if (needsAuth) {
      showAuthScreen();
    } else {
      startApp();
    }

    if (navigator.onLine) checkForUpdates();

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
    <section class="module-detail page-content" aria-labelledby="module-title">
      <h2 id="module-title">${escapeHtml(module.title)}</h2>
      <p>${escapeHtml(module.description)}</p>
      <ul class="lesson-list" role="list">
        ${module.lessons.map((lesson, i) => {
          const complete = progress.completedLessons.includes(lesson.id);
          const locked = i > 0 && !progress.completedLessons.includes(module.lessons[i - 1].id);
          return `
            <li class="lesson-item animate-item ${complete ? 'complete' : ''} ${locked ? 'locked' : ''}" role="listitem">
              ${locked
                ? `<span class="lesson-locked" aria-label="Locked">${escapeHtml(lesson.title)} (locked)</span>`
                : `<a href="#/lesson/${escapeHtml(lesson.id)}">${escapeHtml(lesson.title)}</a>`
              }
              ${complete ? '<span class="badge" aria-label="Completed">Done</span>' : ''}
            </li>`;
        }).join('')}
      </ul>
      <a href="#/dashboard" class="btn btn-secondary">Back to Dashboard</a>
    </section>`;
  animatePageEnter(main);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/core/service-worker.js', { scope: '/' });
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
  }
}

export { calculateScore, checkPrerequisite, lessonsData, quizzesData, APP_VERSION, appReady };

document.addEventListener('DOMContentLoaded', initApp);
