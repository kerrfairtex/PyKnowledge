/**
 * Content loader — API first when online, then static JSON with schema validation.
 */

import { validateLessonsSchema, validateQuizzesSchema, validateContentIntegrity } from '../utils/schema.js';
import {
  fetchLessonsFromApi,
  fetchQuizzesFromApi,
  isApiEnabled,
  checkApiHealth
} from './api.js';

const contentCache = new Map();
let apiAvailable = null;

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

async function shouldUseApi() {
  if (!isApiEnabled() || !navigator.onLine) return false;
  if (apiAvailable === null) {
    apiAvailable = await checkApiHealth();
  }
  return apiAvailable;
}

export async function loadLessons() {
  if (await shouldUseApi()) {
    try {
      const data = await fetchLessonsFromApi();
      return validateLessonsSchema(data);
    } catch (err) {
      console.warn('API lessons fetch failed, using static JSON:', err.message);
      apiAvailable = false;
    }
  }

  const data = await loadJSON('content/lessons.json');
  return validateLessonsSchema(data);
}

export async function loadQuizzes() {
  if (await shouldUseApi()) {
    try {
      const data = await fetchQuizzesFromApi();
      return validateQuizzesSchema(data);
    } catch (err) {
      console.warn('API quizzes fetch failed, using static JSON:', err.message);
      apiAvailable = false;
    }
  }

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
  apiAvailable = null;
}

export function resetApiAvailability() {
  apiAvailable = null;
}
