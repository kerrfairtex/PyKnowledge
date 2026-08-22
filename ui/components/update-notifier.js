/**
 * Service worker update notification.
 */

import { showInfo } from './toast.js';

export function initUpdateNotifier() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    showInfo('App updated. Refresh to get the latest version.');
  });

  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });
  });
}

function showUpdateBanner() {
  const existing = document.getElementById('update-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.className = 'update-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <span>A new version is available.</span>
    <button class="btn btn-primary btn-sm" id="update-reload">Update Now</button>
    <button class="btn btn-secondary btn-sm" id="update-dismiss" aria-label="Dismiss">Dismiss</button>`;

  document.body.appendChild(banner);

  document.getElementById('update-reload').addEventListener('click', async () => {
    // Tell the waiting service worker to activate, THEN reload so the new
    // version actually takes control. A bare reload can keep the old SW.
    const registration = await navigator.serviceWorker.getRegistration();
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      // controllerchange fires after activation; reload then (with a timeout
      // fallback in case the event never fires).
      let reloaded = false;
      const doReload = () => { if (!reloaded) { reloaded = true; window.location.reload(); } };
      navigator.serviceWorker.addEventListener('controllerchange', doReload, { once: true });
      setTimeout(doReload, 3000);
    } else {
      window.location.reload();
    }
  });

  document.getElementById('update-dismiss').addEventListener('click', () => {
    banner.remove();
  });
}

export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.update();
  }
}
