/**
 * Progress bar UI component.
 * Renders markup styled by dashboard.css. Width starts at 0 and is set on the next frame so the
 * CSS `transition` on .progress-bar-percent actually animates the fill in.
 */

let barCounter = 0;

export function renderProgressBar(percent, label = '', options = {}) {
  const { animated = true, celebrate = false } = options;
  const clamped = Math.min(100, Math.max(0, percent));
  const id = `pb-${barCounter++}`;

  if (animated) {
    queueMicrotask(() => {
      attachProgressBarAnimation(id, clamped);
      if (celebrate) {
        triggerProgressCelebration(id);
      }
    });
  }

  return `
    <div class="progress-bar-wrap ${celebrate ? 'is-celebrating' : ''}" id="${id}" role="progressbar"
         aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar-background"></div>
      <div class="progress-bar-percent" style="width: ${animated ? 0 : clamped}%"></div>
      <span class="progress-bar-label">${label || `${clamped}%`}</span>
    </div>`;
}

function attachProgressBarAnimation(id, percent) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  const fill = wrap.querySelector('.progress-bar-percent');
  if (!fill) return;
  requestAnimationFrame(() => {
    fill.style.width = `${percent}%`;
  });
}

function triggerProgressCelebration(id) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  const fill = wrap.querySelector('.progress-bar-percent');
  if (fill) {
    setTimeout(() => {
      fill.classList.add('celebration-complete');
    }, 800);
  }
}
