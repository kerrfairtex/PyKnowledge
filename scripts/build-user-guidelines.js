/**
 * Build script: generates /user-guidelines/index.html from /docs/USER_GUIDE.md
 *
 * The Markdown file (docs/USER_GUIDE.md) remains the single source of truth.
 * This script converts it to HTML using the marked library and embeds it
 * in a styled documentation page that uses the PyKnowledge design system
 * (ui/themes/tokens.css) — NO custom color tokens.
 *
 * Run: node scripts/build-user-guidelines.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false,
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const mdPath = join(ROOT, 'docs', 'USER_GUIDE.md');
const outDir = join(ROOT, 'user-guidelines');
const outPath = join(outDir, 'index.html');

const mdContent = readFileSync(mdPath, 'utf8');
const html = marked.parse(mdContent);

const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#04090b" />
  <meta name="color-scheme" content="dark">
  <title>User Guide — PyKnowledge</title>
  <meta name="description" content="Complete user guide for PyKnowledge, the offline-first Python learning platform for TRAC/BARMM/CHED students." />
  <link rel="icon" href="/ui/assets/icon-192.png" type="image/png" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="stylesheet" href="/ui/themes/tokens.css" />
  <style>
    * { box-sizing: border-box; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
    }

    html { background: var(--bg); }
    body {
      margin: 0;
      background: transparent;
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.7;
      font-size: 16px;
      -webkit-font-smoothing: antialiased;
    }

    .wrap { max-width: 720px; margin: 0 auto; padding: 0 20px; }

    header.site-header {
      position: sticky; top: 0; z-index: 20;
      background: rgba(4, 9, 11, 0.92);
      border-bottom: 1px solid var(--line);
      padding: 12px 0;
    }
    header.site-header .wrap { display: flex; justify-content: space-between; align-items: center; }
    .brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--text); font-family: var(--font-mono); font-size: 14px; }
    .brand img { height: 24px; width: auto; }
    nav a { color: var(--info); text-decoration: none; font-size: 14px; font-family: var(--font-mono); }
    nav a:hover { text-decoration: underline; }

    .page { padding: 32px 0; }
    h1 { font-size: 28px; font-family: var(--font-mono); color: var(--text); margin: 0 0 8px; line-height: 1.2; }
    h2 { font-size: 20px; font-family: var(--font-mono); color: var(--text); margin: 28px 0 12px; border-bottom: 1px solid var(--line); padding-bottom: 4px; }
    h3 { font-size: 16px; font-family: var(--font-mono); color: var(--info); margin: 16px 0 8px; }
    h4 { font-size: 14px; font-family: var(--font-mono); color: var(--dim); margin: 12px 0 6px; }
    p { margin: 0 0 12px; }
    ul { margin: 0 0 12px; padding-left: 20px; }
    ol { margin: 0 0 12px; padding-left: 24px; }
    li { margin-bottom: 6px; }
    a { color: var(--info); }
    code { font-family: var(--font-mono); background: var(--panel); color: var(--ok); padding: 2px 6px; border-radius: 2px; font-size: 13px; }
    pre { background: var(--panel); border: 1px solid var(--line); border-radius: 2px; padding: 12px; overflow-x: auto; font-size: 13px; }
    pre code { background: none; padding: 0; color: var(--text); }
    blockquote { border-left: 3px solid var(--info); margin: 12px 0; padding: 4px 16px; color: var(--dim); }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
    th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; }
    th { background: var(--panel); color: var(--text); }
    strong { color: var(--text); }
    hr { border: none; border-top: 1px solid var(--line); margin: 24px 0; }
    .tag { display: inline-block; font-family: var(--font-mono); font-size: 11px; padding: 1px 6px; border-radius: 2px; border: 1px solid var(--line); }
    .tag-ok { background: var(--ok); color: var(--bg); }
    .tag-warn { background: var(--warn); color: var(--bg); }
    .callout { background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--ok); padding: 12px 16px; margin: 12px 0; }
    .callout-warn { border-left-color: var(--warn); }
    .callout-err { border-left-color: var(--err); }
    .toc { background: var(--panel); border: 1px solid var(--line); border-radius: 2px; padding: 16px; margin: 16px 0; }
    .toc ol { margin: 0; }
    .btn { display: inline-block; padding: 8px 16px; border: 1px solid var(--line); background: var(--panel); color: var(--text); font-family: var(--font-mono); font-size: 13px; text-decoration: none; cursor: pointer; border-radius: 2px; }
    .btn-primary { background: var(--ok); color: var(--bg); border-color: var(--ok); }
    .page { padding: 32px 0; }
    footer.site-footer { padding: 24px 0; border-top: 1px solid var(--line); font-size: 12px; color: var(--dim); font-family: var(--font-mono); }
    @media (max-width: 480px) {
      .page { padding: 24px 0; }
      h1 { font-size: 24px; }
      h2 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <a href="/" class="brand"><img src="/ui/assets/logo.png" alt="" /> PyKnowledge</a>
      <nav><a href="/privacy.html">Privacy Policy</a></nav>
    </div>
  </header>

  <main class="wrap">
    <div class="page">
      <article class="doc-content">
${html}
      </article>
    </div>
  </main>

  <footer class="site-footer">
    <p>PyKnowledge &middot; MIT licensed &middot; Built for TRAC students in Bongao, Tawi-Tawi</p>
    <p>Curriculum aligned with CHED standards. All content stored locally on your device.</p>
  </footer>
</body>
</html>
`;

import { mkdirSync, mkdir } from 'fs';
try { mkdirSync(outDir, { recursive: true }); } catch(e) { /* ignore if exists */ }

writeFileSync(outPath, page, 'utf8');
console.log('Generated: ' + outPath);
console.log('Source: ' + mdPath);
console.log('Body HTML length: ' + html.length);
console.log('Total page size: ' + page.length + ' bytes');
