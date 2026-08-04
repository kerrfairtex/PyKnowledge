/**
 * Offline local authentication — profile management and session handling.
 * Designed for shared school computers with no backend server.
 */

import { hashPin, verifyPin, generateUserId, isCryptoAvailable } from '../utils/crypto.js';

const PROFILES_KEY = 'pyknowledge_profiles';
const SESSION_KEY = 'pyknowledge_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle

let activeUserId = null;

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
  if (activeUserId) {
    const profiles = getProfiles();
    return profiles.find((p) => p.id === activeUserId) || null;
  }

  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - session.lastActive > SESSION_TIMEOUT_MS) {
      clearSession();
      return null;
    }
    activeUserId = session.userId;
    const profiles = getProfiles();
    return profiles.find((p) => p.id === session.userId) || null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return getActiveUser() !== null;
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
