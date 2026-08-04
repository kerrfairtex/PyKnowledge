/**
 * Lesson viewer — renders lesson content and video player.
 */

import { parseLessonContent } from '../../utils/parser.js';
import { getProgress } from '../../core/storage.js';
import { renderVideoPlayer } from '../../ui/components/video-player.js';

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
    main.innerHTML = `<div class="error-card"><h2>Lesson not found</h2><a href="#/">Back</a></div>`;
    return;
  }

  const parsed = parseLessonContent(lesson);
  const progress = getProgress();
  const mod = lessonsData.modules.find((m) => m.id === moduleId);
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = lessonIndex > 0 ? mod.lessons[lessonIndex - 1] : null;
  const locked = prevLesson && !progress.completedLessons.includes(prevLesson.id);

  if (locked) {
    main.innerHTML = `<div class="error-card"><h2>Lesson Locked</h2><p>Complete "${prevLesson.title}" first.</p><a href="#/module/${moduleId}">Back to Module</a></div>`;
    return;
  }

  const sectionsHtml = parsed.sections.map((section) => `
    <div class="lesson-section">
      <h3>${section.heading}</h3>
      <div class="lesson-body">${section.body}</div>
      ${section.code ? `<pre class="code-block"><code>${escapeHtml(section.code)}</code></pre>` : ''}
    </div>
  `).join('');

  main.innerHTML = `
    <article class="lesson-viewer">
      <header>
        <h2>${parsed.title}</h2>
        ${parsed.duration ? `<span class="duration">${parsed.duration}</span>` : ''}
      </header>
      ${parsed.hasVideo ? `<div id="video-container"></div>` : ''}
      <div class="lesson-content">${sectionsHtml}</div>
      <footer class="lesson-actions">
        <a href="#/module/${moduleId}" class="btn btn-secondary">Back to Module</a>
        <a href="#/quiz/${lessonId}" class="btn btn-primary">Take Quiz</a>
      </footer>
    </article>`;

  if (parsed.hasVideo) {
    const container = document.getElementById('video-container');
    renderVideoPlayer(container, parsed.videoSrc, parsed.title);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
