import { readFileSync } from 'fs';
import {
  calculateScore,
  prepareAttempt,
  isSelfCheck,
  recordSummaryHtml
} from '../app/quizzes/quiz-engine.js';
import {
  getProgress,
  resetProgress,
  markLessonComplete,
  recordQuizAttempt,
  getQuizRecord,
  MAX_ATTEMPTS_PER_QUIZ
} from '../core/storage.js';
import { validateProgressIntegrity } from '../storage/progress.js';
import { validateQuizzesSchema } from '../utils/schema.js';

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

const quizzesData = JSON.parse(readFileSync('content/quizzes.json', 'utf8'));
const lessonsData = JSON.parse(readFileSync('content/lessons.json', 'utf8'));

// Small seeded RNG so shuffles are reproducible.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function correctAnswerFor(q) {
  if (q.type === 'multiple-choice') return q.correctAnswer;
  if (q.type === 'true-false') return q.correctAnswer;
  return Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
}

describe('quiz content', () => {
  test('no quiz repeats a question id or wording', () => {
    for (const quiz of quizzesData.quizzes) {
      const ids = quiz.questions.map((q) => q.id);
      const texts = quiz.questions.map((q) => q.question.trim().toLowerCase());
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  test('schema validation rejects a repeated question', () => {
    const dupe = { id: 'x-q1', type: 'true-false', question: 'Same?', correctAnswer: true };
    const bad = { version: '1', quizzes: [{ id: 'x', title: 'X', questions: [dupe, { ...dupe }] }] };
    expect(() => validateQuizzesSchema(bad)).toThrow();
  });

  test('every quiz can actually be passed by answering correctly', () => {
    for (const quiz of quizzesData.quizzes) {
      const questions = prepareAttempt(quiz, [], seeded(7));
      const answers = questions.map(correctAnswerFor);
      const result = calculateScore(questions, answers);
      expect(result.total).toBeGreaterThan(0);
      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    }
  });

  test('"From memory" prompts are self-checks, not scored', () => {
    const quiz = quizzesData.quizzes.find((q) => q.id === 'lesson-1-2');
    const selfChecks = quiz.questions.filter(isSelfCheck);
    expect(selfChecks.length).toBeGreaterThan(0);
    const result = calculateScore(quiz.questions, quiz.questions.map(correctAnswerFor));
    expect(result.total).toBe(quiz.questions.length - selfChecks.length);
  });
});

describe('calculateScore with self-checks', () => {
  const questions = [
    { id: 'a', type: 'true-false', correctAnswer: true },
    { id: 'b', type: 'true-false', correctAnswer: true },
    { id: 'c', type: 'true-false', correctAnswer: true },
    { id: 'r', type: 'fill-blank', reviewPrompt: true, correctAnswer: ['a long model answer'] }
  ];

  test('self-check answers never change the score', () => {
    const blank = calculateScore(questions, [true, true, true, '']);
    const wrote = calculateScore(questions, [true, true, true, 'anything at all']);
    expect(blank.score).toBe(100);
    expect(wrote.score).toBe(100);
    expect(blank.total).toBe(3);
  });

  test('2 of 3 scored is 67% and does not pass', () => {
    const result = calculateScore(questions, [true, true, false, 'x']);
    expect(result.score).toBe(67);
    expect(result.passed).toBe(false);
    expect(Object.keys(result.results)).toEqual(['a', 'b', 'c']);
  });

  test('a quiz of only self-checks is not passable', () => {
    const result = calculateScore([questions[3]], ['x']);
    expect(result.passed).toBe(false);
    expect(result.total).toBe(0);
  });
});

describe('prepareAttempt', () => {
  const quiz = quizzesData.quizzes.find((q) => q.id === 'lesson-1-1');

  test('keeps every question and the right answer after shuffling options', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const prepared = prepareAttempt(quiz, [], seeded(seed));
      expect(prepared.map((q) => q.id).sort()).toEqual(quiz.questions.map((q) => q.id).sort());
      for (const q of prepared) {
        const original = quiz.questions.find((x) => x.id === q.id);
        if (q.type === 'multiple-choice') {
          expect(q.options[q.correctAnswer]).toBe(original.options[original.correctAnswer]);
          expect([...q.options].sort()).toEqual([...original.options].sort());
        }
      }
    }
  });

  test('does not mutate the source quiz', () => {
    const before = JSON.stringify(quiz);
    prepareAttempt(quiz, [], seeded(3));
    expect(JSON.stringify(quiz)).toBe(before);
  });

  test('different attempts present the questions in different orders', () => {
    const orders = new Set();
    for (let seed = 1; seed <= 25; seed += 1) {
      orders.add(prepareAttempt(quiz, [], seeded(seed)).map((q) => q.id).join(','));
    }
    expect(orders.size).toBeGreaterThan(5);
  });

  test('a retry never repeats the exact order of the previous attempt', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const first = prepareAttempt(quiz, [], seeded(seed)).map((q) => q.id);
      const second = prepareAttempt(quiz, [{ questionIds: first, missed: [] }], seeded(seed));
      expect(second.map((q) => q.id).join(',')).not.toBe(first.join(','));
    }
  });

  test('options like "all of the above" keep their position', () => {
    const fixed = {
      id: 'f', title: 'F',
      questions: [{
        id: 'f1', type: 'multiple-choice', question: 'Pick', correctAnswer: 3,
        options: ['one', 'two', 'three', 'All of the above']
      }]
    };
    const [q] = prepareAttempt(fixed, [], seeded(5));
    expect(q.options).toEqual(['one', 'two', 'three', 'All of the above']);
    expect(q.correctAnswer).toBe(3);
  });

  test('with a question bank, a retry draws unseen questions first', () => {
    const bank = {
      id: 'bank', title: 'Bank', questionsPerAttempt: 3,
      questions: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((id) => ({
        id, type: 'true-false', question: `Question ${id}?`, correctAnswer: true
      }))
    };
    const first = prepareAttempt(bank, [], seeded(11)).map((q) => q.id);
    expect(first).toHaveLength(3);
    const second = prepareAttempt(bank, [{ questionIds: first, missed: [] }], seeded(12)).map((q) => q.id);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  test('with a question bank, previously missed questions come back before correct ones', () => {
    const bank = {
      id: 'bank', title: 'Bank', questionsPerAttempt: 2,
      questions: ['q1', 'q2', 'q3', 'q4'].map((id) => ({
        id, type: 'true-false', question: `Question ${id}?`, correctAnswer: true
      }))
    };
    const history = [
      { questionIds: ['q1', 'q2'], missed: ['q2'] },
      { questionIds: ['q3', 'q4'], missed: [] }
    ];
    // Everything seen once; q2 was missed, so it must be drawn again.
    const next = prepareAttempt(bank, history, seeded(2)).map((q) => q.id);
    expect(next).toContain('q2');
  });
});

describe('quiz record', () => {
  beforeEach(() => { resetProgress(); });

  test('a failed attempt is recorded, and is not a pass', () => {
    recordQuizAttempt('lesson-1-1', { score: 40, correct: 2, total: 5, passed: false, missed: ['lesson-1-1-q2'] });
    const rec = getQuizRecord('lesson-1-1');
    expect(rec.attemptCount).toBe(1);
    expect(rec.passed).toBe(false);
    expect(rec.bestScore).toBe(40);
    expect(rec.lastAttempt.missed).toEqual(['lesson-1-1-q2']);
    expect(getProgress().quizScores['lesson-1-1']).toBeUndefined();
  });

  test('pass after fail keeps both attempts with timestamps', () => {
    recordQuizAttempt('lesson-1-1', { score: 40, correct: 2, total: 5, passed: false }, new Date('2026-11-01T01:00:00Z'));
    const saved = recordQuizAttempt('lesson-1-1', { score: 80, correct: 4, total: 5, passed: true }, new Date('2026-11-02T01:00:00Z'));
    const rec = getQuizRecord('lesson-1-1');
    expect(saved.number).toBe(2);
    expect(rec.attemptCount).toBe(2);
    expect(rec.passed).toBe(true);
    expect(rec.bestScore).toBe(80);
    expect(rec.firstPassedAt).toBe('2026-11-02T01:00:00.000Z');
    expect(rec.attempts[0].at).toBe('2026-11-01T01:00:00.000Z');
    expect(getProgress().quizScores['lesson-1-1']).toBe(80);
  });

  test('a lower retake never erases a better pass', () => {
    recordQuizAttempt('lesson-1-1', { score: 100, correct: 5, total: 5, passed: true });
    recordQuizAttempt('lesson-1-1', { score: 60, correct: 3, total: 5, passed: false });
    recordQuizAttempt('lesson-1-1', { score: 80, correct: 4, total: 5, passed: true });
    const rec = getQuizRecord('lesson-1-1');
    expect(rec.passed).toBe(true);
    expect(rec.bestScore).toBe(100);
    expect(getProgress().quizScores['lesson-1-1']).toBe(100);
  });

  test('markLessonComplete keeps the best score', () => {
    markLessonComplete('lesson-1-1', 90);
    markLessonComplete('lesson-1-1', 75);
    expect(getProgress().quizScores['lesson-1-1']).toBe(90);
  });

  test('history is capped per quiz', () => {
    for (let i = 0; i < MAX_ATTEMPTS_PER_QUIZ + 5; i += 1) {
      recordQuizAttempt('lesson-1-1', { score: i, correct: 0, total: 5, passed: false });
    }
    const rec = getQuizRecord('lesson-1-1');
    expect(rec.attemptCount).toBe(MAX_ATTEMPTS_PER_QUIZ);
    expect(rec.lastAttempt.score).toBe(MAX_ATTEMPTS_PER_QUIZ + 4);
  });

  test('a quiz with nothing recorded reports no attempts', () => {
    const rec = getQuizRecord('lesson-2-1');
    expect(rec.attemptCount).toBe(0);
    expect(rec.passed).toBe(false);
    expect(rec.bestScore).toBeNull();
    expect(recordSummaryHtml('lesson-2-1')).toContain('No attempts recorded yet');
  });

  test('summary shows status, best score and attempt list', () => {
    recordQuizAttempt('lesson-1-1', { score: 40, correct: 2, total: 5, passed: false });
    recordQuizAttempt('lesson-1-1', { score: 80, correct: 4, total: 5, passed: true });
    const html = recordSummaryHtml('lesson-1-1');
    expect(html).toContain('[PASSED]');
    expect(html).toContain('best 80%');
    expect(html).toContain('2 attempts');
    expect(html).toContain('FAIL');
  });
});

describe('progress integrity keeps the capstone record', () => {
  beforeEach(() => { resetProgress(); });

  test('capstone score and attempts survive pruning of unrelated tampering', () => {
    recordQuizAttempt('capstone-final', { score: 90, correct: 9, total: 10, passed: true });
    // Tampered: lesson-1-2 completed without lesson-1-1.
    markLessonComplete('lesson-1-2', 100);
    const { tampered } = validateProgressIntegrity(lessonsData);
    expect(tampered).toBe(true);

    const progress = getProgress();
    expect(progress.completedLessons).not.toContain('lesson-1-2');
    expect(progress.quizScores['lesson-1-2']).toBeUndefined();
    expect(progress.quizScores['capstone-final']).toBe(90);
    expect(getQuizRecord('capstone-final').attemptCount).toBe(1);
  });

  test('capstone attempts do not add a non-lesson id to completedLessons', () => {
    recordQuizAttempt('capstone-final', { score: 90, correct: 9, total: 10, passed: true });
    expect(getProgress().completedLessons).toEqual([]);
    expect(validateProgressIntegrity(lessonsData).tampered).toBe(false);
  });
});
