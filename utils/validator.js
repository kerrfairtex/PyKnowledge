/**
 * Quiz answer validation utilities.
 */

/** True when the learner actually gave an answer (null/undefined/'' = skipped). */
function isBlank(value) {
  return value === null || value === undefined || value === '';
}

// Fill-blank answers are compared with ALL whitespace removed, so `print( )`,
// `print ()` and ` PRINT() ` all match `print()`.
function normalizeFill(value) {
  return String(value).replace(/\s+/g, '').toLowerCase();
}

export function validateAnswer(question, userAnswer) {
  // A skipped question is never correct. (Without this, `Boolean(null)` equals
  // a True/False answer of false, so skipping scored as right.)
  if (isBlank(userAnswer)) return false;

  if (question.type === 'multiple-choice') {
    return String(userAnswer) === String(question.correctAnswer);
  }
  if (question.type === 'true-false') {
    return Boolean(userAnswer) === Boolean(question.correctAnswer);
  }
  if (question.type === 'fill-blank') {
    const normalized = normalizeFill(userAnswer);
    if (normalized === '') return false;
    const expected = (Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer])
      .map(normalizeFill);
    return expected.includes(normalized);
  }
  return false;
}

export function validateQuizAnswers(questions, answers) {
  return questions.map((q, i) => validateAnswer(q, answers[i]));
}
