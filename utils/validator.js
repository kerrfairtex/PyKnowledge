/**
 * Quiz answer validation utilities.
 */

export function validateAnswer(question, userAnswer) {
  if (question.type === 'multiple-choice') {
    return String(userAnswer) === String(question.correctAnswer);
  }
  if (question.type === 'true-false') {
    return Boolean(userAnswer) === Boolean(question.correctAnswer);
  }
  if (question.type === 'fill-blank') {
    const normalized = String(userAnswer).trim().toLowerCase();
    const expected = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.map((a) => a.trim().toLowerCase())
      : [String(question.correctAnswer).trim().toLowerCase()];
    return expected.includes(normalized);
  }
  return false;
}

export function validateQuizAnswers(questions, answers) {
  return questions.map((q, i) => validateAnswer(q, answers[i]));
}
