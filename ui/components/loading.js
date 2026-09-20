/**
 * Loading state UI component.
 */

import { escapeHtml } from '../../utils/sanitize.js';

const SKELETONS = {
  dashboard: `
    <div class="skeleton-loader" aria-busy="true" aria-label="Loading dashboard">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>`,
  lesson: `
    <div class="skeleton-loader" aria-busy="true" aria-label="Loading lesson">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-card"></div>
    </div>`,
  quiz: `
    <div class="skeleton-loader" aria-busy="true" aria-label="Loading quiz">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-text"></div>
    </div>`,
  library: `
    <div class="skeleton-loader" aria-busy="true" aria-label="Loading library">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>`,
  default: `
    <div class="skeleton-loader" aria-busy="true" aria-label="Loading">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>`
};

export function showViewSkeleton(container, type = 'default') {
  if (!container) return;
  container.innerHTML = SKELETONS[type] || SKELETONS.default;
}

export function showLoading(main, message = 'Loading...') {
  if (!main) return;
  main.innerHTML = `
    <div class="loading-state" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>${message}</p>
    </div>`;
}

export function showSkeleton(main) {
  showViewSkeleton(main, 'default');
}

export function showViewError(container, message, onRetry) {
  if (!container) return;
  container.innerHTML = `
    <div class="error-card page-content" role="alert">
      <h2>Something went wrong</h2>
      <p>${escapeHtml(String(message ?? ''))}</p>
      ${onRetry ? `<button class="btn btn-primary" id="retry-btn">Try again</button>` : ''}
    </div>`;
  
  if (onRetry) {
    container.querySelector('#retry-btn').addEventListener('click', onRetry);
  }
}
