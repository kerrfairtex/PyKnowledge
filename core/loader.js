/**
 * Content loader — fetches JSON assets from cache or network with schema validation.
 */

import { validateLessonsSchema, validateQuizzesSchema, validateContentIntegrity } from '../utils/schema.js';

const contentCache = new Map();

export async function loadJSON(path) {
  if (contentCache.has(path)) {
    return contentCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  const data = await response.json();
  contentCache.set(path, data);
  return data;
}

export async function loadLessons() {
  const data = await loadJSON('content/lessons.json');
  return validateLessonsSchema(data);
}

export async function loadQuizzes() {
  const data = await loadJSON('content/quizzes.json');
  return validateQuizzesSchema(data);
}

export async function loadAllContent() {
  const [lessons, quizzes] = await Promise.all([loadLessons(), loadQuizzes()]);
  validateContentIntegrity(lessons, quizzes);
  return { lessons, quizzes };
}

export function clearContentCache() {
  contentCache.clear();
}
