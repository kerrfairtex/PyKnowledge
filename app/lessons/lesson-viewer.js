/**
 * Lesson viewer — renders lesson content and video player.
 */

import { parseLessonContent } from '../../utils/parser.js';
import { getProgress } from '../../core/storage.js';
import { renderVideoPlayer } from '../../ui/components/video-player.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { renderNotFound } from '../../core/errors.js';
import { animatePageEnter } from '../../ui/components/animations.js';

export function renderLessonViewer(main, lessonId, lessonsData) {
  let lesson = null;
  let moduleId = null;

  for (const mod of lessonsData.modules) {
    const found = mod.lessons.find((l) => l.id === lessonId);
    if (found) {
      lesson = found;
      moduleId = mod.id;
      break;
    }
  }

  if (!lesson) {
    renderNotFound(main, 'Lesson');
    return;
  }

  const parsed = parseLessonContent(lesson);
  const progress = getProgress();
  const mod = lessonsData.modules.find((m) => m.id === moduleId);
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = lessonIndex > 0 ? mod.lessons[lessonIndex - 1] : null;
  const locked = prevLesson && !progress.completedLessons.includes(prevLesson.id);

  if (locked) {
    main.innerHTML = `
      <div class="error-card" role="alert">
        <h2>Lesson Locked</h2>
        <p>Complete "${escapeHtml(prevLesson.title)}" first.</p>
        <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-primary">Back to Module</a>
      </div>`;
    return;
  }

  const sectionsHtml = parsed.sections.map((section) => `
    <div class="lesson-section">
      <h3>${escapeHtml(section.heading)}</h3>
      <div class="lesson-body">${escapeHtml(section.body)}</div>
      ${section.code ? `<pre class="code-block" tabindex="0"><code>${escapeHtml(section.code)}</code></pre>` : ''}
    </div>
  `).join('');

  main.innerHTML = `
    <article class="lesson-viewer page-content">
      <header>
        <h2>${escapeHtml(parsed.title)}</h2>
        ${parsed.duration ? `<span class="duration">${escapeHtml(parsed.duration)}</span>` : ''}
      </header>
      ${parsed.hasVideo ? `<div id="video-container"></div>` : ''}
      <div class="lesson-content">${sectionsHtml}</div>
      <footer class="lesson-actions">
        <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-secondary">Back to Module</a>
        <a href="#/quiz/${escapeHtml(lessonId)}" class="btn btn-primary">Take Quiz</a>
      </footer>
    </article>`;

  if (parsed.hasVideo) {
    const container = document.getElementById('video-container');
    renderVideoPlayer(container, parsed.videoSrc, parsed.title);
  }

  animatePageEnter(main.querySelector('.page-content'));
}
