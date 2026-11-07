import { readFileSync, writeFileSync, createHash } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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
  try {
    const hash = createHash('sha256').update(readFileSync(join(root, asset))).digest('hex').slice(0, 12);
    hashes[asset] = hash;
  } catch (e) { console.error(`FAIL: ${asset}: ${e.message}`); process.exit(1); }
}

const manifestPath = join(root, 'tests', '.sw-hashes.json');
let previous = {};
try { previous = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}

let changes = 0;
for (const [a, h] of Object.entries(hashes)) {
  if (previous.hashes?.[a] && previous.hashes[a] !== h) { console.log(`CHANGED: ${a}`); changes++; }
}
writeFileSync(manifestPath, JSON.stringify({ version: CURRENT_VERSION, hashes }, null, 2));
console.log(changes ? `OK: ${changes} change(s) — bump CACHE_VERSION if intentional` : `OK: no changes (v${CURRENT_VERSION})`);
