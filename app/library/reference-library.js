/**
 * app/library/reference-library.js
 * PyKnowledge — Reference Library (route: /library)
 *
 * Free-reading area: Python cheat sheets + searchable glossary.
 * Fully offline — content comes from the SW-cached /content/reference.json.
 */

import { loadJSON } from '../../core/loader.js';
import { escapeHtml, escapeAttr } from '../../utils/sanitize.js';
import { renderNotFound } from '../../core/errors.js';
import { animatePageEnter } from '../../ui/components/animations.js';

let referenceData = null;

async function getReference() {
  if (!referenceData) {
    referenceData = await loadJSON('content/reference.json');
  }
  return referenceData;
}

// ---- Route entry ----------------------------------------------------------

export async function renderLibrary(main, params) {
  const sheetId = params && params[0];

  if (sheetId === 'glossary') {
    await renderGlossary(main);
    return;
  }
  if (sheetId) {
    await renderSheet(main, sheetId);
    return;
  }
  await renderIndex(main);
}

// ---- Index: list of sheets + glossary link --------------------------------

async function renderIndex(main) {
  const data = await getReference();

  const cards = data.sheets.map((sheet) => `
    <a class="ref-card" href="#/library/${escapeAttr(sheet.id)}">
      <h3>${escapeHtml(sheet.title)}</h3>
      <p>${escapeHtml(sheet.summary)}</p>
      <span class="ref-card-meta">${sheet.sections.length} sections</span>
    </a>
  `).join('');

  main.innerHTML = `
    <div class="library page-content">
      <header class="library-head">
        <h1>Reference Library</h1>
        <p>Read up on any Python topic — no locks, no quizzes. Works offline.</p>
      </header>

      <section class="ref-glossary-entry" aria-label="Glossary">
        <a class="ref-card ref-card--wide" href="#/library/glossary">
          <h3>📖 Glossary</h3>
          <p>${data.glossary.length} Python terms explained in one line each.</p>
        </a>
      </section>

      <section class="ref-grid" aria-label="Cheat sheets">
        ${cards}
      </section>
    </div>`;

  animatePageEnter(main.querySelector('.page-content'));
}

// ---- Sheet detail -----------------------------------------------------------

async function renderSheet(main, sheetId) {
  const data = await getReference();
  const sheet = data.sheets.find((s) => s.id === sheetId);

  if (!sheet) {
    renderNotFound(main, 'Reference page');
    return;
  }

  // Prev/next navigation across all sheets (glossary excluded).
  const idx = data.sheets.indexOf(sheet);
  const prev = idx > 0 ? data.sheets[idx - 1] : null;
  const next = idx < data.sheets.length - 1 ? data.sheets[idx + 1] : null;

  const sections = sheet.sections.map((section) => `
    <section class="lesson-section">
      <h2>${escapeHtml(section.heading)}</h2>
      <div class="lesson-body">${escapeHtml(section.body)}</div>
      ${section.code ? `<pre class="code-block" tabindex="0"><code>${escapeHtml(section.code)}</code></pre>` : ''}
    </section>
  `).join('');

  main.innerHTML = `
    <article class="reference-sheet page-content">
      <nav class="ref-breadcrumb" aria-label="Breadcrumb">
        <a href="#/library">← All reference pages</a>
      </nav>

      <header>
        <h1>${escapeHtml(sheet.title)}</h1>
        <p class="ref-summary">${escapeHtml(sheet.summary)}</p>
      </header>

      ${sections}

      <footer class="lesson-actions">
        ${prev ? `<a href="#/library/${escapeAttr(prev.id)}" class="btn btn-secondary">← ${escapeHtml(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a href="#/library/${escapeAttr(next.id)}" class="btn btn-primary">${escapeHtml(next.title)} →</a>` : '<span></span>'}
      </footer>
    </article>`;

  animatePageEnter(main.querySelector('.page-content'));
}

// ---- Glossary with live search ---------------------------------------------

function glossaryListHtml(glossary) {
  if (glossary.length === 0) {
    return '<p class="ref-empty">No terms match your search.</p>';
  }
  return `
    <dl class="glossary-list">
      ${glossary.map((entry) => `
        <div class="glossary-item">
          <dt>${escapeHtml(entry.term)}</dt>
          <dd>${escapeHtml(entry.definition)}</dd>
        </div>
      `).join('')}
    </dl>`;
}

async function renderGlossary(main) {
  const data = await getReference();

  main.innerHTML = `
    <div class="glossary page-content">
      <nav class="ref-breadcrumb" aria-label="Breadcrumb">
        <a href="#/library">← All reference pages</a>
      </nav>

      <header class="library-head">
        <h1>Glossary</h1>
        <p>${data.glossary.length} Python terms, A to Y.</p>
      </header>

      <div class="glossary-search">
        <label for="glossary-search-input" class="visually-hidden">Search glossary</label>
        <input type="search" id="glossary-search-input"
               placeholder="Search a term… (e.g. loop)"
               autocomplete="off">
      </div>

      <div id="glossary-results">${glossaryListHtml(data.glossary)}</div>
    </div>`;

  const input = document.getElementById('glossary-search-input');
  const results = document.getElementById('glossary-results');

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const filtered = query
      ? data.glossary.filter((e) =>
          e.term.toLowerCase().includes(query) ||
          e.definition.toLowerCase().includes(query))
      : data.glossary;
    results.innerHTML = glossaryListHtml(filtered);
  });

  animatePageEnter(main.querySelector('.page-content'));
}
