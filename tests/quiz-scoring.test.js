import { calculateScore } from '../app/quizzes/quiz-engine.js';
import { validateAnswer } from '../utils/validator.js';

const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; }
};

describe('quiz scoring', () => {
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

  test('passes at exactly 70% with 10 questions', () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`, type: 'true-false', correctAnswer: true
    }));
    const answers = [true, true, true, true, true, true, true, false, false, false];
    const result = calculateScore(ten, answers);
    expect(result.score).toBe(70);
    expect(result.passed).toBe(true);
  });

  test('fails at 69% with 10 questions', () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`, type: 'true-false', correctAnswer: true
    }));
    const answers = [true, true, true, true, true, true, false, false, false, false];
    const result = calculateScore(ten, answers);
    expect(result.score).toBe(60);
    expect(result.passed).toBe(false);
  });

  test('handles null answers as wrong', () => {
    const result = calculateScore(questions, [null, null, null]);
    expect(result.score).toBe(0);
    expect(result.correct).toBe(0);
  });

  test('handles undefined answers as wrong', () => {
    const result = calculateScore(questions, [undefined, undefined, undefined]);
    expect(result.score).toBe(0);
    expect(result.correct).toBe(0);
  });

  test('handles empty questions array', () => {
    const result = calculateScore([], []);
    expect(result.score).toBe(0);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(false);
  });

  test('handles single question quiz', () => {
    const single = [{ id: 'q1', type: 'true-false', correctAnswer: true }];
    const result = calculateScore(single, [true]);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  test('handles 20 questions correctly', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => ({
      id: `q${i}`, type: 'true-false', correctAnswer: true
    }));
    const answers = Array(20).fill(true);
    const result = calculateScore(twenty, answers);
    expect(result.score).toBe(100);
    expect(result.correct).toBe(20);
  });

  test('score details include per-question results', () => {
    const result = calculateScore(questions, [1, false, 'print']);
    expect(result.results).toBeDefined();
    expect(result.results.q1).toBe(true);
    expect(result.results.q2).toBe(false);
    expect(result.results.q3).toBe(true);
  });

  test('retry score replaces previous', () => {
    const first = calculateScore(questions, [0, false, 'wrong']);
    expect(first.score).toBe(0);
    const second = calculateScore(questions, [1, true, 'print']);
    expect(second.score).toBe(100);
  });

  test('fill-blank accepts multiple correct answers', () => {
    const q = { id: 'q1', type: 'fill-blank', correctAnswer: ['print', 'print()'] };
    expect(validateAnswer(q, 'print')).toBe(true);
    expect(validateAnswer(q, 'print()')).toBe(true);
    expect(validateAnswer(q, 'PRINT')).toBe(true);
    expect(validateAnswer(q, 'wrong')).toBe(false);
  });

  test('alternative correct answers produce same score', () => {
    const altQuestions = [
      { id: 'q1', type: 'multiple-choice', correctAnswer: 1, options: ['a', 'b', 'c'] },
      { id: 'q2', type: 'fill-blank', correctAnswer: ['x', 'y'] }
    ];
    const resultA = calculateScore(altQuestions, [1, 'x']);
    const resultB = calculateScore(altQuestions, [1, 'y']);
    expect(resultA.score).toBe(resultB.score);
    expect(resultA.score).toBe(100);
  });
});
