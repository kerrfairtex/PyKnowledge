/**
 * app/dashboard/dashboard.js
 * PyKnowledge — Dashboard view (route: /dashboard)
 *
 * No framework, no build step — plain DOM rendering.
 *
 * WIRING — already correct in core/engine.js:91. This file's export
 * matches that call exactly:
 *   registerRoute('/dashboard', (m, p, r) => {
 *     clearFrontPageLayout();
 *     renderDashboard(m, p, r, lessonsData);
 *     updateNavbarActiveState();
 *   });
 * No changes needed in engine.js — nothing to edit there.
 *
 * Uses the app's real storage layer instead of reimplementing it:
 *   - getProgress()                         from core/storage.js
 *   - checkPrerequisite(moduleId, lessons)  from storage/progress.js
 * Per PyKnowledge_Build_Orchestration.md: checkPrerequisite(moduleId,
 * lessonsData) → { allowed, reason?, remainingLessons? }. If the real
 * return shape differs from that (e.g. field names), only moduleState()
 * below needs adjusting — nothing else touches it directly.
 */

import { checkPrerequisite, validateProgressIntegrity } from '../../storage/progress.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { getActiveUser } from '../../storage/auth.js';

// ---- Prerequisite / completion state -----------------------------------

async function moduleState(module, lessonsData, progress) {
  const { done, total } = moduleCompletion(module, progress);

  if (module.prerequisite) {
    const result = await checkPrerequisite(module.id, lessonsData);
    if (!result.allowed) return 'locked';
  }
  return done === total && total > 0 ? 'done' : 'unlocked';
}

function moduleCompletion(module, progress) {
  const total = module.lessons.length;
  const done = module.lessons.filter(l => progress.completedLessons.includes(l.id)).length;
  return { done, total };
}

// ---- Flash messages (fCC-style post-redirect toast) --------------------
// Reads a flash key off the hash query, e.g. #/dashboard?flash=signin-success

const FLASH_MESSAGES = {
  'signin-success': 'Signed in — pick up where you left off.',
  'module-complete': 'Module complete. Next one just unlocked.',
  'quiz-passed': 'Quiz passed — nice work.'
};

function readFlash() {
  const hash = window.location.hash; // "#/dashboard?flash=signin-success"
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const key = params.get('flash');
  return key && FLASH_MESSAGES[key] ? { key, text: FLASH_MESSAGES[key] } : null;
}

function clearFlashFromUrl() {
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex !== -1) {
    history.replaceState(null, '', window.location.pathname + window.location.search + hash.slice(0, qIndex));
  }
}

// ---- Icons (inline SVG, no icon font/CDN) -------------------------------

const ICONS = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M4 19.5V6.5"/></svg>',
  loop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>',
  branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3v8a4 4 0 0 0 4 4h4"/><circle cx="6" cy="18" r="2.2"/><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="15" r="2.2"/></svg>',
  func: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4h1c-2 0-3 1-3 3v3H5v2h2v3c0 2-1 3-3 3h1"/><path d="M14 11l4 4m0-4-4 4"/></svg>',
  stack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 13 4 4 10-10"/></svg>'
};
const MODULE_ICONS = [ICONS.book, ICONS.branch, ICONS.loop, ICONS.func, ICONS.stack, ICONS.stack, ICONS.flag];

// ---- Curriculum facts (grounded: computed from content/lessons.json) ------
// These numbers are derived from the real content data at render time —
// never hardcoded, so they stay true as lessons are added.

const PYTHON_TRIVIA = [
  'Python is named after Monty Python\'s Flying Circus — not the snake.',
  'The Zen of Python ("import this") has 19 guiding principles written in 1999.',
  'Python runs Instagram, YouTube, Dropbox, and NASA\'s data pipeline.',
  'Lists in Python can hold mixed types: [1, "two", 3.0, True] is valid.',
  'Python\'s creator, Guido van Rossum, released version 0.9.0 in February 1991.',
  'A tuple is an immutable list — once created, it cannot be changed.',
  'f-strings (Python 3.6+) are the fastest way to format text in Python.',
  'Dictionaries power almost everything in Python — even classes use them internally.'
];

function curriculumStats(modules) {
  let exercises = 0;
  let challenges = 0;
  for (const m of modules) {
    for (const l of m.lessons) {
      for (const ex of (l.exercises || [])) {
        exercises += 1;
        if (ex.type === 'challenge') challenges += 1;
      }
    }
  }
  return { exercises, challenges };
}

function pickTrivia() {
  const day = Math.floor(Date.now() / 86400000);
  return PYTHON_TRIVIA[day % PYTHON_TRIVIA.length];
}

// ---- Greeting (time-aware, uses the signed-in user's name) ----------------

function greetUser() {
  const user = getActiveUser();
  const first = user && user.displayName ? escapeHtml(user.displayName.split(' ')[0]) : null;
  const h = new Date().getHours();
  const timeGreeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return first ? `${timeGreeting}, ${first}` : 'Welcome back';
}

// ---- Render --------------------------------------------------------------

export async function renderDashboard(main, _params, _route, lessonsData) {
  // Stale-render guard: only the latest invocation may paint.
  const renderId = Symbol('dashboard-render');
  renderDashboard._latest = renderId;
  const isLatest = () => renderDashboard._latest === renderId;

  main.innerHTML = `<div class="dash page-content"><p class="dash-loading">Loading your dashboard…</p></div>`;

  if (!lessonsData || !Array.isArray(lessonsData.modules)) {
    main.innerHTML = `<div class="dash page-content"><p class="dash-error">Curriculum data isn't available yet.</p></div>`;
    return;
  }

  const { progress } = validateProgressIntegrity(lessonsData);
  const modules = lessonsData.modules;
  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const totalDone = progress.completedLessons.length;
  const stats = curriculumStats(modules);
  const overallPct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;

  // Resolve ALL module cards before painting once — no out-of-order flicker.
  const cardsHtml = (await Promise.all(
    modules.map((m, i) => moduleCardHtml(m, lessonsData, progress, MODULE_ICONS[i % MODULE_ICONS.length]))
  )).join('');

  if (!isLatest()) return; // a newer navigation superseded this render

  const flash = readFlash();

  main.innerHTML = `
    <div class="dash page-content">
      ${flash ? `
        <div class="dash-toast" role="status">
          <span>${flash.text}</span>
          <button class="dash-toast-dismiss" aria-label="Dismiss">${ICONS.check}</button>
        </div>` : ''}

      <header class="dash-head">
        <h1 id="dash-greeting">${greetUser()}</h1>
        <p>Continue your Python learning journey.</p>
      </header>

      <section class="dash-overall" aria-label="Overall progress">
        <div class="dash-overall-row">
          <span>Overall progress</span>
          <span class="dash-overall-count">${totalDone}/${totalLessons} lessons · ${overallPct}%</span>
        </div>
        <div class="dash-bar"><div class="dash-bar-fill" style="width:${overallPct}%"></div></div>
      </section>

      <section class="dash-facts" aria-label="About this course">
        <h2 class="dash-facts-title">This course, by the numbers</h2>
        <div class="dash-facts-grid">
          <div class="dash-fact">
            <strong>${modules.length}</strong>
            <span>modules in a set path — each one unlocks the next</span>
          </div>
          <div class="dash-fact">
            <strong>${stats.exercises}</strong>
            <span>hands-on exercises, from reading code to writing your own</span>
          </div>
          <div class="dash-fact">
            <strong>${stats.challenges}</strong>
            <span>coding challenges that go beyond the basics</span>
          </div>
          <div class="dash-fact">
            <strong>0 internet</strong>
            <span>needed after install — everything runs on this device</span>
          </div>
        </div>
        <p class="dash-trivia">
          <span class="dash-trivia-label">Did you know?</span> ${escapeHtml(pickTrivia())}
        </p>
      </section>

      <ol class="dash-list">${cardsHtml}</ol>
    </div>
  `;

  if (flash) {
    clearFlashFromUrl();
    main.querySelector('.dash-toast-dismiss')?.addEventListener('click', () => {
      main.querySelector('.dash-toast')?.remove();
    });
  }
}

async function moduleCardHtml(module, lessonsData, progress, icon) {
  const state = await moduleState(module, lessonsData, progress); // 'locked' | 'unlocked' | 'done'
  const { done, total } = moduleCompletion(module, progress);
  const pct = total ? Math.round((done / total) * 100) : 0;

  let action;
  if (state === 'locked') {
    const prereq = lessonsData.modules.find(m => m.id === module.prerequisite);
    action = `<p class="dash-card-locked-note">Complete all lessons in &quot;${prereq ? escapeHtml(prereq.title) : 'the previous module'}&quot; first</p>`;
  } else {
    const label = state === 'done' ? 'Review module' : (done > 0 ? 'Continue module' : 'Start module');
    action = `<a class="dash-card-btn" href="#/module/${encodeURIComponent(module.id)}">${label}</a>`;
  }

  return `
    <li class="dash-card dash-card--${state}">
      <div class="dash-card-icon" aria-hidden="true">${icon}</div>
      <div class="dash-card-body">
        <div class="dash-card-title-row">
          <h3>${escapeHtml(module.title)}</h3>
          ${state === 'locked' ? `<span class="dash-card-badge">${ICONS.lock}</span>` : ''}
          ${state === 'done' ? `<span class="dash-card-badge dash-card-badge--done">${ICONS.check}</span>` : ''}
        </div>
        <p class="dash-card-desc">${escapeHtml(module.description || '')}</p>
        <div class="dash-bar dash-bar--small"><div class="dash-bar-fill" style="width:${pct}%"></div></div>
        <div class="dash-card-count">${done}/${total} lessons</div>
        ${action}
      </div>
    </li>
  `;
}
