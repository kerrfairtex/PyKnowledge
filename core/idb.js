/**
 * IndexedDB persistence for PyKnowledge.
 *
 * Structured application data (student progress, quiz results, exercise
 * results, bookmarks, settings) lives in IndexedDB — NOT the Cache API —
 * so it survives offline sessions, restarts, and service-worker cache
 * evictions. localStorage is only a fallback for contexts where
 * IndexedDB is unavailable (older browsers, test environments).
 */

import { getActiveUser, getProgressKey } from '../storage/auth.js';

const DB_NAME = 'pyknowledge';
const DB_VERSION = 1;

// Object stores per the offline-data design:
//   progress    -> per-user progress document (key: getProgressKey(userId))
//   quizResults -> per-quiz scores
//   exercises   -> exercise submission results
//   bookmarks   -> saved lesson bookmarks
//   settings    -> user preferences
const STORES = ['progress', 'quizResults', 'exercises', 'bookmarks', 'settings'];

let dbPromise = null;

function isIndexedDBAvailable() {
  return typeof indexedDB !== 'undefined';
}

function openDatabase() {
  if (!isIndexedDBAvailable()) return null;

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        for (const storeName of STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'key' });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStore(storeName, mode) {
  const db = await openDatabase();
  if (!db) throw new Error('IndexedDB unavailable');
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function idbGet(storeName, key) {
  const store = await getStore(storeName, 'readonly');
  const record = await idbRequest(store.get(key));
  return record ? record.value : undefined;
}

export async function idbSet(storeName, key, value) {
  const store = await getStore(storeName, 'readwrite');
  await idbRequest(store.put({ key, value }));
}

export async function idbDelete(storeName, key) {
  const store = await getStore(storeName, 'readwrite');
  await idbRequest(store.delete(key));
}

/**
 * Durable write: IndexedDB first, localStorage as fallback.
 * Never throws to callers — the in-memory cache remains the source
 * of truth for the current session.
 */
export async function persist(storeName, key, value) {
  try {
    await idbSet(storeName, key, value);
  } catch {
    try {
      localStorage.setItem(`${DB_NAME}_${storeName}_${key}`, JSON.stringify(value));
    } catch {
      /* give up silently; in-memory cache still holds the data */
    }
  }
}

/** Read: IndexedDB first, then localStorage fallback. */
export async function load(storeName, key) {
  try {
    const value = await idbGet(storeName, key);
    if (value !== undefined) return value;
  } catch {
    /* fall through to localStorage */
  }
  try {
    const raw = localStorage.getItem(`${DB_NAME}_${storeName}_${key}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

/** Remove from both IndexedDB and the localStorage fallback. */
export async function remove(storeName, key) {
  try {
    await idbDelete(storeName, key);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(`${DB_NAME}_${storeName}_${key}`);
  } catch {
    /* ignore */
  }
}

export function getStorageKey() {
  const user = getActiveUser();
  return getProgressKey(user?.id);
}
