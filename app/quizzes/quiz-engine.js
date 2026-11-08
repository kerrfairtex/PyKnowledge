/**
 * Quiz engine — attempt preparation, scoring, rendering, and record keeping.
 *
 * Every submitted attempt (pass or fail) is written to the student's record
 * (see recordQuizAttempt in core/storage.js) so the app can show real evidence
 * of what was taken, when, and what the result was.
 */

import { validateQuizAnswers } from '../../utils/validator.js';
import { getProgress, markLessonComplete, recordQuizAttempt, getQuizRecord } from '../../core/storage.js';
import { unlockNextModule } from '../../storage/progress.js';
import { checkAchievements } from '../../storage/achievements.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { renderNotFound } from '../../core/errors.js';
import { showSuccess } from '../../ui/components/toast.js';
import { celebrateAchievement } from '../../ui/components/animations.js';

export const PASS_THRESHOLD = 70;

/**
 * "From memory..." reflection prompts carry a model answer for the student to
 * compare against. They cannot be auto-graded (the model answer is a whole
 * sentence), so they are shown as self-checks and never count toward the score.
 */
export function isSelfCheck(question) {
  return Boolean(question && question.reviewPrompt === true);
}

export function calculateScore(questions, answers) {
  const scoredIdx = [];
  (questions || []).forEach((q, i) => { if (!isSelfCheck(q)) scoredIdx.push(i); });

  if (scoredIdx.length === 0) {
    return { score: 0, correct: 0, total: 0, passed: false, details: [], results: {} };
  }

  const all = validateQuizAnswers(questions, answers);
  const results = scoredIdx.map((i) => all[i]);
  const correct = results.filter(Boolean).length;
  const total = scoredIdx.length;
  const score = Math.round((correct / total) * 100);

  const perQuestion = {};
  scoredIdx.forEach((qi, k) => {
    perQuestion[questions[qi].id] = results[k];
  });

  return {
    score,
    correct,
    total,
    passed: score >= PASS_THRESHOLD,
    results: perQuestion,
    details: scoredIdx.map((qi, k) => ({
      questionId: questions[qi].id,
      correct: results[k]
    }))
  };
}

/**
 * Has the learner given a usable answer? Self-checks are optional, so they
 * always count as answered. Used to stop a scored question being skipped.
 */
export function isAnswered(question, answer) {
  if (isSelfCheck(question)) return true;
  if (question.type === 'multiple-choice') return Number.isInteger(answer);
  if (question.type === 'true-false') return typeof answer === 'boolean';
  if (question.type === 'fill-blank') return typeof answer === 'string' && answer.trim() !== '';
  return answer !== null && answer !== undefined;
}

// ---- Answer review: what you answered, what was right, and why -------------

function answerText(q, value) {
  if (value === null || value === undefined || value === '') return '';
  if (q.type === 'multiple-choice') return String((q.options || [])[value] ?? '');
  if (q.type === 'true-false') return value ? 'True' : 'False';
  return String(value);
}

function correctText(q) {
  if (q.type === 'multiple-choice') return String((q.options || [])[Number(q.correctAnswer)] ?? '');
  if (q.type === 'true-false') return q.correctAnswer ? 'True' : 'False';
  return (Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer])
    .map((a) => String(a).trim())
    .join(' or ');
}

/**
 * One entry per SCORED question, in the order the learner saw them. `questions`
 * must be the attempt's own list (options already shuffled), so the chosen and
 * correct option text match what was on screen. `explanation` is optional
 * authoring text on the question.
 */
export function buildAnswerReview(questions, answers, result) {
  const review = [];
  (questions || []).forEach((q, i) => {
    if (isSelfCheck(q)) return;
    review.push({
      number: i + 1,
      id: q.id,
      question: q.question,
      correct: Boolean(result && result.results && result.results[q.id]),
      yourAnswer: answerText(q, answers[i]),
      correctAnswer: correctText(q),
      explanation: typeof q.explanation === 'string' ? q.explanation.trim() : ''
    });
  });
  return review;
}

export function answerReviewHtml(review) {
  if (!review || review.length === 0) return '';
  const missed = review.filter((r) => !r.correct).length;
  const items = review.map((r) => `
      <li class="quiz-review-item ${r.correct ? 'is-correct' : 'is-wrong'}">
        <p class="quiz-review-q"><span aria-hidden="true">${r.correct ? '[OK]' : '[X]'}</span> <span class="visually-hidden">${r.correct ? 'Correct.' : 'Incorrect.'}</span> Q${r.number}. ${escapeHtml(r.question)}</p>
        <p>Your answer: ${r.yourAnswer ? escapeHtml(r.yourAnswer) : '<em>(none)</em>'}</p>
        ${r.correct ? '' : `<p>Correct answer: <strong>${escapeHtml(r.correctAnswer)}</strong></p>`}
        ${r.explanation ? `<p class="quiz-review-why">${escapeHtml(r.explanation)}</p>` : ''}
      </li>`).join('');
  return `
    <details class="quiz-review"${missed ? ' open' : ''}>
      <summary>Review your answers (${missed} missed)</summary>
      <ol class="quiz-review-list">${items}</ol>
    </details>`;
}

// ---- Attempt preparation: vary what the student sees on each try ----------

function shuffled(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Options like "Both A and B" only make sense in their original position.
const POSITIONAL_OPTION = /\b(all|none|both) of the above\b|\bboth [a-d] and [a-d]\b/i;

function withShuffledOptions(q, rng) {
  if (q.type !== 'multiple-choice' || !Array.isArray(q.options) || q.options.length < 2) return q;
  if (q.options.some((o) => POSITIONAL_OPTION.test(String(o)))) return q;
  const order = shuffled(q.options.map((_, i) => i), rng);
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correctAnswer: order.indexOf(Number(q.correctAnswer))
  };
}

/**
 * Build the question list for one attempt. Pure — pass a seeded `rng` in tests.
 *
 *  - If the quiz defines `questionsPerAttempt` smaller than its bank, draw that
 *    many, preferring questions the student has not seen yet, then ones they
 *    got wrong before. (With a bank of exactly the quiz size, all are used.)
 *  - The order is shuffled, and never identical to the previous attempt's order.
 *  - Multiple-choice options are shuffled and `correctAnswer` is remapped, so
 *    the answer position can't be memorised.
 *
 * `history` is the quiz's recorded attempts (oldest first).
 */
export function prepareAttempt(quiz, history = [], rng = Math.random) {
  const bank = quiz.questions || [];
  const size = Math.min(Number(quiz.questionsPerAttempt) || bank.length, bank.length);

  const seen = new Map();
  const missed = new Map();
  for (const attempt of history) {
    (attempt.questionIds || []).forEach((id) => seen.set(id, (seen.get(id) || 0) + 1));
    (attempt.missed || []).forEach((id) => missed.set(id, (missed.get(id) || 0) + 1));
  }

  let chosen = bank;
  if (size < bank.length) {
    chosen = bank
      .map((q) => ({ q, a: seen.get(q.id) || 0, b: -(missed.get(q.id) || 0), r: rng() }))
      .sort((x, y) => x.a - y.a || x.b - y.b || x.r - y.r)
      .slice(0, size)
      .map((x) => x.q);
  }

  let ordered = shuffled(chosen, rng);
  const last = history.length ? history[history.length - 1].questionIds || [] : [];
  if (ordered.length > 1 && ordered.every((q, i) => q.id === last[i])) {
    ordered = [...ordered.slice(1), ordered[0]];
  }
  return ordered.map((q) => withShuffledOptions(q, rng));
}

// ---- Rendering --------------------------------------------------------------

function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

/** The student's saved record for this quiz — shown before they start. */
export function recordSummaryHtml(quizId) {
  const rec = getQuizRecord(quizId);
  if (rec.attemptCount === 0 && !rec.passed) {
    return '<p class="quiz-record quiz-record--none" role="status">No attempts recorded yet.</p>';
  }

  const status = rec.passed
    ? `<strong class="quiz-record-status is-passed">[PASSED]</strong> best ${rec.bestScore}%${rec.firstPassedAt ? ` &middot; first passed ${escapeHtml(formatWhen(rec.firstPassedAt))}` : ''}`
    : `<strong class="quiz-record-status is-failed">[NOT PASSED YET]</strong> best ${rec.bestScore}%`;

  const rows = rec.attempts.slice(-5).reverse().map((a, i) => `
      <li>#${rec.attemptCount - i} &middot; ${escapeHtml(formatWhen(a.at))} &middot; ${a.score}% (${a.correct}/${a.total}) &middot; ${a.passed ? 'PASS' : 'FAIL'}</li>`).join('');

  return `
    <div class="quiz-record" role="status">
      <p>${status} &middot; ${rec.attemptCount} attempt${rec.attemptCount === 1 ? '' : 's'}</p>
      ${rows ? `<ol class="quiz-record-list" reversed>${rows}</ol>` : ''}
    </div>`;
}

export function renderQuiz(main, quizId, quizzesData, lessonsData) {
  const quiz = quizzesData.quizzes.find((q) => q.id === quizId);
  if (!quiz) {
    renderNotFound(main, 'Quiz');
    return;
  }

  // Direct-URL gating: a quiz should only be reachable after its preceding
  // lesson is complete, matching the sequential lock in the lesson viewer.
  const progress = getProgress();
  const gateLessonId = quiz.lessonId || quiz.id;
  let lessonModule = null;
  let lessonIndex = -1;
  for (const mod of lessonsData.modules || []) {
    const idx = mod.lessons.findIndex((l) => l.id === gateLessonId);
    if (idx > -1) { lessonModule = mod; lessonIndex = idx; break; }
  }
  if (lessonModule && lessonIndex > 0) {
    const prevLesson = lessonModule.lessons[lessonIndex - 1];
    if (!progress.completedLessons.includes(prevLesson.id)) {
      main.innerHTML = `
        <div class="error-card" role="alert">
          <h2>Quiz Locked</h2>
          <p>Complete "${escapeHtml(prevLesson.title)}" first.</p>
          <a href="#/lesson/${escapeHtml(prevLesson.id)}" class="btn btn-primary">Go to Lesson</a>
        </div>`;
      return;
    }
  }

  const rec = getQuizRecord(quiz.id);
  const scoredCount = quiz.questions.filter((q) => !isSelfCheck(q)).length;
  const selfCheckCount = quiz.questions.length - scoredCount;
  const startLabel = rec.passed ? 'Retake for practice' : rec.attemptCount > 0 ? 'Try again' : 'Start Quiz';
  const intro = rec.passed
    ? 'You have already passed this quiz. Your pass is saved — a retake will not remove it.'
    : 'Take your time — you can retry if you don\'t pass on the first attempt.';

  // Show a Start splash before revealing questions
  main.innerHTML = `
    <section class="quiz-container quiz-intro" aria-labelledby="quiz-title">
      <p class="os-boot-line" aria-hidden="true">$ quiz --start ${escapeHtml(quiz.id)}</p>
      <h2 id="quiz-title">${escapeHtml(quiz.title)}</h2>
      <p class="quiz-meta"><strong>${scoredCount}</strong> scored questions &middot; Need ${PASS_THRESHOLD}% to pass${selfCheckCount ? ` &middot; ${selfCheckCount} self-check (not scored)` : ''}</p>
      <p>${intro}</p>
      ${recordSummaryHtml(quiz.id)}
      <button type="button" id="quiz-start-btn" class="btn btn-primary btn-lg">
        ${startLabel}
      </button>
      <a href="#/lesson/${escapeHtml(quiz.lessonId || quizId)}" class="btn btn-secondary">Back to Lesson</a>
    </section>`;

  document.getElementById('quiz-start-btn').addEventListener('click', () => {
    showQuizQuestions(main, quiz, lessonsData);
  });
}

function showQuizQuestions(main, quiz, lessonsData) {
  // Fresh draw for every attempt: new order, shuffled options, unseen-first.
  const questions = prepareAttempt(quiz, getQuizRecord(quiz.id).attempts);
  const total = questions.length;
  const answers = new Array(total).fill(null);
  let current = 0;

  function segmentedProgress() {
    return questions.map((_, i) => {
      const cls = i < current ? 'is-done' : i === current ? 'is-current' : '';
      return `<span class="os-quiz-seg ${cls}"></span>`;
    }).join('');
  }

  function questionHtml(q, i) {
    if (isSelfCheck(q)) {
      return `
        <fieldset class="quiz-question quiz-selfcheck">
          <legend>${escapeHtml(q.question)}</legend>
          <p class="quiz-meta">Self-check — not scored. Write your answer, then compare it with the model answer after you submit.</p>
          <textarea name="q${i}" class="quiz-input" rows="3" placeholder="Your answer (optional)" autocomplete="off"></textarea>
        </fieldset>`;
    }
    if (q.type === 'multiple-choice') {
      const options = q.options.map((opt, j) => `
        <label class="quiz-option">
          <input type="radio" name="q${i}" value="${j}" required>
          ${escapeHtml(opt)}
        </label>
      `).join('');
      return `<fieldset class="quiz-question"><legend>${escapeHtml(q.question)}</legend>${options}</fieldset>`;
    }
    if (q.type === 'true-false') {
      return `
        <fieldset class="quiz-question">
          <legend>${escapeHtml(q.question)}</legend>
          <label class="quiz-option"><input type="radio" name="q${i}" value="true" required> True</label>
          <label class="quiz-option"><input type="radio" name="q${i}" value="false" required> False</label>
        </fieldset>`;
    }
    if (q.type === 'fill-blank') {
      return `
        <fieldset class="quiz-question">
          <legend>${escapeHtml(q.question)}</legend>
          <input type="text" name="q${i}" class="quiz-input" required placeholder="Your answer" autocomplete="off">
        </fieldset>`;
    }
    return '';
  }

  function recordAnswer(i) {
    const q = questions[i];
    if (isSelfCheck(q) || q.type === 'fill-blank') {
      const input = document.querySelector(`[name="q${i}"]`);
      answers[i] = input ? input.value : '';
    } else if (q.type === 'multiple-choice') {
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      answers[i] = sel ? parseInt(sel.value, 10) : null;
    } else if (q.type === 'true-false') {
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      answers[i] = sel ? sel.value === 'true' : null;
    }
  }

  function restoreAnswer(i) {
    const q = questions[i];
    const a = answers[i];
    if (a === null || a === undefined) return;
    if (isSelfCheck(q) || q.type === 'fill-blank') {
      const input = document.querySelector(`[name="q${i}"]`);
      if (input) input.value = a;
    } else if (q.type === 'multiple-choice') {
      const sel = document.querySelector(`input[name="q${i}"][value="${a}"]`);
      if (sel) sel.checked = true;
    } else if (q.type === 'true-false') {
      const sel = document.querySelector(`input[name="q${i}"][value="${a ? 'true' : 'false'}"]`);
      if (sel) sel.checked = true;
    }
  }

  function renderCurrent() {
    const q = questions[current];
    const isLast = current === total - 1;
    main.innerHTML = `
      <section class="quiz-container os-quiz" aria-labelledby="quiz-title">
        <h2 id="quiz-title">${escapeHtml(quiz.title)}</h2>
        <p class="quiz-meta">Q${current + 1}/${total} &middot; ${PASS_THRESHOLD}% to pass</p>
        <div class="os-quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}"
          aria-valuenow="${current + 1}" aria-label="Question ${current + 1} of ${total}">
          ${segmentedProgress()}
        </div>
        <form id="quiz-form" novalidate>
          ${questionHtml(q, current)}
          <p id="quiz-unanswered" class="quiz-unanswered" role="alert" hidden>Choose or type an answer to continue.</p>
          <div class="os-quiz-nav">
            ${current > 0 ? '<button type="button" id="quiz-prev" class="btn btn-ghost">&larr; Prev</button>' : ''}
            <button type="submit" id="quiz-next" class="btn btn-primary">${isLast ? 'Submit Quiz' : 'Next →'}</button>
          </div>
        </form>
        <div id="quiz-results" hidden></div>
      </section>`;

    restoreAnswer(current);

    const prevBtn = document.getElementById('quiz-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        recordAnswer(current);
        current -= 1;
        renderCurrent();
      });
    }

    document.getElementById('quiz-form').addEventListener('submit', (e) => {
      e.preventDefault();
      recordAnswer(current);
      // The form is novalidate, so enforce "answer required" here: a skipped
      // scored question must not move on (or be submitted).
      if (!isAnswered(questions[current], answers[current])) {
        const msg = document.getElementById('quiz-unanswered');
        if (msg) msg.hidden = false;
        return;
      }
      if (current < total - 1) {
        current += 1;
        renderCurrent();
      } else {
        handleQuizSubmit(main, quiz, lessonsData, questions, answers);
      }
    });
  }

  renderCurrent();
}

function selfCheckReviewHtml(questions, answers) {
  const items = questions
    .map((q, i) => ({ q, a: answers[i] }))
    .filter(({ q }) => isSelfCheck(q))
    .map(({ q, a }) => {
      const model = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' / ') : String(q.correctAnswer);
      return `
        <li>
          <strong>${escapeHtml(q.question)}</strong>
          <div>Your answer: ${a ? escapeHtml(a) : '<em>(left blank)</em>'}</div>
          <div>Model answer: ${escapeHtml(model)}</div>
        </li>`;
    }).join('');
  return items ? `<div class="quiz-selfcheck-review"><h4>Self-check (not scored)</h4><ul>${items}</ul></div>` : '';
}

function handleQuizSubmit(main, quiz, lessonsData, questions, answers) {
  const result = calculateScore(questions, answers);
  const resultsEl = document.getElementById('quiz-results');
  const form = document.getElementById('quiz-form');

  form.hidden = true;
  resultsEl.hidden = false;

  // Save the attempt FIRST — pass or fail — so there is always a record.
  const saved = recordQuizAttempt(quiz.id, {
    score: result.score,
    correct: result.correct,
    total: result.total,
    passed: result.passed,
    questionIds: questions.map((q) => q.id),
    missed: result.details.filter((d) => !d.correct).map((d) => d.questionId)
  });
  const savedLine = `<p class="quiz-saved" role="status">Saved to your record: attempt #${saved.number} &middot; ${escapeHtml(formatWhen(saved.at))}</p>`;
  const selfChecks = selfCheckReviewHtml(questions, answers);
  // Show every scored question with the learner's answer, the right answer and
  // (when authored) the explanation — pass or fail.
  const reviewHtml = answerReviewHtml(buildAnswerReview(questions, answers, result));

  if (result.passed) {
    // Complete the quiz's associated lesson, not quiz.id: quiz.id may differ from
    // quiz.lessonId (e.g. capstone-final -> lesson-9-3), and a quiz id must never
    // be stored as a lesson id. The score itself is saved under quiz.id by
    // recordQuizAttempt above, so no score is passed here.
    const lessonId = quiz.lessonId || quiz.id;
    markLessonComplete(lessonId);
    unlockNextModule(lessonId, lessonsData);
    const newAchievements = checkAchievements(lessonsData);

    if (newAchievements.length > 0) {
      newAchievements.forEach((a) => {
        showSuccess(`Achievement unlocked: ${a.title}`);
        celebrateAchievement(a.title);
      });
    }

    const achievementHtml = newAchievements.length > 0
      ? `<div class="achievements stagger-children">${newAchievements.map((a) => `<p class="achievement animate-item">🏆 ${escapeHtml(a.title)}: ${escapeHtml(a.description)}</p>`).join('')}</div>`
      : '';

    // Capstone: quiz ID differs from its associated lesson ID => course-level
    // completion, not a module unlock.
    const isCapstone = quiz.id !== lessonId;

    // Determine the true next lesson: the next lesson in this module, or the
    // first lesson of the next module, or the dashboard if this was the last.
    let continueHref = '#/dashboard';
    if (!isCapstone) {
      let currentModule = null;
      let lessonIndex = -1;
      for (const mod of lessonsData.modules || []) {
        const idx = mod.lessons.findIndex((l) => l.id === lessonId);
        if (idx > -1) { currentModule = mod; lessonIndex = idx; break; }
      }
      if (currentModule && lessonIndex > -1) {
        const nextLesson = currentModule.lessons[lessonIndex + 1];
        if (nextLesson) {
          continueHref = `#/lesson/${escapeHtml(nextLesson.id)}`;
        } else {
          const modNum = parseInt(String(currentModule.id).split('-')[1], 10) || 0;
          const nextMod = lessonsData.modules.find((m) => m.id === `module-${modNum + 1}`);
          if (nextMod && nextMod.lessons.length > 0) {
            continueHref = `#/lesson/${escapeHtml(nextMod.lessons[0].id)}`;
          }
        }
      }
    }

    let unlockLine;
    if (isCapstone) {
      unlockLine = `<p class="os-quiz-unlock" role="status">[OK] COURSE COMPLETE</p>`;
    } else {
      const moduleId = findModuleForLesson(lessonId, lessonsData);
      const moduleNum = parseInt(String(moduleId).split('-')[1], 10) || 0;
      const nextModuleNum = moduleNum + 1;
      const hasNext = lessonsData.modules.some((m) => m.id === `module-${nextModuleNum}`);
      unlockLine = hasNext
        ? `<p class="os-quiz-unlock" role="status">[OK] MODULE ${nextModuleNum} UNLOCKED</p>`
        : `<p class="os-quiz-unlock" role="status">[OK] COURSE COMPLETE</p>`;
    }

    resultsEl.innerHTML = `
      <div class="quiz-result passed animate-item" role="status">
        <h3>Passed!</h3>
        <p>Score: ${result.score}% (${result.correct}/${result.total}) &middot; needed ${PASS_THRESHOLD}%</p>
        ${savedLine}
        ${unlockLine}
        ${achievementHtml}
        ${reviewHtml}
        ${selfChecks}
        <a href="${continueHref}" class="btn btn-primary">Continue</a>
        <a href="#/progress" class="btn btn-secondary">View my record</a>
        <a href="#/dashboard" class="btn btn-ghost">Dashboard</a>
      </div>`;
  } else {
    const weakSpots = result.details
      .filter((d) => !d.correct)
      .map((d) => {
        const q = questions.find((x) => x.id === d.questionId);
        return q ? `<span class="os-quiz-review-chip">${escapeHtml(q.concept || q.id)}</span>` : '';
      })
      .join('');

    resultsEl.innerHTML = `
      <div class="quiz-result failed animate-item" role="alert">
        <h3>[FAIL] ${result.score}% — need ${PASS_THRESHOLD}%</h3>
        <p>${result.correct}/${result.total} correct. You can retry as many times as you need — each try mixes up the questions.</p>
        ${savedLine}
        ${weakSpots ? `<div class="os-quiz-review"><span class="os-quiz-review-label">review:</span> ${weakSpots}</div>` : ''}
        ${reviewHtml}
        ${selfChecks}
        <button type="button" id="quiz-retry" class="btn btn-primary">Retry Quiz</button>
        <a href="#/lesson/${escapeHtml(quiz.lessonId || quiz.id)}" class="btn btn-secondary">Review Lesson</a>
        <a href="#/progress" class="btn btn-ghost">View my record</a>
      </div>`;

    document.getElementById('quiz-retry').addEventListener('click', () => {
      showQuizQuestions(main, quiz, lessonsData);
    });
  }
}

function findModuleForLesson(lessonId, lessonsData) {
  for (const mod of lessonsData.modules) {
    if (mod.lessons.some((l) => l.id === lessonId)) return mod.id;
  }
  return '';
}
