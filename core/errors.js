/**
 * Centralized error handling for PyKnowledge.
 */

import { escapeHtml } from '../utils/sanitize.js';

export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', recoverable = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export function renderError(main, error, options = {}) {
  if (!main) return;

  const title = options.title || 'Something went wrong';
  const message = error?.message || 'An unexpected error occurred';
  const showRetry = options.showRetry !== false && error?.recoverable !== false;

  main.innerHTML = `
    <div class="error-card" role="alert">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="error-actions">
        ${showRetry ? '<button class="btn btn-primary" id="error-retry">Try Again</button>' : ''}
        <a href="#/dashboard" class="btn btn-secondary">Back to Dashboard</a>
      </div>
    </div>`;

  const retryBtn = document.getElementById('error-retry');
  if (retryBtn && options.onRetry) {
    retryBtn.addEventListener('click', options.onRetry);
  }
}

export function renderNotFound(main, resource = 'Page') {
  if (!main) return;
  main.innerHTML = `
    <div class="error-card not-found" role="alert">
      <h2>${escapeHtml(resource)} not found</h2>
      <p>The content you're looking for doesn't exist or has been moved.</p>
      <a href="#/dashboard" class="btn btn-primary">Go to Dashboard</a>
    </div>`;
}

export async function withErrorHandling(main, fn, options = {}) {
  try {
    return await fn();
  } catch (err) {
    console.error('PyKnowledge error:', err);
    renderError(main, err, options);
    return null;
  }
}
