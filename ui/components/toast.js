/**
 * Toast notification system.
 */

import { escapeHtml } from '../../utils/sanitize.js';

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 4000) {
  const el = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span>${escapeHtml(message)}</span><button class="toast-close" aria-label="Dismiss">&times;</button>`;

  const remove = () => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', remove);
  el.appendChild(toast);

  if (duration > 0) {
    setTimeout(remove, duration);
  }

  return remove;
}

export function showSuccess(message) {
  return showToast(message, 'success');
}

export function showError(message) {
  return showToast(message, 'error', 6000);
}

export function showInfo(message) {
  return showToast(message, 'info');
}
