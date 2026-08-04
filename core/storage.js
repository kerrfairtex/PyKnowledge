/**
 * LocalStorage wrapper for PyKnowledge progress persistence.
 * Progress is scoped per authenticated user; guests use a shared key.
 */

import { getActiveUser, getProgressKey, touchSession } from '../storage/auth.js';

const DEFAULT_PROGRESS = {
  version: 1,
  completedLessons: [],
  quizScores: {},
  achievements: [],
  lastAccessed: null,
  unlockedModules: ['module-1']
};

function getStorageKey() {
  const user = getActiveUser();
  return getProgressKey(user?.id);
}

export function getProgress() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    touchSession();
    return { ...DEFAULT_PROGRESS, ...parsed };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress) {
  const updated = {
    ...progress,
    lastAccessed: new Date().toISOString()
  };
  localStorage.setItem(getStorageKey(), JSON.stringify(updated));
  touchSession();
  return updated;
}

export function resetProgress() {
  localStorage.removeItem(getStorageKey());
  return { ...DEFAULT_PROGRESS };
}

export function markLessonComplete(lessonId, score = null) {
  const progress = getProgress();
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
  }
  if (score !== null) {
    progress.quizScores[lessonId] = score;
  }
  return saveProgress(progress);
}

export function isLessonComplete(lessonId) {
  return getProgress().completedLessons.includes(lessonId);
}
