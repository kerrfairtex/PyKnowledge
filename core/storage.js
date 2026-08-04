/**
 * LocalStorage wrapper for PyKnowledge progress persistence.
 * Key: pyknowledge_progress
 */

const STORAGE_KEY = 'pyknowledge_progress';

const DEFAULT_PROGRESS = {
  version: 1,
  completedLessons: [],
  quizScores: {},
  achievements: [],
  lastAccessed: null,
  unlockedModules: ['module-1']
};

export function getProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
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
