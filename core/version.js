// Source of truth for the app version.
// The service worker loads its own copy from sw-version.js.
// Bump both files together.
export const APP_VERSION = '0.5.0';
export const CACHE_NAME = `pyknowledge-v${APP_VERSION}`;
