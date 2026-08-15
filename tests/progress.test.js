import { getProgress, saveProgress, resetProgress, markLessonComplete, isLessonComplete } from '../core/storage.js';

const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; }
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
    localStorage.setItem('pyknowledge_progress', JSON.stringify({
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
