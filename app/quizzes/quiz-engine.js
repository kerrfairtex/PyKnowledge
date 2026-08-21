/**
 * Quiz engine — scoring, rendering, and validation.
 */

import { validateQuizAnswers } from '../../utils/validator.js';
import { markLessonComplete } from '../../core/storage.js';
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
  const questionsHtml = quiz.questions.map((q, i) => {
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
  }).join('');

  main.innerHTML = `
    <section class="quiz-container" aria-labelledby="quiz-title">
      <h2 id="quiz-title">${escapeHtml(quiz.title)}</h2>
      <p class="quiz-meta">${quiz.questions.length} questions &middot; 70% to pass</p>
      <form id="quiz-form" novalidate>
        ${questionsHtml}
        <button type="submit" class="btn btn-primary">Submit Quiz</button>
      </form>
      <div id="quiz-results" hidden></div>
    </section>`;

  document.getElementById('quiz-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleQuizSubmit(quiz, lessonsData);
  });
}

function handleQuizSubmit(quiz, lessonsData) {
  const answers = quiz.questions.map((q, i) => {
    if (q.type === 'multiple-choice') {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      return selected ? parseInt(selected.value, 10) : null;
    }
    if (q.type === 'true-false') {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      return selected ? selected.value === 'true' : null;
    }
    if (q.type === 'fill-blank') {
      const input = document.querySelector(`input[name="q${i}"]`);
      return input ? input.value : '';
    }
    return null;
  });

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
      ? `<div class="achievements">${newAchievements.map((a) => `<p class="achievement">🏆 ${escapeHtml(a.title)}: ${escapeHtml(a.description)}</p>`).join('')}</div>`
      : '';

    resultsEl.innerHTML = `
      <div class="quiz-result passed animate-item" role="status">
        <h3>Passed!</h3>
        <p>Score: ${result.score}% (${result.correct}/${result.total})</p>
        ${achievementHtml}
        <a href="#/module/${escapeHtml(findModuleForLesson(quiz.id, lessonsData))}" class="btn btn-primary">Continue</a>
        <a href="#/dashboard" class="btn btn-secondary">Dashboard</a>
      </div>`;
  } else {
    resultsEl.innerHTML = `
      <div class="quiz-result failed" role="alert">
        <h3>Not quite — try again</h3>
        <p>Score: ${result.score}% (${result.correct}/${result.total}). You need 70% to pass.</p>
        <button type="button" id="quiz-retry" class="btn btn-primary">Retry Quiz</button>
        <a href="#/dashboard" class="btn btn-secondary">Dashboard</a>
      </div>`;

    document.getElementById('quiz-retry').addEventListener('click', () => {
      window.location.reload();
    });
  }
}

function findModuleForLesson(lessonId, lessonsData) {
  for (const mod of lessonsData.modules) {
    if (mod.lessons.some((l) => l.id === lessonId)) return mod.id;
  }
  return '';
}
