import { readFileSync } from 'fs';
import { validateAnswer } from '../utils/validator.js';
import {
  calculateScore,
  isAnswered,
  prepareAttempt,
  buildAnswerReview,
  answerReviewHtml
} from '../app/quizzes/quiz-engine.js';
import { validateQuizzesSchema, ContentValidationError } from '../utils/schema.js';

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

const tfFalse = { id: 'tf-f', type: 'true-false', question: 'Python needs a compiler step.', correctAnswer: false };
const tfTrue = { id: 'tf-t', type: 'true-false', question: 'Python is readable.', correctAnswer: true };
const mc = {
  id: 'mc', type: 'multiple-choice', question: 'Which is a loop?',
  options: ['if', 'for', 'def', 'class'], correctAnswer: 1, explanation: 'for repeats a block.'
};
const fill = { id: 'fb', type: 'fill-blank', question: 'Which function prints?', correctAnswer: ['print', 'print()', '-= '] };

describe('skipped answers are never correct', () => {
  test('an unanswered true/false whose answer is false is wrong', () => {
    expect(validateAnswer(tfFalse, null)).toBe(false);
    expect(validateAnswer(tfFalse, undefined)).toBe(false);
    expect(validateAnswer(tfFalse, '')).toBe(false);
  });

  test('an answered true/false still scores both ways', () => {
    expect(validateAnswer(tfFalse, false)).toBe(true);
    expect(validateAnswer(tfFalse, true)).toBe(false);
    expect(validateAnswer(tfTrue, true)).toBe(true);
    expect(validateAnswer(tfTrue, false)).toBe(false);
  });

  test('answer 0 on multiple-choice is an answer, not a skip', () => {
    expect(validateAnswer({ ...mc, correctAnswer: 0 }, 0)).toBe(true);
  });

  test('submitting everything blank scores 0 and fails', () => {
    const qs = [tfFalse, tfFalse, mc, fill];
    const result = calculateScore(qs, [null, null, null, '']);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  test('no quiz in the real bank can be passed with every answer blank', () => {
    for (const quiz of quizzesData.quizzes) {
      const qs = prepareAttempt(quiz, [], seeded(7));
      const result = calculateScore(qs, qs.map(() => null));
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    }
  });
});

describe('isAnswered', () => {
  test('multiple-choice needs a chosen option', () => {
    expect(isAnswered(mc, null)).toBe(false);
    expect(isAnswered(mc, 0)).toBe(true);
  });

  test('true/false needs an explicit true or false', () => {
    expect(isAnswered(tfFalse, null)).toBe(false);
    expect(isAnswered(tfFalse, false)).toBe(true);
    expect(isAnswered(tfTrue, true)).toBe(true);
  });

  test('fill-blank needs non-blank text', () => {
    expect(isAnswered(fill, '')).toBe(false);
    expect(isAnswered(fill, '   ')).toBe(false);
    expect(isAnswered(fill, 'print')).toBe(true);
  });

  test('self-checks are optional', () => {
    const selfCheck = { id: 's', type: 'fill-blank', question: 'From memory...', correctAnswer: ['x'], reviewPrompt: true };
    expect(isAnswered(selfCheck, '')).toBe(true);
    expect(isAnswered(selfCheck, null)).toBe(true);
  });
});

describe('fill-blank ignores spacing and case', () => {
  test('spaces inside the answer do not matter', () => {
    expect(validateAnswer(fill, 'print( )')).toBe(true);
    expect(validateAnswer(fill, 'print ()')).toBe(true);
    expect(validateAnswer(fill, '  PRINT()  ')).toBe(true);
  });

  test('a stored answer with stray spaces still matches the trimmed input', () => {
    expect(validateAnswer(fill, '-=')).toBe(true);
    expect(validateAnswer(fill, '- =')).toBe(true);
  });

  test('wrong text and blank text are still wrong', () => {
    expect(validateAnswer(fill, 'echo')).toBe(false);
    expect(validateAnswer(fill, '   ')).toBe(false);
  });
});

describe('answer review', () => {
  const quiz = { id: 'q', title: 'Q', questions: [mc, tfFalse, fill] };

  test('shows the learner answer and the correct answer as seen on screen (options shuffled)', () => {
    const qs = prepareAttempt(quiz, [], seeded(3));
    const mcQ = qs.find((q) => q.id === 'mc');
    const wrongIdx = mcQ.options.findIndex((o) => o !== 'for');
    const answers = qs.map((q) => {
      if (q.id === 'mc') return wrongIdx;
      if (q.id === 'tf-f') return true;
      return 'print';
    });
    const result = calculateScore(qs, answers);
    const review = buildAnswerReview(qs, answers, result);

    const mcRow = review.find((r) => r.id === 'mc');
    expect(mcRow.correct).toBe(false);
    expect(mcRow.yourAnswer).toBe(mcQ.options[wrongIdx]);
    expect(mcRow.correctAnswer).toBe('for');
    expect(mcRow.explanation).toBe('for repeats a block.');

    const tfRow = review.find((r) => r.id === 'tf-f');
    expect(tfRow.correct).toBe(false);
    expect(tfRow.yourAnswer).toBe('True');
    expect(tfRow.correctAnswer).toBe('False');

    const fbRow = review.find((r) => r.id === 'fb');
    expect(fbRow.correct).toBe(true);
    expect(fbRow.yourAnswer).toBe('print');
    expect(fbRow.correctAnswer).toBe('print or print() or -=');
  });

  test('self-check questions are left out of the review', () => {
    const selfCheck = { id: 's', type: 'fill-blank', question: 'From memory...', correctAnswer: ['x'], reviewPrompt: true };
    const qs = [mc, selfCheck];
    const answers = [1, 'x'];
    const review = buildAnswerReview(qs, answers, calculateScore(qs, answers));
    expect(review.map((r) => r.id)).toEqual(['mc']);
  });

  test('html lists missed count, correct answers and explanations, and escapes text', () => {
    const risky = { ...mc, id: 'r', question: 'Is <b>x</b> bold?', explanation: 'Use <i>tags</i> carefully.' };
    const qs = [risky];
    const answers = [0];
    const html = answerReviewHtml(buildAnswerReview(qs, answers, calculateScore(qs, answers)));
    expect(html).toContain('1 missed');
    expect(html).toContain('Correct answer: <strong>for</strong>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('&lt;i&gt;tags&lt;/i&gt;');
    expect(html).not.toContain('<b>x</b>');
  });

  test('a fully correct attempt hides correct-answer lines but still lists each question', () => {
    const qs = [mc, tfTrue];
    const answers = [1, true];
    const html = answerReviewHtml(buildAnswerReview(qs, answers, calculateScore(qs, answers)));
    expect(html).toContain('0 missed');
    expect(html).not.toContain('Correct answer:');
    expect(html).toContain('Which is a loop?');
  });

  test('nothing to review renders nothing', () => {
    expect(answerReviewHtml([])).toBe('');
  });
});

describe('quiz schema: optional fields', () => {
  const base = (extra = {}, qExtra = {}) => ({
    version: '1.0.0',
    quizzes: [{
      id: 'a', title: 'A', ...extra,
      questions: [
        { id: 'a1', type: 'true-false', question: 'One?', correctAnswer: true, ...qExtra },
        { id: 'a2', type: 'true-false', question: 'Two?', correctAnswer: false },
        { id: 'a3', type: 'true-false', question: 'Three?', correctAnswer: true }
      ]
    }]
  });

  test('explanation and a valid questionsPerAttempt are accepted', () => {
    expect(() => validateQuizzesSchema(base({ questionsPerAttempt: 2 }, { explanation: 'Because.' }))).not.toThrow();
  });

  test('empty explanation is rejected', () => {
    expect(() => validateQuizzesSchema(base({}, { explanation: '  ' }))).toThrow(ContentValidationError);
  });

  test('questionsPerAttempt must be a whole number within the bank size', () => {
    expect(() => validateQuizzesSchema(base({ questionsPerAttempt: 0 }))).toThrow(ContentValidationError);
    expect(() => validateQuizzesSchema(base({ questionsPerAttempt: 4 }))).toThrow(ContentValidationError);
    expect(() => validateQuizzesSchema(base({ questionsPerAttempt: 1.5 }))).toThrow(ContentValidationError);
  });

  test('the real quiz bank still validates', () => {
    expect(() => validateQuizzesSchema(quizzesData)).not.toThrow();
  });
});
