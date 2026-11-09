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

export function renderLessonViewer(main, lessonId, lessonsData, quizzesData) {
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

  // Resolve the current lesson's quiz title from quizzesData passed in
  // by the caller (loaded via core/loader.js). Prefer the quiz whose id
  // matches the lesson id (e.g. lesson-9-3 over capstone-final).
  // If quizzesData is missing or empty, fall back to the lesson title.
  const quizzes = quizzesData && quizzesData.quizzes ? quizzesData.quizzes : [];
  const currentQuiz = quizzes.find((q) => q.lessonId === lessonId && q.id === lessonId)
    || quizzes.find((q) => q.lessonId === lessonId);
  const currentQuizTitle = currentQuiz
    ? currentQuiz.title.replace(/^Quiz: /, '')
    : lesson.title;
  const parsed = parseLessonContent(lesson);
  const progress = getProgress();
  const mod = lessonsData.modules.find((m) => m.id === moduleId);
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = lessonIndex > 0 ? mod.lessons[lessonIndex - 1] : null;
  const locked = prevLesson && !progress.completedLessons.includes(prevLesson.id);
  const lessonComplete = progress.completedLessons.includes(lessonId);
  const nextLesson = lessonIndex < mod.lessons.length - 1 ? mod.lessons[lessonIndex + 1] : null;

  if (locked) {
    // Find the first incomplete lesson in this module (the lesson that
    // must be completed to unlock this one).
    const firstIncomplete = mod.lessons.find((l) => !progress.completedLessons.includes(l.id));
    const firstQuiz = quizzes.find((q) => q.lessonId === firstIncomplete.id && q.id === firstIncomplete.id)
      || quizzes.find((q) => q.lessonId === firstIncomplete.id);
    const firstQuizTitle = firstQuiz
      ? firstQuiz.title.replace(/^Quiz: /, '')
      : firstIncomplete.title;

    main.innerHTML = `
      <div class="error-card" role="alert">
        <h2>Lesson Locked</h2>
        <p>Pass the quiz for "${escapeHtml(firstQuizTitle)}" to unlock this lesson.</p>
        <a href="#/quiz/${escapeHtml(firstIncomplete.id)}" class="btn btn-primary" data-take-quiz="#/quiz/${escapeHtml(firstIncomplete.id)}">Take Quiz</a>
        <a href="#/lesson/${escapeHtml(firstIncomplete.id)}" class="btn btn-ghost" style="margin-left:8px">Go to Lesson</a>
        <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-secondary">Back to Module</a>
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
        ${lessonComplete
          ? `<span class="badge badge--done" aria-label="Lesson complete">Done</span>`
          : `<span class="badge badge--pending" aria-label="Lesson not yet complete">In progress</span>`
        }
      </header>
      ${parsed.hasVideo ? `<div id="video-container"></div>` : ''}
      <div class="lesson-content">${sectionsHtml}</div>
      ${exercisesHtml ? `<section class="lesson-exercises" aria-labelledby="exercises-title">
        <h3 id="exercises-title">Exercises</h3>
        ${exercisesHtml}
      </section>` : ''}
      ${renderLessonFooter(lessonComplete, lessonId, moduleId, nextLesson, prevLesson, currentQuizTitle)}
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



/**
 * Grade a write_code/challenge exercise against all test cases.
 *
 * Pure function: takes code, test cases, and an async execute function;
 * returns results without touching the DOM. Sketch runner behavior is
 * unchanged — each test case is executed through the provided executeFn.
 *
 * Returns { allPassed, results, passCount, failingCaseIndex, message,
 * lastActualOutput } where results[i] corresponds to testCases[i].
 */
export async function gradeExercise(code, testCases, executeFn) {
  const results = [];
  let allPassed = true;

  for (const testCase of testCases) {
    const stdin = testCase?.expected_stdin || '';
    const expectedStdout = testCase?.expected_stdout || '';
    // Optional: for random output that can't be matched exactly. The trimmed
    // output must match this regular expression (write it with ^ and $).
    const expectedPattern = typeof testCase?.expected_pattern === 'string' ? testCase.expected_pattern : '';

    const result = await executeFn(code, stdin);

    if (result.error) {
      allPassed = false;
      results.push({
        passed: false,
        stdin,
        expectedStdout,
        actualOutput: '',
        error: result.error
      });
      continue;
    }

    const actualOutput = result.output;
    const normalizedActual = actualOutput.replace(/\r\n/g, '\n').trim();
    const normalizedExpected = expectedStdout.replace(/\r\n/g, '\n').trim();

    let passed;
    if (expectedPattern) {
      try {
        passed = new RegExp(expectedPattern).test(normalizedActual);
      } catch {
        passed = false; // a broken pattern never passes by accident
      }
    } else {
      passed = normalizedActual === normalizedExpected;
    }
    if (!passed) allPassed = false;

    results.push({ passed, stdin, expectedStdout, actualOutput, error: null });
  }

  const passCount = results.filter((r) => r.passed).length;
  const failingCaseIndex = results.findIndex((r) => !r.passed) + 1;
  const lastActualOutput = results.length > 0
    ? results[results.length - 1].actualOutput
    : '';

  let message;
  if (allPassed) {
    message = testCases.length > 1
      ? `[OK] All ${testCases.length} test cases passed.`
      : '[OK] Test passed.';
  } else {
    message = testCases.length > 1
      ? `[FAIL] Test case ${failingCaseIndex} of ${testCases.length} failed (${passCount}/${testCases.length} passed).`
      : '[FAIL] Test failed.';
  }

  return { allPassed, results, passCount, failingCaseIndex, message, lastActualOutput };
}



/**
 * Render the lesson footer action buttons based on completion state.
 * Pure function: returns HTML string, no DOM access.
 *
 * States:
 *   Incomplete: Take Quiz link + disabled Next Lesson + hint naming the quiz
 *   Complete + next lesson: enabled Next Lesson link
 *   Complete + last in module: "Module complete" hint
 *
 * @param {boolean} lessonComplete - whether the lesson is marked complete
 * @param {string} lessonId - current lesson id
 * @param {string} moduleId - current module id
 * @param {object|null} nextLesson - next lesson object { id, title } or null
 * @param {object|null} prevLesson - previous lesson object { id } or null
 * @returns {string} footer HTML
 */
export function renderLessonFooter(lessonComplete, lessonId, moduleId, nextLesson, prevLesson, currentQuizTitle) {
  const quizLink = `<a href="#/quiz/${escapeHtml(lessonId)}" class="btn btn-primary" data-take-quiz="#/quiz/${escapeHtml(lessonId)}">Take Quiz</a>`;
  const backLink = prevLesson
    ? `<a href="#/lesson/${escapeHtml(prevLesson.id)}" class="btn btn-ghost" data-prev-lesson="#/lesson/${escapeHtml(prevLesson.id)}">← Previous</a>`
    : '';

  if (!lessonComplete) {
    const quizName = escapeHtml(currentQuizTitle);
    const nextTitle = nextLesson ? escapeHtml(nextLesson.title) : '';
    const body = nextLesson
      ? `Pass the quiz for ${quizName} to continue to ${nextTitle}.`
      : `Pass the quiz for ${quizName} to finish this module.`;
    const hint = `<span class="os-hint" aria-hidden="true">${body}</span>`;
    const ariaLabel = body;
    return `
      <footer class="lesson-actions">
        <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-secondary">Back to Module</a>
        <div class="lesson-actions-right">
          ${backLink}
          <div class="os-next-group" role="group" aria-label="Next actions">
            ${quizLink}
            <button type="button" class="btn btn-primary btn-disabled" aria-disabled="true" data-locked-next data-quiz-name="${quizName}" aria-label="${ariaLabel}">Next Lesson →</button>
            ${hint}
          </div>
        </div>
      </footer>`;
  }

  if (nextLesson) {
    return `
      <footer class="lesson-actions">
        <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-secondary">Back to Module</a>
        <div class="lesson-actions-right">
          ${backLink}
          <a href="#/lesson/${escapeHtml(nextLesson.id)}" class="btn btn-primary" data-next-lesson="#/lesson/${escapeHtml(nextLesson.id)}">Next Lesson →</a>
        </div>
      </footer>`;
  }

  return `
    <footer class="lesson-actions">
      <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-secondary">Back to Module</a>
      <div class="lesson-actions-right">
        ${backLink}
        <span class="os-hint" aria-hidden="true">Module complete</span>
      </div>
    </footer>`;
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
        // Run the student's code against ALL test cases via gradeExercise.
        // A pass is only reported when every supplied case passes.
        let result;
        try {
          result = await gradeExercise(code, testCases, executePython);
        } catch (err) {
          callback('', err.message);
          return;
        }

        if (result.allPassed) {
          callback(result.lastActualOutput, null);
          showExerciseFeedback(exercise.id, 'success', result.message);
        } else {
          callback(result.lastActualOutput, null);

          const remediation = findRemediation(exercise, result.lastActualOutput || '');
          showExerciseFeedback(exercise.id, 'error', remediation
            ? `[FAIL] Output mismatch.\n${remediation.traceback}\n\nPATCH AVAILABLE: ${remediation.patchHref}`
            : result.message);
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


// ---- Locked "Next Lesson" reminder ----------------------------------
let lockedNextBound = false;

function showReminder(msg) {
  let el = document.querySelector('.guard-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'guard-toast';
    el.setAttribute('role', 'alert');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 4000);
}

function bindLockedNext() {
  if (lockedNextBound) return;
  lockedNextBound = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-locked-next]');
    if (!btn) return;
    e.preventDefault();
    showReminder('Pass the quiz for "' + btn.dataset.quizName + '" to unlock the next lesson.');
    const take = document.querySelector('[data-take-quiz]');
    if (take) {
      take.scrollIntoView({ behavior: 'smooth', block: 'center' });
      take.classList.add('guard-pulse');
      setTimeout(() => take.classList.remove('guard-pulse'), 2000);
    }
  });
}

if (typeof document !== 'undefined') bindLockedNext();
