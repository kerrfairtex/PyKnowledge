/**
 * HTML5 video player component.
 */

export function renderVideoPlayer(container, src, title) {
  if (!container) return;

  container.innerHTML = `
    <div class="video-player">
      <video controls preload="metadata" width="100%" aria-label="${title}">
        <source src="${src}" type="video/mp4">
        Your browser does not support HTML5 video.
      </video>
    </div>`;
}
