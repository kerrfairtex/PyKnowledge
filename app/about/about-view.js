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
        <h2>What is PyKnowledge?</h2>
        <p>PyKnowledge is an <strong>offline-first, installable Python learning app</strong> that
        teaches programming through nine CHED-aligned modules. It was built for TRAC
        students in Bongao, Tawi-Tawi — a region where internet is unreliable, school
        computers are shared, and most educational platforms fail because they need
        constant connectivity.</p>
        <p>Once installed on a phone or computer, the entire course — all 28 lessons,
        108 interactive exercises, 151 quiz questions, a searchable reference library,
        and even a real in-browser Python runner — works <strong>fully offline</strong>.
        No account on any server. No data ever leaves the device. No ads, no
        subscription. Free forever.</p>
      </section>

      <section class="about-card">
        <h2>How the course works</h2>
        <p>Lessons are sequenced into nine progressive modules, from your first
        print() to object-oriented programming. Each lesson includes:</p>
        <ul class="about-feature-list">
          <li><strong>Readable explanations</strong> with worked code examples you can study at your own pace</li>
          <li><strong>Predict-the-output puzzles</strong> — see code, guess what it prints, check your answer</li>
          <li><strong>Fix-the-code challenges</strong> — buggy code with hints and a revealed solution</li>
          <li><strong>Parsons problems</strong> — drag-and-drop code blocks into the correct order</li>
          <li><strong>Write-code exercises</strong> — write real Python and run it instantly in the app using Skulpt, a browser-based Python interpreter</li>
          <li><strong>Challenge exercises</strong> — multi-step problems that test deeper understanding</li>
        </ul>
        <p>Every module ends with a quiz (5+ questions) testing what you learned. A
        final 10-question capstone quiz mixes questions from all nine modules. Lessons
        unlock as you complete them, so you always know exactly what's next —
        complete Module 1's lessons, Module 2 opens, and so on. Your progress shows
        on the dashboard with percentage bars and counts.</p>
      </section>

      <section class="about-card">
        <h2>The nine modules</h2>
        <ul class="about-modules">${moduleRows}</ul>
        <p class="about-note">Finish all nine and take the final capstone quiz to
        complete the course.</p>
      </section>

      <section class="about-card">
        <h2>Reference Library</h2>
        <p>Stuck on a concept? The Library tab has <strong>nine cheat sheets</strong> — one
        per module — covering every topic with syntax examples and common-pitfall warnings.
        There is also a <strong>searchable glossary</strong> of 24 Python terms, from
        "Argument" to "Yield", each explained in one line.</p>
        <p>Unlike the lessons, the Library has no locks — students can browse any topic
        at any time. It is also cached offline after the first visit.</p>
      </section>

      <section class="about-card">
        <h2>Why it works offline</h2>
        <p>Islands like ours lose signal for hours or days. PyKnowledge takes a
        different approach from most learning apps:</p>
        <ul class="about-feature-list">
          <li><strong>Every file is cached on install</strong> — 55 assets including
          lessons, quizzes, exercises, the reference library, and the Python interpreter
          (Skulpt) are stored on your device by the browser's service worker</li>
          <li><strong>Progress is local-only</strong> — completed lessons, quiz scores,
          achievements, and unlocked modules are saved in your browser's IndexedDB</li>
          <li><strong>Multiple profiles</strong> — on shared school computers, each
          student creates a separate profile with a PIN; progress stays separate</li>
          <li><strong>Guest mode</strong> — students can try the course instantly without
          creating a profile; guest progress can be migrated into a named profile later</li>
          <li><strong>Zero cost to run</strong> — after the first visit, the app uses
          no data at all. No videos to stream, no API calls, no server round-trips</li>
        </ul>
      </section>

      <section class="about-card">
        <h2>Built in Tawi-Tawi</h2>
        <p>This curriculum started as coursework for TRAC and BARMM CHED students
        in Bongao, Tawi-Tawi — designed, developed, and tested on a single phone
        and a shared laptop.</p>
        <p>The pacing, examples, and the decision to go fully offline all come from
        teaching in that context: classrooms with intermittent signal, students
        sharing devices, and real-world constraints that most platforms ignore.</p>
        <p>Lesson content follows the CHED calendar and BARMM education standards
        used by schools across the islands.</p>
      </section>

      <section class="about-card">
        <h2>Who built this</h2>
        <p>PyKnowledge was designed, written, and maintained by <strong>Kerr Fairtex</strong>
        — a developer and educator based in Tawi-Tawi who built the entire platform
        (landing page, app shell, curriculum content, exercises, quizzes, reference
        library, and Android deployment) over the course of several months as a
        community project for TRAC students.</p>
        <p>Technology: the app runs on vanilla JavaScript (no framework — just ES
        modules, a custom hash router, and the Skulpt Python interpreter). The
        service worker caches everything for offline use. It deploys to Render as
        a static site and packages for Google Play as a Trusted Web Activity (TWA)
        via PWABuilder.</p>
        <p>MIT licensed — the source code is public and contributions are welcome.
        If you are a teacher or student in BARMM who wants to help improve the
        lessons, translate content into Filipino or Bissa, or add more exercises,
        please reach out.</p>
        <div class="about-photos" aria-hidden="true">
          <img src="ui/assets/place/academic-building.jpg" alt="" loading="lazy" />
          <img src="ui/assets/place/island-aerial-view.jpg" alt="" loading="lazy" />
        </div>
      </section>

      <footer class="about-footer">
        <p>Maintained by <a href="https://www.facebook.com/share/18D34C7E4e/" target="_blank" rel="noopener">Kerr Fairtex</a> · MIT licensed ·
        <a href="https://github.com/kerrfairtex/PyKnowledge" target="_blank" rel="noopener">Source code</a></p>
        <p class="about-privacy">Your data never leaves this device — see our
        privacy policy at pyknowledge.onrender.com/privacy.html when online.</p>
      </footer>
    </div>`;

  animatePageEnter(main.querySelector('.page-content'));
}
