/**
 * PyKnowledge Application Kernel
 * Core functions: loadModule(), calculateScore(), checkPrerequisite(), ServiceWorker
 */

import { loadLessons, loadQuizzes } from './loader.js';
import { registerRoute, initRouter, navigate } from './router.js';
import { getProgress } from './storage.js';
import { checkPrerequisite } from '../storage/progress.js';
import { calculateScore } from '../app/quizzes/quiz-engine.js';
import { renderDashboard } from '../app/dashboard/dashboard.js';
import { renderLessonViewer } from '../app/lessons/lesson-viewer.js';
import { renderQuiz } from '../app/quizzes/quiz-engine.js';
import { renderProgressDashboard } from '../app/progress/progress-dashboard.js';
import { renderNavbar } from '../ui/components/navbar.js';

let lessonsData = null;
let quizzesData = null;

export async function loadModule(moduleId) {
  if (!lessonsData) {
    lessonsData = await loadLessons();
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
  try {
    await registerServiceWorker();
    lessonsData = await loadLessons();
    quizzesData = await loadQuizzes();

    renderNavbar(document.getElementById('main-nav'));

    registerRoute('/', (main, params, route) => renderDashboard(main, params, route, lessonsData));
    registerRoute('/module', async (main, params) => {
      const moduleId = params[0];
      if (!moduleId) {
        navigate('/');
        return;
      }
      const result = await loadModule(moduleId);
      if (result.error) {
        main.innerHTML = `<div class="error-card"><h2>Locked</h2><p>${result.error}</p><a href="#/">Back to Dashboard</a></div>`;
        return;
      }
      renderModuleLessons(main, result.module);
    });
    registerRoute('/lesson', async (main, params) => {
      const lessonId = params[0];
      renderLessonViewer(main, lessonId, lessonsData);
    });
    registerRoute('/quiz', async (main, params) => {
      const quizId = params[0];
      renderQuiz(main, quizId, quizzesData, lessonsData);
    });
    registerRoute('/progress', (main) => {
      renderProgressDashboard(main, lessonsData);
    });

    await initRouter();
  } catch (err) {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `<div class="error-card"><h2>Failed to load</h2><p>${err.message}</p></div>`;
    }
    console.error('PyKnowledge init error:', err);
  }
}

function renderModuleLessons(main, module) {
  const progress = getProgress();
  main.innerHTML = `
    <section class="module-detail">
      <h2>${module.title}</h2>
      <p>${module.description}</p>
      <ul class="lesson-list">
        ${module.lessons.map((lesson, i) => {
          const complete = progress.completedLessons.includes(lesson.id);
          const locked = i > 0 && !progress.completedLessons.includes(module.lessons[i - 1].id);
          return `
            <li class="lesson-item ${complete ? 'complete' : ''} ${locked ? 'locked' : ''}">
              ${locked
                ? `<span class="lesson-locked">${lesson.title} (locked)</span>`
                : `<a href="#/lesson/${lesson.id}">${lesson.title}</a>`
              }
              ${complete ? '<span class="badge">Done</span>' : ''}
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

export { calculateScore, checkPrerequisite, lessonsData, quizzesData };

document.addEventListener('DOMContentLoaded', initApp);
