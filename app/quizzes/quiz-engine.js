/**
 * Quiz engine — scoring, rendering, and validation.
 */

import { validateQuizAnswers } from '../../utils/validator.js';
import { markLessonComplete, getProgress } from '../../core/storage.js';
import { unlockNextModule } from '../../storage/progress.js';
import { checkAchievements } from '../../storage/achievements.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { renderNotFound } from '../../core/errors.js';
import { showSuccess } from '../../ui/components/toast.js';
import { celebrateAchievement } from '../../ui/components/animations.js';

export function calculateScore(questions, answers) {
  if (!questions || questions.length === 0) {
    return { score: 0, correct: 0, total: 0, passed: false, details: [], results: {} };
  }

  const results = validateQuizAnswers(questions, answers);
  const correct = results.filter(Boolean).length;
  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const passingThreshold = 70;

  const perQuestion = {};
  results.forEach((isCorrect, i) => {
    perQuestion[questions[i].id] = isCorrect;
  });

  return {
    score,
    correct,
    total,
    passed: score >= passingThreshold,
    results: perQuestion,
    details: results.map((isCorrect, i) => ({
      questionId: questions[i].id,
      correct: isCorrect
    }))
  };
}

export function renderQuiz(main, quizId, quizzesData, lessonsData) {
  const quiz = quizzesData.quizzes.find((q) => q.id === quizId);
  if (!quiz) {
    renderNotFound(main, 'Quiz');
    return;
  }

  // Show a Start splash before revealing questions
  main.innerHTML = `
    <section class="quiz-container quiz-intro" aria-labelledby="quiz-title">
      <p class="os-boot-line" aria-hidden="true">$ quiz --start ${escapeHtml(quiz.id)}</p>
      <h2 id="quiz-title">${escapeHtml(quiz.title)}</h2>
      <p class="quiz-meta"><strong>${quiz.questions.length}</strong> questions &middot; Need 70% to pass</p>
      <p>Take your time — you can retry if you don't pass on the first attempt.</p>
      <button type="button" id="quiz-start-btn" class="btn btn-primary btn-lg">
        Start Quiz
      </button>
      <a href="#/lesson/${escapeHtml(quizId)}" class="btn btn-secondary">Back to Lesson</a>
    </section>`;

  document.getElementById('quiz-start-btn').addEventListener('click', () => {
    showQuizQuestions(main, quiz, lessonsData);
  });
}

function showQuizQuestions(main, quiz, lessonsData) {
  const total = quiz.questions.length;
  const answers = new Array(total).fill(null);
  let current = 0;

  function segmentedProgress() {
    return quiz.questions.map((_, i) => {
      const cls = i < current ? 'is-done' : i === current ? 'is-current' : '';
      return `<span class="os-quiz-seg ${cls}"></span>`;
    }).join('');
  }

  function questionHtml(q, i) {
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
    const q = quiz.questions[i];
    if (q.type === 'multiple-choice') {
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      answers[i] = sel ? parseInt(sel.value, 10) : null;
    } else if (q.type === 'true-false') {
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      answers[i] = sel ? sel.value === 'true' : null;
    } else if (q.type === 'fill-blank') {
      const input = document.querySelector(`input[name="q${i}"]`);
      answers[i] = input ? input.value : '';
    }
  }

  function restoreAnswer(i) {
    const q = quiz.questions[i];
    const a = answers[i];
    if (a === null || a === undefined) return;
    if (q.type === 'multiple-choice') {
      const sel = document.querySelector(`input[name="q${i}"][value="${a}"]`);
      if (sel) sel.checked = true;
    } else if (q.type === 'true-false') {
      const sel = document.querySelector(`input[name="q${i}"][value="${a ? 'true' : 'false'}"]`);
      if (sel) sel.checked = true;
    } else if (q.type === 'fill-blank') {
      const input = document.querySelector(`input[name="q${i}"]`);
      if (input) input.value = a;
    }
  }

  function renderCurrent() {
    const q = quiz.questions[current];
    const isLast = current === total - 1;
    main.innerHTML = `
      <section class="quiz-container os-quiz" aria-labelledby="quiz-title">
        <h2 id="quiz-title">${escapeHtml(quiz.title)}</h2>
        <p class="quiz-meta">Q${current + 1}/${total} &middot; 70% to pass</p>
        <div class="os-quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}"
          aria-valuenow="${current + 1}" aria-label="Question ${current + 1} of ${total}">
          ${segmentedProgress()}
        </div>
        <form id="quiz-form" novalidate>
          ${questionHtml(q, current)}
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
      if (current < total - 1) {
        current += 1;
        renderCurrent();
      } else {
        handleQuizSubmit(quiz, lessonsData, answers);
      }
    });
  }

  renderCurrent();
}

function handleQuizSubmit(quiz, lessonsData, answers) {
  const result = calculateScore(quiz.questions, answers);
  const resultsEl = document.getElementById('quiz-results');
  const form = document.getElementById('quiz-form');

  form.hidden = true;
  resultsEl.hidden = false;

  if (result.passed) {
    markLessonComplete(quiz.id, result.score);
    unlockNextModule(quiz.id, lessonsData);
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

    const moduleId = findModuleForLesson(quiz.id, lessonsData);
    const moduleNum = parseInt(String(moduleId).split('-')[1], 10) || 0;
    const nextModuleNum = moduleNum + 1;
    const hasNext = lessonsData.modules.some((m) => m.id === `module-${nextModuleNum}`);
    const unlockLine = hasNext
      ? `<p class="os-quiz-unlock" role="status">[OK] MODULE ${nextModuleNum} UNLOCKED</p>`
      : `<p class="os-quiz-unlock" role="status">[OK] COURSE COMPLETE</p>`;

    resultsEl.innerHTML = `
      <div class="quiz-result passed animate-item" role="status">
        <h3>Passed!</h3>
        <p>Score: ${result.score}% (${result.correct}/${result.total}) &middot; needed 70%</p>
        ${unlockLine}
        ${achievementHtml}
        <a href="#/module/${escapeHtml(moduleId)}" class="btn btn-primary">Continue</a>
        <a href="#/dashboard" class="btn btn-secondary">Dashboard</a>
      </div>`;
  } else {
    const weakSpots = result.details
      .filter((d) => !d.correct)
      .map((d) => {
        const q = quiz.questions.find((x) => x.id === d.questionId);
        return q ? `<span class="os-quiz-review-chip">${escapeHtml(q.concept || q.id)}</span>` : '';
      })
      .join('');

    resultsEl.innerHTML = `
      <div class="quiz-result failed animate-item" role="alert">
        <h3>[FAIL] ${result.score}% — need 70%</h3>
        <p>${result.correct}/${result.total} correct. You can retry as many times as you need.</p>
        ${weakSpots ? `<div class="os-quiz-review"><span class="os-quiz-review-label">review:</span> ${weakSpots}</div>` : ''}
        <button type="button" id="quiz-retry" class="btn btn-primary">Retry Quiz</button>
        <a href="#/lesson/${escapeHtml(quiz.id)}" class="btn btn-secondary">Review Lesson</a>
        <a href="#/dashboard" class="btn btn-ghost">Dashboard</a>
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
