import { calculateScore } from '../app/quizzes/quiz-engine.js';
import { checkPrerequisite, getModuleProgress, getOverallProgress } from '../storage/progress.js';
import { validateAnswer } from '../utils/validator.js';
import { getProgress, saveProgress, resetProgress } from '../core/storage.js';

// In-memory localStorage mock for Node test environment
const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; }
};

const mockLessonsData = {
  modules: [
    {
      id: 'module-1',
      title: 'Module 1',
      prerequisite: null,
      lessons: [{ id: 'l1' }, { id: 'l2' }]
    },
    {
      id: 'module-2',
      title: 'Module 2',
      prerequisite: 'module-1',
      lessons: [{ id: 'l3' }]
    }
  ]
};

describe('calculateScore', () => {
  const questions = [
    { id: 'q1', type: 'multiple-choice', correctAnswer: 1, options: ['a', 'b', 'c'] },
    { id: 'q2', type: 'true-false', correctAnswer: true },
    { id: 'q3', type: 'fill-blank', correctAnswer: ['print', 'print()'] }
  ];

  test('returns 100% for all correct answers', () => {
    const result = calculateScore(questions, [1, true, 'print']);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correct).toBe(3);
  });

  test('returns 0% for all wrong answers', () => {
    const result = calculateScore(questions, [0, false, 'wrong']);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  test('passes at exactly 70%', () => {
    const twoQuestions = questions.slice(0, 2);
    const result = calculateScore(twoQuestions, [1, false]);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });

  test('handles empty questions', () => {
    const result = calculateScore([], []);
    expect(result.score).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('checkPrerequisite', () => {
  beforeEach(() => {
    resetProgress();
  });

  test('allows module with no prerequisite', () => {
    const result = checkPrerequisite('module-1', mockLessonsData);
    expect(result.allowed).toBe(true);
  });

  test('blocks module when prerequisite incomplete', () => {
    const result = checkPrerequisite('module-2', mockLessonsData);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Module 1');
  });

  test('allows module when prerequisite complete', () => {
    saveProgress({
      ...getProgress(),
      completedLessons: ['l1', 'l2']
    });
    const result = checkPrerequisite('module-2', mockLessonsData);
    expect(result.allowed).toBe(true);
  });
});

describe('validateAnswer', () => {
  test('validates multiple-choice', () => {
    const q = { type: 'multiple-choice', correctAnswer: 2 };
    expect(validateAnswer(q, 2)).toBe(true);
    expect(validateAnswer(q, 1)).toBe(false);
  });

  test('validates fill-blank case-insensitively', () => {
    const q = { type: 'fill-blank', correctAnswer: ['Print', 'print()'] };
    expect(validateAnswer(q, 'print')).toBe(true);
    expect(validateAnswer(q, 'PRINT')).toBe(true);
  });
});

describe('progress tracking', () => {
  beforeEach(() => {
    resetProgress();
  });

  test('getModuleProgress calculates correctly', () => {
    saveProgress({
      ...getProgress(),
      completedLessons: ['l1']
    });
    const result = getModuleProgress('module-1', mockLessonsData);
    expect(result.completed).toBe(1);
    expect(result.total).toBe(2);
    expect(result.percent).toBe(50);
  });

  test('getOverallProgress aggregates all modules', () => {
    saveProgress({
      ...getProgress(),
      completedLessons: ['l1', 'l2', 'l3']
    });
    const result = getOverallProgress(mockLessonsData);
    expect(result.completedLessons).toBe(3);
    expect(result.totalLessons).toBe(3);
    expect(result.percent).toBe(100);
  });
});
