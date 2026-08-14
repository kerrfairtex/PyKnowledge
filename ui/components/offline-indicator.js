/**
 * Offline / online connectivity indicator.
 */

import { showInfo, showSuccess } from './toast.js';

let indicator = null;
let wasOffline = false;

export function initOfflineIndicator() {
  if (indicator) return;

  indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.className = 'offline-indicator';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  indicator.hidden = true;
  document.body.appendChild(indicator);

  updateStatus();
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
}

function updateStatus() {
  if (!indicator) return;
  const offline = !navigator.onLine;

  indicator.hidden = !offline;
  indicator.className = `offline-indicator ${offline ? 'is-offline' : 'is-online'}`;
  indicator.textContent = offline ? 'You are offline — cached content is available' : '';
}

function onOffline() {
  wasOffline = true;
  updateStatus();
  showInfo('You are now offline. Cached lessons remain available.');
}

function onOnline() {
  updateStatus();
  if (wasOffline) {
    showSuccess('Back online.');
    wasOffline = false;
  }
}

export function isOnline() {
  return navigator.onLine;
}
