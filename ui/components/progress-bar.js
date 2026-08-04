/**
 * Progress bar UI component.
 */

export function renderProgressBar(percent, label = '') {
  const clamped = Math.min(100, Math.max(0, percent));
  return `
    <div class="progress-bar" role="progressbar" aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-fill" style="width: ${clamped}%"></div>
      <span class="progress-label">${label || `${clamped}%`}</span>
    </div>`;
}
