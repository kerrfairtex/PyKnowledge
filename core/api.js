/**
 * API client — optional server integration with offline JSON fallback.
 */

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.PYKNOWLEDGE_API_URL) {
    return window.PYKNOWLEDGE_API_URL.replace(/\/$/, '');
  }
  return null;
}

export function isApiEnabled() {
  return Boolean(getApiBaseUrl());
}

export async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('API not configured');
  }

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { Accept: 'application/json', ...options.headers };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  // Optional timeout so a dead API never stalls content loading.
  const { timeoutMs, ...fetchOptions } = options;
  let response;
  if (timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  } else {
    response = await fetch(url, { ...fetchOptions, headers });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchLessonsFromApi() {
  return apiFetch('/api/content/lessons');
}

export async function fetchQuizzesFromApi() {
  return apiFetch('/api/content/quizzes');
}

export async function fetchContentManifest() {
  return apiFetch('/api/content/manifest');
}

const HEALTH_TIMEOUT_MS = 2500;
let healthCache = null; // null = unknown, true/false = probed

export async function checkApiHealth() {
  if (healthCache !== null) return healthCache; // dead API probed once — stay quiet
  try {
    const base = getApiBaseUrl();
    if (!base || !navigator.onLine) { healthCache = false; return false; }
    const data = await apiFetch('/api/health', { timeoutMs: HEALTH_TIMEOUT_MS });
    healthCache = data.status === 'ok' && data.database === 'connected';
    return healthCache;
  } catch {
    // API unreachable (not deployed / offline / CORS) — expected in
    // offline-first mode. Cache the failure so we never re-probe this
    // session; content loads from static JSON without console noise.
    healthCache = false;
    return false;
  }
}

export async function loginToApi(email, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

export async function registerOnApi(email, password, displayName) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });
}

const TOKEN_KEY = 'pyknowledge_api_token';

export function saveApiToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getApiToken() {
  return localStorage.getItem(TOKEN_KEY);
}
