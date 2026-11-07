// Footer rendering tests using jsdom (already a devDependency)
import { renderLessonFooter } from '../app/lessons/lesson-viewer.js';
import { JSDOM } from 'jsdom';

function parse(html) {
  const dom = new JSDOM(html, { url: 'http://localhost/' });
  return dom.window.document;
}

describe('renderLessonFooter — three states', () => {
  test('incomplete lesson: Take Quiz link to #/quiz/<lessonId>', () => {
    const html = renderLessonFooter(false, 'lesson-1-1', 'module-1', { id: 'lesson-1-2', title: 'Variables' }, null);
    const doc = parse(html);

    const takeQuiz = doc.querySelector('a[data-take-quiz]');
    expect(takeQuiz).not.toBeNull();
    expect(takeQuiz.textContent.trim()).toBe('Take Quiz');
    expect(takeQuiz.getAttribute('href')).toBe('#/quiz/lesson-1-1');

    // Disabled Next Lesson (button, not link)
    const disabledNext = doc.querySelector('button[disabled]');
    expect(disabledNext).not.toBeNull();
    expect(disabledNext.textContent.trim()).toBe('Next Lesson →');
    expect(disabledNext.disabled).toBe(true);

    // Hint naming the quiz
    const hint = doc.querySelector('.os-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain('Pass the quiz for Variables');
  });

  test('incomplete lesson: hint names the next lesson quiz', () => {
    const html = renderLessonFooter(false, 'lesson-1-1', 'module-1', { id: 'lesson-1-2', title: 'Quiz Title Here' }, null);
    const doc = parse(html);
    const hint = doc.querySelector('.os-hint');
    expect(hint.textContent).toBe('Pass the quiz for Quiz Title Here to continue');
  });

  test('complete + next lesson: enabled Next Lesson link to #/lesson/<id>', () => {
    const html = renderLessonFooter(true, 'lesson-1-1', 'module-1', { id: 'lesson-1-2', title: 'Variables' }, null);
    const doc = parse(html);

    const takeQuiz = doc.querySelector('a[data-take-quiz]');
    expect(takeQuiz).toBeNull(); // no Take Quiz when complete

    const next = doc.querySelector('a[data-next-lesson]');
    expect(next).not.toBeNull();
    expect(next.textContent.trim()).toBe('Next Lesson →');
    expect(next.getAttribute('href')).toBe('#/lesson/lesson-1-2');
    expect(next.disabled).toBeFalsy();
    expect(next.classList.contains('btn-disabled')).toBe(false);

    // No disabled button
    const disabledBtn = doc.querySelector('button[disabled]');
    expect(disabledBtn).toBeNull();
  });

  test('complete + last in module: Module complete hint, no Next link', () => {
    const html = renderLessonFooter(true, 'lesson-1-3', 'module-1', null, null);
    const doc = parse(html);

    const takeQuiz = doc.querySelector('a[data-take-quiz]');
    expect(takeQuiz).toBeNull();

    const next = doc.querySelector('a[data-next-lesson]');
    expect(next).toBeNull();

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
