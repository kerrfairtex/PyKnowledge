/**
 * Lesson viewer — renders lesson content, video player, and exercises.
 */

import { parseLessonContent } from '../../utils/parser.js';
import { getProgress } from '../../core/storage.js';
import { renderVideoPlayer } from '../../ui/components/video-player.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { renderNotFound } from '../../core/errors.js';
import { animatePageEnter } from '../../ui/components/animations.js';
import { createCodeEditor } from '../../ui/components/code-editor.js';
import { executePython } from '../../lib/python-executor.js';
import { isAuthenticated, hasProfiles } from '../../storage/auth.js';

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

  // Authentication check — profile holders must sign in; guests (no
  // profiles on device) learn freely with progress under their guest id.
  if (!isAuthenticated() && hasProfiles()) {
    main.innerHTML = `
      <div class="error-card" role="alert">
        <h2>Authentication Required</h2>
        <p>Please sign in to access this lesson.</p>
        <a href="#" class="btn btn-primary" onclick="window.location.hash = '#/login'; return false;">Sign In</a>
      </div>`;
    return;
  }

  if (!lesson) {
    renderNotFound(main, 'Lesson');
    return;
  }

  (lesson.exercises || []).forEach((ex) => { ex.__lessonId = lesson.id; });
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
      ${section.code ? `<div class="os-code-pane"><div class="os-code-scroll-cue" aria-hidden="true">→ scroll</div><pre class="code-block os-code-block" tabindex="0"><code>${numberedCode(section.code)}</code></pre></div>` : ''}
    </div>
  `).join('');

  // Render exercises if they exist
  const exercisesHtml = lesson.exercises && lesson.exercises.length > 0
    ? renderExercises(lesson.exercises)
    : '';

  main.innerHTML = `
    <article class="lesson-viewer page-content">
      <header>
        <h2>${escapeHtml(parsed.title)}</h2>
        ${parsed.duration ? `<span class="duration">${escapeHtml(parsed.duration)}</span>` : ''}
      </header>
      ${parsed.hasVideo ? `<div id="video-container"></div>` : ''}
      <div class="lesson-content">${sectionsHtml}</div>
      ${exercisesHtml ? `<section class="lesson-exercises" aria-labelledby="exercises-title">
        <h3 id="exercises-title">Exercises</h3>
        ${exercisesHtml}
      </section>` : ''}
      <footer class="lesson-actions">
        <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-secondary">Back to Module</a>
        <div class="lesson-actions-right">
          ${prevLesson ? `<a href="#/lesson/${escapeHtml(prevLesson.id)}" class="btn btn-ghost" data-prev-lesson="#/lesson/${escapeHtml(prevLesson.id)}">← Previous</a>` : ''}
          ${lessonIndex < mod.lessons.length - 1 ? `<a href="#/lesson/${escapeHtml(mod.lessons[lessonIndex + 1].id)}" class="btn btn-primary" data-next-lesson="#/lesson/${escapeHtml(mod.lessons[lessonIndex + 1].id)}">Next Lesson →</a>` : `<a href="#/quiz/${escapeHtml(lessonId)}" class="btn btn-primary">Take Quiz</a>`}
        </div>
      </footer>
    </article>`;

  if (parsed.hasVideo) {
    const container = document.getElementById('video-container');
    renderVideoPlayer(container, parsed.videoSrc, parsed.title);
  }

  // Initialize code editors for write_code exercises
  initializeCodeEditors(lesson.exercises);

  animatePageEnter(main.querySelector('.page-content'));
}

// Line-numbered code with >>> prompt on line 1. Text stays selectable;
// gutter is aria-hidden decoration.
function numberedCode(code) {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  return lines.map((line, i) => {
    const gutter = i === 0
      ? `<span class="os-code-gutter" aria-hidden="true">&gt;&gt;&gt; </span>`
      : `<span class="os-code-gutter" aria-hidden="true">${String(i + 1).padStart(2, ' ')} </span>`;
    return `${gutter}<span class="os-code-text">${escapeHtml(line)}</span>`;
  }).join('\n');
}

function renderExercises(exercises) {
  const exerciseIndexMap = new Map(exercises.map((e, i) => [String(e.id), i]));
  return exercises.map((exercise) => {
    const typeLabel = exercise.type ? String(exercise.type).replace('_', ' ') : 'unknown';
    if (!['predict_output', 'fix_the_code', 'parsons', 'write_code', 'challenge'].includes(exercise.type)) {
      console.warn(`[lesson-viewer] Unknown exercise type "${exercise.type}" (id: ${exercise.id}) — skipped.`);
      return '';
    }

    let contentHtml = '';

    switch (exercise.type) {
      case 'predict_output':
        contentHtml = `
          <div class="exercise-code-display">${escapeHtml(exercise.code)}</div>
          <fieldset class="quiz-question">
            <legend>${escapeHtml(exercise.prompt)}</legend>
            ${exercise.options.map((opt, i) => `
              <label class="quiz-option">
                <input type="radio" name="ex-${exercise.id}" value="${i}" required>
                ${escapeHtml(opt)}
              </label>
            `).join('')}
          </fieldset>
          <button type="button" class="btn btn-primary check-predict-btn" data-exercise-id="${exercise.id}">Check Answer</button>
          <div class="exercise-feedback" hidden></div>
        `;
        break;

      case 'fix_the_code':
        contentHtml = `
          <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
          <div class="os-diff">
            <div class="os-diff-side os-diff-buggy">
              <span class="os-diff-label">[BUGGY]</span>
              <div class="exercise-code-display">${numberedCode(exercise.buggy_code)}</div>
            </div>
            <div class="os-diff-side os-diff-fixed">
              <span class="os-diff-label">[FIXED]</span>
              <details class="exercise-hints os-diff-solution">
                <summary>reveal fix</summary>
                <div class="exercise-code-display">${numberedCode(exercise.solution_code)}</div>
              </details>
            </div>
          </div>
          ${renderHintLevels(exercise)}
        `;
        break;

      case 'parsons':
        contentHtml = `
          <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
          <div class="parsons-blocks" id="parsons-source-${exercise.id}">
            ${exercise.blocks.map((block, i) => `
              <div class="parsons-block" draggable="true" data-index="${i}">${escapeHtml(block)}</div>
            `).join('')}
            ${exercise.distractor_blocks ? exercise.distractor_blocks.map((block, i) => `
              <div class="parsons-block" draggable="true" data-index="${exercise.blocks.length + i}" data-distractor="true">${escapeHtml(block)}</div>
            `).join('') : ''}
          </div>
          <div class="parsons-drop-zone" id="parsons-target-${exercise.id}" aria-label="Drag blocks here to arrange"></div>
          <div class="parsons-controls">
            <button type="button" class="btn btn-primary check-parsons-btn" data-exercise-id="${exercise.id}">Check Order</button>
            <button type="button" class="btn btn-secondary reset-parsons-btn" data-exercise-id="${exercise.id}">Reset</button>
          </div>
          <div class="exercise-feedback" hidden></div>
        `;
        break;

      case 'challenge':
        contentHtml = `
          <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
          ${exercise.difficulty ? `<span class="exercise-difficulty">${escapeHtml(exercise.difficulty)}</span>` : ''}
          <div id="code-editor-${exercise.id}"></div>
          ${renderHintLevels(exercise)}
          <div class="exercise-feedback" hidden></div>
        `;
        break;

      case 'write_code':
        contentHtml = `
          <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
          <div id="code-editor-${exercise.id}"></div>
          ${renderHintLevels(exercise)}
          <div class="exercise-feedback" hidden></div>
        `;
        break;
    }

    const exIndex = (exerciseIndexMap.get(exercise.id) || 0) + 1;
    return `
      <article class="exercise-card" id="exercise-${exercise.id}" data-ex-type="${exercise.type}">
        <header class="os-ex-head">
          <span class="dash-chip dash-chip--open">EX ${String(exIndex).padStart(2, '0')}</span>
          <span class="exercise-type-badge">${typeLabel}</span>
          ${exercise.difficulty ? `<span class="os-ex-diff" data-diff="${escapeHtml(exercise.difficulty)}">${escapeHtml(exercise.difficulty)}</span>` : ''}
        </header>
        ${contentHtml}
      </article>
    `;
  }).join('');
}

// Misconception matcher: builds a traceback-style explanation + a patch link
// to the remediation exercise when the user's answer trips a known detection.
function findRemediation(exercise, userSignal) {
  const misconceptions = exercise.misconceptions || [];
  const signal = String(userSignal || '').toLowerCase();
  for (const m of misconceptions) {
    const detection = String(m.detection || '').toLowerCase();
    // heuristic: match key tokens from the detection description
    const tokens = detection.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 3);
    const hit = tokens.some((t) => signal.includes(t));
    if (hit || misconceptions.length === 1) {
      const patch = m.remediationExerciseId
        ? `<a href="#/lesson/${lessonIdForExercise(exercise)}">#exercise-${m.remediationExerciseId}</a>`
        : null;
      return {
        traceback: `Traceback (most recent call last):\n  ConceptError: ${m.explanation || detection}`,
        patchHref: patch || 'review the hints above'
      };
    }
  }
  return null;
}

// Lesson lookup for patch links (module context comes from render scope;
// falls back to plain anchor without lesson link).
function lessonIdForExercise(exercise) {
  return exercise.__lessonId || '';
}

// Progressive hints: "hint --level 1/2/3" — one button per level.
function renderHintLevels(exercise) {
  const hints = exercise.hints || [];
  if (!hints.length) return '';
  return `
    <div class="os-hints" data-exercise-id="${escapeHtml(String(exercise.id))}">
      <span class="os-hints-label" aria-hidden="true">$ hints --levels=${hints.length}</span>
      ${hints.map((h, i) => `
        <div class="os-hint-level" data-level="${i + 1}" hidden>
          <span class="os-hint-prompt">hint --level ${i + 1}/${hints.length}</span>
          <p>${escapeHtml(h)}</p>
        </div>
      `).join('')}
      <button type="button" class="btn btn-ghost btn-sm os-hint-btn" data-next-level="1">hint --level 1</button>
    </div>`;
}

function initializeCodeEditors(exercises) {
  if (!exercises) return;

    exercises.forEach((exercise) => {
      if (exercise.type !== 'write_code' && exercise.type !== 'challenge') return;

    const container = document.getElementById(`code-editor-${exercise.id}`);
    if (!container) return;

    const starterCode = exercise.starter_code || '# your code here';
    const testCases = exercise.test_cases || [];

    createCodeEditor(container, {
      starterCode,
      onRun: async (code, callback) => {
        // For write_code exercises, we run against the first test case's stdin
        // In a full implementation, we'd run against all test cases
        const stdin = testCases[0]?.expected_stdin || '';
        const expectedStdout = testCases[0]?.expected_stdout || '';

        try {
          const result = await executePython(code, stdin);
          if (result.error) {
            callback('', result.error);
          } else {
            const actualOutput = result.output;
            // Compare output (normalize line endings)
            const normalizedActual = actualOutput.replace(/\r\n/g, '\n').trim();
            const normalizedExpected = expectedStdout.replace(/\r\n/g, '\n').trim();

            if (normalizedActual === normalizedExpected) {
              callback(actualOutput, null);
              const passed = testCases.length > 1
                ? `[OK] Test case 1 of ${testCases.length} passed.`
                : '[OK] Test passed.';
              showExerciseFeedback(exercise.id, 'success', passed);
            } else {
              callback(actualOutput, `Expected:\n${expectedStdout}\n\nGot:\n${actualOutput}`);
              const remediation = findRemediation(exercise, actualOutput);
              showExerciseFeedback(exercise.id, 'error', remediation
                ? `[FAIL] Output mismatch.\n${remediation.traceback}\n\nPATCH AVAILABLE: ${remediation.patchHref}`
                : '[FAIL] Output does not match expected. See output panel.');
            }
          }
        } catch (err) {
          callback('', err.message);
        }
      }
    });
  });

  // Progressive hint buttons: reveal one level at a time
  document.querySelectorAll('.os-hints').forEach((hintsEl) => {
    const btn = hintsEl.querySelector('.os-hint-btn');
    if (!btn) return;
    const levels = hintsEl.querySelectorAll('.os-hint-level');
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.nextLevel, 10);
      const levelEl = hintsEl.querySelector(`.os-hint-level[data-level="${next}"]`);
      if (levelEl) {
        levelEl.hidden = false;
        if (next >= levels.length) {
          btn.hidden = true;
        } else {
          btn.dataset.nextLevel = String(next + 1);
          btn.textContent = `hint --level ${next + 1}`;
        }
      }
    });
  });

  // Initialize predict_output check buttons (answer kept out of the DOM;
  // looked up from the in-memory exercise data instead)
  document.querySelectorAll('.check-predict-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const exerciseId = btn.dataset.exerciseId;
      const exercise = exercises.find(e => String(e.id) === exerciseId);
      if (!exercise) return;
      const correctAnswer = exercise.answer;
      const selected = document.querySelector(`input[name="ex-${exerciseId}"]:checked`);

      if (!selected) {
        showExerciseFeedback(exerciseId, 'error', 'Please select an answer.');
        return;
      }

      const selectedText = selected.closest('label')?.textContent.trim() ?? '';
      if (selected.value === String(correctAnswer) || selectedText === correctAnswer) {
        showExerciseFeedback(exerciseId, 'success', `[OK] Correct. ${exercise.explanation || ''}`.trim());
      } else {
        const remediation = findRemediation(exercise, selectedText);
        showExerciseFeedback(exerciseId, 'error', remediation
          ? `[FAIL] Incorrect.\n${remediation.traceback}\n\nPATCH AVAILABLE: ${remediation.patchHref}`
          : `[FAIL] Incorrect. Try again.${exercise.explanation ? `\n${exercise.explanation}` : ''}`);
      }
    });
  });

  // Initialize parsons drag and drop
  initializeParsons(exercises);
}

function initializeParsons(exercises) {
  exercises.filter(e => e.type === 'parsons').forEach(exercise => {
    const sourceEl = document.getElementById(`parsons-source-${exercise.id}`);
    const targetEl = document.getElementById(`parsons-target-${exercise.id}`);
    const checkBtn = document.querySelector(`.check-parsons-btn[data-exercise-id="${exercise.id}"]`);
    const resetBtn = document.querySelector(`.reset-parsons-btn[data-exercise-id="${exercise.id}"]`);

    if (!sourceEl || !targetEl) return;

    let draggedItem = null;

    // Drag from source
    sourceEl.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('parsons-block')) {
        draggedItem = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    sourceEl.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('parsons-block')) {
        e.target.classList.remove('dragging');
      }
      draggedItem = null;
    });

    // Drop zone events
    targetEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      targetEl.classList.add('active');
    });

    targetEl.addEventListener('dragleave', () => {
      targetEl.classList.remove('active');
    });

    targetEl.addEventListener('drop', (e) => {
      e.preventDefault();
      targetEl.classList.remove('active');

      if (draggedItem && draggedItem.parentElement === sourceEl) {
        // Move the block into the target (no clone — prevents duplicates)
        draggedItem.classList.remove('dragging');
        targetEl.appendChild(draggedItem);
        draggedItem = null;
      }
    });

    // Allow reordering within target
    targetEl.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('parsons-block')) {
        draggedItem = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    targetEl.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('parsons-block')) {
        e.target.classList.remove('dragging');
      }
      draggedItem = null;
    });

    targetEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      targetEl.classList.add('active');

      // Insert before the element we're hovering over
      const afterElement = getDragAfterElement(targetEl, e.clientY);
      const draggable = document.querySelector('.parsons-block.dragging');
      if (draggable && draggable.parentElement === targetEl) {
        if (afterElement === null) {
          targetEl.appendChild(draggable);
        } else {
          targetEl.insertBefore(draggable, afterElement);
        }
      }
    });

    targetEl.addEventListener('drop', (e) => {
      e.preventDefault();
      targetEl.classList.remove('active');
    });

    // Tap-to-order: click moves a block to the other container (mobile-friendly,
    // complements drag & drop). Click inserts at end of target / returns to source.
    [sourceEl, targetEl].forEach((container) => {
      container.addEventListener('click', (e) => {
        const block = e.target.closest('.parsons-block');
        if (!block) return;
        if (block.parentElement === sourceEl) {
          targetEl.appendChild(block);
        } else {
          sourceEl.appendChild(block);
        }
      });
    });

    // Check button
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const blocks = Array.from(targetEl.querySelectorAll('.parsons-block'));
        const userOrder = blocks.map(b => parseInt(b.dataset.index, 10));
        const correctOrder = exercise.correct_order;

        if (userOrder.length !== correctOrder.length) {
          showExerciseFeedback(exercise.id, 'error', `Please arrange all ${correctOrder.length} blocks.`);
          return;
        }

        const isCorrect = userOrder.every((val, i) => val === correctOrder[i]);

        if (isCorrect) {
          showExerciseFeedback(exercise.id, 'success', '[OK] Correct order.');
        } else {
          const remediation = findRemediation(exercise, userOrder.join(','));
          showExerciseFeedback(exercise.id, 'error', remediation
            ? `[FAIL] Incorrect order.\n${remediation.traceback}\n\nPATCH AVAILABLE: ${remediation.patchHref}`
            : '[FAIL] Incorrect order. Try again.');
        }
      });
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        // Clear target and return every block to the source container
        targetEl.querySelectorAll('.parsons-block').forEach(b => {
          b.classList.remove('dragging');
          sourceEl.appendChild(b);
        });
        targetEl.innerHTML = '';
        const feedback = document.querySelector(`#exercise-${exercise.id} .exercise-feedback`);
        feedback.hidden = true;
        feedback.textContent = '';
        feedback.className = 'exercise-feedback';
      });
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.parsons-block:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function showExerciseFeedback(exerciseId, type, message) {
  const feedback = document.querySelector(`#exercise-${exerciseId} .exercise-feedback`);
  if (!feedback) return;

  feedback.hidden = false;
  feedback.textContent = message;
  feedback.className = `exercise-feedback ${type}`;
  
  // Trigger animation
  feedback.classList.remove('animate-item');
  void feedback.offsetWidth; // force reflow
  feedback.classList.add('animate-item');
}
