import { readFileSync } from 'fs';
import { gradeExercise } from '../app/lessons/lesson-viewer.js';

const lessonsData = JSON.parse(readFileSync('content/lessons.json', 'utf8'));

const exercises = lessonsData.modules
  .flatMap((m) => m.lessons)
  .flatMap((l) => (l.exercises || []).map((ex) => ({ lessonId: l.id, ex })));

const byId = (id) => exercises.find((e) => e.ex.id === id).ex;

describe('exercise test cases can actually be passed', () => {
  test('no exercise expects different output for the same input', () => {
    // A program that prints a fixed answer gives the same stdout for the same
    // stdin, so two exact cases with the same stdin but different expected
    // stdout can never both pass. (This once made "print your name" impossible:
    // it expected both "Maria" and "Juan".)
    const contradictions = [];
    for (const { lessonId, ex } of exercises) {
      const byStdin = new Map();
      for (const tc of ex.test_cases || []) {
        if (tc.expected_pattern) continue; // pattern cases are checked below
        const stdin = tc.expected_stdin || '';
        const out = (tc.expected_stdout || '').replace(/\r\n/g, '\n').trim();
        if (!byStdin.has(stdin)) byStdin.set(stdin, new Set());
        byStdin.get(stdin).add(out);
      }
      for (const outs of byStdin.values()) {
        if (outs.size > 1) contradictions.push(`${lessonId}/${ex.id}`);
      }
    }
    expect(contradictions).toEqual([]);
  });

  test('every test case expects some output (exact text or a pattern)', () => {
    // An empty expectation only passes a program that prints nothing, which
    // contradicts any prompt that says "print ...".
    const empty = [];
    for (const { lessonId, ex } of exercises) {
      (ex.test_cases || []).forEach((tc, i) => {
        const hasText = String(tc.expected_stdout || '').trim() !== '';
        const hasPattern = String(tc.expected_pattern || '').trim() !== '';
        if (!hasText && !hasPattern) empty.push(`${lessonId}/${ex.id}#${i + 1}`);
      });
    }
    expect(empty).toEqual([]);
  });

  test('every expected_pattern is a valid regular expression', () => {
    for (const { ex } of exercises) {
      for (const tc of ex.test_cases || []) {
        if (tc.expected_pattern) expect(() => new RegExp(tc.expected_pattern)).not.toThrow();
      }
    }
  });

  test('the "print the name" exercise has one case that print("Maria") satisfies', () => {
    const ex = byId('ex-1-1-b');
    expect(ex.test_cases).toHaveLength(1);
    expect(ex.test_cases[0].expected_stdout.trim()).toBe('Maria');
    expect(ex.prompt).toContain('Maria');
  });

  test('exercises with random output start blank, not already solved', () => {
    for (const id of ['ex-6-1-d', 'ex-6-3-c', 'ex-6-3-d']) {
      expect(byId(id).starter_code).toBe('# your code here');
    }
  });
});

describe('gradeExercise with expected_pattern', () => {
  const runs = (output) => async () => ({ output, error: null });

  test('a matching output passes, a non-matching output fails', async () => {
    const cases = [{ expected_pattern: '^(Ali|Beth)$' }];
    expect((await gradeExercise('x', cases, runs('Beth\n'))).allPassed).toBe(true);
    expect((await gradeExercise('x', cases, runs('Zed\n'))).allPassed).toBe(false);
    expect((await gradeExercise('x', cases, runs('Ali Beth\n'))).allPassed).toBe(false);
  });

  test('an invalid pattern fails safely instead of throwing', async () => {
    const res = await gradeExercise('x', [{ expected_pattern: '(' }], runs('anything'));
    expect(res.allPassed).toBe(false);
  });

  test('cases without a pattern still need an exact match', async () => {
    const cases = [{ expected_stdout: 'Maria\n' }];
    expect((await gradeExercise('x', cases, runs('Maria\n'))).allPassed).toBe(true);
    expect((await gradeExercise('x', cases, runs('Juan\n'))).allPassed).toBe(false);
  });

  test('a program that prints nothing no longer passes a random-output exercise', async () => {
    for (const id of ['ex-6-1-d', 'ex-6-3-c', 'ex-6-3-d']) {
      expect((await gradeExercise('pass', byId(id).test_cases, runs(''))).allPassed).toBe(false);
    }
  });

  test('real-looking random outputs pass their exercises', async () => {
    const pass = async (id, out) =>
      (await gradeExercise('x', byId(id).test_cases, runs(out))).allPassed;
    expect(await pass('ex-6-1-d', '2\n10\n')).toBe(true);
    expect(await pass('ex-6-1-d', '1\n1\n')).toBe(true);
    expect(await pass('ex-6-1-d', '11\n3\n')).toBe(false);
    expect(await pass('ex-6-1-d', '5\n')).toBe(false);
    expect(await pass('ex-6-3-c', 'Dina\n')).toBe(true);
    expect(await pass('ex-6-3-c', 'Eve\n')).toBe(false);
    expect(await pass('ex-6-3-d', '53.4\n')).toBe(true);
    expect(await pass('ex-6-3-d', '54\n')).toBe(true);
    expect(await pass('ex-6-3-d', 'mean is 54\n')).toBe(false);
  });
});
