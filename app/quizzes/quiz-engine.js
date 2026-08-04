/**
 * Quiz engine — scoring, rendering, and validation.
 */

import { validateQuizAnswers } from '../../utils/validator.js';
import { markLessonComplete } from '../../core/storage.js';
import { unlockNextModule } from '../../storage/progress.js';
import { checkAchievements } from '../../storage/achievements.js';

export function calculateScore(questions, answers) {
  if (!questions || questions.length === 0) {
    return { score: 0, correct: 0, total: 0, passed: false, details: [] };
  }

  const results = validateQuizAnswers(questions, answers);
  const correct = results.filter(Boolean).length;
  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const passingThreshold = 70;

  return {
    score,
    correct,
    total,
    passed: score >= passingThreshold,
    details: results.map((isCorrect, i) => ({
      questionId: questions[i].id,
      correct: isCorrect
    }))
  };
}

export function renderQuiz(main, quizId, quizzesData, lessonsData) {
  const quiz = quizzesData.quizzes.find((q) => q.id === quizId);
  if (!quiz) {
    main.innerHTML = `<div class="error-card"><h2>Quiz not found</h2><a href="#/">Back</a></div>`;
    return;
  }

  const questionsHtml = quiz.questions.map((q, i) => {
    if (q.type === 'multiple-choice') {
      const options = q.options.map((opt, j) => `
        <label class="quiz-option">
          <input type="radio" name="q${i}" value="${j}" required>
          ${opt}
        </label>
      `).join('');
      return `<fieldset class="quiz-question"><legend>${q.question}</legend>${options}</fieldset>`;
    }
    if (q.type === 'true-false') {
      return `
        <fieldset class="quiz-question">
          <legend>${q.question}</legend>
          <label class="quiz-option"><input type="radio" name="q${i}" value="true" required> True</label>
          <label class="quiz-option"><input type="radio" name="q${i}" value="false" required> False</label>
        </fieldset>`;
    }
    if (q.type === 'fill-blank') {
      return `
        <fieldset class="quiz-question">
          <legend>${q.question}</legend>
          <input type="text" name="q${i}" class="quiz-input" required placeholder="Your answer">
        </fieldset>`;
    }
    return '';
  }).join('');

  main.innerHTML = `
    <section class="quiz-container">
      <h2>${quiz.title}</h2>
      <p class="quiz-meta">${quiz.questions.length} questions &middot; 70% to pass</p>
      <form id="quiz-form">
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
    const achievementHtml = newAchievements.length > 0
      ? `<div class="achievements">${newAchievements.map((a) => `<p class="achievement">🏆 ${a.title}: ${a.description}</p>`).join('')}</div>`
      : '';

    resultsEl.innerHTML = `
      <div class="quiz-result passed">
        <h3>Passed!</h3>
        <p>Score: ${result.score}% (${result.correct}/${result.total})</p>
        ${achievementHtml}
        <a href="#/module/${findModuleForLesson(quiz.id, lessonsData)}" class="btn btn-primary">Continue</a>
        <a href="#/" class="btn btn-secondary">Dashboard</a>
      </div>`;
  } else {
    resultsEl.innerHTML = `
      <div class="quiz-result failed">
        <h3>Not quite — try again</h3>
        <p>Score: ${result.score}% (${result.correct}/${result.total}). You need 70% to pass.</p>
        <button onclick="location.reload()" class="btn btn-primary">Retry Quiz</button>
        <a href="#/" class="btn btn-secondary">Dashboard</a>
      </div>`;
  }
}

function findModuleForLesson(lessonId, lessonsData) {
  for (const mod of lessonsData.modules) {
    if (mod.lessons.some((l) => l.id === lessonId)) return mod.id;
  }
  return '';
}
