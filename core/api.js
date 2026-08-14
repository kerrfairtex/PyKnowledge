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

  const response = await fetch(url, { ...options, headers });

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

export async function checkApiHealth() {
  try {
    const base = getApiBaseUrl();
    if (!base || !navigator.onLine) return false;
    const data = await apiFetch('/api/health');
    return data.status === 'ok' && data.database === 'connected';
  } catch {
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
