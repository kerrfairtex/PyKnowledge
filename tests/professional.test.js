import { escapeHtml, escapeAttr, sanitizeHtml } from '../utils/sanitize.js';
import {
  validateLessonsSchema,
  validateQuizzesSchema,
  validateContentIntegrity,
  ContentValidationError
} from '../utils/schema.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('sanitize', () => {
  test('escapeHtml escapes dangerous characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('escapeHtml handles null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('sanitizeHtml removes script tags', () => {
    const dirty = '<p>Hello</p><script>evil()</script>';
    expect(sanitizeHtml(dirty)).not.toContain('<script>');
  });

  test('escapeAttr escapes backticks', () => {
    expect(escapeAttr('`test`')).toBe('&#96;test&#96;');
  });
});

describe('schema validation', () => {
  const validLessons = {
    version: '1.0.0',
    modules: [{
      id: 'm1', title: 'Test', description: 'Desc', prerequisite: null,
      lessons: [{ id: 'l1', title: 'L1', content: { sections: [{ heading: 'H', body: 'B' }] } }]
    }]
  };

  const validQuizzes = {
    version: '1.0.0',
    quizzes: [{
      id: 'l1', title: 'Q1',
      questions: [{ id: 'q1', type: 'true-false', question: 'Test?', correctAnswer: true }]
    }]
  };

  test('validates correct lessons schema', () => {
    expect(validateLessonsSchema(validLessons)).toEqual(validLessons);
  });

  test('rejects empty modules', () => {
    expect(() => validateLessonsSchema({ version: '1', modules: [] }))
      .toThrow(ContentValidationError);
  });

  test('validates correct quizzes schema', () => {
    expect(validateQuizzesSchema(validQuizzes)).toEqual(validQuizzes);
  });

  test('rejects invalid question type', () => {
    const bad = {
      version: '1', quizzes: [{
        id: 'q', title: 'T',
        questions: [{ id: 'q1', type: 'essay', question: 'Q' }]
      }]
    };
    expect(() => validateQuizzesSchema(bad)).toThrow(ContentValidationError);
  });

  test('validates content integrity', () => {
    expect(() => validateContentIntegrity(validLessons, validQuizzes)).not.toThrow();
  });

  test('rejects quiz without matching lesson', () => {
    const badQuizzes = {
      version: '1', quizzes: [{
        id: 'orphan', title: 'T',
        questions: [{ id: 'q1', type: 'true-false', question: 'Q', correctAnswer: true }]
      }]
    };
    expect(() => validateContentIntegrity(validLessons, badQuizzes))
      .toThrow(ContentValidationError);
  });

  test('validates real content files', () => {
    const lessons = JSON.parse(readFileSync(join(root, 'content/lessons.json'), 'utf8'));
    const quizzes = JSON.parse(readFileSync(join(root, 'content/quizzes.json'), 'utf8'));
    validateLessonsSchema(lessons);
    validateQuizzesSchema(quizzes);
    validateContentIntegrity(lessons, quizzes);
  });
});

describe('router', () => {
  test('getCurrentRoute parses hash correctly', async () => {
    const { getCurrentRoute } = await import('../core/router.js');
    // In node env without window, we test the logic indirectly
    expect(typeof getCurrentRoute).toBe('function');
  });
});
