/**
 * Progress bar UI component.
 * Renders markup styled by dashboard.css (.progress-bar-wrap / .progress-bar-background
 * / .progress-bar-percent). Width starts at 0 and is set on the next frame so the
 * CSS `transition` on .progress-bar-percent actually animates the fill in.
 */

let barCounter = 0;

export function renderProgressBar(percent, label = '') {
  const clamped = Math.min(100, Math.max(0, percent));
  const id = `pb-${barCounter++}`;

  // width set after insertion (see attachProgressBarAnimation) so the
  // transition has a 0% -> N% change to animate, not a static jump.
  queueMicrotask(() => attachProgressBarAnimation(id, clamped));

  return `
    <div class="progress-header">
      <span>${label || `${clamped}%`}</span>
    </div>
    <div class="progress-bar-wrap" id="${id}" role="progressbar"
         aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar-background"></div>
      <div class="progress-bar-percent"></div>
    </div>`;
}

function attachProgressBarAnimation(id, percent) {
  const wrap = document.getElementById(id);
  if (!wrap) return; // not yet in DOM this tick, caller re-renders will fix width anyway
  const fill = wrap.querySelector('.progress-bar-percent');
  if (!fill) return;
  requestAnimationFrame(() => {
    fill.style.width = `${percent}%`;
  });
}
