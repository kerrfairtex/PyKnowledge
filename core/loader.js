/**
 * Content loader — fetches JSON assets from cache or network.
 */

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
  return loadJSON('content/lessons.json');
}

export async function loadQuizzes() {
  return loadJSON('content/quizzes.json');
}

export function clearContentCache() {
  contentCache.clear();
}
