/**
 * HTML5 video player component.
 */

import { escapeAttr } from '../../utils/sanitize.js';

export function renderVideoPlayer(container, src, title) {
  if (!container) return;

  const safeTitle = escapeAttr(title ?? '');
  const safeSrc = escapeAttr(src ?? '');

  container.innerHTML = `
    <div class="video-player">
      <video controls preload="metadata" width="100%" aria-label="${safeTitle}">
        <source src="${safeSrc}" type="video/mp4">
        Your browser does not support HTML5 video.
      </video>
    </div>`;
}
