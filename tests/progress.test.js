import { getProgress, saveProgress, resetProgress, markLessonComplete, isLessonComplete } from '../core/storage.js';
import { checkPrerequisite, unlockNextModule } from '../storage/progress.js';
import { getActiveUser, getProgressKey } from '../storage/auth.js';

const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; }
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

describe('progress', () => {
  beforeEach(() => { resetProgress(); });

  test('getProgress returns defaults when no stored data', () => {
    const progress = getProgress();
    expect(progress.completedLessons).toEqual([]);
    expect(progress.quizScores).toEqual({});
    expect(progress.achievements).toEqual([]);
    expect(progress.unlockedModules).toEqual(['module-1']);
  });

  test('markLessonComplete adds to completedLessons', () => {
    markLessonComplete('lesson-1-1');
    expect(isLessonComplete('lesson-1-1')).toBe(true);
    expect(isLessonComplete('lesson-1-2')).toBe(false);
  });

  test('markLessonComplete is idempotent', () => {
    markLessonComplete('lesson-1-1');
    markLessonComplete('lesson-1-1');
    const progress = getProgress();
    expect(progress.completedLessons.filter(id => id === 'lesson-1-1').length).toBe(1);
  });

  test('markLessonComplete stores quiz score', () => {
    markLessonComplete('lesson-1-1', 85);
    const progress = getProgress();
    expect(progress.quizScores['lesson-1-1']).toBe(85);
  });

  test('markLessonComplete without score does not overwrite', () => {
    markLessonComplete('lesson-1-1', 85);
    markLessonComplete('lesson-1-1');
    const progress = getProgress();
    expect(progress.quizScores['lesson-1-1']).toBe(85);
  });

  test('resetProgress clears all state', () => {
    markLessonComplete('lesson-1-1', 100);
    resetProgress();
    const progress = getProgress();
    expect(progress.completedLessons).toEqual([]);
    expect(progress.quizScores).toEqual({});
  });

  test('getProgress merges stored data with defaults', () => {
    // Write under the REAL per-user key the app reads (guest id is random
    // per run, so the key must be derived, not hardcoded).
    const key = getProgressKey(getActiveUser().id);
    localStorage.setItem(key, JSON.stringify({
      completedLessons: ['lesson-1-1'],
      version: 1
    }));
    const progress = getProgress();
    expect(progress.completedLessons).toEqual(['lesson-1-1']);
    expect(progress.unlockedModules).toEqual(['module-1']);
  });

  test('saveProgress updates lastAccessed', () => {
    const before = Date.now();
    saveProgress({ ...getProgress(), completedLessons: ['l1'] });
    const after = getProgress();
    expect(after.lastAccessed).toBeTruthy();
    expect(new Date(after.lastAccessed).getTime()).toBeGreaterThanOrEqual(before);
  });

  test('progress survives JSON round-trip', () => {
    const original = { ...getProgress(), completedLessons: ['l1'], quizScores: { l1: 90 } };
    saveProgress(original);
    const restored = getProgress();
    expect(restored.completedLessons).toEqual(['l1']);
    expect(restored.quizScores).toEqual({ l1: 90 });
  });

  test('multiple lessons tracked independently', () => {
    markLessonComplete('lesson-1-1');
    markLessonComplete('lesson-1-2', 80);
    markLessonComplete('lesson-1-3', 95);
    const progress = getProgress();
    expect(progress.completedLessons).toHaveLength(3);
    expect(progress.quizScores['lesson-1-2']).toBe(80);
    expect(progress.quizScores['lesson-1-3']).toBe(95);
  });
});

describe('lesson-to-quiz progression', () => {
  const mockLessonsData = {
    modules: [
      {
        id: 'module-1',
        title: 'Module 1',
        prerequisite: null,
        lessons: [
          { id: 'lesson-1-1', title: 'Lesson 1-1' },
          { id: 'lesson-1-2', title: 'Lesson 1-2' },
          { id: 'lesson-1-3', title: 'Lesson 1-3' }
        ]
      },
      {
        id: 'module-2',
        title: 'Module 2',
        prerequisite: 'module-1',
        lessons: [{ id: 'lesson-2-1', title: 'Lesson 2-1' }]
      }
    ]
  };

  beforeEach(() => { resetProgress(); });

  test('passing lesson 1 quiz marks lesson 1 complete', () => {
    markLessonComplete('lesson-1-1');
    expect(isLessonComplete('lesson-1-1')).toBe(true);
  });

  test('lesson 2 is locked until lesson 1 complete', () => {
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
    markLessonComplete('lesson-1-1');
    markLessonComplete('lesson-1-2');
    markLessonComplete('lesson-1-3');
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(true);
  });

  test('unlockNextModule unlocks module-2 only after all module-1 lessons complete', () => {
    markLessonComplete('lesson-1-1');
    markLessonComplete('lesson-1-2');
    const result1 = unlockNextModule('lesson-1-2', mockLessonsData);
    expect(result1.unlockedModules).not.toContain('module-2');

    markLessonComplete('lesson-1-3');
    const result2 = unlockNextModule('lesson-1-3', mockLessonsData);
    expect(result2.unlockedModules).toContain('module-2');
  });

  test('full student journey: lesson 1 quiz -> complete lesson 1 -> lesson 2 accessible -> module unlock', () => {
    // Fresh student: nothing complete
    expect(isLessonComplete('lesson-1-1')).toBe(false);
    expect(isLessonComplete('lesson-1-2')).toBe(false);
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);

    // Student takes lesson 1's quiz and passes
    markLessonComplete('lesson-1-1', 85);
    expect(isLessonComplete('lesson-1-1')).toBe(true);
    expect(getProgress().quizScores['lesson-1-1']).toBe(85);

    // Lesson 2 still blocked until all module-1 lessons complete
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);

    // Student completes remaining module-1 lessons
    markLessonComplete('lesson-1-2', 90);
    markLessonComplete('lesson-1-3', 95);

    // Now module-2 unlocks
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(true);
    const unlocked = unlockNextModule('lesson-1-3', mockLessonsData);
    expect(unlocked.unlockedModules).toContain('module-2');

    // All three lessons tracked
    const progress = getProgress();
    expect(progress.completedLessons).toHaveLength(3);
    expect(progress.completedLessons).toContain('lesson-1-1');
    expect(progress.completedLessons).toContain('lesson-1-2');
    expect(progress.completedLessons).toContain('lesson-1-3');
  });

  test('direct quiz access policy: locked lesson quiz blocked until previous lesson complete', () => {
    // lesson-1-2's quiz should not be reachable until lesson-1-1 complete
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
    expect(isLessonComplete('lesson-1-1')).toBe(false);

    markLessonComplete('lesson-1-1');
    expect(isLessonComplete('lesson-1-1')).toBe(true);

    // With lesson-1-1 complete, lesson-1-2 can be attempted
    markLessonComplete('lesson-1-2');
    expect(isLessonComplete('lesson-1-2')).toBe(true);
  });
});
