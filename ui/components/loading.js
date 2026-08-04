/**
 * Loading state UI component.
 */

export function showLoading(main, message = 'Loading...') {
  if (!main) return;
  main.innerHTML = `
    <div class="loading-state" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>${message}</p>
    </div>`;
}

export function showSkeleton(main) {
  if (!main) return;
  main.innerHTML = `
    <div class="skeleton-loader" aria-busy="true" aria-label="Loading content">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>`;
}
