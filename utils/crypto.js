/**
 * Web Crypto utilities for offline local authentication.
 * PINs are hashed with PBKDF2 — never stored in plaintext.
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function hashPin(pin, saltBase64 = null) {
  const encoder = new TextEncoder();
  const salt = saltBase64
    ? base64ToBuffer(saltBase64)
    : crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    hash: bufferToBase64(hashBuffer),
    salt: bufferToBase64(salt)
  };
}

export async function verifyPin(pin, storedHash, storedSalt) {
  const { hash } = await hashPin(pin, storedSalt);
  return hash === storedHash;
}

export function generateUserId() {
  return `user_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}

export function isCryptoAvailable() {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}
