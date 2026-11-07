// Footer rendering tests — exercise the REAL renderLessonViewer path
// (not just the pure renderLessonFooter function) so the test fails if the
// footer is ever unwired from renderLessonViewer again.
//
// Runs under testEnvironment: 'node' (jest.config.js). jsdom globals are set
// up manually before renderLessonViewer() is invoked.
import { renderLessonViewer } from '../app/lessons/lesson-viewer.js';
import { JSDOM } from 'jsdom';

// --- jsdom + globals that renderLessonViewer's render path needs -----------
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

// Deterministic guest id so getProgress() is stable across tests.
store['pyknowledge_guest_id'] = 'guest-fixed';

const DEFAULT_PROGRESS = {
  version: 1,
  completedLessons: [],
  quizScores: {},
  achievements: [],
  lastAccessed: null,
  unlockedModules: ['module-1']
};

function seedProgress(completedLessons = []) {
  store[`pyknowledge_progress_guest-fixed`] = JSON.stringify({
    ...DEFAULT_PROGRESS,
    completedLessons
  });
}

const mockLessonsData = {
  modules: [{
    id: 'module-1',
    title: 'Module 1',
    prerequisite: null,
    lessons: [
      { id: 'lesson-1-1', title: 'What is Python?', video: null, content: { sections: [] } },
      { id: 'lesson-1-2', title: 'Variables', video: null, content: { sections: [] } },
      { id: 'lesson-1-3', title: 'Input and Output', video: null, content: { sections: [] } },
    ]
  }]
};

function render(lessonId, completedLessons = []) {
  seedProgress(completedLessons);
  const main = document.getElementById('main-content');
  renderLessonViewer(main, lessonId, mockLessonsData);
  return main;
}

// ---------------------------------------------------------------------------
// Real-path tests: these call renderLessonViewer and inspect the rendered
// footer. If renderLessonFooter() is ever unwired from renderLessonViewer,
// the .os-hint quiz hint and the Take Quiz link disappear and these fail.
// ---------------------------------------------------------------------------
describe('renderLessonViewer footer — real render path', () => {
  test('incomplete lesson shows Take Quiz + disabled Next + quiz-naming hint', () => {
    const main = render('lesson-1-1');

    const takeQuiz = main.querySelector('a[data-take-quiz]');
    expect(takeQuiz).not.toBeNull();
    expect(takeQuiz.textContent.trim()).toBe('Take Quiz');
    expect(takeQuiz.getAttribute('href')).toBe('#/quiz/lesson-1-1');

    const disabledNext = main.querySelector('button[disabled]');
    expect(disabledNext).not.toBeNull();
    expect(disabledNext.textContent.trim()).toBe('Next Lesson →');
    expect(disabledNext.disabled).toBe(true);

    // One hint, naming the quiz for the next lesson.
    const hints = main.querySelectorAll('.os-hint');
    expect(hints.length).toBe(1);
    expect(hints[0].textContent).toBe('Pass the quiz for Variables to continue');
  });

  test('complete lesson with next lesson shows enabled Next Lesson link, no Take Quiz', () => {
    const main = render('lesson-1-1', ['lesson-1-1']);

    expect(main.querySelector('a[data-take-quiz]')).toBeNull();

    const next = main.querySelector('a[data-next-lesson]');
    expect(next).not.toBeNull();
    expect(next.textContent.trim()).toBe('Next Lesson →');
    expect(next.getAttribute('href')).toBe('#/lesson/lesson-1-2');
    expect(next.disabled).toBeFalsy();
    expect(next.classList.contains('btn-disabled')).toBe(false);

    expect(main.querySelector('button[disabled]')).toBeNull();
  });

  test('complete last lesson in module shows Module complete hint, no Next link', () => {
    const main = render('lesson-1-3', ['lesson-1-1', 'lesson-1-2', 'lesson-1-3']);

    expect(main.querySelector('a[data-take-quiz]')).toBeNull();
    expect(main.querySelector('a[data-next-lesson]')).toBeNull();

    const hint = main.querySelector('.os-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe('Module complete');
  });

  test('footer always includes Back to Module link', () => {
    const main = render('lesson-1-1');
    const back = main.querySelector('a[href="#/module/module-1"]');
    expect(back).not.toBeNull();
    expect(back.textContent.trim()).toBe('Back to Module');
  });

  test('does not show the duplicate lesson-complete-hint', () => {
    const main = render('lesson-1-1');
    expect(main.querySelector('.lesson-complete-hint')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pure function tests (kept as a unit-level guard on renderLessonFooter itself).
// ---------------------------------------------------------------------------
import { renderLessonFooter } from '../app/lessons/lesson-viewer.js'; // re-import for clarity

function parse(html) {
  const d = new JSDOM(html, { url: 'http://localhost/' });
  return d.window.document;
}

describe('renderLessonFooter — pure function', () => {
  test('incomplete lesson: Take Quiz link to #/quiz/<lessonId>', () => {
    const html = renderLessonFooter(false, 'lesson-1-1', 'module-1', { id: 'lesson-1-2', title: 'Variables' }, null);
    const doc = parse(html);

    const takeQuiz = doc.querySelector('a[data-take-quiz]');
    expect(takeQuiz).not.toBeNull();
    expect(takeQuiz.textContent.trim()).toBe('Take Quiz');
    expect(takeQuiz.getAttribute('href')).toBe('#/quiz/lesson-1-1');

    const disabledNext = doc.querySelector('button[disabled]');
    expect(disabledNext).not.toBeNull();
    expect(disabledNext.textContent.trim()).toBe('Next Lesson →');
    expect(disabledNext.disabled).toBe(true);

    const hint = doc.querySelector('.os-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain('Pass the quiz for Variables');
  });

  test('complete + last in module: Module complete hint, no Next link', () => {
    const html = renderLessonFooter(true, 'lesson-1-3', 'module-1', null, null);
    const doc = parse(html);

    expect(doc.querySelector('a[data-take-quiz]')).toBeNull();
    expect(doc.querySelector('a[data-next-lesson]')).toBeNull();

    const hint = doc.querySelector('.os-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe('Module complete');
  });

  test('footer always includes Back to Module link', () => {
    const html = renderLessonFooter(false, 'lesson-1-1', 'module-1', { id: 'lesson-1-2', title: 'X' }, null);
    const doc = parse(html);
    const back = doc.querySelector('a[href="#/module/module-1"]');
    expect(back).not.toBeNull();
    expect(back.textContent.trim()).toBe('Back to Module');
  });
});
