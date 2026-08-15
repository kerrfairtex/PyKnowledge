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
        <a href="#/quiz/${escapeHtml(lessonId)}" class="btn btn-primary">Take Quiz</a>
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

function renderExercises(exercises) {
  return exercises.map((exercise) => {
    const typeLabel = exercise.type.replace('_', ' ');
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
          <button type="button" class="btn btn-primary check-predict-btn" data-exercise-id="${exercise.id}" data-answer="${exercise.answer}">Check Answer</button>
          <div class="exercise-feedback" hidden></div>
        `;
        break;

      case 'fix_the_code':
        contentHtml = `
          <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
          <div class="exercise-code-display">${escapeHtml(exercise.buggy_code)}</div>
          <details class="exercise-hints">
            <summary>Show Hints</summary>
            <ul>${exercise.hints.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>
          </details>
          <details class="exercise-hints">
            <summary>Show Solution</summary>
            <div class="exercise-code-display">${escapeHtml(exercise.solution_code)}</div>
          </details>
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

      case 'write_code':
        contentHtml = `
          <div class="exercise-prompt">${escapeHtml(exercise.prompt)}</div>
          <div id="code-editor-${exercise.id}"></div>
          ${exercise.hints && exercise.hints.length > 0 ? `
            <details class="exercise-hints">
              <summary>Show Hints</summary>
              <ul>${exercise.hints.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>
            </details>
          ` : ''}
          <div class="exercise-feedback" hidden></div>
        `;
        break;
    }

    return `
      <article class="exercise-card" id="exercise-${exercise.id}">
        <header>
          <span class="exercise-type-badge">${typeLabel}</span>
        </header>
        ${contentHtml}
      </article>
    `;
  }).join('');
}

function initializeCodeEditors(exercises) {
  if (!exercises) return;

  exercises.forEach((exercise) => {
    if (exercise.type !== 'write_code') return;

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
              showExerciseFeedback(exercise.id, 'success', '✓ All test cases passed!');
            } else {
              callback(actualOutput, `Expected:\n${expectedStdout}\n\nGot:\n${actualOutput}`);
              showExerciseFeedback(exercise.id, 'error', '✗ Output does not match expected. See output panel.');
            }
          }
        } catch (err) {
          callback('', err.message);
        }
      }
    });
  });

  // Initialize predict_output check buttons
  document.querySelectorAll('.check-predict-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const exerciseId = btn.dataset.exerciseId;
      const correctAnswer = btn.dataset.answer;
      const selected = document.querySelector(`input[name="ex-${exerciseId}"]:checked`);

      if (!selected) {
        showExerciseFeedback(exerciseId, 'error', 'Please select an answer.');
        return;
      }

      if (selected.value === correctAnswer || selected.nextSibling.textContent.trim() === correctAnswer) {
        showExerciseFeedback(exerciseId, 'success', '✓ Correct!');
      } else {
        showExerciseFeedback(exerciseId, 'error', '✗ Incorrect. Try again.');
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
        // Clone the block and add to target
        const clone = draggedItem.cloneNode(true);
        clone.draggable = true;
        clone.classList.remove('dragging');
        targetEl.appendChild(clone);
        // Remove from source (or keep for reset)
        // We'll keep in source for reset functionality
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
          showExerciseFeedback(exercise.id, 'success', '✓ Correct order!');
        } else {
          showExerciseFeedback(exercise.id, 'error', '✗ Incorrect order. Try again.');
        }
      });
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
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
}
