/**
 * Lightweight JSON schema validation for content files.
 */

export class ContentValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ContentValidationError';
    this.details = details;
  }
}

function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function isStringArray(val) {
  return Array.isArray(val) && val.every((v) => typeof v === 'string');
}

export function validateLessonsSchema(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ContentValidationError('lessons.json must be a JSON object');
  }

  if (!isNonEmptyString(data.version)) {
    errors.push('Missing or invalid "version" field');
  }

  if (!Array.isArray(data.modules) || data.modules.length === 0) {
    errors.push('"modules" must be a non-empty array');
  } else {
    data.modules.forEach((mod, i) => {
      if (!isNonEmptyString(mod.id)) errors.push(`modules[${i}].id is required`);
      if (!isNonEmptyString(mod.title)) errors.push(`modules[${i}].title is required`);
      if (!isNonEmptyString(mod.description)) errors.push(`modules[${i}].description is required`);
      if (mod.prerequisite !== null && mod.prerequisite !== undefined && !isNonEmptyString(mod.prerequisite)) {
        errors.push(`modules[${i}].prerequisite must be a string or null`);
      }
      if (!Array.isArray(mod.lessons) || mod.lessons.length === 0) {
        errors.push(`modules[${i}].lessons must be a non-empty array`);
      } else {
        mod.lessons.forEach((lesson, j) => {
          if (!isNonEmptyString(lesson.id)) errors.push(`modules[${i}].lessons[${j}].id is required`);
          if (!isNonEmptyString(lesson.title)) errors.push(`modules[${i}].lessons[${j}].title is required`);
          if (!lesson.content || !Array.isArray(lesson.content.sections)) {
            errors.push(`modules[${i}].lessons[${j}].content.sections is required`);
          }
        });
      }
    });
  }

  if (errors.length > 0) {
    throw new ContentValidationError('lessons.json validation failed', errors);
  }

  return data;
}

export function validateQuizzesSchema(data) {
  const errors = [];
  const validTypes = ['multiple-choice', 'true-false', 'fill-blank'];

  if (!data || typeof data !== 'object') {
    throw new ContentValidationError('quizzes.json must be a JSON object');
  }

  if (!isNonEmptyString(data.version)) {
    errors.push('Missing or invalid "version" field');
  }

  if (!Array.isArray(data.quizzes) || data.quizzes.length === 0) {
    errors.push('"quizzes" must be a non-empty array');
  } else {
    data.quizzes.forEach((quiz, i) => {
      if (!isNonEmptyString(quiz.id)) errors.push(`quizzes[${i}].id is required`);
      if (!isNonEmptyString(quiz.title)) errors.push(`quizzes[${i}].title is required`);
      if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        errors.push(`quizzes[${i}].questions must be a non-empty array`);
      } else {
        quiz.questions.forEach((q, j) => {
          if (!validTypes.includes(q.type)) {
            errors.push(`quizzes[${i}].questions[${j}].type must be one of: ${validTypes.join(', ')}`);
          }
          if (!isNonEmptyString(q.question)) {
            errors.push(`quizzes[${i}].questions[${j}].question is required`);
          }
          if (q.type === 'multiple-choice' && !Array.isArray(q.options)) {
            errors.push(`quizzes[${i}].questions[${j}].options is required for multiple-choice`);
          }
          if (q.type === 'fill-blank' && !isStringArray(q.correctAnswer) && typeof q.correctAnswer !== 'string') {
            errors.push(`quizzes[${i}].questions[${j}].correctAnswer is required for fill-blank`);
          }
        });
      }
    });
  }

  if (errors.length > 0) {
    throw new ContentValidationError('quizzes.json validation failed', errors);
  }

  return data;
}

export function validateContentIntegrity(lessonsData, quizzesData) {
  const lessonIds = new Set();
  lessonsData.modules.forEach((mod) => {
    mod.lessons.forEach((l) => lessonIds.add(l.id));
  });

  const errors = [];
  quizzesData.quizzes.forEach((quiz) => {
    if (!lessonIds.has(quiz.id)) {
      errors.push(`Quiz "${quiz.id}" has no matching lesson`);
    }
  });

  const moduleIds = new Set(lessonsData.modules.map((m) => m.id));
  lessonsData.modules.forEach((mod) => {
    if (mod.prerequisite && !moduleIds.has(mod.prerequisite)) {
      errors.push(`Module "${mod.id}" references unknown prerequisite "${mod.prerequisite}"`);
    }
  });

  if (errors.length > 0) {
    throw new ContentValidationError('Content integrity check failed', errors);
  }
}
