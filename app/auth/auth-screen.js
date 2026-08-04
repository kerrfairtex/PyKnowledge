/**
 * Authentication screens — profile picker, login, and registration.
 */

import { escapeHtml } from '../../utils/sanitize.js';
import {
  getProfiles, createProfile, loginWithPin, hasProfiles, getActiveUser
} from '../../storage/auth.js';
import { showSuccess } from '../../ui/components/toast.js';
import { animatePageEnter, staggerChildren } from '../../ui/components/animations.js';

export function renderAuthGate(main, onAuthenticated) {
  if (getActiveUser()) {
    onAuthenticated();
    return;
  }

  if (hasProfiles()) {
    renderProfilePicker(main, onAuthenticated);
  } else {
    renderWelcome(main, onAuthenticated);
  }
}

function renderWelcome(main, onAuthenticated) {
  main.innerHTML = `
    <section class="auth-screen auth-welcome" aria-labelledby="welcome-title">
      <div class="auth-card animate-item">
        <div class="auth-logo" aria-hidden="true">🐍</div>
        <h2 id="welcome-title">Welcome to PyKnowledge</h2>
        <p class="auth-subtitle">Create your student profile to save progress on this device.</p>
        <p class="auth-note">Works fully offline. No internet or account required.</p>
        <button type="button" class="btn btn-primary btn-lg" id="btn-create-profile">Create Profile</button>
        <button type="button" class="btn btn-ghost" id="btn-guest">Continue as Guest</button>
      </div>
    </section>`;

  animatePageEnter(main);
  document.getElementById('btn-create-profile').addEventListener('click', () => {
    renderRegister(main, onAuthenticated);
  });
  document.getElementById('btn-guest').addEventListener('click', () => {
    onAuthenticated();
  });
}

export function renderProfilePicker(main, onAuthenticated) {
  const profiles = getProfiles();

  main.innerHTML = `
    <section class="auth-screen" aria-labelledby="picker-title">
      <div class="auth-card">
        <h2 id="picker-title">Who's learning today?</h2>
        <p class="auth-subtitle">Select your profile to continue</p>
        <div class="profile-grid" role="list">
          ${profiles.map((p) => `
            <button type="button" class="profile-card animate-item" data-user-id="${escapeHtml(p.id)}" role="listitem"
              style="--avatar-color: ${escapeHtml(p.avatar)}">
              <span class="profile-avatar" aria-hidden="true">${escapeHtml(p.displayName.charAt(0).toUpperCase())}</span>
              <span class="profile-name">${escapeHtml(p.displayName)}</span>
            </button>
          `).join('')}
          <button type="button" class="profile-card profile-card-add animate-item" id="btn-add-profile" role="listitem">
            <span class="profile-avatar profile-avatar-add" aria-hidden="true">+</span>
            <span class="profile-name">Add Profile</span>
          </button>
        </div>
        <button type="button" class="btn btn-ghost" id="btn-guest-picker">Continue as Guest</button>
      </div>
    </section>`;

  animatePageEnter(main);
  staggerChildren(main, '.animate-item');

  main.querySelectorAll('.profile-card[data-user-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderPinEntry(main, btn.dataset.userId, onAuthenticated);
    });
  });

  document.getElementById('btn-add-profile').addEventListener('click', () => {
    renderRegister(main, onAuthenticated);
  });
  document.getElementById('btn-guest-picker').addEventListener('click', () => {
    onAuthenticated();
  });
}

function renderPinEntry(main, userId, onAuthenticated) {
  const profile = getProfiles().find((p) => p.id === userId);
  if (!profile) return;

  main.innerHTML = `
    <section class="auth-screen" aria-labelledby="pin-title">
      <div class="auth-card animate-item">
        <button type="button" class="auth-back" id="btn-back" aria-label="Back to profiles">&larr;</button>
        <div class="profile-avatar profile-avatar-lg" style="--avatar-color: ${escapeHtml(profile.avatar)}"
          aria-hidden="true">${escapeHtml(profile.displayName.charAt(0).toUpperCase())}</div>
        <h2 id="pin-title">Hello, ${escapeHtml(profile.displayName)}</h2>
        <p class="auth-subtitle">Enter your PIN to continue</p>
        <form id="pin-form" class="auth-form">
          <div class="pin-input-group">
            <input type="password" id="pin-input" class="pin-input" inputmode="numeric"
              pattern="[0-9]*" maxlength="8" placeholder="••••" required autocomplete="off"
              aria-label="PIN">
          </div>
          <p class="form-error" id="pin-error" hidden role="alert"></p>
          <button type="submit" class="btn btn-primary btn-lg">Sign In</button>
        </form>
      </div>
    </section>`;

  animatePageEnter(main);
  const pinInput = document.getElementById('pin-input');
  pinInput.focus();

  document.getElementById('btn-back').addEventListener('click', () => {
    renderProfilePicker(main, onAuthenticated);
  });

  document.getElementById('pin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('pin-error');
    errorEl.hidden = true;

    try {
      await loginWithPin(userId, pinInput.value);
      showSuccess(`Welcome back, ${profile.displayName}!`);
      onAuthenticated();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      pinInput.value = '';
      pinInput.focus();
      pinInput.classList.add('shake');
      setTimeout(() => pinInput.classList.remove('shake'), 500);
    }
  });
}

function renderRegister(main, onAuthenticated) {
  main.innerHTML = `
    <section class="auth-screen" aria-labelledby="register-title">
      <div class="auth-card animate-item">
        ${hasProfiles() ? '<button type="button" class="auth-back" id="btn-back" aria-label="Back">&larr;</button>' : ''}
        <h2 id="register-title">Create Your Profile</h2>
        <p class="auth-subtitle">Set up your name and a 4-digit PIN</p>
        <form id="register-form" class="auth-form">
          <div class="form-group">
            <label for="reg-name">Your Name</label>
            <input type="text" id="reg-name" class="form-input" required minlength="2"
              maxlength="30" placeholder="e.g. Maria" autocomplete="name">
          </div>
          <div class="form-group">
            <label for="reg-pin">PIN (4+ digits)</label>
            <input type="password" id="reg-pin" class="form-input" inputmode="numeric"
              pattern="[0-9]*" minlength="4" maxlength="8" required placeholder="••••"
              autocomplete="new-password">
          </div>
          <div class="form-group">
            <label for="reg-pin-confirm">Confirm PIN</label>
            <input type="password" id="reg-pin-confirm" class="form-input" inputmode="numeric"
              pattern="[0-9]*" minlength="4" maxlength="8" required placeholder="••••"
              autocomplete="new-password">
          </div>
          <p class="form-error" id="reg-error" hidden role="alert"></p>
          <button type="submit" class="btn btn-primary btn-lg">Create Profile</button>
        </form>
      </div>
    </section>`;

  animatePageEnter(main);
  document.getElementById('reg-name').focus();

  const backBtn = document.getElementById('btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      renderProfilePicker(main, onAuthenticated);
    });
  }

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('reg-error');
    errorEl.hidden = true;

    const name = document.getElementById('reg-name').value;
    const pin = document.getElementById('reg-pin').value;
    const confirm = document.getElementById('reg-pin-confirm').value;

    if (pin !== confirm) {
      errorEl.textContent = 'PINs do not match';
      errorEl.hidden = false;
      return;
    }

    try {
      const profile = await createProfile(name, pin);
      const { startSession } = await import('../../storage/auth.js');
      startSession(profile.id);
      showSuccess(`Profile created! Welcome, ${profile.displayName}`);
      onAuthenticated();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
}
