import { webcrypto } from 'crypto';
import { hashPin, verifyPin, generateUserId } from '../utils/crypto.js';

// Polyfill Web Crypto for Node test environment
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto;
}

const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; }
};
global.sessionStorage = {
  getItem: (key) => store[`s_${key}`] ?? null,
  setItem: (key, val) => { store[`s_${key}`] = String(val); },
  removeItem: (key) => { delete store[`s_${key}`]; }
};

describe('crypto', () => {
  test('hashPin produces hash and salt', async () => {
    const result = await hashPin('1234');
    expect(result.hash).toBeTruthy();
    expect(result.salt).toBeTruthy();
    expect(result.hash).not.toBe('1234');
  });

  test('verifyPin accepts correct PIN', async () => {
    const { hash, salt } = await hashPin('5678');
    const valid = await verifyPin('5678', hash, salt);
    expect(valid).toBe(true);
  });

  test('verifyPin rejects wrong PIN', async () => {
    const { hash, salt } = await hashPin('5678');
    const valid = await verifyPin('0000', hash, salt);
    expect(valid).toBe(false);
  });

  test('same PIN with same salt produces same hash', async () => {
    const first = await hashPin('1234');
    const second = await hashPin('1234', first.salt);
    expect(first.hash).toBe(second.hash);
  });

  test('generateUserId creates unique ids', () => {
    const a = generateUserId();
    const b = generateUserId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^user_/);
  });
});

describe('auth', () => {
  beforeEach(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
    const { logout } = await import('../storage/auth.js');
    logout();
  });

  test('createProfile stores hashed PIN', async () => {
    const { createProfile, getProfiles } = await import('../storage/auth.js');
    const profile = await createProfile('Maria', '1234');
    expect(profile.displayName).toBe('Maria');
    expect(profile.pinHash).toBeTruthy();
    expect(profile.pinHash).not.toBe('1234');
    expect(getProfiles()).toHaveLength(1);
  });

  test('loginWithPin authenticates valid user', async () => {
    const { createProfile, loginWithPin, isAuthenticated, getActiveUser } = await import('../storage/auth.js');
    const profile = await createProfile('Juan', '4321');
    expect(isAuthenticated()).toBe(false);
    await loginWithPin(profile.id, '4321');
    expect(isAuthenticated()).toBe(true);
    expect(getActiveUser().displayName).toBe('Juan');
  });

  test('loginWithPin rejects wrong PIN', async () => {
    const { createProfile, loginWithPin } = await import('../storage/auth.js');
    const profile = await createProfile('Ana', '1111');
    await expect(loginWithPin(profile.id, '9999')).rejects.toThrow('Incorrect PIN');
  });

  test('createProfile rejects short PIN', async () => {
    const { createProfile } = await import('../storage/auth.js');
    await expect(createProfile('Test', '12')).rejects.toThrow('at least 4');
  });

  test('createProfile rejects duplicate names', async () => {
    const { createProfile } = await import('../storage/auth.js');
    await createProfile('Maria', '1234');
    await expect(createProfile('maria', '5678')).rejects.toThrow('already exists');
  });

  test('per-user progress keys are isolated', async () => {
    const { createProfile, startSession } = await import('../storage/auth.js');
    const { getProgressKey } = await import('../storage/auth.js');
    const profile = await createProfile('Student', '1234');
    startSession(profile.id);
    expect(getProgressKey(profile.id)).toBe(`pyknowledge_progress_${profile.id}`);
    expect(getProgressKey(null)).toBe('pyknowledge_progress');
  });

  test('logout clears session', async () => {
    const { createProfile, loginWithPin, logout, isAuthenticated } = await import('../storage/auth.js');
    const profile = await createProfile('Test', '1234');
    await loginWithPin(profile.id, '1234');
    expect(isAuthenticated()).toBe(true);
    logout();
    expect(isAuthenticated()).toBe(false);
  });
});
