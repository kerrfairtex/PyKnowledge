// Footer rendering tests — exercise the REAL renderLessonViewer path against
// real content data (content/lessons.json + content/quizzes.json). This fails
// if renderLessonFooter() is ever unwired from renderLessonViewer, or if the
// hint names the wrong quiz.
//
// Runs under testEnvironment: 'node'. jsdom globals are set up manually.
import { renderLessonViewer } from '../app/lessons/lesson-viewer.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { JSDOM } from 'jsdom';

const { fileURLToPath } = await import('url');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsData = JSON.parse(readFileSync(join(root, 'content', 'lessons.json'), 'utf8'));
const quizzesData = JSON.parse(readFileSync(join(root, 'content', 'quizzes.json'), 'utf8'));

// --- jsdom + globals -------------------------------------------------------
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="main-content"></div></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

store['pyknowledge_guest_id'] = 'guest-fixed';

const quizByLesson = {};
for (const q of quizzesData.quizzes) {
  quizByLesson[q.lessonId] = q;
}

function lessonQuizTitle(lessonId) {
  // Match the app's preference: prefer the quiz whose id equals the lesson id
  // (e.g. lesson-9-3 over capstone-final), else any quiz for that lessonId.
  const q = quizzesData.quizzes.find((q) => q.lessonId === lessonId && q.id === lessonId)
    || quizzesData.quizzes.find((q) => q.lessonId === lessonId);
  return q ? q.title.replace(/^Quiz: /, '') : null;
}
function nextLessonOf(lessonId) {
  for (const mod of lessonsData.modules) {
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx > -1) return mod.lessons[idx + 1] || null;
  }
  return null;
}
function prevLessonsOf(lessonId) {
  for (const mod of lessonsData.modules) {
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx > -1) return mod.lessons.slice(0, idx).map((l) => l.id);
  }
  return [];
}

const allLessons = lessonsData.modules.flatMap((m) => m.lessons);

function seedProgress(completedLessons = []) {
  store[`pyknowledge_progress_guest-fixed`] = JSON.stringify({
    version: 1,
    completedLessons,
    quizScores: {},
    achievements: [],
    lastAccessed: null,
    unlockedModules: ['module-1']
  });
}

function render(lessonId) {
  // Mark all prior lessons in the same module as completed so this lesson
  // is unlocked and its footer is rendered (not a "Lesson Locked" card).
  seedProgress(prevLessonsOf(lessonId));
  const main = document.getElementById('main-content');
  renderLessonViewer(main, lessonId, lessonsData, quizzesData);
  return main;
}

// --- Pure function tests ---------------------------------------------------
import { renderLessonFooter } from '../app/lessons/lesson-viewer.js';

function parse(html) {
  const d = new JSDOM(html, { url: 'http://localhost/' });
  return d.window.document;
}

describe('renderLessonFooter — pure function with current-lesson quiz', () => {
  test('incomplete lesson: hint names current lesson quiz, not next lesson', () => {
    const html = renderLessonFooter(false, 'lesson-1-1', 'module-1',
      { id: 'lesson-1-2', title: 'Variables and Data Types' }, null, 'What is Python?');
    const doc = parse(html);
    const hint = doc.querySelector('.os-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe('Pass the quiz for What is Python? to continue to Variables and Data Types.');

    const btn = doc.querySelector('button[disabled]');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Pass the quiz for What is Python? to continue to Variables and Data Types.');
  });

  test('last lesson of module: hint says "finish this module"', () => {
    const html = renderLessonFooter(false, 'lesson-1-3', 'module-1', null, null, 'Input and Output');
    const doc = parse(html);
    const hint = doc.querySelector('.os-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe('Pass the quiz for Input and Output to finish this module.');
    expect(doc.querySelector('button[disabled]')?.getAttribute('aria-label'))
      .toBe('Pass the quiz for Input and Output to finish this module.');
  });

  test('Take Quiz link still points at current lesson quiz', () => {
    const html = renderLessonFooter(false, 'lesson-1-1', 'module-1',
      { id: 'lesson-1-2', title: 'Variables and Data Types' }, null, 'What is Python?');
    const doc = parse(html);
    const tq = doc.querySelector('a[data-take-quiz]');
    expect(tq).not.toBeNull();
    expect(tq.getAttribute('href')).toBe('#/quiz/lesson-1-1');
  });
});

// --- Real-path tests: every lesson names its OWN quiz ----------------------
describe('renderLessonViewer footer — every lesson names its own quiz', () => {
  test.each(allLessons.map((l) => [l.id, l.title]))('%s hint names its own quiz', (lessonId, lessonTitle) => {
    const main = render(lessonId);
    const hint = main.querySelector('.os-hint');
    expect(hint).not.toBeNull();
    if (!hint) throw new Error(`No .os-hint on ${lessonId}`);

    const quizTitle = lessonQuizTitle(lessonId);
    const quizName = quizTitle ?? lessonTitle;
    const next = nextLessonOf(lessonId);
    const nextTitle = next ? next.title : null;

    let expected;
    if (nextTitle) {
      expected = `Pass the quiz for ${quizName} to continue to ${nextTitle}.`;
    } else {
      expected = `Pass the quiz for ${quizName} to finish this module.`;
    }
    expect(hint.textContent).toBe(expected);

    const btn = main.querySelector('button[disabled]');
    if (nextTitle) {
      expect(btn).not.toBeNull();
      expect(btn.getAttribute('aria-label')).toBe(expected);
    }
  });

  test('last lesson of course (lesson-9-3) shows "finish this module"', () => {
    const main = render('lesson-9-3');
    const hint = main.querySelector('.os-hint');
    expect(hint.textContent).toBe('Pass the quiz for Iterators and Generators to finish this module.');
  });

  test('lesson-1-1 hint names its own quiz (What is Python?), not next lesson', () => {
    const main = render('lesson-1-1');
    const hint = main.querySelector('.os-hint');
    expect(hint.textContent).toBe('Pass the quiz for What is Python? to continue to Variables and Data Types.');
  });
});
