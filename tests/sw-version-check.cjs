const { readFileSync, writeFileSync, statSync } = require('fs');
const { createHash } = require('crypto');
const { join } = require('path');

const root = join(__dirname, '..');
const UPDATE = process.argv.includes('--update');

const swVersionJs = readFileSync(join(root, 'core/sw-version.js'), 'utf8');
const versionMatch = swVersionJs.match(/SW_VERSION\s*=\s*['"]([^'"]+)['"]/);
const CURRENT_VERSION = versionMatch[1];

const swJs = readFileSync(join(root, 'service-worker.js'), 'utf8');
const precacheMatch = swJs.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);
if (!precacheMatch) { console.error('FAIL: no STATIC_ASSETS'); process.exit(1); }

const assetList = precacheMatch[1]
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'))
  .map(l => l.replace(/['"]/g, '').replace(/,$/, '').trim());

const hashes = {};
for (const asset of assetList) {
  const filePath = join(root, asset);
  try {
    if (statSync(filePath).isDirectory()) { hashes[asset] = '__dir__'; continue; }
    hashes[asset] = createHash('sha256').update(readFileSync(filePath)).digest('hex').slice(0, 12);
  } catch (e) { console.error(`FAIL: ${asset}: ${e.message}`); process.exit(1); }
}

const manifestPath = join(root, 'tests', '.sw-hashes.json');
let previous = {};
try { previous = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}

if (UPDATE) {
  writeFileSync(manifestPath, JSON.stringify({ version: CURRENT_VERSION, hashes }, null, 2));
  console.log(`OK: baseline updated to v${CURRENT_VERSION} (${Object.keys(hashes).length} files)`);
  process.exit(0);
}

let changes = 0;
for (const [a, h] of Object.entries(hashes)) {
  if (previous.hashes?.[a] && previous.hashes[a] !== h) {
    console.log(`CHANGED: ${a} (${previous.hashes[a]} -> ${h})`);
    changes++;
  }
}
if (changes > 0) {
  console.log(`\nFAIL: ${changes} file(s) changed since v${previous.version || '?'} — bump CACHE_VERSION (currently ${CURRENT_VERSION})`);
  process.exit(1);
}
console.log(`OK: no changes since v${previous.version} (${Object.keys(hashes).length} files)`);
