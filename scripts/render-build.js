/**
 * Render static-site build script.
 * Generates /api-config.js from Render env vars so the frontend
 * knows where the API server lives.
 *
 * Render injects the API_URL env var at build time; this script
 * writes a tiny JS snippet that app-shell.html loads.
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiUrl = process.env.API_URL || '';
const output = `window.PYKNOWLEDGE_API_URL = '${apiUrl.replace(/'/g, "\\'")}';\n`;

writeFileSync(join(root, 'api-config.js'), output);
console.log(`api-config.js written (API_URL: ${apiUrl || '(empty — offline-only)'})`);