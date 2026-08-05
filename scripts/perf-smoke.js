import { performance } from 'perf_hooks';
import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const THRESHOLD_MS = 500;

const files = [
  'index.html',
  'core/engine.js',
  'content/lessons.json',
  'content/quizzes.json',
  'ui/themes/default.css'
];

let totalSize = 0;
const results = [];

for (const file of files) {
  const path = join(root, file);
  const start = performance.now();
  readFileSync(path, 'utf8');
  const elapsed = performance.now() - start;
  const size = statSync(path).size;
  totalSize += size;
  results.push({ file, elapsed: elapsed.toFixed(2), size });
}

console.log('Performance smoke test:');
results.forEach((r) => console.log(`  ${r.file}: ${r.elapsed}ms (${r.size} bytes)`));
console.log(`  Total asset size (sample): ${(totalSize / 1024).toFixed(1)} KB`);

const maxElapsed = Math.max(...results.map((r) => parseFloat(r.elapsed)));
if (maxElapsed > THRESHOLD_MS) {
  console.error(`FAIL: File read exceeded ${THRESHOLD_MS}ms threshold (${maxElapsed}ms)`);
  process.exit(1);
}

console.log(`PASS: All files read under ${THRESHOLD_MS}ms`);
