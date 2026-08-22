import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const versionFile = readFileSync(join(root, 'core/version.js'), 'utf8');

const swVersionFile = readFileSync(join(root, 'core/sw-version.js'), 'utf8');

const match = versionFile.match(/APP_VERSION = '([^']+)'/);
if (!match) {
  console.error('Could not parse APP_VERSION from core/version.js');
  process.exit(1);
}

const appVersion = match[1];

if (pkg.version !== appVersion) {
  console.error(`Version mismatch: package.json (${pkg.version}) !== core/version.js (${appVersion})`);
  process.exit(1);
}

const swMatch = swVersionFile.match(/SW_VERSION = '([^']+)'/);
if (!swMatch) {
  console.error('Could not parse SW_VERSION from core/sw-version.js');
  process.exit(1);
}

if (swMatch[1] !== appVersion) {
  console.error(`Version mismatch: core/sw-version.js (${swMatch[1]}) !== core/version.js (${appVersion})`);
  process.exit(1);
}

console.log(`Version sync OK: v${appVersion}`);
