/**
 * Offline local authentication — profile management and session handling.
 * Designed for shared school computers with no backend server.
 */

import { hashPin, verifyPin, generateUserId, isCryptoAvailable } from '../utils/crypto.js';
import { remove } from '../core/idb.js';

const PROFILES_KEY = 'pyknowledge_profiles';
const SESSION_KEY = 'pyknowledge_session';
const GUEST_KEY = 'pyknowledge_guest_id';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle

let activeUserId = null;

function getOrCreateGuestId() {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return 'guest_' + Date.now();
  }
}

export function getProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getActiveUser() {
  // Check for authenticated profile first
  if (activeUserId) {
    const profiles = getProfiles();
    const found = profiles.find((p) => p.id === activeUserId);
    if (found) return found;
  }

  if (typeof sessionStorage === 'undefined') {
    // Return guest user if no session storage available
    return { id: getOrCreateGuestId(), displayName: 'Guest', isGuest: true };
  }

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (Date.now() - session.lastActive <= SESSION_TIMEOUT_MS) {
        activeUserId = session.userId;
        const profiles = getProfiles();
        const found = profiles.find((p) => p.id === session.userId);
        if (found) return found;
      } else {
        clearSession();
      }
    }
  } catch { /* ignore */ }

  // Fallback: persistent guest user
  return { id: getOrCreateGuestId(), displayName: 'Guest', isGuest: true };
}

export function isAuthenticated() {
  const user = getActiveUser();
  return user !== null && !user.isGuest;
}

export function hasProfiles() {
  return getProfiles().length > 0;
}

export async function createProfile(displayName, pin) {
  if (!isCryptoAvailable()) {
    throw new Error('Secure authentication requires a modern browser with Web Crypto support');
  }

  const name = displayName.trim();
  if (!name || name.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }
  if (!pin || pin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  if (!/^\d+$/.test(pin)) {
    throw new Error('PIN must contain only numbers');
  }

  const profiles = getProfiles();
  if (profiles.some((p) => p.displayName.toLowerCase() === name.toLowerCase())) {
    throw new Error('A profile with this name already exists');
  }

  const { hash, salt } = await hashPin(pin);
  const profile = {
    id: generateUserId(),
    displayName: name,
    pinHash: hash,
    pinSalt: salt,
    createdAt: new Date().toISOString(),
    avatar: pickAvatar(name)
  };

  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
}

export async function loginWithPin(userId, pin) {
  const profile = getProfiles().find((p) => p.id === userId);
  if (!profile) {
    throw new Error('Profile not found');
  }

  const valid = await verifyPin(pin, profile.pinHash, profile.pinSalt);
  if (!valid) {
    throw new Error('Incorrect PIN');
  }

  startSession(profile.id);
  return profile;
}

export function startSession(userId) {
  activeUserId = userId;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      userId,
      lastActive: Date.now(),
      startedAt: new Date().toISOString()
    }));
  }
}

export function touchSession() {
  if (typeof sessionStorage === 'undefined') return;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;
  const session = JSON.parse(raw);
  session.lastActive = Date.now();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  activeUserId = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function logout() {
  clearSession();
}

export function deleteProfile(userId) {
  const profiles = getProfiles().filter((p) => p.id !== userId);
  saveProfiles(profiles);
  localStorage.removeItem(`pyknowledge_progress_${userId}`);
  remove('progress', `pyknowledge_progress_${userId}`).catch(() => {});
  if (activeUserId === userId) clearSession();
}

function pickAvatar(name) {
  const colors = ['#e94560', '#4ecca3', '#f0a500', '#0f3460', '#7b68ee', '#ff6b6b'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function getProgressKey(userId) {
  return userId ? `pyknowledge_progress_${userId}` : 'pyknowledge_progress';
}
