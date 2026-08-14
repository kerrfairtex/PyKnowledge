/**
 * PyKnowledge Front Page — project landing with design, development, and regional context.
 */

import { escapeHtml } from '../../utils/sanitize.js';
import { APP_VERSION } from '../../core/version.js';
import { animatePageEnter, staggerChildren } from '../../ui/components/animations.js';
import { getOverallProgress } from '../../storage/progress.js';

export function renderFrontPage(main, _params, _route, lessonsData) {
  const overall = lessonsData ? getOverallProgress(lessonsData) : null;
  const lessonCount = lessonsData
    ? lessonsData.modules.reduce((n, m) => n + m.lessons.length, 0)
    : 5;
  const moduleCount = lessonsData ? lessonsData.modules.length : 2;

  main.innerHTML = `
    <div class="front-page page-content">

      <!-- Hero -->
      <section class="fp-hero" aria-labelledby="fp-hero-title">
        <div class="fp-hero-glow" aria-hidden="true"></div>
        <div class="fp-hero-content animate-item">
          <div class="fp-badges">
            <span class="fp-badge">Offline-First</span>
            <span class="fp-badge">Zero Hosting Cost</span>
            <span class="fp-badge">CHED-Aligned</span>
          </div>
          <h2 id="fp-hero-title" class="fp-hero-title">PyKnowledge</h2>
          <p class="fp-hero-lead">Offline Python Learning Platform for Remote Communities</p>
          <p class="fp-hero-desc">
            A browser-based learning system that keeps working when the internet doesn't —
            designed for students, faculty, and institutions in areas with weak connectivity
            and legacy hardware.
          </p>
          <div class="fp-hero-actions">
            <a href="#/dashboard" class="btn btn-primary btn-lg fp-cta">Start Learning</a>
            <a href="#the-area" class="btn btn-secondary btn-lg">Explore the Project</a>
          </div>
          ${overall ? `
            <p class="fp-hero-progress">
              Your progress: <strong>${overall.completedLessons}/${overall.totalLessons}</strong> lessons complete
            </p>` : ''}
        </div>
        <div class="fp-hero-visual animate-item" aria-hidden="true">
          <div class="fp-code-window">
            <div class="fp-code-bar">
              <span></span><span></span><span></span>
            </div>
            <pre class="fp-code"><code><span class="code-comment"># Your first Python program</span>
<span class="code-keyword">print</span>(<span class="code-string">'Hello from BARMM!'</span>)

<span class="code-comment"># Works offline after install</span>
<span class="code-keyword">for</span> lesson <span class="code-keyword">in</span> modules:
    learn(lesson)</code></pre>
          </div>
        </div>
      </section>

      <!-- The Area -->
      <section class="fp-section" id="the-area" aria-labelledby="fp-area-title">
        <div class="fp-section-header animate-item">
          <span class="fp-section-label">Target Region</span>
          <h2 id="fp-area-title">Serving Underserved Learning Communities</h2>
          <p class="fp-section-intro">
            PyKnowledge is purpose-built for institutions operating in geographically
            isolated and connectivity-challenged regions of the Philippines.
          </p>
        </div>
        <div class="fp-area-grid">
          <article class="fp-area-card animate-item">
            <div class="fp-area-icon" aria-hidden="true">🏫</div>
            <h3>TRAC</h3>
            <p>
              Tawi-Tawi Regional Agricultural College and partner institutions
              serving students across island and coastal communities where
              stable internet remains unreliable.
            </p>
          </article>
          <article class="fp-area-card animate-item">
            <div class="fp-area-icon" aria-hidden="true">🌴</div>
            <h3>BARMM</h3>
            <p>
              Bangsamoro Autonomous Region in Muslim Mindanao — empowering learners
              in a culturally diverse region where digital infrastructure
              is still developing.
            </p>
          </article>
          <article class="fp-area-card animate-item">
            <div class="fp-area-icon" aria-hidden="true">📋</div>
            <h3>CHED Curriculum</h3>
            <p>
              Content aligned with Commission on Higher Education Python programming
              standards, ensuring academic rigor while remaining accessible
              on low-spec school computers.
            </p>
          </article>
        </div>
        <div class="fp-area-stats animate-item">
          <div class="fp-stat">
            <span class="fp-stat-value">&lt;500ms</span>
            <span class="fp-stat-label">Page load target</span>
          </div>
          <div class="fp-stat">
            <span class="fp-stat-value">2 GB</span>
            <span class="fp-stat-label">Minimum RAM</span>
          </div>
          <div class="fp-stat">
            <span class="fp-stat-value">0</span>
            <span class="fp-stat-label">Hosting cost</span>
          </div>
          <div class="fp-stat">
            <span class="fp-stat-value">100%</span>
            <span class="fp-stat-label">Offline after install</span>
          </div>
        </div>
      </section>

      <!-- Platform -->
      <section class="fp-section fp-section-alt" id="platform" aria-labelledby="fp-platform-title">
        <div class="fp-section-header animate-item">
          <span class="fp-section-label">The Platform</span>
          <h2 id="fp-platform-title">Not a Traditional LMS</h2>
          <p class="fp-section-intro">
            PyKnowledge is a self-contained Progressive Web App — no servers,
            no databases, no recurring fees. Everything runs inside the browser.
          </p>
        </div>
        <div class="fp-feature-grid">
          <div class="fp-feature animate-item">
            <span class="fp-feature-icon" aria-hidden="true">📚</span>
            <h3>Content Module</h3>
            <p>JSON-driven lessons with code examples and embedded video playback.</p>
          </div>
          <div class="fp-feature animate-item">
            <span class="fp-feature-icon" aria-hidden="true">✅</span>
            <h3>Assessment Module</h3>
            <p>Interactive quizzes with scoring, validation, and a 70% pass threshold.</p>
          </div>
          <div class="fp-feature animate-item">
            <span class="fp-feature-icon" aria-hidden="true">📈</span>
            <h3>Progress Module</h3>
            <p>Lesson unlocking, achievements, and per-student progress tracking.</p>
          </div>
          <div class="fp-feature animate-item">
            <span class="fp-feature-icon" aria-hidden="true">🔒</span>
            <h3>Local Profiles</h3>
            <p>PIN-protected student profiles for shared school computers — fully offline.</p>
          </div>
        </div>
      </section>

      <!-- Design -->
      <section class="fp-section" id="design" aria-labelledby="fp-design-title">
        <div class="fp-section-header animate-item">
          <span class="fp-section-label">Design</span>
          <h2 id="fp-design-title">Designed for Clarity and Access</h2>
          <p class="fp-section-intro">
            Every design decision prioritizes readability on small screens, low-end hardware,
            and environments where students may be learning independently.
          </p>
        </div>
        <div class="fp-design-grid">
          <div class="fp-design-item animate-item">
            <h3>Visual Language</h3>
            <ul>
              <li>Dark theme reduces eye strain during long study sessions</li>
              <li>High-contrast accents for buttons and progress indicators</li>
              <li>Monospace code blocks with syntax-friendly formatting</li>
              <li>Gradient hero and ambient backgrounds for visual hierarchy</li>
            </ul>
          </div>
          <div class="fp-design-item animate-item">
            <h3>Accessibility</h3>
            <ul>
              <li>Skip-to-content link and keyboard navigation</li>
              <li>ARIA labels, roles, and focus management throughout</li>
              <li><code>prefers-reduced-motion</code> support for all animations</li>
              <li>Semantic HTML5 structure for screen readers</li>
            </ul>
          </div>
          <div class="fp-design-item animate-item">
            <h3>Motion Design</h3>
            <ul>
              <li>Page transitions and staggered card entrances</li>
              <li>Progress bar fill animations and hover micro-interactions</li>
              <li>Achievement celebration overlays on quiz completion</li>
              <li>Loading skeletons during content fetch</li>
            </ul>
          </div>
          <div class="fp-design-item animate-item">
            <h3>Responsive Layout</h3>
            <ul>
              <li>Mobile-first layout for phones and tablets</li>
              <li>Flexible module grid adapts to any screen width</li>
              <li>Touch-friendly buttons and quiz controls</li>
              <li>Works on dual-core CPUs with 2 GB RAM</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Development -->
      <section class="fp-section fp-section-alt" id="development" aria-labelledby="fp-dev-title">
        <div class="fp-section-header animate-item">
          <span class="fp-section-label">Development</span>
          <h2 id="fp-dev-title">Built with Modern Web Standards</h2>
          <p class="fp-section-intro">
            A pure HTML5, CSS3, and Vanilla JavaScript stack — intentionally
            excluding backends and frameworks to maximize sustainability and portability.
          </p>
        </div>
        <div class="fp-stack">
          <div class="fp-stack-layer animate-item">
            <h3>Frontend</h3>
            <div class="fp-tags">
              <span class="fp-tag">HTML5</span>
              <span class="fp-tag">CSS3</span>
              <span class="fp-tag">JavaScript ES6+</span>
              <span class="fp-tag">PWA</span>
            </div>
          </div>
          <div class="fp-stack-layer animate-item">
            <h3>Offline Engine</h3>
            <div class="fp-tags">
              <span class="fp-tag">Service Worker</span>
              <span class="fp-tag">Cache API</span>
              <span class="fp-tag">LocalStorage</span>
              <span class="fp-tag">JSON Assets</span>
            </div>
          </div>
          <div class="fp-stack-layer animate-item">
            <h3>Security</h3>
            <div class="fp-tags">
              <span class="fp-tag">Web Crypto API</span>
              <span class="fp-tag">PBKDF2 PIN Hashing</span>
              <span class="fp-tag">XSS Sanitization</span>
              <span class="fp-tag">Schema Validation</span>
            </div>
          </div>
          <div class="fp-stack-layer animate-item">
            <h3>Quality</h3>
            <div class="fp-tags">
              <span class="fp-tag">Jest Testing</span>
              <span class="fp-tag">ESLint</span>
              <span class="fp-tag">GitHub Actions CI</span>
              <span class="fp-tag">Semantic Versioning</span>
            </div>
          </div>
        </div>
        <div class="fp-architecture animate-item">
          <h3>Architecture Flow</h3>
          <div class="fp-flow">
            <span class="fp-flow-step">Launch</span>
            <span class="fp-flow-arrow" aria-hidden="true">→</span>
            <span class="fp-flow-step">Dashboard</span>
            <span class="fp-flow-arrow" aria-hidden="true">→</span>
            <span class="fp-flow-step">Load JSON</span>
            <span class="fp-flow-arrow" aria-hidden="true">→</span>
            <span class="fp-flow-step">Lesson</span>
            <span class="fp-flow-arrow" aria-hidden="true">→</span>
            <span class="fp-flow-step">Quiz</span>
            <span class="fp-flow-arrow" aria-hidden="true">→</span>
            <span class="fp-flow-step">Progress</span>
          </div>
        </div>
      </section>

      <!-- Content overview -->
      <section class="fp-section" id="curriculum" aria-labelledby="fp-curr-title">
        <div class="fp-section-header animate-item">
          <span class="fp-section-label">Curriculum</span>
          <h2 id="fp-curr-title">What's Inside</h2>
        </div>
        <div class="fp-curriculum-cards">
          <div class="fp-curr-card animate-item">
            <span class="fp-curr-number">${moduleCount}</span>
            <span class="fp-curr-label">Modules</span>
          </div>
          <div class="fp-curr-card animate-item">
            <span class="fp-curr-number">${lessonCount}</span>
            <span class="fp-curr-label">Lessons</span>
          </div>
          <div class="fp-curr-card animate-item">
            <span class="fp-curr-number">${lessonCount}</span>
            <span class="fp-curr-label">Quizzes</span>
          </div>
        </div>
        <p class="fp-curr-note animate-item">
          Python fundamentals through control structures — expandable JSON content
          pipeline for future CHED module additions.
        </p>
      </section>

      <!-- Stakeholders -->
      <section class="fp-section fp-section-alt" id="stakeholders" aria-labelledby="fp-stake-title">
        <div class="fp-section-header animate-item">
          <span class="fp-section-label">Governance</span>
          <h2 id="fp-stake-title">Project Stakeholders</h2>
        </div>
        <div class="fp-stakeholders">
          <div class="fp-stake animate-item"><strong>Students</strong><span>Primary learners</span></div>
          <div class="fp-stake animate-item"><strong>CHED</strong><span>Curriculum standards</span></div>
          <div class="fp-stake animate-item"><strong>BARMM</strong><span>Regional governance</span></div>
          <div class="fp-stake animate-item"><strong>TRAC Admin</strong><span>Institution oversight</span></div>
          <div class="fp-stake animate-item"><strong>ICS Faculty</strong><span>Content & instruction</span></div>
          <div class="fp-stake animate-item"><strong>Project Team</strong><span>Design & development</span></div>
        </div>
      </section>

      <!-- CTA -->
      <section class="fp-cta animate-item" aria-labelledby="fp-cta-title">
        <h2 id="fp-cta-title">Ready to Learn Python?</h2>
        <p>No internet required after your first visit. Install once, learn anywhere.</p>
        <a href="#/dashboard" class="btn btn-primary btn-lg fp-cta">Enter Learning Dashboard</a>
        <p class="fp-version">PyKnowledge v${escapeHtml(APP_VERSION)}</p>
      </section>

    </div>`;

  document.body.classList.add('front-page-active');
  animatePageEnter(main.querySelector('.front-page'));
  staggerChildren(main, '.animate-item');

  main.querySelectorAll('a[href^="#"]').forEach((link) => {
    if (link.getAttribute('href').startsWith('#/')) return;
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

export function clearFrontPageLayout() {
  document.body.classList.remove('front-page-active');
}
