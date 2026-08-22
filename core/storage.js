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

/**
 * Guest → profile progress migration.
 *
 * Guests save progress under a persistent guest_* key. When they later
 * create a real profile, carry that progress over so nothing appears lost,
 * then clear the guest entries. Merges: completed lessons unioned, quiz
 * scores and achievements merged, unlocked modules unioned — profile data
 * wins on conflicts.
 *
 * Returns true if any guest progress existed and was migrated.
 */
export function migrateGuestProgress(newUserId) {
  const GUEST_KEY = 'pyknowledge_guest_id';
  let guestId;
  try {
    const stored = localStorage.getItem(GUEST_KEY);
    if (!stored) return false;
    guestId = stored;
  } catch { return false; }
  if (guestId === newUserId) return false;

  const guestKey = getProgressKey(guestId);
  const profileKey = getProgressKey(newUserId);

  // Read guest progress from both stores (IndexedDB preferred).
  const readGuest = async () => {
    const idbRecord = await load(STORE, guestKey);
    if (idbRecord !== undefined) return idbRecord;
    try {
      const raw = localStorage.getItem(guestKey);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  };

  const hasMeaningful = (p) => p && (
    (p.completedLessons && p.completedLessons.length > 0) ||
    (p.quizScores && Object.keys(p.quizScores).length > 0) ||
    (p.achievements && p.achievements.length > 0)
  );

  return (async () => {
    const guest = await readGuest();
    if (!hasMeaningful(guest)) {
      // Nothing worth migrating; just tidy up the guest id marker.
      try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ }
      remove(STORE, guestKey).catch(() => {});
      try { localStorage.removeItem(guestKey); } catch { /* ignore */ }
      return false;
    }

    const existing = await load(STORE, profileKey)
      // Also check the legacy mirror key (getProgressKey format) — profiles
      // that have never written via IndexedDB store there.
      .then((v) => v !== undefined ? v : (() => {
        try {
          const raw = localStorage.getItem(profileKey);
          return raw ? JSON.parse(raw) : undefined;
        } catch { return undefined; }
      })());
    const merged = {
      ...cloneProgress(DEFAULT_PROGRESS),
      ...cloneProgress(existing || {}),
      completedLessons: [...new Set([
        ...((existing && existing.completedLessons) || []),
        ...(guest.completedLessons || [])
      ])],
      quizScores: {
        ...(guest.quizScores || {}),
        ...((existing && existing.quizScores) || {})
      },
      achievements: [...new Set([
        ...((existing && existing.achievements) || []),
        ...(guest.achievements || [])
      ])],
      unlockedModules: [...new Set([
        ...((existing && existing.unlockedModules) || ['module-1']),
        ...(guest.unlockedModules || [])
      ])]
    };

    await persist(STORE, profileKey, merged);
    try {
      localStorage.setItem(profileKey, JSON.stringify(merged));
    } catch { /* ignore */ }

    // Clear guest entries after successful migration.
    try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ }
    remove(STORE, guestKey).catch(() => {});
    try { localStorage.removeItem(guestKey); } catch { /* ignore */ }

    return true;
  })();
}
