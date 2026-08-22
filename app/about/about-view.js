/**
 * In-app About view (route: /about).
 *
 * The installed app never shows the marketing landing page, so this view
 * carries the "what is this / who made it" story INSIDE the app: what the
 * course covers, why it's offline-first, how to use it, and the place
 * context. Reachable from the auth welcome screen and the navbar.
 */

import { escapeHtml } from '../../utils/sanitize.js';
import { animatePageEnter } from '../../ui/components/animations.js';

export function renderAbout(main) {
  const modules = [
    ['Introduction to Python', 'Syntax, variables, and basic data types.'],
    ['Control Structures', 'Conditionals and loops that control program flow.'],
    ['Loops', 'for, while, break/continue, and nested loops.'],
    ['Functions', 'Reusable code — parameters, return values, scope.'],
    ['Data Structures', 'Lists, tuples, sets, dictionaries, comprehensions.'],
    ['Modules and Imports', 'Organizing code; the standard library; your own modules.'],
    ['Input and Output', 'f-strings, file reading/writing, JSON data.'],
    ['Errors and Exceptions', 'try/except, raising errors, cleanup with finally.'],
    ['Classes & OOP', 'Your own types, inheritance, iterators and generators.']
  ];

  const moduleRows = modules.map(([title, desc], i) => `
    <li class="about-module-row">
      <span class="about-module-num">${i + 1}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(desc)}</p>
      </div>
    </li>`).join('');

  main.innerHTML = `
    <div class="about-view page-content">
      <header class="about-hero">
        <div class="auth-logo" aria-hidden="true">🐍</div>
        <h1>About PyKnowledge</h1>
        <p class="about-lede">A free Python course built for students in Tawi-Tawi
        and across BARMM — designed for shared computers, patchy island signal,
        and real classroom conditions.</p>
      </header>

      <section class="about-card">
        <h2>What is this?</h2>
        <p>PyKnowledge teaches Python programming through <strong>nine
        CHED-aligned modules</strong> — 28 lessons with explanations, worked code
        examples, and interactive exercises: predict-the-output puzzles,
        fix-the-code challenges, drag-and-drop program building, and a real
        Python runner so you can write and test code right on this device.</p>
        <p>Every module ends with a quiz. Lessons unlock as you master them,
        so you always know exactly what's next.</p>
      </section>

      <section class="about-card">
        <h2>The nine modules</h2>
        <ul class="about-modules">${moduleRows}</ul>
        <p class="about-note">Finish all nine and take the final capstone quiz to
        complete the course.</p>
      </section>

      <section class="about-card">
        <h2>Why it works offline</h2>
        <p>Islands like ours lose signal for hours or days. PyKnowledge caches
        every lesson, exercise, quiz, and even its Python interpreter on your
        device during install. After the first load you never need internet
        again — your progress, scores, and achievements are saved on this device
        too.</p>
        <p>Profiles keep each student's progress separate on shared computers.
        No email, no account, no server — nothing you do here leaves your
        device.</p>
      </section>

      <section class="about-card">
        <h2>Built in Tawi-Tawi</h2>
        <p>This curriculum started as coursework for TRAC and BARMM CHED students
        in Bongao. The pacing, examples, and offline-first design all come from
        teaching in that context. Lesson content follows the CHED calendar and
        BARMM education standards used by schools across the islands.</p>
        <div class="about-photos" aria-hidden="true">
          <img src="ui/assets/place/academic-building.jpg" alt="" loading="lazy" />
          <img src="ui/assets/place/island-aerial-view.jpg" alt="" loading="lazy" />
        </div>
      </section>

      <footer class="about-footer">
        <p>Maintained by Kerr Fairtex · MIT licensed ·
        <a href="https://github.com/kerrfairtex/PyKnowledge" target="_blank" rel="noopener">Source code</a></p>
        <p class="about-privacy">Your data never leaves this device — see our
        privacy policy at pyknowledge.onrender.com/privacy.html when online.</p>
      </footer>
    </div>`;

  animatePageEnter(main.querySelector('.page-content'));
}
