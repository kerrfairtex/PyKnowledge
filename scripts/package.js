/**
 * Release packaging script for PyKnowledge.
 * Creates a distributable zip archive of the offline platform.
 */

import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const FILES = [
  'index.html', 'manifest.json', 'package.json', 'README.md', 'CHANGELOG.md',
  'robots.txt', 'docs',
  'app', 'core', 'content', 'storage', 'ui', 'utils'
];

mkdirSync(join(ROOT, 'dist'), { recursive: true });

const outputName = `pyknowledge-v${VERSION}.zip`;
execSync(`cd "${ROOT}" && zip -r "dist/${outputName}" ${FILES.join(' ')}`, { stdio: 'inherit' });
console.log(`Packaged: dist/${outputName}`);
