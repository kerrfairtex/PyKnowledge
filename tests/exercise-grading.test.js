import { gradeExercise } from '../app/lessons/lesson-viewer.js';

const executeFn = async (code, stdin) => {
  // Mock Skulpt: case 1 outputs 'hello', case 2 outputs 'goodbye', case 3 outputs 'world'
  const expectedByStdin = {
    '': 'hello',
    'stdin-2': 'goodbye',
    'stdin-3': 'world',
  };
  const output = expectedByStdin[stdin] ?? 'unknown';
  return { output, error: null };
};

describe('gradeExercise — all test cases run', () => {
  const testCases = [
    { expected_stdin: '', expected_stdout: 'hello' },
    { expected_stdin: 'stdin-2', expected_stdout: 'goodbye' },
    { expected_stdin: 'stdin-3', expected_stdout: 'world' },
  ];

  test('all 3 test cases run and results array has 3 entries', async () => {
    const result = await gradeExercise('print("hello")', testCases, executeFn);
    expect(result.results.length).toBe(3);
    // Every case was exercised
    expect(result.results[0].stdin).toBe('');
    expect(result.results[1].stdin).toBe('stdin-2');
    expect(result.results[2].stdin).toBe('stdin-3');
  });

  test('case 1 passes, case 2 fails -> allPassed is false', async () => {
    // Case 2 expects 'goodbye' but mock returns 'goodbye' — wait, need a failing case
    const failingCases = [
      { expected_stdin: '', expected_stdout: 'hello' },      // passes
      { expected_stdin: 'stdin-2', expected_stdout: 'WRONG' }, // fails: mock returns 'goodbye'
      { expected_stdin: 'stdin-3', expected_stdout: 'world' }, // passes
    ];
    const result = await gradeExercise('print("hello")', failingCases, executeFn);
    expect(result.allPassed).toBe(false);
    expect(result.passCount).toBe(2);
    expect(result.failingCaseIndex).toBe(2);
  });

  test('failing case 2 is reported with correct message', async () => {
    const failingCases = [
      { expected_stdin: '', expected_stdout: 'hello' },
      { expected_stdin: 'stdin-2', expected_stdout: 'WRONG' },
      { expected_stdin: 'stdin-3', expected_stdout: 'world' },
    ];
    const result = await gradeExercise('print("hello")', failingCases, executeFn);
    expect(result.message).toContain('Test case 2 of 3 failed');
    expect(result.message).toContain('(2/3 passed)');
  });

  test('all 3 pass -> allPassed is true', async () => {
    const result = await gradeExercise('print("hello")', testCases, executeFn);
    expect(result.allPassed).toBe(true);
    expect(result.passCount).toBe(3);
    expect(result.message).toBe('[OK] All 3 test cases passed.');
  });

  test('empty test cases array -> allPassed is true', async () => {
    const result = await gradeExercise('print("hello")', [], executeFn);
    expect(result.allPassed).toBe(true);
    expect(result.results.length).toBe(0);
  });

  test('executeFn error propagates and allPassed is false', async () => {
    const errorFn = async () => ({ output: '', error: 'Skulpt crashed' });
    const result = await gradeExercise('print("hello")', testCases, errorFn);
    expect(result.allPassed).toBe(false);
    expect(result.results[0].error).toBe('Skulpt crashed');
  });
});
