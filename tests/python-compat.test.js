import { jest } from "@jest/globals";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal browser stub: <script> tags are satisfied by evaluating the
// vendored Skulpt files in the global scope, in the same order the app uses.
globalThis.window = globalThis;
globalThis.document = {
  createElement: () => ({}),
  head: {
    appendChild(el) {
      try {
        const src = readFileSync(join(root, el.src), 'utf8');
        (0, eval)(src);
        queueMicrotask(() => el.onload && el.onload());
      } catch (e) {
        queueMicrotask(() => el.onerror && el.onerror(e));
      }
    },
  },
};

const { executePython } = await import('../lib/python-executor.js');

async function run(code) {
  const r = await executePython(code);
  return { out: r.output.trim(), error: r.error };
}

jest.setTimeout(30000);

describe('Skulpt compat layer (real interpreter)', () => {
  test('runtime boots and prints', async () => {
    expect(await run('print("ok")')).toEqual({ out: 'ok', error: null });
  });

  test('statistics', async () => {
    const r = await run(
      'import statistics\n' +
      'print(statistics.mean([1, 2, 3, 4]))\n' +
      'print(statistics.median([5, 1, 3]))\n' +
      'print(statistics.mode([1, 2, 2, 3]))\n' +
      'print(statistics.pstdev([2, 4, 4, 4, 5, 5, 7, 9]))'
    );
    expect(r.error).toBeNull();
    expect(r.out.split('\n')).toEqual(['2.5', '3', '2', '2.0']);
  });

  test('json dumps and loads', async () => {
    const r = await run(
      'import json\n' +
      'print(json.dumps({"a": 1, "b": [1, 2]}))\n' +
      'print(json.loads(\'{"x": [1, true, null]}\')["x"])'
    );
    expect(r.error).toBeNull();
    expect(r.out.split('\n')).toEqual(['{"a": 1, "b": [1, 2]}', '[1, True, None]']);
  });

  test('in-memory open(): write then read back', async () => {
    const r = await run(
      'with open("t.txt", "w") as f:\n' +
      '    f.write("hi\\nthere\\n")\n' +
      'with open("t.txt") as f:\n' +
      '    print(f.readlines())'
    );
    expect(r.error).toBeNull();
    expect(r.out).toBe("['hi\\n', 'there\\n']");
  });

  test('open() of a missing file raises FileNotFoundError', async () => {
    const r = await run(
      'try:\n' +
      '    open("nope.txt")\n' +
      'except FileNotFoundError:\n' +
      '    print("missing")'
    );
    expect(r.error).toBeNull();
    expect(r.out).toBe('missing');
  });

  test('Python-style float printing', async () => {
    const r = await run('print(3 / 2)\nprint(1.0)\nprint(0.1 + 0.2)');
    expect(r.error).toBeNull();
    expect(r.out.split('\n')).toEqual(['1.5', '1.0', '0.30000000000000004']);
  });
});
