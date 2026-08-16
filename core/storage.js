/**
 * Progress persistence for PyKnowledge.
 *
 * Structured student data (completed lessons, quiz scores, achievements,
 * unlocked modules) is persisted to IndexedDB via core/idb.js so it
 * survives offline sessions, restarts and cache evictions. A synchronous
 * in-memory cache keeps the app's render paths sync; the legacy
 * localStorage key remains as a sync mirror + fallback for contexts
 * without IndexedDB (older browsers, test environments).
 */

import { getActiveUser, getProgressKey, touchSession } from '../storage/auth.js';
import { persist, load, remove } from './idb.js';

const DEFAULT_PROGRESS = {
  version: 1,
  completedLessons: [],
  quizScores: {},
  achievements: [],
  lastAccessed: null,
  unlockedModules: ['module-1']
};

const STORE = 'progress';

// Cache keyed by storage key (per user). Hydrated from IndexedDB at boot.
let cacheKey = null;
let cache = null;

function getStorageKey() {
  const user = getActiveUser();
  return getProgressKey(user?.id);
}

/** Deep clone so callers can mutate the returned object safely. */
function cloneProgress(progress) {
  return {
    ...progress,
    completedLessons: [...(progress.completedLessons || [])],
    quizScores: { ...(progress.quizScores || {}) },
    achievements: [...(progress.achievements || [])],
    unlockedModules: [...(progress.unlockedModules || [])]
  };
}

function readLegacy() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return cloneProgress(DEFAULT_PROGRESS);
    return { ...cloneProgress(DEFAULT_PROGRESS), ...JSON.parse(raw) };
  } catch {
    return cloneProgress(DEFAULT_PROGRESS);
  }
}

/**
 * Hydrate the in-memory cache from IndexedDB (preferred), migrating any
 * existing legacy localStorage data into IndexedDB on first boot.
 * Call once at app startup, after auth/session is known.
 */
export async function initStorage() {
  const key = getStorageKey();
  const stored = await load(STORE, key);
  if (stored !== undefined) {
    cache = cloneProgress(stored);
    cacheKey = key;
    // Keep the legacy mirror in sync so pre-hydration sync reads agree.
    try {
      localStorage.setItem(key, JSON.stringify(cache));
    } catch { /* ignore */ }
    return cache;
  }

  // No IndexedDB record yet — migrate legacy localStorage data if present.
  const legacy = readLegacy();
  cache = legacy;
  cacheKey = key;
  await persist(STORE, key, legacy);
  return cache;
}

export function getProgress() {
  const key = getStorageKey();
  if (cache && cacheKey === key) {
    return cloneProgress(cache);
  }
  // Not hydrated for this user yet — read the sync mirror.
  return readLegacy();
}

export function saveProgress(progress) {
  const updated = {
    ...progress,
    lastAccessed: new Date().toISOString()
  };
  const key = getStorageKey();
  cache = cloneProgress(updated);
  cacheKey = key;

  // Sync mirror (immediate durability + fallback).
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch { /* ignore */ }

  // Durable IndexedDB write (async, never throws).
  persist(STORE, key, updated).catch(() => {});

  touchSession();
  return updated;
}

export function resetProgress() {
  const key = getStorageKey();
  cache = null;
  cacheKey = null;

  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
  remove(STORE, key).catch(() => {});

  return cloneProgress(DEFAULT_PROGRESS);
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
