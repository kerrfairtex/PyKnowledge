#!/usr/bin/env node
/**
 * scripts/verify-precache-coverage.js
 *
 * Walks the real project files and fails if any file required for offline
 * operation is missing from the service-worker STATIC_ASSETS precache list.
 *
 * Usage: node scripts/verify-precache-coverage.js
 *
 * Exits non-zero if gaps are found.
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

const root = process.cwd();

// ---------- 1. Parse STATIC_ASSETS from service-worker.js ----------
const swSource = readFileSync(join(root, 'service-worker.js'), 'utf8');
const block = swSource.match(/STATIC_ASSETS\s*=\s*\[\s*([\s\S]*?)\s*\]/);
if (!block) {
  console.error('FAIL: Could not find STATIC_ASSETS array in service-worker.js');
  process.exit(2);
}

const precacheAssets = block[1]
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith('//'))
  .map((l) => l.replace(/['"]/g, '').replace(/,$/, '').trim())
  .filter((l) => l.length > 0);

const precacheSet = new Set(precacheAssets);
console.log('Precache list: ' + precacheAssets.length + ' entries');

// ---------- 2. Enumerate required project files ----------
const EXCLUDED_DIRS = [
  'node_modules', '.git', 'server', 'tests', 'Curriculum', 'scripts', 'docs',
  'store-listing',
];

const ROOT_BUILD_ONLY = [
  'package.json', 'package-lock.json', 'vercel.json', 'netlify.toml',
  'docker-compose.yml', 'render.yaml', 'render.json',
  'eslint.config.js', 'jest.config.js', 'api-config.js',
  'app-shell.html',
  'nova-chatbox.html',
  'place-context.html',
  'footer.html',
];

function isRequiredFile(filePath) {
  const rel = relative(root, filePath).split(sep).join('/');
  const top = rel.split('/')[0];

  if (EXCLUDED_DIRS.includes(top)) return false;
  if (top === '.' && ROOT_BUILD_ONLY.includes(rel)) return false;

  const ext = extname(rel).toLowerCase();
  const requiredExts = [
    '.html', '.js', '.css', '.json', '.woff2', '.woff',
    '.png', '.jpg', '.jpeg', '.svg', '.ico',
  ];
  return requiredExts.includes(ext);
}

function walk(dir, results) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (isRequiredFile(full)) {
      results.push(full);
    }
  }
  return results;
}

const requiredFiles = walk(root, []);
console.log('Required project files: ' + requiredFiles.length);

// ---------- 3. Compare ----------
const missing = [];
const onDiskMissing = [];

for (const file of requiredFiles) {
  const rel = '/' + relative(root, file).split(sep).join('/');
  if (!precacheSet.has(rel)) {
    missing.push(rel);
  }
}

for (const asset of precacheAssets) {
  const diskPath = asset === '/' ? join(root, 'index.html') : join(root, asset.slice(1));
  try {
    statSync(diskPath);
  } catch {
    onDiskMissing.push(asset);
  }
}

console.log('');
console.log('=== RESULTS ===');
console.log('Required files not in precache: ' + missing.length);
missing.forEach((m) => console.log('  MISSING: ' + m));

console.log('');
console.log('Precache entries not on disk: ' + onDiskMissing.length);
onDiskMissing.forEach((m) => console.log('  NOT ON DISK: ' + m));

// ---------- 4. Exit code ----------
let exitCode = 0;
if (missing.length > 0) {
  console.error('\nFAIL: ' + missing.length + ' required file(s) are not precached. Offline coverage incomplete.');
  exitCode = 1;
}
if (onDiskMissing.length > 0) {
  console.error('\nFAIL: ' + onDiskMissing.length + ' precache entry(ies) do not exist on disk.');
  exitCode = 1;
}
if (missing.length === 0 && onDiskMissing.length === 0) {
  console.log('\nPASS: All required project files are in the precache list and exist on disk.');
}

process.exit(exitCode);
